# CFE Phase 1.1 Implementation Plan

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Baseline HEAD: `01e3bb3`

## Baseline Gate

- `npm run test` -> pass (`53` files, `265` tests)
- `npm run typecheck` -> pass
- `npm run build` -> pass
- `docs/audits/CFE_PHASE1_1_FLAG_AUDIT.md` -> present

## Current Flag-Generation Seam

Primary file:

- [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts)

Relevant current locations:

- confidence threshold constant: [src/lib/format/cfe.ts:24](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:24)
- line-level `LOW_CONFIDENCE` marker: [src/lib/format/cfe.ts:427](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:427)
- low-confidence display branch: [src/lib/format/cfe.ts:433](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:433)
- inline flag generation: [src/lib/format/cfe.ts:440](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts:440)

## Current Decision Tree

Current behavior is effectively:

1. if `word.confidence < 0.70`
2. emit `LOW_CONFIDENCE` on the containing line
3. skip display-token normalization for that word
4. generate inline flag

There is currently no token classification layer. The system treats:

- low confidence

as equivalent to:

- garble-flag eligible

## Proposed Decision Tree

1. classify each token deterministically before inline-flag generation
2. preserve current low-confidence line marker behavior
3. preserve current display text and raw text behavior
4. change only inline-flag eligibility

### Proposed classes

- `FUNCTION_WORD`
- `COMMON_WORD`
- `PROPER_NOUN`
- `MEDICAL_TERM`
- `LEGAL_TERM`
- `ORGANIZATION`
- `OTHER`

### Proposed eligibility rules

- `FUNCTION_WORD`
  - never emit inline flag
- `COMMON_WORD`
  - emit inline flag only below a stricter threshold than `0.70`
- `PROPER_NOUN`
  - emit inline flag at current threshold
- `MEDICAL_TERM`
  - emit inline flag at current threshold
- `LEGAL_TERM`
  - emit inline flag at current threshold
- `ORGANIZATION`
  - emit inline flag at current threshold
- `OTHER`
  - keep current threshold behavior

## Implementation Scope

Files expected to change:

- [src/lib/format/cfe.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.ts)
- [src/lib/format/cfe.test.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/cfe.test.ts)
- [docs/audits/CFE_PHASE1_1_VALIDATION.md](/C:/Users/james/Projects/Depo-Pro/docs/audits/CFE_PHASE1_1_VALIDATION.md)

Potentially useful type addition:

- [src/lib/format/types.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/format/types.ts)

## Safety Boundaries

This phase must not change:

- `word_id`
- `raw_text`
- timestamps
- confidence values
- display text rewriting behavior
- audio sync
- persistence
- standards documents

The allowed change is:

- inline garble-flag visibility only
