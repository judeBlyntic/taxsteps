-- Tax Steps schema: profiles, document types, categories, documents, Google connections, API usage.
-- Receipt images are never stored: there is deliberately no image/file column or storage bucket.

create extension if not exists pg_trgm with schema extensions;

-- ── updated_at ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── profiles ──────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  business_name text check (char_length(business_name) <= 160),
  tax_number text check (char_length(tax_number) <= 40),
  country text check (country ~ '^[A-Z]{2}$'),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Pacific/Auckland' check (char_length(timezone) between 1 and 64),
  locale text not null default 'en-US' check (locale ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  fy_start_month smallint not null default 1 check (fy_start_month between 1 and 12),
  fy_start_day smallint not null default 1 check (fy_start_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.validate_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end $$;

create trigger profiles_validate before insert or update on public.profiles
  for each row execute function public.validate_profile();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── document types (lookup; add a type = insert a row) ───────────────────────
create table public.document_types (
  code text primary key check (code ~ '^[a-z_]{1,40}$'),
  label text not null check (char_length(label) between 1 and 60),
  sort smallint not null default 0
);
insert into public.document_types (code, label, sort) values
  ('receipt', 'Receipt', 0), ('invoice', 'Invoice', 1), ('bill', 'Bill', 2), ('expense', 'Expense', 3);

-- ── categories ────────────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text not null default 'tag' check (char_length(icon) between 1 and 40),
  color text not null default 'neutral-200' check (char_length(color) between 1 and 40),
  sort integer not null default 0 check (sort between 0 and 10000),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index categories_user_name_key on public.categories (user_id, lower(name));
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ── documents ─────────────────────────────────────────────────────────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_type text not null default 'receipt' references public.document_types (code),
  merchant_name text not null check (char_length(btrim(merchant_name)) between 1 and 200),
  title text check (char_length(title) <= 200),
  description text check (char_length(description) <= 2000),
  category_id uuid,
  expense_type text not null default 'business' check (expense_type in ('business', 'personal')),
  amount numeric(14, 2) not null check (amount >= 0),
  tax_amount numeric(14, 2) check (tax_amount >= 0 and tax_amount <= amount),
  tax_label text check (char_length(tax_label) <= 20),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  transaction_date date not null check (transaction_date >= date '1900-01-01'),
  invoice_number text check (char_length(invoice_number) <= 100),
  payment_method text check (char_length(payment_method) <= 60),
  status text not null default 'needs_review' check (status in ('complete', 'needs_review')),
  source text not null default 'manual' check (source in ('scan', 'upload', 'manual')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite FK: a document can only reference a category owned by the same user.
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create index documents_user_date_idx on public.documents (user_id, transaction_date desc, id desc);
create index documents_user_category_idx on public.documents (user_id, category_id);
create index documents_merchant_trgm_idx on public.documents using gin (merchant_name extensions.gin_trgm_ops);

create or replace function public.validate_document() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.transaction_date > current_date + 366 then
    raise exception 'transaction_date is too far in the future' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'user_id cannot change' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger documents_validate before insert or update on public.documents
  for each row execute function public.validate_document();
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- ── Google Sheets connections (server-only; token encrypted by the Edge Function) ──
create table public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_email text,
  refresh_token_enc text not null,
  default_spreadsheet_id text,
  default_sheet_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger google_connections_updated_at before update on public.google_connections
  for each row execute function public.set_updated_at();

-- ── API usage (rate limiting; server-only) ───────────────────────────────────
create table public.api_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('extract', 'export', 'sheets')),
  created_at timestamptz not null default now()
);
create index api_usage_user_kind_time_idx on public.api_usage (user_id, kind, created_at desc);

-- ── New user: profile from signup metadata + default categories ──────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_country text := upper(nullif(btrim(m ->> 'country'), ''));
  v_currency text := upper(nullif(btrim(m ->> 'currency'), ''));
  v_tz text := nullif(btrim(m ->> 'timezone'), '');
  v_locale text := nullif(btrim(m ->> 'locale'), '');
  v_fm int := 1;
  v_fd int := 1;
begin
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then v_country := null; end if;
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then v_currency := 'USD'; end if;
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'Pacific/Auckland';
  end if;
  if v_locale is null or v_locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then v_locale := 'en-US'; end if;
  if (m ->> 'fy_start_month') ~ '^\d{1,2}$' and (m ->> 'fy_start_month')::int between 1 and 12 then
    v_fm := (m ->> 'fy_start_month')::int;
    if (m ->> 'fy_start_day') ~ '^\d{1,2}$' and (m ->> 'fy_start_day')::int between 1 and 31 then
      v_fd := (m ->> 'fy_start_day')::int;
    end if;
  end if;

  insert into public.profiles (id, full_name, country, currency, timezone, locale, fy_start_month, fy_start_day)
  values (new.id, left(nullif(btrim(m ->> 'full_name'), ''), 120), v_country, v_currency, v_tz, v_locale, v_fm, v_fd);

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

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
