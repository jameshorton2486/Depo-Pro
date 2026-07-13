# Sprint TP-0.5A Report

## Summary

Sprint `TP-0.5A` implemented caption production on top of the region engine by
teaching `src/lib/transcript/transcriptParagraphs.ts` to replace raw
caption-region transcript text with generated caption output from `CaseRecord`
metadata. The caption producer now owns cause number, party caption text,
court lines, and the appearances block, while leaving proceedings, testimony,
and certification behavior unchanged.

## Files Changed

- `src/lib/transcript/transcriptParagraphs.ts`
- `src/lib/transcript/transcriptParagraphs.test.ts`
- `src/lib/transcript/qaStructureUtils.ts`
- `SPRINT_BOARD.md`

## Caption Semantics Produced

- Cause number block
- Party caption block
- Court block
- Appearances block

## Compatibility Paths Remaining

- When caption metadata is unavailable, the transcript still falls back to raw
  caption-region document blocks instead of dropping content.
- Certification remains isolated as raw `DOCUMENT_BLOCK` output; dedicated
  certification production belongs to `TP-0.5B`.
- Proceedings and testimony production continue to rely on the existing
  deterministic producer chain.

## Regression Coverage

- Caption-region paragraphs are generated from metadata without entering
  testimony semantics.
- Generated caption and appearance blocks remain in the `CAPTION` region.
- Certification lines stay isolated from testimony and no longer merge into a
  single multi-line document block through the QA fixer.

## Validation Results

- `npx vitest run src/lib/transcript/transcriptParagraphs.test.ts src/lib/transcript/structuredTranscriptPackage.test.ts src/lib/transcript/qaStructureUtils.test.ts`: PASS
- `npm test`: PASS (`108` files, `645` tests)
- `npm run typecheck`: PASS
- `npm run build`: PASS

## Remaining Work

- `TP-0.5A` does not yet produce a dedicated certification region model.
- Proceedings still depend on the existing opening heuristics and have not yet
  been upgraded into the separate proceedings production sprint.
- Testimony state transitions, dialogue production, and geometry remain future
  Wave 23 work.
