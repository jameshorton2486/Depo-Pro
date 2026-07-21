# Wave 23A Reconciliation Summary

Date: 2026-07-13

## Decision

Wave 23 is split into:

- `Wave 23A`: implementation reconciliation
- `Wave 23B`: deposition production

This is a planning reset, not an architecture reset.

## Why This Split Was Necessary

The implementation has outrun portions of the older Wave 22 planning language.

Examples:

- `speakerResolution.ts` was planned, but [src/lib/transcript/speakerResolutionEngine.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/speakerResolutionEngine.ts) already exists and is active.
- `preWorkspaceOrchestrator.ts` was planned, but [src/lib/transcript/preWorkspaceStructure.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/preWorkspaceStructure.ts) already owns that seam.
- `workspacePresentation.ts` and `qaFixer.ts` were treated as active semantic owners in older documents, but both are deleted in the working tree and their responsibilities have already been redistributed.

If the old plan were followed literally, it would recreate duplicate ownership and violate the Wave 0 governance rule that each semantic responsibility has one owner.

## What Wave 0 Prevented

Wave 0’s single-owner rule prevented a stale implementation plan from spawning a second owner for responsibilities that already moved upstream.

That is a healthy outcome.

## Reconciled Owner Model

- Canonical integrity: [src/lib/transcript/canonicalIntegrity.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/canonicalIntegrity.ts)
- Boundary semantics: [src/lib/transcript/boundaryEngine.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/boundaryEngine.ts)
- Speaker semantics: [src/lib/transcript/speakerResolutionEngine.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/speakerResolutionEngine.ts)
- Paragraph semantics: [src/lib/transcript/transcriptParagraphs.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/transcriptParagraphs.ts)
- Pre-workspace orchestration: [src/lib/transcript/preWorkspaceStructure.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/preWorkspaceStructure.ts)
- Structured contract assembly: [src/lib/transcript/structuredTranscriptPackage.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/structuredTranscriptPackage.ts)
- Deterministic corrections: [src/lib/transcript/correctionEngines.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/correctionEngines.ts)
- Correction validation: [src/lib/transcript/correctionValidator.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/correctionValidator.ts)
- AI residual review: [src/lib/transcript/aiReview.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/aiReview.ts)

## Genuine Remaining Gaps

- extend canonical integrity in place
- add a centralized entity registry
- tighten residual review ownership so one module clearly owns the final unresolved queue

## What Wave 23B Must Not Do

Wave 23B must not:

- recreate `speakerResolution.ts`
- recreate `preWorkspaceOrchestrator.ts`
- reopen deleted owners like `workspacePresentation.ts` or `qaFixer.ts`
- add new semantic reconstruction into fallback render paths

## Wave 23B Entry Point

Wave 23B should begin from `REMAINING_WORK_MATRIX.md`, not from the older Wave 22 audit sequence.

That means the next coding pass should start with:

1. [src/lib/transcript/canonicalIntegrity.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/canonicalIntegrity.ts)
2. new centralized entity-registry ownership
3. review-gate reconciliation across correction validation, orchestration, and AI review

