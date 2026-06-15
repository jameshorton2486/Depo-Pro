# LIMITED TRANSCRIPT REASSEMBLY ENGINE — VALIDATION

Date: 2026-06-15
Branch: `feature/stage3-workspace-core`
Authoritative prompt: [PROMPT_LIMITED_TRANSCRIPT_REASSEMBLY_ENGINE.md](/abs/path/C:/Users/james/projects/depo-pro/docs/prompts/speaker-resolution/PROMPT_LIMITED_TRANSCRIPT_REASSEMBLY_ENGINE.md)

## Commit Series

1. Characterization / lifecycle tests: `196f25c7137236ea8886e8e0c6090b487165d764`
2. Candidate reassembly preview + explicit apply flow: `586fae7f6b8490c47c8b14c6a0fae12d4a6d253c`
3. Validation report: this commit

## Scope Confirmed

Implemented capability is limited to:

- transcript-scoped rebuild only
- raw Deepgram JSON as source of truth
- preview before apply
- explicit apply only
- blocked when review state exists
- blocked when suggestions exist
- blocked when certification exists
- blocked when exports exist

Explicitly not implemented:

- bulk rebuilds
- case-wide rebuilds
- automatic rebuilds
- certification mutation
- export mutation
- audit-history rewrites
- silent review-state carry-forward
- silent suggestion carry-forward

## Validation Targets

| Transcript ID | Case ID | Current Mixed Canonical Utterances | Candidate Mixed Canonical Utterances | Current Utterance Count | Candidate Utterance Count | Speaker Count | Word Count |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `tr_1781456706021_4bdiwu` | `case_20260614_esoh81` | 114 | 0 | 1968 | 2105 | 8 -> 8 | 13954 -> 13954 |
| `tr_1781563788609_b38j6p` | `case_20260615_6f2vam` | 112 | 0 | 1972 | 2112 | 8 -> 8 | 13939 -> 13939 |

## Evidence

### Transcript `tr_1781456706021_4bdiwu`

- Current persisted state from [TRANSCRIPT_REASSEMBLY_AUDIT.md](/abs/path/C:/Users/james/projects/depo-pro/docs/audits/TRANSCRIPT_REASSEMBLY_AUDIT.md):
  - mixed canonical utterances: `114`
  - utterances: `1968`
  - speakers: `8`
  - words: `13954`
- Candidate state recomputed from preserved raw Deepgram JSON fixture at [tr_1781456706021_4bdiwu_deepgram_response.json](/abs/path/C:/Users/james/projects/depo-pro/docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json) through [normalizeTranscriptResponse](/abs/path/C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:155) and [buildNormalizedTranscriptMetrics](/abs/path/C:/Users/james/projects/depo-pro/src/lib/transcript/reassembly.ts:130):
  - mixed Deepgram utterances: `114`
  - mixed canonical utterances: `0`
  - utterances: `2105`
  - speakers: `8`
  - words: `13954`

### Transcript `tr_1781563788609_b38j6p`

- Current persisted state from [TRANSCRIPT_REASSEMBLY_AUDIT.md](/abs/path/C:/Users/james/projects/depo-pro/docs/audits/TRANSCRIPT_REASSEMBLY_AUDIT.md):
  - mixed canonical utterances: `112`
  - utterances: `1972`
  - speakers: `8`
  - words: `13939`
- Candidate state recomputed from the preserved raw Deepgram storage object named in [TRANSCRIPT_REASSEMBLY_AUDIT.md](/abs/path/C:/Users/james/projects/depo-pro/docs/audits/TRANSCRIPT_REASSEMBLY_AUDIT.md), downloaded read-only for validation, then processed through [normalizeTranscriptResponse](/abs/path/C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:155) and [buildNormalizedTranscriptMetrics](/abs/path/C:/Users/james/projects/depo-pro/src/lib/transcript/reassembly.ts:130):
  - mixed Deepgram utterances: `112`
  - mixed canonical utterances: `0`
  - utterances: `2112`
  - speakers: `8`
  - words: `13939`

## Invariants

Verified for both audited transcripts:

- total word count unchanged
- speaker count unchanged
- canonical ordering remains deterministic under current normalization
- candidate preview is computed from raw Deepgram JSON, not persisted canonical rows
- preview metrics do not mutate live transcript state

## Guard Validation

Guard logic is implemented in [evaluateReassemblyEligibility](/abs/path/C:/Users/james/projects/depo-pro/src/lib/transcript/reassembly.ts:69) and exercised through preview/apply routes in:

- [workspaceService.ts](/abs/path/C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:1012)
- [editor-api/index.ts](/abs/path/C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:1421)

Characterization tests cover:

- certified transcript block
- export-locked transcript block
- existing review-state block
- existing suggestions block
- preview token enforcement

## Test Verification

- `npm run test`
  - `68` files passed
  - `330` tests passed
- `npm run typecheck`
  - passed

## Lifecycle Safety Outcome

Validation was preview-first and non-mutating against the audited transcripts.

No rebuild was applied during validation.

The engine remains bounded to candidate-first promotion semantics:

1. compute candidate transcript state from preserved raw Deepgram JSON
2. compute before/after metrics and downstream impacts
3. require explicit user acceptance
4. only then replace transcript-derived rows and append an audit event

## Final Determination

PASS

- audited target `tr_1781456706021_4bdiwu`: `114 -> 0`
- audited target `tr_1781563788609_b38j6p`: `112 -> 0`
- no invariant violations detected
- limited-scope lifecycle guards remain intact
