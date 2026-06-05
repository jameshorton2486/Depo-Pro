# PROMPT 3B REPORT — Conflict Rehydration From Provenance

Date: June 5, 2026

## Outcome

Prompt 3B completed in scope.

Commits:
- `0f72d60` `feat: deriveOpenConflicts from field_provenance event history`
- `0fdbb86` `feat: conflict store rehydrates open conflicts on case load`
- `f180831` `fix: readiness and conflict counts include rehydrated conflicts`
- `c4b231f` `test: conflict rehydration verification script`

Verification after each task:
- `npm run typecheck`
- `npm run test`

## Task 1

Added a pure replay utility in [src/lib/conflicts/deriveOpenConflicts.ts](/C:/Users/james/projects/depo-pro/src/lib/conflicts/deriveOpenConflicts.ts:1) with table-driven coverage in [src/lib/conflicts/deriveOpenConflicts.test.ts](/C:/Users/james/projects/depo-pro/src/lib/conflicts/deriveOpenConflicts.test.ts:1).

Real provenance event vocabulary used:
- `extracted`
- `conflict_detected`
- `conflict_resolved`
- `confirmed`
- `manual_edit`

Where found:
- migration constraint in [supabase/migrations/20260602163903_create_field_provenance_table.sql](/C:/Users/james/projects/depo-pro/supabase/migrations/20260602163903_create_field_provenance_table.sql:49)
- UI type union in [src/components/conflict/types.ts](/C:/Users/james/projects/depo-pro/src/components/conflict/types.ts:8)

Open-conflict replay rule implemented:
- `conflict_detected` opens
- `conflict_resolved`, `confirmed`, and `manual_edit` close
- latest event wins per field path

## Task 2

Extended the central load seam so `caseLoadService` now returns provenance rows alongside the case row, files, and audio in [src/api/caseLoadService.ts](/C:/Users/james/projects/depo-pro/src/api/caseLoadService.ts:9). The provenance query is a single ordered read in [src/api/provenanceService.ts](/C:/Users/james/projects/depo-pro/src/api/provenanceService.ts:27).

Hydration now happens at the case-scoped conflict provider mount:
- provider initializer rebuilds `history` and `active` from `field_provenance` in [src/components/conflict/conflictStore.tsx](/C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:106)
- `CaseContext` resolves launches through `loadCaseBundle()` and carries `activeProvenance` per case in [src/context/CaseContext.tsx](/C:/Users/james/projects/depo-pro/src/context/CaseContext.tsx:92)
- `ConflictProvider` receives `initialProvenance` through the case-scoped remount in [src/components/DepoEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/DepoEditor.tsx:176)

De-dup guard:
- in-session `detectConflict()` now exits when the hydrated active conflict already matches the same field/current/challenger pair in [src/components/conflict/conflictStore.tsx](/C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:327)

Resolution-event verification:
- the unchanged resolution path still writes `event_type: "conflict_resolved"` before persisting in [src/components/conflict/conflictStore.tsx](/C:/Users/james/projects/depo-pro/src/components/conflict/conflictStore.tsx:344)
- this is one of the closing events used by `deriveOpenConflicts()`

Contract note:
- local bundle addition logged in [CONTRACT_NOTES.md](/C:/Users/james/projects/depo-pro/CONTRACT_NOTES.md:14)

## Task 3

Hydrated active conflicts are now overlaid back onto projected table rows in [src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx](/C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:428). This restores:
- visible conflict rows
- filter/status behavior
- conflict counts in the table footer and summary badges
- the same resolve actions used for in-session conflicts

The Intake readiness banner already read unresolved conflicts from the conflict store in [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/IntakeScreen/IntakeScreen.tsx:195), so no logic change was needed there.

## Task 4

Appended the manual acceptance flow to [scripts/verify-persistence.md](/C:/Users/james/projects/depo-pro/scripts/verify-persistence.md:34).

The human pass now explicitly verifies:
- `job_demo_001` opens with 11 conflicts
- refresh keeps 11
- resolving one drops to 10
- refresh keeps 10
- switching cases shows no conflict leakage

## Scope Confirmation

Stayed in scope:
- provenance replay
- case-load hydration
- visible conflict restoration
- verification script

Did not change:
- schema or migrations
- extraction logic or `applyExtraction`
- autosave / Prompt 4A behavior
- case/session model
- frozen contract types in `src/api/types.ts`

## Boundary Log

No new boundary conditions were encountered.
