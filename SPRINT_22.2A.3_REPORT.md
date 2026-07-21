# Sprint 22.2A.3 Report

## Summary

Sprint `22.2A.3` consolidated boundary semantic preservation inside `src/lib/transcript/boundaryEngine.ts`.
The narrow fix was to preserve persisted boundary fields when mapping `EditorDocument` utterances into `BoundaryUtteranceView` objects.
This keeps existing boundary semantics intact across the producer boundary without changing package assembly or consumers.

## Files Changed

- `src/lib/transcript/boundaryEngine.ts`
- `src/lib/transcript/boundaryEngine.test.ts`
- `SPRINT_BOARD.md`

## Duplicate Producers Removed

- No duplicate producer was deleted in this sprint.
- The producer-integrity fix removed a semantic loss point where `mapDocumentToBoundaryUtterances()` discarded boundary-owned fields before downstream boundary processing.

## Remaining Compatibility Paths

- Consumers such as `workspaceService.ts` and `buildEditorContent.ts` still consume persisted boundary flags directly.
- No consumer migration was performed in this sprint.

## Tests Added

- Added regression coverage proving `mapDocumentToBoundaryUtterances()` preserves:
  - `excluded_from_output`
  - `exclusion_reason`
  - `is_synthetic`

## Validation Results

- `npx vitest run src/lib/transcript/boundaryEngine.test.ts`: PASS
- `npm test`: PASS (`105` files, `630` tests)
- `npm run typecheck`: PASS
- `npm run build`: PASS

## Remaining Work

- Sprint `22.2A.4` should focus on `structuredTranscriptPackage.ts` as contract assembler only.
- No package assembly or consumer changes were made here.
