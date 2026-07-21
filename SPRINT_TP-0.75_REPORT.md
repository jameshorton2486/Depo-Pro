# Sprint TP-0.75 Report

## Summary

Sprint `TP-0.75` added proceedings metadata production and the governing Wave 23
region model. The new region authority lives in
`docs/architecture/W23_REGION_MODEL.md`. The transcript producer now generates
the proceedings heading, videographer opening, and reporter opening from
`CaseRecord` metadata when the record is sufficiently populated, and suppresses
duplicated raw proceedings admin speech in that case.

## Files Changed

- `docs/architecture/W23_REGION_MODEL.md`
- `src/lib/transcript/transcriptParagraphs.ts`
- `src/lib/transcript/transcriptParagraphs.test.ts`
- `SPRINT_BOARD.md`

## Proceedings Metadata Produced

- `PROCEEDINGS` heading
- videographer opening
- reporter opening
- date on the record
- time on the record
- cause number on the record
- remote deposition language
- reporter license language
- agreement request

## Compatibility Paths Remaining

- When proceedings metadata is incomplete, the pipeline falls back to the
  existing transcript-driven proceedings behavior.
- Oath and commencement remain owned by proceedings-event logic, not metadata
  production.
- Examination and testimony transitions remain owned by later Wave 23 sprints.

## Regression Coverage

- Proceedings metadata generation activates only when the record contains the
  required metadata set.
- Metadata-generated proceedings suppress duplicated raw admin speech.
- Attorney appearance colloquy is preserved after metadata-driven proceedings.
- Existing caption, certification, oath, and testimony tests remain green.

## Validation Results

- `npm test`: PASS (`108` files, `646` tests)
- `npm run typecheck`: PASS
- `npm run build`: PASS

## Remaining Work

- `TP-1` still needs to own proceedings events such as witness sworn and
  deposition commenced.
- `TP-2` still needs to own the examination state machine.
- Certification production remains separate future work.
