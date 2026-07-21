# Sprint 22.2B.2 Report

## Summary

Sprint `22.2B.2` completed the export consumer conversion in
`src/lib/transcriptDownloads.ts`.
Export paths for TXT, copy transcript, Word, and PDF now honor boundary-owned
exclusion semantics before serialization and continue consuming structured
transcript semantics through the contract-backed export path.

## Files Changed

- `src/lib/transcriptDownloads.ts`
- `src/lib/transcriptDownloads.test.ts`
- `SPRINT_BOARD.md`

## Semantic Inference Removed

- Removed export-side inclusion of utterances marked `excluded_from_output`.
- Structured export paths now serialize only the visible transcript view before
  contract assembly or legacy clean formatting.

## Export Consumers Converted

- TXT transcript export
- Copy Transcript
- Word-compatible export
- Print / Save PDF export

## Compatibility Paths Remaining

- Raw-label export fallback still exists when structure is not confirmed or
  `keepRawLabels` is selected.
- `formattingEngine.ts` was audited but not changed in this sprint because it is
  not currently wired into the active transcript export path.
- Stage S export work remains out of scope for this sprint.

## Regression Coverage

- Added structured export coverage proving persisted `line_type` and
  `speaker_label` survive export serialization.
- Added boundary export coverage proving excluded utterances are omitted from
  structured exports.

## Validation Results

- `npx vitest run src/lib/transcriptDownloads.test.ts`: PASS
- `npm test`: PASS (`105` files, `635` tests)
- `npm run typecheck`: PASS
- `npm run build`: PASS

## Remaining Work

- Stage S remains the next consumer conversion candidate.
- Legacy retirement should remain deferred until all intended consumers trust
  the contract.
