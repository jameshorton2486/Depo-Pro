create table if not exists public.transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.cases(case_id) on delete cascade,
  transcript_id text not null unique,
  owner_user_id uuid not null default auth.uid() references auth.users(id),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'complete', 'failed')),
  callback_token_hash text not null,
  request_path text,
  response_path text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transcription_jobs_owner_idx
  on public.transcription_jobs (owner_user_id);

create index if not exists transcription_jobs_case_idx
  on public.transcription_jobs (case_id);

create unique index if not exists transcription_jobs_case_active_idx
  on public.transcription_jobs (case_id)
  where status in ('queued', 'processing');

create trigger transcription_jobs_set_updated_at
  before update on public.transcription_jobs
  for each row execute function public.set_updated_at();

alter table public.transcription_jobs enable row level security;

create policy "transcription_jobs_select_owner" on public.transcription_jobs
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy "transcription_jobs_insert_owner" on public.transcription_jobs
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "transcription_jobs_update_owner" on public.transcription_jobs
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
