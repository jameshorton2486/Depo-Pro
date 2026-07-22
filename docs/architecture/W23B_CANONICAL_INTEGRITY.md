# Wave 23B — Canonical Integrity Expansion

**Status:** Implemented by this PR after merge.
**Owner:** `src/lib/transcript/canonicalIntegrity.ts`.

## Summary

Adds a read-only canonical transcript gate after normalization/merge and before ingest.
Invalid canonical state is quarantined as `needs_manual_review`; this PR does not alter
transcript text, speakers, paragraph structure, or formatting.

## Transcript Impact

| Measure | Before | After | Evidence |
|---|---|---|---|
| Recognition | No change | No change | No STT request or model change. |
| Semantic integrity | Partial checks | Stronger validation | Regression tests cover orphan references, duplicates, and timing. |
| Production | No change | No change | Proceedings, examination, and dialogue are deferred. |
| Formatting | No change | No change | No formatter or geometry module changed. |
| Reporter repair burden | High for malformed input | Reduced | Invalid canonical rows are quarantined before workspace ingest. |

## Canonical Failure Examples

**Before:** an utterance starts at `31.5s`, while a source word begins at `30.2s`.

**After:** canonical integrity returns `FAIL` with a timing-bound diagnostic; the
transcript is persisted as `needs_manual_review` and never enters the workspace.

## Architectural Impact

- **Owner:** `canonicalIntegrity.ts` owns post-normalization and post-merge validation.
- **Consumer:** `transcribe-callback` invokes the gate as orchestration before ingest.
- **Ownership changes:** none.
- **Duplicate logic removed:** none.

## Ownership Verification

| Responsibility | Owner | Verified |
|---|---|---|
| Raw payload validation | `integrityAudit.ts` | ✅ |
| Canonical transcript validation | `canonicalIntegrity.ts` | ✅ |
| Transcript reconstruction | Not in this PR | ✅ |
| Proceedings | Deferred | ✅ |
| Speaker resolution | Deferred | ✅ |
| Geometry | Deferred | ✅ |
| AI review | Deferred | ✅ |

## Validation and Exit Criteria

Regression coverage verifies orphan words and utterances, duplicate speaker/utterance/word IDs,
invalid or reversed timing, ordinal continuity, timing coherence, duplicate spans, and chunk warnings.
A failed canonical gate is quarantined before `ingestTranscript`.

## Deferred Work

Not addressed by this PR: Proceedings, Examination, Dialogue, Speaker Resolution, Entity Registry,
Geometry, Punctuation, and AI review. Those responsibilities remain with PRs #8–#11 and later work.