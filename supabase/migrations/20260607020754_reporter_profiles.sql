begin;

create table if not exists public.reporter_profiles (
  owner_user_id uuid primary key default auth.uid() references auth.users(id),
  display_name text,
  csr_number text,
  csr_cert_expiration date,
  firm_registration_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reporter_profiles_set_updated_at
  before update on public.reporter_profiles
  for each row execute function set_updated_at();

alter table public.reporter_profiles enable row level security;

create policy "reporter_profiles_select_owner" on public.reporter_profiles
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "reporter_profiles_insert_owner" on public.reporter_profiles
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "reporter_profiles_update_owner" on public.reporter_profiles
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

commit;
