-- Aggregates for dashboard/reports (RLS applies: security invoker) and per-user rate limiting.

create or replace function public.document_summary(
  p_from date default null,
  p_to date default null,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  f jsonb := coalesce(p_filters, '{}'::jsonb);
  esc_merchant text := replace(replace(replace(f ->> 'merchant', '\', '\\'), '%', '\%'), '_', '\_');
  esc_search text := replace(replace(replace(f ->> 'search', '\', '\\'), '%', '\%'), '_', '\_');
  result jsonb;
begin
  with d as (
    select doc.*
    from public.documents doc
    where doc.user_id = (select auth.uid())
      and (p_from is null or doc.transaction_date >= p_from)
      and (p_to is null or doc.transaction_date <= p_to)
      and (f -> 'category_ids' is null or doc.category_id in (
            select (jsonb_array_elements_text(f -> 'category_ids'))::uuid))
      and (f -> 'ids' is null or doc.id in (select (jsonb_array_elements_text(f -> 'ids'))::uuid))
      and (f ->> 'document_type' is null or doc.document_type = f ->> 'document_type')
      and (f ->> 'expense_type' is null or doc.expense_type = f ->> 'expense_type')
      and (f ->> 'status' is null or doc.status = f ->> 'status')
      and (esc_merchant is null or doc.merchant_name ilike '%' || esc_merchant || '%')
      and (esc_search is null
           or doc.merchant_name ilike '%' || esc_search || '%'
           or doc.title ilike '%' || esc_search || '%'
           or doc.invoice_number ilike '%' || esc_search || '%'
           or doc.description ilike '%' || esc_search || '%')
      and (f ->> 'min_amount' is null or doc.amount >= (f ->> 'min_amount')::numeric)
      and (f ->> 'max_amount' is null or doc.amount <= (f ->> 'max_amount')::numeric)
      and (f ->> 'min_tax' is null or doc.tax_amount >= (f ->> 'min_tax')::numeric)
      and (f ->> 'max_tax' is null or doc.tax_amount <= (f ->> 'max_tax')::numeric)
  )
  select jsonb_build_object(
    'currencies', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'tax', tax, 'count', n, 'average', avg_amount) order by total desc)
      from (select currency, sum(amount) as total, coalesce(sum(tax_amount), 0) as tax, count(*) as n,
                   round(avg(amount), 2) as avg_amount
            from d group by currency) x), '[]'::jsonb),
    'by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', month, 'currency', currency, 'total', total) order by month, currency)
      from (select to_char(transaction_date, 'YYYY-MM') as month, currency, sum(amount) as total
            from d group by 1, 2) x), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('category_id', category_id, 'name', name, 'currency', currency,
                                          'total', total, 'tax', tax, 'count', n) order by total desc)
      from (select d.category_id, coalesce(c.name, 'Uncategorised') as name, d.currency, sum(d.amount) as total,
                   coalesce(sum(d.tax_amount), 0) as tax, count(*) as n
            from d left join public.categories c on c.id = d.category_id
            group by d.category_id, c.name, d.currency) x), '[]'::jsonb),
    'by_type', coalesce((
      select jsonb_agg(jsonb_build_object('expense_type', expense_type, 'currency', currency, 'total', total))
      from (select expense_type, currency, sum(amount) as total from d group by 1, 2) x), '[]'::jsonb),
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('date', day, 'business', business, 'personal', personal) order by day)
      from (select transaction_date::text as day,
                   count(*) filter (where expense_type = 'business') as business,
                   count(*) filter (where expense_type = 'personal') as personal
            from d group by transaction_date) x), '[]'::jsonb)
  ) into result;
  return result;
end $$;

revoke execute on function public.document_summary(date, date, jsonb) from public, anon;
grant execute on function public.document_summary(date, date, jsonb) to authenticated;

-- Atomically checks and records one use of a rate-limited action for the calling user.
create or replace function public.consume_rate_limit(p_kind text, p_per_hour int, p_per_day int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n_hour int;
  n_day int;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_kind not in ('extract', 'export', 'sheets') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_kind, 0));
  delete from public.api_usage where user_id = uid and created_at < now() - interval '7 days';

  select count(*) filter (where created_at > now() - interval '1 hour'), count(*)
    into n_hour, n_day
  from public.api_usage
  where user_id = uid and kind = p_kind and created_at > now() - interval '1 day';

  -- Hard ceiling so a client calling this directly with huge limits can't grow the table unbounded.
  if n_hour >= p_per_hour or n_day >= least(p_per_day, 1000) then
    return false;
  end if;

  insert into public.api_usage (user_id, kind) values (uid, p_kind);
  return true;
end $$;

revoke execute on function public.consume_rate_limit(text, int, int) from public, anon;
grant execute on function public.consume_rate_limit(text, int, int) to authenticated;
