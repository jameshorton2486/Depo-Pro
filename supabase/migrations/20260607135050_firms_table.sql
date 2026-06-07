begin;

create table if not exists public.firms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id),
  name text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  main_phone text not null default '',
  fax text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists firms_owner_idx on public.firms (owner_user_id);
create index if not exists firms_name_idx on public.firms (lower(name));

create trigger firms_set_updated_at
  before update on public.firms
  for each row execute function set_updated_at();

alter table public.firms enable row level security;

create policy "firms_select_owner" on public.firms
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "firms_insert_owner" on public.firms
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "firms_update_owner" on public.firms
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

commit;
