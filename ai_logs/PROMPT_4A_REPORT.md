# PROMPT 4A REPORT

## Status

Completed in scope.

No schema changes. No `src/api/types.ts` changes. No extraction-logic changes. No case-model work.

## Tasks and Commits

- Task 0 gate — live verifiers rerun successfully
  - `node scripts\verify-case-roundtrip.mjs`
  - `node scripts\verify-create-case.mjs`
- Task 1 — `29c8b03` `feat: add intake autosave and save provenance`
- Task 2 — `39dcd38` `feat: flush case switches before prompting`
- Task 3 — `d54375b` `fix: preserve workspace dirty state across saves`
- Task 4 — `docs + verification`
  - verification steps appended to [scripts/verify-persistence.md](/C:/Users/james/projects/depo-pro/scripts/verify-persistence.md:89)
  - this report committed as `docs: prompt 4a report`

## Task 0 Gate

Both live persistence verifiers pass against the current Supabase project:

- case round-trip insert/read/update/archive
- create-case before/after row-count check

Operational note:

- `verify-create-case` is not parallel-safe with other scripts that also insert into `cases`, because it asserts a strict `beforeCount + 1` row delta.
- Running it sequentially is correct and passed cleanly.

## Task 1 — Intake Autosave and Provenance

Changes:

- added local save provenance metadata on `CaseRecord` as `_saveMeta`
  - source: `manual | autosave | flush`
  - timestamp
  - edit sequence
- added `editSeq` tracking to `IntakeState`
- made Intake saves sequence-aware so a save that completes after later edits no longer clears dirty state incorrectly
- added 10-second intake autosave
- added `beforeunload` protection for dirty or in-flight Intake saves

Key files:

- [src/types/case.ts](/C:/Users/james/projects/depo-pro/src/types/case.ts:1)
- [src/store/intakeReducer.ts](/C:/Users/james/projects/depo-pro/src/store/intakeReducer.ts:237)
- [src/context/IntakeContext.tsx](/C:/Users/james/projects/depo-pro/src/context/IntakeContext.tsx:38)
- [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:1325)
- [src/store/intakeReducer.test.ts](/C:/Users/james/projects/depo-pro/src/store/intakeReducer.test.ts:1)

Contract note:

- `_saveMeta` is logged as a local persisted addition in [CONTRACT_NOTES.md](/C:/Users/james/projects/depo-pro/CONTRACT_NOTES.md:18)

## Task 2 — Silent Flush on Navigation

Changes:

- case switches now try an automatic flush first
- the switch dialog no longer appears on the happy path
- the dialog opens only when the flush fails
- failure dialog actions are now:
  - `Retry Save`
  - `Discard and Switch`
  - `Cancel`
- `AGENTS.md` now locks the rule that the manual `Save` control is permanent

Key files:

- [src/context/CaseContext.tsx](/C:/Users/james/projects/depo-pro/src/context/CaseContext.tsx:175)
- [src/components/DepoEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/DepoEditor.tsx:95)
- [AGENTS.md](/C:/Users/james/projects/depo-pro/AGENTS.md:64)

## Task 3 — Workspace Dirty-Race Fix

Changes:

- added `editSeq` tracking to `DocumentContext` state
- changed `SAVE_OK` to carry the saved sequence number
- reducer now clears dirty only if the acknowledged save matches the latest edit sequence
- added `beforeunload` protection for dirty or in-flight workspace saves
- exported reducer/init helpers for targeted reducer tests

Key files:

- [src/context/DocumentContext.tsx](/C:/Users/james/projects/depo-pro/src/context/DocumentContext.tsx:18)
- [src/context/DocumentContext.test.ts](/C:/Users/james/projects/depo-pro/src/context/DocumentContext.test.ts:1)

## Task 4 — Verification Steps

Added manual verification coverage for:

- 10-second Intake autosave
- silent flush on case switch
- failure-only navigation dialog
- workspace in-flight save race behavior
- unload guard expectations

Location:

- [scripts/verify-persistence.md](/C:/Users/james/projects/depo-pro/scripts/verify-persistence.md:89)

## Verification

Passed:

- `node scripts\verify-case-roundtrip.mjs`
- `node scripts\verify-create-case.mjs`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Build note:

- Vite emitted only the pre-existing large-chunk warnings and a dependency `eval` warning from `bluebird`; build still completed successfully.

## Boundary Log

None.
