# Auth / RLS Audit

Date: 2026-06-06
Branch: `feature/stage3-workspace-core`

## 1. Table inventory

Current application tables and policy posture, derived from:
- [supabase/migrations/20260603210000_create_core_schema.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260603210000_create_core_schema.sql:1)
- [supabase/migrations/20260605180500_case_files.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260605180500_case_files.sql:1)
- [supabase/migrations/20260605222208_transcript_persistence_v2.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260605222208_transcript_persistence_v2.sql:1)
- [supabase/migrations/20260606113000_editor_api_working_rpc.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:1)
- [supabase/migrations/20260606114500_editor_api_resolve_suggestion_rpc.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260606114500_editor_api_resolve_suggestion_rpc.sql:1)

Every table below currently uses the permissive pattern `to authenticated using (true)` / `with check (true)`, except append-only tables which omit update/delete.

| Table | Current policies | User-identifying column today |
| --- | --- | --- |
| `contacts` | pre-existing authenticated open policies | none |
| `field_provenance` | pre-existing authenticated open policies | none |
| `cases` | select/insert/update authenticated open | none |
| `case_audio` | select/insert/update authenticated open | none |
| `case_files` | select/insert/update authenticated open | none |
| `transcripts` | select/insert/update authenticated open | none |
| `transcript_speakers` | select/insert/update authenticated open, plus delete-incomplete-jobs | none |
| `transcript_utterances` | select/insert/update authenticated open, plus delete-incomplete-jobs | none |
| `transcript_words` | select/insert/update authenticated open, plus delete-incomplete-jobs | none |
| `transcript_audit_log` | select/insert authenticated open, plus delete-incomplete-jobs | none |
| `transcript_review_state` | select/insert/update authenticated open | none |
| `transcript_suggestions` | select/insert/update authenticated open | none |
| `case_exhibits` | select/insert/update authenticated open | none |
| `case_certifications` | select/insert/update authenticated open | none |
| `exports` | select/insert/update authenticated open | none |

Trigger/function inventory relevant to hardening:
- `set_updated_at()` in [20260603210000_create_core_schema.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260603210000_create_core_schema.sql:25)
- `reject_raw_text_change()` in [20260603210000_create_core_schema.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260603210000_create_core_schema.sql:204)
- `editor_apply_working_changes()` in [20260606113000_editor_api_working_rpc.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260606113000_editor_api_working_rpc.sql:7)
- `editor_resolve_suggestion()` in [20260606114500_editor_api_resolve_suggestion_rpc.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260606114500_editor_api_resolve_suggestion_rpc.sql:6)

None of the application tables currently has an ownership column.

## 2. Data disposability check

Live row counts were queried against the linked Supabase project under the current anonymous-auth bootstrap:

| Table | Count |
| --- | ---: |
| `contacts` | 6 |
| `field_provenance` | 145 |
| `cases` | 20 |
| `case_audio` | 1 |
| `case_files` | 8 |
| `transcripts` | 3 |
| `transcript_speakers` | 6 |
| `transcript_utterances` | 17 |
| `transcript_words` | 123 |
| `transcript_audit_log` | 7 |
| `transcript_review_state` | 1 |
| `transcript_suggestions` | 3 |
| `case_exhibits` | 2 |
| `case_certifications` | 0 |
| `exports` | 0 |

Row sampling shows fixture / verification content only:
- `job_demo_001`
- `case_20260605_wqc8ew`
- `case_20260606_gyte38`
- multiple `case_verify_*`
- `case_transcript_verify_*`
- `case_editor_api_*`
- transcript rows `tr_job_verify_*` and `tr_editor_api_*`

The Garza/Texas notice rows are still test data in this project context. No evidence of real customer production data appeared in sampled identifiers or payload values.

Gate result: **disposable-data exception allowed**.

## 3. Client auth surface

Anonymous-session assumptions and auth-coupled call sites:

