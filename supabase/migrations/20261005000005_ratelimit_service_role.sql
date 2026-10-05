-- Rate limiting is recorded only by Edge Functions (service role), never callable by clients.
drop function public.consume_rate_limit(text, int, int);

create or replace function public.consume_rate_limit(p_user_id uuid, p_kind text, p_per_hour int, p_per_day int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n_hour int;
  n_day int;
begin
  if p_user_id is null then
    raise exception 'user required' using errcode = '22023';
  end if;
  if p_kind not in ('extract', 'export', 'sheets') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_kind, 0));
  delete from public.api_usage where user_id = p_user_id and created_at < now() - interval '7 days';

  select count(*) filter (where created_at > now() - interval '1 hour'), count(*)
    into n_hour, n_day
  from public.api_usage
  where user_id = p_user_id and kind = p_kind and created_at > now() - interval '1 day';

  if n_hour >= p_per_hour or n_day >= p_per_day then
    return false;
  end if;

  insert into public.api_usage (user_id, kind) values (p_user_id, p_kind);
  return true;
end $$;

revoke execute on function public.consume_rate_limit(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(uuid, text, int, int) to service_role;

-- FK-covering index in FK column order (category deletes set documents.category_id null).
drop index public.documents_user_category_idx;
create index documents_category_user_idx on public.documents (category_id, user_id);
