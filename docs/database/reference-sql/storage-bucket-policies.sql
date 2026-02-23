-- Depo-Pro Stream B.3
-- Storage bucket RLS hardening
-- Run in Supabase SQL Editor (staging first, then production).

-- ---------------------------------------------------------------------
-- 1) Audit current bucket and policy state
-- ---------------------------------------------------------------------
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;

select name, bucket_id, operation, definition, check_expression
from storage.policies
order by bucket_id, operation;

-- ---------------------------------------------------------------------
-- 2) Force legal buckets to private
-- ---------------------------------------------------------------------
update storage.buckets set public = false where name = 'depo-audio';
update storage.buckets set public = false where name = 'depo-files';
update storage.buckets set public = false where name = 'depo-exports';
update storage.buckets set public = false where name = 'depo-chunks';

-- ---------------------------------------------------------------------
-- 3) Reset and recreate storage object policies (idempotent)
-- ---------------------------------------------------------------------
drop policy if exists "Users read own firm audio" on storage.objects;
drop policy if exists "Reporters upload to own firm audio" on storage.objects;
drop policy if exists "Users delete own audio uploads" on storage.objects;
drop policy if exists "Users read own firm files" on storage.objects;
drop policy if exists "Users upload to own firm files" on storage.objects;
drop policy if exists "Users delete own file uploads" on storage.objects;
drop policy if exists "Users read own firm exports" on storage.objects;

-- depo-audio: read within own firm folder
create policy "Users read own firm audio"
on storage.objects for select
to authenticated
using (
  bucket_id = 'depo-audio'
  and (storage.foldername(name))[1] in (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

-- depo-audio: upload within own firm folder
create policy "Reporters upload to own firm audio"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'depo-audio'
  and (storage.foldername(name))[1] in (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

-- depo-audio: delete own uploads
create policy "Users delete own audio uploads"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'depo-audio'
  and owner_id = auth.uid()::text
);

-- depo-files: read within own firm folder
create policy "Users read own firm files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'depo-files'
  and (storage.foldername(name))[1] in (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

-- depo-files: upload within own firm folder
create policy "Users upload to own firm files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'depo-files'
  and (storage.foldername(name))[1] in (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

-- depo-files: delete own uploads
create policy "Users delete own file uploads"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'depo-files'
  and owner_id = auth.uid()::text
);

-- depo-exports: read within own firm folder
create policy "Users read own firm exports"
on storage.objects for select
to authenticated
using (
  bucket_id = 'depo-exports'
  and (storage.foldername(name))[1] in (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

-- No authenticated INSERT policy for depo-exports or depo-chunks.
-- Server-side service_role writes these buckets.

-- ---------------------------------------------------------------------
-- 4) Set file size and MIME constraints
-- ---------------------------------------------------------------------
update storage.buckets set
  file_size_limit = 2147483648,
  allowed_mime_types = array[
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4',
    'audio/ogg', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime'
  ]
where name = 'depo-audio';

update storage.buckets set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/tiff',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where name = 'depo-files';

update storage.buckets set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
where name = 'depo-exports';

update storage.buckets set
  file_size_limit = 524288000,
  allowed_mime_types = array['audio/wav', 'audio/x-wav']
where name = 'depo-chunks';

-- ---------------------------------------------------------------------
-- 5) Post-apply verification
-- ---------------------------------------------------------------------
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where name in ('depo-audio', 'depo-files', 'depo-exports', 'depo-chunks')
order by name;

select name, bucket_id, operation
from storage.policies
where bucket_id in ('depo-audio', 'depo-files', 'depo-exports', 'depo-chunks')
order by bucket_id, operation, name;

-- Cross-firm check template (replace uuids before run):
-- set local role = 'authenticated';
-- set local request.jwt.claims = '{"sub":"<firm-a-user-uuid>"}';
-- select *
-- from storage.objects
-- where bucket_id = 'depo-audio'
--   and (storage.foldername(name))[1] = '<firm-b-uuid>';
