# Sprint TP-1 Report

## Summary

Sprint `TP-1` completed the first Transcript Production pass for proceedings
and examination events in `src/lib/transcript/transcriptParagraphs.ts`.
The paragraph producer now converts oath and commencement colloquy into
producer-owned parenthetical transcript events before Workspace render or any
downstream consumer formatting.

## Files Changed

- `src/lib/transcript/transcriptParagraphs.ts`
- `src/lib/transcript/transcriptParagraphs.test.ts`
- `SPRINT_BOARD.md`

## Semantic Events Produced

- `(The witness was sworn.)`
- `(Whereupon, the deposition commenced.)`
- existing `PROCEEDINGS`
- existing `EXAMINATION`
- existing `BY MR. ...:`

## Duplicate Inference Paths Removed or Bypassed

- Reporter oath colloquy is no longer left as raw transcript dialogue when the
  oath can be deterministically recognized.
- Reporter commencement colloquy is no longer left as raw transcript dialogue
  when examination commencement can be deterministically recognized.

## Validation Results

- `npx vitest run src/lib/transcript/transcriptParagraphs.test.ts`: PASS
- `npm test`: PASS (`107` files, `640` tests)
- `npm run typecheck`: PASS
- `npm run build`: PASS

## Remaining Work

- TP-1 does not yet reconstruct richer proceedings sequences beyond oath and
  commencement.
- Q/A ownership correction remains for TP-2.
- Appearance reconstruction remains for TP-3.
