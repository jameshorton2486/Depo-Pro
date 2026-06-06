# Auth / RLS Report

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
- Existing fixture-era `case-files` objects are deleted in the storage migration so reseeding recreates them under the new convention.

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
  - anonymous auth, if still enabled at the project level, yields zero rows

## Manual dashboard sequence

1. Apply migrations with `npx supabase db push`.
2. Create or sign in as the primary smoke user.
3. Run the seed script with owner-scoped credentials.
4. Run the smoke script with `SMOKE_USER_*` and `SMOKE_USER2_*`.
5. Confirm the editor still boots in DEV mock mode with `VITE_USE_REAL_API=0`.
6. In the Supabase dashboard, disable anonymous sign-ins under Authentication → Providers.
