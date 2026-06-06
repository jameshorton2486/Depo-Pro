# Auth / RLS Report

## Phase 0 verification

- RPC verification:
  - `20260606113000_editor_api_working_rpc.sql` is `security invoker`
  - `20260606114500_editor_api_resolve_suggestion_rpc.sql` is `security invoker`
  - the working RPC updates `transcript_words`, updates `transcript_utterances`, and inserts into `transcript_audit_log`
  - the suggestion-resolve RPC updates `transcript_suggestions`, updates `transcript_words`, and inserts into `transcript_audit_log`
  - neither RPC sets `owner_user_id` explicitly; both rely on invoker-scoped defaults and RLS
- Additional post-audit scope found:
  - `case_files` also required `owner_user_id`, owner index, and owner-scoped policies
- Live disposability check before migration:
  - fixture-scale rows only, including `job_demo_001`, `case_verify_*`, `case_transcript_verify_*`, and `case_editor_api_*`
  - sampled row counts before deletion:
    - `contacts`: 6
    - `field_provenance`: 145
    - `cases`: 20
    - `case_audio`: 1
    - `case_files`: 8
    - `transcripts`: 3
    - `transcript_speakers`: 6
    - `transcript_utterances`: 17
    - `transcript_words`: 123
    - `transcript_audit_log`: 7
    - `transcript_review_state`: 1
    - `transcript_suggestions`: 3
    - `case_exhibits`: 2
    - `case_certifications`: 0
    - `exports`: 0
- Storage verification:
  - the live project uses the `case-files` bucket
  - owner-prefix policies were applied on `storage.objects` for that bucket
  - direct SQL deletion of `storage.objects` is blocked by Supabase, so fixture-era objects are now simply unreachable under the new policy shape
- Live verification blocker after implementation:
  - the project’s email/password flow currently requires confirmation, so unattended `signUp()` does not yield a session
  - smoke verification therefore still needs either confirmed test-user credentials or a manual dashboard step to create/confirm users before the two-user live smoke can complete

## Decisions

- Ownership is denormalized onto every application table with `owner_user_id uuid not null default auth.uid() references auth.users(id)`.
- Policies use `owner_user_id = (select auth.uid())` for select/update/delete and matching `with check` for inserts/updates, following the RLS performance guidance.
- `transcript_audit_log` remains append-only: select + insert only.
- Multi-party sharing remains deferred. This hardening scope is single-owner rows only.

## Disposable-data exception

Phase 0 confirmed the linked project contains fixture / verification rows only. The ownership migration therefore deletes existing application rows before adding strict `owner_user_id not null` columns. No backfill owner is used.

Deleted row domains covered by the migration:
- intake data
- transcript-domain rows
- exhibits / certifications / exports
- contact library rows
- provenance rows

Storage objects are handled separately in the storage phase.

## Additive migrations

- `20260606180456_add_owner_user_id_ownership.sql`
  - adds `owner_user_id` to every application table
  - creates owner indexes
  - clears disposable fixture rows first
- `20260606180508_owner_scoped_rls_policies.sql`
  - drops permissive authenticated policies
  - creates owner-scoped replacements
  - removes the legacy `transcript_audit_log_delete_incomplete_jobs` policy so audit rows remain append-only
- `20260606181010_owner_scoped_storage_policies.sql`
  - replaces permissive `case-files` bucket policies with owner-prefix policies
  - preserves orphaned fixture-era storage objects because direct SQL deletion is blocked

## Deferred

- multi-user case sharing
- role-based access beyond simple ownership
- dashboard step to disable anonymous sign-ins

## Client auth hardening

- Anonymous bootstrap was removed from `src/lib/supabase.ts`.
- Auth state is now explicit:
  - session snapshot + subscription
  - optional host-injected session via `DepoEditorConfig.supabaseAccessToken` / `supabaseRefreshToken`
  - `AuthRequiredError` surfaced for real-API requests with no session
- `AuthGate` wraps the app outside `CaseProvider`.
- DEV mock mode still bypasses the gate UI when `VITE_USE_REAL_API !== "1"`.
- Sign-out is exposed in the toolbar and Case Browser header.

## Storage hardening

- New object path convention is `<owner_user_id>/<case_id>/...` for:
  - document uploads
  - audio uploads
  - transcript raw packets
- `case-files` storage policies were rewritten to require the first folder segment to equal `(select auth.uid()::text)`.
- Existing fixture-era `case-files` objects are left in place because `storage.objects` blocks direct SQL deletion; they are no longer readable under the owner-prefix policy shape.

## Seed and smoke hardening

- `scripts/seed-editor-transcript.mjs` no longer falls back to anonymous auth.
- Seeding now requires either:
  - `SUPABASE_SERVICE_ROLE_KEY` + `SEED_OWNER_USER_ID`, or
  - `SEED_USER_EMAIL` + `SEED_USER_PASSWORD`
- Seeded storage objects now follow the owner-scoped path convention:
  - `<owner_user_id>/<case_id>/audio/...`
  - `<owner_user_id>/<case_id>/transcripts/...`
  - `<owner_user_id>/<case_id>/exhibits/...`
- `scripts/editor-api-smoke.mjs` signs in as two real users and verifies:
  - authenticated happy-path editor-api behavior for all 8 routes
  - unauthenticated requests return `401`
  - user 2 cannot see user 1's case rows via direct Supabase queries
  - user 2 receives `404` for user 1's transcript route through `editor-api`
  - user 2 cannot persist a working save against user 1's transcript, and user 1's word text / `raw_text` / audit-row count remain unchanged
  - anonymous auth, if still enabled at the project level, yields zero rows

## Manual dashboard sequence

1. Apply migrations with `npx supabase db push`.
2. Create and confirm two password users for smoke verification, or provide existing confirmed credentials.
3. Run the seed script with owner-scoped credentials.
4. Run the smoke script with `SMOKE_USER_*` and `SMOKE_USER2_*`.
5. Confirm the editor still boots in DEV mock mode with `VITE_USE_REAL_API=0`.
6. In the Supabase dashboard, disable anonymous sign-ins under Authentication → Providers.
