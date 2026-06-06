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
