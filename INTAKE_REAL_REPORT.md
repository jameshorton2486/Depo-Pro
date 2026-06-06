# Intake Real Report

## Phase 0 verification

1. `case_files` is already present and fits notice / scheduling / supporting documents.
   - Created in `supabase/migrations/20260605180500_case_files.sql`
   - Ownership added in `supabase/migrations/20260606180456_add_owner_user_id_ownership.sql`
   - Owner-scoped RLS added in `supabase/migrations/20260606180508_owner_scoped_rls_policies.sql`
   - Shape matches the intake document slots: `case_id`, `file_id`, `file_type`, `original_filename`, `mime_type`, `file_size_bytes`, `checksum`, `storage_path`, `status`, `owner_user_id`
   - No additive migration is needed for intake uploads.

2. Storage bucket verification
   - Bucket: `case-files`
   - Owner-prefix policy source: `supabase/migrations/20260606181010_owner_scoped_storage_policies.sql`
   - Required path convention is confirmed as `<owner_user_id>/<case_id>/...`
   - Current upload code already matches that convention in `src/api/fileService.ts`.

3. F8 attorney flow
   - Current attorney empty-state flow still routes through `handleAttorneyAdd` / `commitAttorneySelection`.
   - The generic `handleSelect(type, contact)` attorney branch in `src/components/IntakeScreen/IntakeScreen.tsx` had no remaining call sites; it was removed as dead code because it bypassed `representing`.
   - Live browser confirmation of the empty-state flow was blocked in-session by the browser runtime failure seen elsewhere today, so this step is code-path verified rather than browser-verified.

4. Finding re-anchor against the current codebase
   - F1 durable uploads: already implemented in `src/api/fileService.ts` and `src/components/IntakeScreen/DocumentUploadPanel.tsx`
   - F2 honest audio gating: validation already keys off durable audio presence in `src/validation/intakeValidation.ts`
   - F3 real-mode mock leakage: only remaining live leak was `mockConflictAlternates` in `src/components/IntakeScreen/IntakeScreen.tsx`
   - F4 durable keyterms: already implemented through `src/context/IntakeContext.tsx` and `src/store/intakeReducer.ts`
   - F5 stale Deepgram defaults: still present in `src/types/case.ts`
   - F6 save flow hardening gap: `handleProceed` still advanced without forcing a save, and save failures had no inline retry banner
   - F7 persisted gate semantics were already honest and were left unchanged
   - F9 UFM payload button is already a truthful preview and remains out of scope

## Decisions

- Reused the existing `src/api/fileService.ts` instead of creating a second upload service. The prompt's intended seam already exists there and is the correct place for durable intake uploads.
- Added a shared runtime helper in `src/lib/runtime/mode.ts` and used it to gate mock behavior instead of scattering env checks.
- Kept existing autosave behavior intact. This prompt only hardens save-on-proceed and visible save failure handling; it does not remove or redesign autosave.

## Fixture imports found in Phase 3

- `src/components/IntakeScreen/IntakeScreen.tsx`
  - `mockConflictAlternates` remains imported, but is now used only when `isMockMode()` is true
- `mockCaseRecord` no longer participates in the real intake hydration path; current live hydration resolves to persisted row or `emptyCaseRecord`
- `src/components/DepoEditor.tsx` still imports `FIXTURE_LANGUAGE_MAP`, but that is outside intake scope and was not changed here

## Keyterm default decision

- `SEED_KEYTERMS` is no longer the live source of truth for intake.
- Durable keyterms already come from `record.deepgram.keyterms` and persist through the case record.
- No additional default-keyterm layer was introduced in this task.

## Deferred

- Additional autosave redesign beyond the existing implementation
- UFM payload generation / downstream packaging concerns
- Scheduling / supporting document extraction behavior beyond the existing pipelines

## Live manual verification script

1. Sign in as `smoke-user-1`.
2. Create a new case.
3. Upload one notice document and one audio file.
4. Refresh the page.
5. Confirm both slots still render as done and Gate 1 shows audio satisfied.
6. Save the case and confirm:
   - `cases.payload.audio` is populated
   - `case_audio` contains the row
   - `case_files` contains the notice row
   - Storage objects exist under `<uid>/<case_id>/...`
7. Add a keyterm, save, and confirm it appears in `cases.payload.deepgram.keyterms`.
8. Edit an intake field and click Proceed without manually saving.
9. Confirm the save completes before stage advance and the edited value survives reload.

## Deviations from the prompt

- No additive migration was needed because `case_files`, owner-prefixed storage paths, and durable upload helpers were already in place.
- The live browser verification item in Phase 0.3 could not be completed in-session because the browser runtime was unavailable; the dead-branch decision is therefore based on current code paths plus call-site search.
