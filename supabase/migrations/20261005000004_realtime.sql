-- Realtime sync via per-user PRIVATE broadcast channels ("user:<uid>").
-- Plain postgres_changes can't filter DELETE events per user, so changes are broadcast
-- from triggers to a channel only that user is authorised to join.

create or replace function public.broadcast_user_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner text := coalesce(to_jsonb(new), to_jsonb(old)) ->> tg_argv[0];
begin
  perform realtime.broadcast_changes(
    'user:' || owner,  -- topic
    tg_op,             -- event
    tg_op,             -- operation
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end $$;

revoke execute on function public.broadcast_user_change() from public, anon, authenticated;

create trigger documents_broadcast after insert or update or delete on public.documents
  for each row execute function public.broadcast_user_change('user_id');
create trigger categories_broadcast after insert or update or delete on public.categories
  for each row execute function public.broadcast_user_change('user_id');
create trigger profiles_broadcast after update on public.profiles
  for each row execute function public.broadcast_user_change('id');

-- Only the owner may receive messages on their topic.
create policy "users receive own broadcasts" on realtime.messages
  for select to authenticated
  using (realtime.topic() = 'user:' || (select auth.uid())::text and realtime.messages.extension = 'broadcast');
