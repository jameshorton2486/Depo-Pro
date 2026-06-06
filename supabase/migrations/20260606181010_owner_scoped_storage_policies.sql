-- =============================================================================
-- Auth / RLS hardening — owner-scoped storage policies
-- Adopts <owner_user_id>/<case_id>/... object paths for the case-files bucket
-- and replaces the permissive bucket policies with owner-prefix enforcement.
-- Fixture-era objects are deleted because Phase 0 confirmed disposable data.
-- =============================================================================

begin;

delete from storage.objects
where bucket_id = 'case-files';

drop policy if exists "case_files_bucket_select_authenticated" on storage.objects;
drop policy if exists "case_files_bucket_insert_authenticated" on storage.objects;
drop policy if exists "case_files_bucket_update_authenticated" on storage.objects;

create policy "case_files_bucket_select_owner" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'case-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "case_files_bucket_insert_owner" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'case-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "case_files_bucket_update_owner" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'case-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'case-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

commit;