- [src/lib/supabase.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/supabase.ts:17)
  - `ensureSupabaseSession()` calls `supabase.auth.signInAnonymously()`
- [src/lib/supabase.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/supabase.ts:49)
  - `getSupabaseClient()` blocks on that anonymous bootstrap
- [src/api/client.ts](/C:/Users/james/Projects/Depo-Pro/src/api/client.ts:23)
  - bearer token is attached only if `supabase.auth.getSession()` returns one
- [src/api/caseService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/caseService.ts:61)
  - case save/load/list operations all rely on `getSupabaseClient()`
- [src/api/contactService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/contactService.ts:27)
  - contact CRUD relies on `getSupabaseClient()`
- [src/components/conflict/conflictStore.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/conflictStore.tsx:126)
  - provenance inserts/readbacks rely on `getSupabaseClient()`
- [supabase/functions/editor-api/index.ts](/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:109)
  - Edge Function requires caller `Authorization`; it is already ready for real-user JWT passthrough
- [scripts/seed-editor-transcript.mjs](/C:/Users/james/Projects/Depo-Pro/scripts/seed-editor-transcript.mjs:353)
  - current local seed still has anonymous fallback
- [scripts/editor-api-smoke.mjs](/C:/Users/james/Projects/Depo-Pro/scripts/editor-api-smoke.mjs:199)
  - current smoke signs in anonymously
- [scripts/verify-case-roundtrip.mjs](/C:/Users/james/Projects/Depo-Pro/scripts/verify-case-roundtrip.mjs:148)
- [scripts/verify-create-case.mjs](/C:/Users/james/Projects/Depo-Pro/scripts/verify-create-case.mjs:47)
- [scripts/verify-transcript-ingest.mjs](/C:/Users/james/Projects/Depo-Pro/scripts/verify-transcript-ingest.mjs:275)
  - all still rely on anonymous auth

## 4. Storage buckets

Code and migrations assume a single Storage bucket:
- bucket name `case-files` in [src/api/fileService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/fileService.ts:53), [src/api/transcriptionService.ts](/C:/Users/james/Projects/Depo-Pro/src/api/transcriptionService.ts:53), and [supabase/functions/editor-api/index.ts](/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:94)
- migration-created storage policies are in [20260605180500_case_files.sql](/C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260605180500_case_files.sql:57)

Current object path convention in code:
- documents: `cases/{case_id}/{slot-or-type}/...`
- audio: `cases/{case_id}/audio/...`
- transcript raw packets: `cases/{case_id}/transcripts/{job_id}/raw.json`

`storage.listBuckets()` under the current anonymous-auth session returned an empty visible list, so bucket enumeration is not trustworthy through the current client role. However:
- live `case_audio.storage_path`
- live `case_files.storage_path`
- successful signed URL generation
- successful `editor-api` seed upload
prove Storage is in active use and `case-files` exists.

Storage must be included in the hardening plan.

## 5. Mount / host handoff

`DepoEditorConfig` lives in [src/types/index.ts](/C:/Users/james/Projects/Depo-Pro/src/types/index.ts:15), not in the frozen API contract. It can legally gain optional auth-token fields.

Mount flow:
- [src/main.tsx](/C:/Users/james/Projects/Depo-Pro/src/main.tsx:28) `mountEditor(config)` configures the client and mounts the widget
- [src/main.tsx](/C:/Users/james/Projects/Depo-Pro/src/main.tsx:44) `window.mountEditor(config)` is the public host entrypoint
- [src/main.tsx](/C:/Users/james/Projects/Depo-Pro/src/main.tsx:50) standalone mode auto-mounts from `window.DEPO_EDITOR_CONFIG`

Conclusion:
- standalone mode can show an inline AuthGate
- embedded mode can accept host-injected Supabase access/refresh tokens on `DepoEditorConfig`

## 6. Phase 0 conclusion

No contract change is required.
No service-role usage is required in runtime client or Edge Function code.
No join-based policies are required if ownership is denormalized onto every table.

Proceed to Phase 1.
