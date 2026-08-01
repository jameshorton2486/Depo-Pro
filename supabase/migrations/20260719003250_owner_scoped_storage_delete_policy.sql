begin;

create policy "case_files_bucket_delete_owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'case-files'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

commit;