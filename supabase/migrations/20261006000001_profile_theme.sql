-- App colour theme, synced across devices. 'fresh' is the default for everyone, existing accounts included.
alter table public.profiles
  add column theme text not null default 'fresh' check (theme in ('fresh', 'classic'));
