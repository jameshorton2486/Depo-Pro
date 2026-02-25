-- B.3 Storage Bucket Security
-- Enforce private buckets, firm-scoped policies, and size/MIME constraints.

-- Force core buckets private
update storage.buckets set public = false where name = 'depo-audio';
update storage.buckets set public = false where name = 'depo-files';
update storage.buckets set public = false where name = 'depo-exports';
update storage.buckets set public = false where name = 'depo-chunks';

-- Reset and recreate storage object policies (idempotent)
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

-- Size and MIME constraints
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