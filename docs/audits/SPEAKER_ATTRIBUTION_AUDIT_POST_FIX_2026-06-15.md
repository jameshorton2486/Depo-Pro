# SPEAKER_ATTRIBUTION_AUDIT_POST_FIX

## Target

- Transcript ID: `tr_1781456706021_4bdiwu`
- Case ID: `case_20260614_esoh81`
- Raw Deepgram fixture: `docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json`
- Pre-fix audit: `docs/audits/SPEAKER_ATTRIBUTION_AUDIT_2026-06-15.md`

## Validation Method

This post-fix validation reran the normalization path against the same committed raw Deepgram fixture used in the pre-fix audit.

Measured code path:

- `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`

Measured output:

- canonical utterances produced by the current committed normalization code
- canonical words produced by the current committed normalization code

This report does **not** claim that the already-persisted live transcript rows were rewritten. It validates that the implemented assembly fix now preserves attribution correctly when the audited transcript is normalized with the current code.

## Before / After Summary

| Metric | Pre-fix | Post-fix |
|--------|---------|----------|
| Raw Deepgram utterances | `1968` | `1968` |
| Raw words | `13954` | `13954` |
| Mixed raw Deepgram utterances | `114` | `114` |
| Canonical utterances | `1968` | `2105` |
| Mixed canonical utterances | `114` | `0` |

## Primary Metric

- Before: `114`
- After: `0`

Result: `PASS`

## Required Invariants

| Invariant | Result |
|-----------|--------|
| Total word count unchanged | `PASS` |
| Speaker count unchanged | `PASS` |
| Global ordering unchanged | `PASS` |
| Word timestamps unchanged | `PASS` |
| Confidence values unchanged | `PASS` |
| Raw Deepgram attribution preserved | `PASS` |
| Speaker-pure canonical utterances only | `PASS` |
| Existing speaker-pure utterances remain unchanged except deterministic ID generation if required | `PASS` |

Measured facts:

- `normalized.words.length === 13954`
- canonical speaker count remains `8`
- every `word_index` remains globally ordered
- every normalized word preserves raw `start`, `end`, and rounded `confidence`
- every canonical utterance now satisfies `unique(word.speaker).length === 1`

## Deterministic Lineage

Lineage is now deterministic through `utterance_id` generation in `src/lib/transcript/normalize.ts`.

Examples from the audited transcript:

- first five canonical utterance IDs after the fix:
  - `utt_000000`
  - `utt_000001`
  - `utt_000001_s001`
  - `utt_000002`
  - `utt_000003`

This proves that one raw Deepgram utterance can now become multiple canonical utterances without a schema change, while preserving stable source ordering.

## Stage Table

| Stage | Pre-fix | Post-fix | Basis |
|-------|---------|----------|-------|
| Deepgram JSON | `PARTIAL` | `PARTIAL` | measured |
| Normalization | `PARTIAL` | `PASS` | measured |
| Database | `PARTIAL` | `PASS` | inferred from unchanged persistence of normalized rows |
| Workspace | `PARTIAL` | `PASS` | inferred from unchanged workspace load of normalized rows |
| Rendering | `FAILED` | `PASS` | inferred from speaker-pure canonical utterances feeding unchanged block authority |

## Why The Stage Table Changes

Measured:

- the first proven fidelity break in the pre-fix audit was normalization / assembly
- that break is removed by splitting mixed-speaker Deepgram utterances into speaker-pure canonical utterances before canonicalization
- post-fix canonical output contains `0` mixed canonical utterances

Inferred:

- `src/api/transcriptRepository.ts: insertNormalizedTranscript` persists normalized rows without introducing a new attribution collapse
- `src/api/workspaceService.ts: buildEditorDocumentFromSnapshot` loads one `speaker_id` per utterance and preserves word speaker identity
- `src/lib/buildEditorContent.ts: buildEditorContent` still uses utterance-level speaker authority, but that authority is now safe because canonical utterances are speaker-pure

## First Fidelity Break

Pre-fix:

- `Assembly`

Post-fix:

- the audited assembly-layer fidelity break is removed
- no earlier fidelity break was introduced by this change

## Final Determination

`PASS`

Reason:

- the implemented change satisfied the primary success metric: mixed canonical utterances moved from `114` to `0`
- all required invariants held
- no schema change, migration, reconstruction logic, participant matching, or AI logic was introduced
