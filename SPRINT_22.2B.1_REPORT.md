# Sprint 22.2B.1 Report

## Summary

Sprint `22.2B.1` completed the first Workspace Consumer Trust pass in
`src/lib/buildEditorContent.ts`.
The structured Workspace path now consumes speaker labels and speaker roles
from the Structured Transcript Contract directly instead of using local
structured-path fallback chains for those speaker semantics.

## Files Changed

- `src/lib/buildEditorContent.ts`
- `src/lib/buildEditorContent.test.ts`
- `SPRINT_BOARD.md`

## Semantic Inferences Removed

- Removed structured-path fallback for `speaker_label` that could fall back to:
  - `sourceLine.speaker_label`
  - `speaker.display_name`
  - `paragraph.label`
- Removed structured-path speaker-role fallback that reused local role
  derivation instead of preferring contract-owned speaker role.

## Contract Fields Consumed

- `structuredTranscript.paragraphs[*].speakerLabel`
- `structuredTranscript.paragraphs[*].speakerRole`
- `structuredTranscript.paragraphs[*].kind`

## Compatibility Paths Remaining

- Legacy Workspace rendering remains available when structure is not confirmed.
- Structured-path formatting still derives display prefixes from contract
  paragraph kind.
- No export, Stage S, or other consumer migration was performed in this sprint.

## Validation Results

- `npx vitest run src/lib/buildEditorContent.test.ts`: PASS
- `npm test`: PASS (`105` files, `633` tests)
- `npm run typecheck`: PASS
- `npm run build`: PASS

## Remaining Workspace Semantic Debt

- Structured-path role-to-line presentation helpers still exist for formatting
  concerns, even though speaker semantics now come from the contract.
- Additional consumer-trust work may still be needed if other Workspace helpers
  reconstruct transcript semantics outside `buildEditorContent.ts`.
