# Owner-Scoped RLS Spot Check

Depo-Pro uses `owner_user_id`, not firm tenancy. The relevant boundary is the authenticated user ID and the first segment of `case-files` Storage object paths.

## Source result

The historical permissive policies in the initial migrations are explicitly dropped by later owner-scoped migrations. The final source policy model checks `(select auth.uid())` against `owner_user_id` for cases, case media/files, transcripts, transcript children, review data, contacts, reporter profiles, firms, and transcription jobs. `speaker_resolution_current` verifies ownership through its transcript. Storage select/insert/update/delete policies enforce the owner prefix.

## Storage delete rule

The only valid delete policy for browser-accessible case files is
`case_files_bucket_delete_owner`: `bucket_id = ''case-files''` and the first storage
path segment equals `(select auth.uid()::text)`. Do not use an `is_public = false`
exception: that condition would authorize deletion of every private object.

## Staging policy query

```sql
select policyname, qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'case_files_bucket_delete_owner';
```

Expect one policy whose predicate restricts `bucket_id` to `case-files` and checks
`(storage.foldername(name))[1] = (select auth.uid()::text)`. The test object name
must therefore include the owner UUID as its first segment, for example
`<user-id>/<case-id>/audio/<file-id>_sample.m4a`.

## Required staging checks

1. Apply all pending migrations, including `20260719003250_owner_scoped_storage_delete_policy.sql`.
2. As User A, create a synthetic case and object under User A's path.
3. As User B, verify select, update, and delete all return no rows or an authorization error for User A's case, media, transcript, and Storage object.
4. As User A, verify upload and removal succeed under User A's prefix.
5. Query `pg_policies` after deployment to confirm no `USING (true)` policy remains on public tenant data and that the owner policies are present.
6. Confirm the watchdog RPC is executable only by `service_role`.

This is a source-level pass. The remote result remains unverified until the Supabase CLI is reauthenticated and the staging checks run.