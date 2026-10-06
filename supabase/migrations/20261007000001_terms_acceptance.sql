-- Which Terms of Service / Privacy Policy version each account agreed to, and when.
-- terms_accepted_at is always stamped by the server, so a client can't backdate or forge it.
alter table public.profiles
  add column terms_version text check (terms_version ~ '^\d{4}-\d{2}-\d{2}$'),
  add column terms_accepted_at timestamptz;

create or replace function public.stamp_terms_acceptance() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.terms_version is distinct from old.terms_version then
    new.terms_accepted_at := case when new.terms_version is null then null else now() end;
  else
    new.terms_accepted_at := old.terms_accepted_at;
  end if;
  return new;
end $$;
revoke execute on function public.stamp_terms_acceptance() from public, anon, authenticated;

create trigger profiles_stamp_terms before insert or update on public.profiles
  for each row execute function public.stamp_terms_acceptance();

-- Email sign-ups pass the accepted version in their signup metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_country text := upper(nullif(btrim(m ->> 'country'), ''));
  v_currency text := upper(nullif(btrim(m ->> 'currency'), ''));
  v_tz text := nullif(btrim(m ->> 'timezone'), '');
  v_locale text := nullif(btrim(m ->> 'locale'), '');
  v_terms text := nullif(btrim(m ->> 'terms_version'), '');
  v_fm int := 1;
  v_fd int := 1;
begin
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then v_country := null; end if;
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then v_currency := 'USD'; end if;
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'Pacific/Auckland';
  end if;
  if v_locale is null or v_locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then v_locale := 'en-US'; end if;
  if v_terms is not null and v_terms !~ '^\d{4}-\d{2}-\d{2}$' then v_terms := null; end if;
  if (m ->> 'fy_start_month') ~ '^\d{1,2}$' and (m ->> 'fy_start_month')::int between 1 and 12 then
    v_fm := (m ->> 'fy_start_month')::int;
    if (m ->> 'fy_start_day') ~ '^\d{1,2}$' and (m ->> 'fy_start_day')::int between 1 and 31 then
      v_fd := (m ->> 'fy_start_day')::int;
    end if;
  end if;

  insert into public.profiles (id, full_name, country, currency, timezone, locale, fy_start_month, fy_start_day, terms_version)
  values (new.id, left(nullif(btrim(m ->> 'full_name'), ''), 120), v_country, v_currency, v_tz, v_locale, v_fm, v_fd, v_terms);

  -- Mirrors DEFAULT_CATEGORIES in packages/core/src/registry.ts (order, icons, colours).
  insert into public.categories (user_id, name, icon, color, sort)
  select new.id, c.name, c.icon, c.color, c.sort
  from (values
    ('Advertising', 'megaphone', 'accent-2-300', 0), ('Vehicle', 'car', 'accent-300', 1),
    ('Fuel', 'fuel', 'neutral-300', 2), ('Travel', 'plane', 'accent-200', 3),
    ('Office', 'briefcase', 'accent-2-200', 4), ('Equipment', 'wrench', 'neutral-200', 5),
    ('Software', 'monitor', 'accent-100', 6), ('Phone', 'smartphone', 'accent-2-300', 7),
    ('Internet', 'wifi', 'accent-300', 8), ('Professional Services', 'handshake', 'neutral-300', 9),
    ('Insurance', 'shield-check', 'accent-200', 10), ('Rent', 'building', 'accent-2-200', 11),
    ('Meals', 'utensils', 'neutral-200', 12), ('Other', 'tag', 'accent-100', 13)
  ) as c(name, icon, color, sort);

  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
