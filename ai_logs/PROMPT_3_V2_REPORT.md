# PROMPT 3 V2 — Case Lifecycle Report

Date: 2026-06-05

## Outcome

Prompt 3 is implemented locally.

This run moved the app from a fixed-case standalone mount to a real case lifecycle shell:

- `CaseBrowserScreen` is now the pre-stage surface for opening and creating cases without adding routes.
- `CaseContext` owns active case identity at the top of the shell.
- the editor subtree remounts under `key={activeCaseId}`, so Intake, conflict state, and workspace providers are case-scoped instead of reusing one persistent demo identity.
- last-opened behavior now persists only a pointer (`lastOpenedCaseId`), never case content.
- browser cards are enriched from grouped case-level queries only (`cases`, `case_audio`, `transcripts`, `case_exhibits`, `case_certifications`), with no per-case N+1 lookups.

## Commits

1. `7a08324` `test: live createCase verifier`
2. `f287e74` `feat: add case browser and active case lifecycle`

## Task 0 — Live createCase verifier

Created [scripts/verify-create-case.mjs](/C:/Users/james/projects/depo-pro/scripts/verify-create-case.mjs:1) and ran it against the live Supabase project.

Verbatim output:

```text
PASS count before createCase-equivalent insert
{
  "count": 5
}
PASS insert createCase-equivalent row
{
  "case_id": "case_verify_create_1780689003827"
}
PASS read created row
{
  "case_id": "case_verify_create_1780689003827",
  "stage": "intake",
  "payload": {
    "notes": "",
    "stage": "intake",
    "case_id": "case_verify_create_1780689003827",
    "version": "1.0",
    "created_at": "2026-06-05T19:50:03.827Z",
    "updated_at": "2026-06-05T19:50:03.827Z",
    "proceeding_type": "freelance_deposition"
  },
  "updated_at": "2026-06-05T19:50:04.67401+00:00"
}
PASS count after createCase-equivalent insert
{
  "count": 6
}
PASS archive verification row
{
  "case_id": "case_verify_create_1780689003827",
  "payload": {
    "notes": "",
    "stage": "intake",
    "case_id": "case_verify_create_1780689003827",
    "version": "1.0",
    "archived": true,
    "created_at": "2026-06-05T19:50:03.827Z",
    "updated_at": "2026-06-05T19:50:04.997Z",
    "proceeding_type": "freelance_deposition"
  },
  "updated_at": "2026-06-05T19:50:05.078039+00:00"
}
```

## Main changes

### 1. Case lifecycle services and helpers

- Added recent-case listing and grouped indicator enrichment in [src/api/caseService.ts](/C:/Users/james/projects/depo-pro/src/api/caseService.ts:1).
- Added pure lifecycle helpers and tests in [src/lib/caseLifecycle.ts](/C:/Users/james/projects/depo-pro/src/lib/caseLifecycle.ts:1) and [src/lib/caseLifecycle.test.ts](/C:/Users/james/projects/depo-pro/src/lib/caseLifecycle.test.ts:1).
- Status chips are derived from a single stage mapper, with `Certified` requiring a real certification row rather than the stage name alone.

### 2. Top-level active case shell

- Added [src/context/CaseContext.tsx](/C:/Users/james/projects/depo-pro/src/context/CaseContext.tsx:1) to own:
  - startup resolution order: valid `lastOpenedCaseId` → valid config `jobId` hint → Case Browser
  - guarded navigation for `openCase`, `createAndOpen`, and `showBrowser`
  - pointer-only `localStorage` persistence, excluding `job_demo_001`
- Refactored [src/components/DepoEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/DepoEditor.tsx:1) so the case-scoped provider tree remounts under `key={activeCaseId}`.
- `StageProvider` now accepts an `initialStage` in [src/context/StageContext.tsx](/C:/Users/james/projects/depo-pro/src/context/StageContext.tsx:1), allowing saved cases to reopen at their persisted workflow stage.
- `IntakeProvider` now accepts `initialRecord` in [src/context/IntakeContext.tsx](/C:/Users/james/projects/depo-pro/src/context/IntakeContext.tsx:1), so non-Intake stages are still backed by the correct active case record.

### 3. Browser UI and navigation

- Added [src/components/CaseBrowserScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/CaseBrowserScreen.tsx:1) with:
  - `New Deposition`
  - recent cases
  - open by ID
  - client-side search over case style, witness, and case ID
  - distinct empty states for `no cases yet` vs `no matches`
- Added `Cases` entry points to both Stage 1 and workspace chrome:
  - [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1)
  - [src/components/Toolbar/Toolbar.tsx](/C:/Users/james/projects/depo-pro/src/components/Toolbar/Toolbar.tsx:1)
- Added the pre-4A unsaved-change dialog in [src/components/DepoEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/DepoEditor.tsx:1):
  - `Save and Switch`
  - `Discard and Switch`
  - `Cancel`

## Guardrails preserved

- No router added.
- Browser layer uses `case_id` only. It does not use transcript job IDs.
- No contract types in `src/api/types.ts` were reshaped.
- No schema or migration changes were made.
- `AGENTS.md` now explicitly records the pointer-only `localStorage` exception in [AGENTS.md](/C:/Users/james/projects/depo-pro/AGENTS.md:1).
- New local lifecycle/browser types were logged in [CONTRACT_NOTES.md](/C:/Users/james/projects/depo-pro/CONTRACT_NOTES.md:1).

## Verification

Passed:

- `node scripts\verify-create-case.mjs`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Attempted but blocked:

- in-app browser verification on `http://127.0.0.1:4173`
- the Browser plugin bootstrap failed before navigation because the Node REPL kernel crashed with:

```text
node_repl kernel exited unexpectedly
node_repl diagnostics: {"kernel_pid":4236,"kernel_status":"running","kernel_stderr_tail":"windows sandbox failed: spawn setup refresh","reason":"stdout_eof","stream_error":null}
```

This was a tooling failure, not an application assertion failure.

## Boundary log

- No new boundary-log entries were added during Prompt 3.
- Existing [ai_logs/BOUNDARY_LOG.md](/C:/Users/james/projects/depo-pro/ai_logs/BOUNDARY_LOG.md:1) remains unchanged and contains only the earlier Prompt 2 audio reducer seam note.

## Explicit confirmations

- Refresh resume now uses a pointer only, never case content.
- `job_demo_001` is never persisted as `lastOpenedCaseId`.
- Recent-case enrichment uses grouped case-level queries, not per-case lookups.
- The browser/case lifecycle layer is scoped to `case_id`, not transcript job IDs.

## Next sequence

Confirmed next order:

1. `PROMPT_3B_CONFLICT_REHYDRATION.md`
2. `PROMPT_4A`

Use the acceptance fixture from [ai_logs/AUDIT_EXTRACTION_INTEGRITY.md](/C:/Users/james/projects/depo-pro/ai_logs/AUDIT_EXTRACTION_INTEGRITY.md:1) Section 6 for the first clean-case post-Prompt-3 verification pass:

- `05-07-26 @ 10am & 2pm - Goldman & Peterson (2).pdf`
