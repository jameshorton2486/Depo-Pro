# CFE Phase 1.1 Validation

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`

## Scope

This validation checks the Phase 1.1 inline-flag classification change against:

- `etminan_response.json`

The implementation changes:

- garble-flag eligibility only

The implementation does not change:

- `word_id`
- `raw_text`
- timestamps
- confidence values
- transcript text rewriting behavior

## Baseline Counts

Source:

- [docs/audits/CFE_PHASE1_1_FLAG_AUDIT.md](/C:/Users/james/Projects/Depo-Pro/docs/audits/CFE_PHASE1_1_FLAG_AUDIT.md)

Baseline total inline flags:

- `499`

Baseline counts by class:

| Class | Baseline Count |
|---|---:|
| `FUNCTION_WORD` | 272 |
| `COMMON_WORD` | 46 |
| `PROPER_NOUN` | 25 |
| `MEDICAL_TERM` | 9 |
| `LEGAL_TERM` | 2 |
| `ORGANIZATION` | 3 |
| `OTHER` | 142 |

## Final Counts

Final total inline flags:

- `181`

Reduction:

- `318` fewer flags
- `63.7%` reduction

Final counts by class:

| Class | Final Count |
|---|---:|
| `FUNCTION_WORD` | 0 |
| `COMMON_WORD` | 7 |
| `PROPER_NOUN` | 23 |
| `MEDICAL_TERM` | 8 |
| `LEGAL_TERM` | 2 |
| `ORGANIZATION` | 8 |
| `OTHER` | 133 |

## Before / After Summary

| Class | Before | After | Change |
|---|---:|---:|---:|
| `FUNCTION_WORD` | 272 | 0 | -272 |
| `COMMON_WORD` | 46 | 7 | -39 |
| `PROPER_NOUN` | 25 | 23 | -2 |
| `MEDICAL_TERM` | 9 | 8 | -1 |
| `LEGAL_TERM` | 2 | 2 | 0 |
| `ORGANIZATION` | 3 | 8 | +5 |
| `OTHER` | 142 | 133 | -9 |

## Examples Removed

These tokens were low-confidence before but no longer emit inline flags:

- `Will` (`FUNCTION_WORD`, confidence `0.1885`)
- `be` (`FUNCTION_WORD`, confidence `0.2898`)
- `the` (`FUNCTION_WORD`, confidence `0.6260`)
- `and` (`FUNCTION_WORD`, confidence `0.5591`)
- `as` (`FUNCTION_WORD`, confidence `0.2500`)
- `a` (`FUNCTION_WORD`, confidence `0.4890`)
- `remote` (`COMMON_WORD`, confidence `0.6909`)
- `essentially` (`COMMON_WORD`, suppressed unless extremely low)

## Examples Preserved

These tokens still emit inline flags after Phase 1.1:

- `Rico` (`PROPER_NOUN`, confidence `0.4922`)
- `Laura` (`PROPER_NOUN`, confidence `0.4617`)
- `PLLC,` (`ORGANIZATION`, confidence `0.5285`)
- `PLLC` (`ORGANIZATION`, confidence `0.5491`)
- `witness` (`LEGAL_TERM`, confidence `0.5615`)
- `disc` (`MEDICAL_TERM`, preserved elsewhere in the fixture and tests)
- `Malley` (`PROPER_NOUN`, confidence `0.5820`)

## Safety Checks

Verified on the formatted Etminan output:

- `word_id` unchanged -> `PASS`
- `raw_text` unchanged -> `PASS`
- timestamps unchanged -> `PASS`
- confidence unchanged -> `PASS`
- no transcript content rewritten by Phase 1.1 -> `PASS`

## Regression Risks

### 1. `OTHER` still carries meaningful residual noise

The biggest remaining volume is now `OTHER`, not `FUNCTION_WORD`.

Observed preserved examples:

- `corporal`
- `license`
- `number`
- `notice`
- `standing`
- `licensed`

This is acceptable for Phase 1.1 because the task was scoped to signal-to-noise improvement, not full domain classification completeness. But it means a later Phase 1.2 could further refine:

- domain-word recognition
- number / identifier treatment
- reporter shorthand / discourse artifact handling

### 2. Organization detection is intentionally broad

All-caps or suffix-style tokens now remain eligible:

- `PLLC`
- `PLLC,`

This is desirable for the current corpus, but it may preserve some harmless acronym noise in other transcripts.

### 3. Proper-noun detection is deterministic but conservative

Title-case tokens are treated as eligible after stopword/common-word filtering. This preserves names well, but it may still retain a small number of capitalized sentence-initial words that are not true names.

## Verification Gate

- `npm run test` -> pass (`53` files, `272` tests)
- `npm run typecheck` -> pass
- `npm run build` -> pass

## Bottom Line

Phase 1.1 achieved the target outcome:

- substantially fewer inline flags
- preserved proper nouns, medical terms, legal terms, and organization markers
- no transcript-payload mutation

The primary noise source identified in the audit:

- low-confidence function words

has been eliminated from inline-flag output.
