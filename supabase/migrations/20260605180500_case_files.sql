-- =============================================================================
-- DEPO-PRO Durable Case Files
--
-- Design notes:
--  * Policies are permissive by design during local dev; tightened in a future
--    auth-hardening migration.
--  * One bucket only: `case-files`, sized for audio (2 GB max object size).
--    Per-type document limits are enforced in application code.
--  * Documents belong in `case_files`.
--  * Audio metadata belongs in `case_audio` and its object lives in the same
--    bucket under `cases/{case_id}/audio/`.
--  * Exhibit metadata belongs in `case_exhibits`.
--  * Never create two metadata rows for one object.
-- =============================================================================

create table if not exists case_files (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references cases(case_id) on delete cascade,
  file_id text not null,
  file_type text not null check (
    file_type in ('notice', 'scheduling', 'supporting', 'transcript_source', 'export', 'other')
  ),
  original_filename text not null,
  mime_type text not null default '',
  file_size_bytes bigint,
  checksum text,
  uploaded_by uuid,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  unique (case_id, file_id)
);

create index if not exists case_files_case_idx on case_files (case_id, uploaded_at desc);
create index if not exists case_files_type_idx on case_files (case_id, file_type, status);

alter table case_files enable row level security;

drop policy if exists "case_files_select_authenticated" on case_files;
create policy "case_files_select_authenticated" on case_files
  for select to authenticated using (true);

drop policy if exists "case_files_insert_authenticated" on case_files;
create policy "case_files_insert_authenticated" on case_files
  for insert to authenticated with check (true);

drop policy if exists "case_files_update_authenticated" on case_files;
create policy "case_files_update_authenticated" on case_files
  for update to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('case-files', 'case-files', false, 2147483648)
on conflict (id) do nothing;

drop policy if exists "case_files_bucket_select_authenticated" on storage.objects;
create policy "case_files_bucket_select_authenticated" on storage.objects
  for select to authenticated
  using (bucket_id = 'case-files');

drop policy if exists "case_files_bucket_insert_authenticated" on storage.objects;
create policy "case_files_bucket_insert_authenticated" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'case-files');

drop policy if exists "case_files_bucket_update_authenticated" on storage.objects;
create policy "case_files_bucket_update_authenticated" on storage.objects
  for update to authenticated
  using (bucket_id = 'case-files')
  with check (bucket_id = 'case-files');
