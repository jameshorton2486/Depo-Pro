# PROMPT 2 (v2) Report

## Task 0 round-trip output

```text
PASS insert row
{
  "id": "25ba9794-8c4b-4043-a903-d1f66635e0ae",
  "case_id": "case_verify_1780682912773",
  "version": "1.0",
  "proceeding_type": "freelance_deposition",
  "stage": "intake",
  "notes": "",
  "payload": {
    "case_id": "case_verify_1780682912773",
    "created_at": "2026-06-05T18:08:32.773Z",
    "verification": true
  },
  "created_at": "2026-06-05T18:08:33.080905+00:00",
  "updated_at": "2026-06-05T18:08:33.080905+00:00"
}
PASS read row back
{
  "id": "25ba9794-8c4b-4043-a903-d1f66635e0ae",
  "case_id": "case_verify_1780682912773",
  "version": "1.0",
  "proceeding_type": "freelance_deposition",
  "stage": "intake",
  "notes": "",
  "payload": {
    "case_id": "case_verify_1780682912773",
    "created_at": "2026-06-05T18:08:32.773Z",
    "verification": true
  },
  "created_at": "2026-06-05T18:08:33.080905+00:00",
  "updated_at": "2026-06-05T18:08:33.080905+00:00"
}
PASS update payload
{
  "id": "25ba9794-8c4b-4043-a903-d1f66635e0ae",
  "case_id": "case_verify_1780682912773",
  "version": "1.0",
  "proceeding_type": "freelance_deposition",
  "stage": "intake",
  "notes": "",
  "payload": {
    "case_id": "case_verify_1780682912773",
    "touched": "2026-06-05T18:08:33.322Z",
    "created_at": "2026-06-05T18:08:32.773Z",
    "verification": true
  },
  "created_at": "2026-06-05T18:08:33.080905+00:00",
  "updated_at": "2026-06-05T18:08:33.381379+00:00"
}
PASS read updated row
{
  "id": "25ba9794-8c4b-4043-a903-d1f66635e0ae",
  "case_id": "case_verify_1780682912773",
  "version": "1.0",
  "proceeding_type": "freelance_deposition",
  "stage": "intake",
  "notes": "",
  "payload": {
    "case_id": "case_verify_1780682912773",
    "touched": "2026-06-05T18:08:33.322Z",
    "created_at": "2026-06-05T18:08:32.773Z",
    "verification": true
  },
  "created_at": "2026-06-05T18:08:33.080905+00:00",
  "updated_at": "2026-06-05T18:08:33.381379+00:00"
}
PASS mark archived
{
  "id": "25ba9794-8c4b-4043-a903-d1f66635e0ae",
  "case_id": "case_verify_1780682912773",
  "version": "1.0",
  "proceeding_type": "freelance_deposition",
  "stage": "intake",
  "notes": "",
  "payload": {
    "case_id": "case_verify_1780682912773",
    "touched": "2026-06-05T18:08:33.322Z",
    "archived": true,
    "created_at": "2026-06-05T18:08:32.773Z",
    "verification": true
  },
  "created_at": "2026-06-05T18:08:33.080905+00:00",
  "updated_at": "2026-06-05T18:08:33.611634+00:00"
}
```

## Tasks and commits

- `8275b89` `docs: prompt 2 blocked — persistence verification failed`
  - Initial blocker report when Task 0 still compared serialized JSON strings against `jsonb`.
- `f61b71e` `fix: task 0 verifier uses jsonb-correct deep equality`
  - Updated `scripts/verify-case-roundtrip.mjs` to use deep structural equality and appended `RESOLVED` to the blocker report.
- `a2424fb` `feat: case_files table and case-files bucket migration`
  - Added the file-only migration at [supabase/migrations/20260605180500_case_files.sql](/C:/Users/james/projects/depo-pro/supabase/migrations/20260605180500_case_files.sql:1).
- `e28aa95` `feat: fileService and centralized caseLoadService`
  - Added `src/api/fileService.ts`, `src/api/caseLoadService.ts`, and bundle-aware Intake hydration.
- `9667146` `feat: intake uploads persist and restore from case_files`
  - Extracted `DocumentUploadPanel`, wired durable uploads/restoration, and added the `record.audio` reducer seam.
- `b06ac5b` `fix: intake validation reads durable upload state`
  - Switched Gate 1 validation to bundle-derived file state and added validator coverage.
- `5c4d67a` `fix: extraction persists the case row on completion`
  - Extraction now saves through the footer save path and has a regression test for save sequencing.

## Files changed

- [scripts/verify-case-roundtrip.mjs](/C:/Users/james/projects/depo-pro/scripts/verify-case-roundtrip.mjs:1)
- [supabase/migrations/20260605180500_case_files.sql](/C:/Users/james/projects/depo-pro/supabase/migrations/20260605180500_case_files.sql:1)
- [src/api/fileService.ts](/C:/Users/james/projects/depo-pro/src/api/fileService.ts:1)
- [src/api/caseLoadService.ts](/C:/Users/james/projects/depo-pro/src/api/caseLoadService.ts:1)
- [src/components/IntakeScreen/DocumentUploadPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/DocumentUploadPanel.tsx:1)
- [src/components/IntakeScreen/extractionPersistence.ts](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/extractionPersistence.ts:1)
- [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1)
- [src/store/intakeReducer.ts](/C:/Users/james/projects/depo-pro/src/store/intakeReducer.ts:1)
- [src/context/IntakeContext.tsx](/C:/Users/james/projects/depo-pro/src/context/IntakeContext.tsx:1)
- [src/validation/intakeValidation.ts](/C:/Users/james/projects/depo-pro/src/validation/intakeValidation.ts:1)
- [scripts/verify-persistence.md](/C:/Users/james/projects/depo-pro/scripts/verify-persistence.md:1)
- [ai_logs/BOUNDARY_LOG.md](/C:/Users/james/projects/depo-pro/ai_logs/BOUNDARY_LOG.md:1)

## Migration for James

Migration file:
- [supabase/migrations/20260605180500_case_files.sql](/C:/Users/james/projects/depo-pro/supabase/migrations/20260605180500_case_files.sql:1)

Do not have Codex run this. James should apply it manually from the repo root:

```powershell
npx supabase db push
```

## Verification

- `npm run typecheck` — PASS
- `npm run test` — PASS
- `npm run build` — PASS
- Live Task 0 verifier — PASS after the jsonb deep-equality correction

## Boundary log

- [ai_logs/BOUNDARY_LOG.md](/C:/Users/james/projects/depo-pro/ai_logs/BOUNDARY_LOG.md:1)
  - Task 3 prompt assumed an existing reducer action for `record.audio`.
  - The repo did not have one, so the smallest safe resolution was a typed `setAudio` action in the existing Intake reducer/context.

## Explicit storage ownership confirmation

- Audio uploads do **not** create `case_files` rows.
  - `uploadCaseAudio()` writes the object into the shared `case-files` bucket, then inserts metadata into `case_audio` only in [src/api/fileService.ts](/C:/Users/james/projects/depo-pro/src/api/fileService.ts:249).
- Exhibit objects do **not** create `case_files` rows in this prompt.
  - The migration comment and storage split remain: documents -> `case_files`, audio metadata -> `case_audio`, exhibits -> `case_exhibits`.

## Deferred items left untouched

- Multi-case browser / recent cases / open existing case flow — Phase 3
- Intake autosave beyond extraction completion — Phase 4
- Auth hardening / owner-scoped RLS — deferred per Prompt 2 and the standing security deferral
