# Wave 23B Next Targets

Date: 2026-07-13

Purpose: define the only approved starting points for the next coding pass after Wave 23A reconciliation.

## Rule

Do not resume implementation from stale Wave 22 prompts.

Use this file together with:

- `CURRENT_IMPLEMENTATION_MAP.md`
- `REMAINING_WORK_MATRIX.md`
- `WAVE23A_RECONCILIATION_SUMMARY.md`

## Approved Wave 23B Start Order

1. Extend `src/lib/transcript/canonicalIntegrity.ts`
   - extend existing owner only
   - no parallel integrity subsystem

2. Introduce a centralized entity-registry owner
   - likely target: `src/lib/transcript/entityRegistry.ts`
   - consume it from speaker resolution, deterministic correction, and AI review
   - do not scatter case-metadata authority across new helper files

3. Reconcile residual review ownership
   - clarify the single owner boundary across
     `src/lib/transcript/correctionValidator.ts`,
     `src/lib/transcript/correctionOrchestrator.ts`,
     and `src/lib/transcript/aiReview.ts`

## Explicitly Disallowed Wave 23B Starts

- recreate `speakerResolution.ts`
- recreate `preWorkspaceOrchestrator.ts`
- reopen `workspacePresentation.ts`
- reopen `qaFixer.ts`
- add new semantic inference to fallback render paths

## Success Condition

Wave 23B is correctly scoped only if every new task can be traced to a `partial` or `missing` item in
`REMAINING_WORK_MATRIX.md`.
