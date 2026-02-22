-- Depo-Pro Stream B.3
-- Storage bucket RLS policies
-- Apply in Supabase SQL Editor (staging first, then production).

-- =====================================================================
-- BUCKET: depo-audio
-- =====================================================================
create policy "Users upload audio to firm folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'depo-audio'
  and (storage.foldername(name))[1] = (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

create policy "Users read own firm audio"
on storage.objects for select
to authenticated
using (
  bucket_id = 'depo-audio'
  and (storage.foldername(name))[1] = (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

create policy "Users delete own audio"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'depo-audio'
  and owner_id = auth.uid()::text
);

-- =====================================================================
-- BUCKET: depo-files
-- =====================================================================
create policy "Users upload files to firm folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'depo-files'
  and (storage.foldername(name))[1] = (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

create policy "Users read own firm files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'depo-files'
  and (storage.foldername(name))[1] = (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

-- =====================================================================
-- BUCKET: depo-exports
-- =====================================================================
create policy "Users read own exports"
on storage.objects for select
to authenticated
using (
  bucket_id = 'depo-exports'
  and (storage.foldername(name))[1] = (
    select firm_id::text from public.profiles where id = auth.uid()
  )
);

-- NOTE:
-- No INSERT policy for authenticated users on depo-exports.
-- Write path is server-side only (service role).
