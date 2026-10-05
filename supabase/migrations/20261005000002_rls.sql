-- Row Level Security: every user sees and changes only their own rows.
-- google_connections and api_usage have RLS on and NO policies: only the service role (Edge Functions) can touch them.

alter table public.profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.categories enable row level security;
alter table public.documents enable row level security;
alter table public.google_connections enable row level security;
alter table public.api_usage enable row level security;

-- profiles: created by the signup trigger, removed by cascade on account deletion.
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy document_types_read on public.document_types for select to authenticated using (true);

create policy categories_select_own on public.categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy categories_update_own on public.categories for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categories_delete_own on public.categories for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy documents_select_own on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy documents_insert_own on public.documents for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy documents_update_own on public.documents for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy documents_delete_own on public.documents for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Anonymous visitors get nothing at all.
revoke all on public.profiles, public.document_types, public.categories, public.documents,
  public.google_connections, public.api_usage from anon;
-- Signed-in clients never touch the server-only tables, even if a policy were added by mistake.
revoke all on public.google_connections, public.api_usage from authenticated;
