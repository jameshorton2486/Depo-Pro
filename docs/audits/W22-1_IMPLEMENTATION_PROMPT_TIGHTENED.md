# DEPO-PRO — W22-1 IMPLEMENTATION PROMPT (Tightened After Audit)

Branch: `feature/stage3-workspace-core`

Freeze: `BETA_FREEZE` active

Mode: implementation

## Audit-Derived Scope Lock

The Phase 0 audit in [W22-1_INTAKE_AUDIT_2026-07-06.md](C:\Users\james\projects\depo-pro\docs\audits\W22-1_INTAKE_AUDIT_2026-07-06.md) established:

- `normalizeTranscriptResponse(...)` already exists and already derives `utterance.text` from canonical words.
- `integrityAudit.ts` exists, but only audits raw Deepgram payload shape/timing and does not enforce canonical transcript invariants after merge.
- `boundaryEngine.ts` exists and should be reused, not rebuilt.
- the real missing W22-1 capability is a canonical finalize gate after merge and before completion.
- the current finalize order is wrong because the job is marked `complete` before boundary processing runs.

Therefore W22-1 must build only:

1. a canonical transcript integrity checker on merged normalized output
2. completion gating on successful boundary processing
3. overlap-risk diagnostics sufficient to surface integrity risk
4. finalize-order gating around that checker as a separate commit slice

Do NOT build:

- a new normalization engine
- a new boundary engine
- an auto-chunk redesign
- any metadata/speaker/QA/lexical/punctuation/render logic

## Required Changes

### 1. Canonical Integrity Gate

Add a canonical integrity audit module that validates merged normalized transcript data before ingest/finalize succeeds.

Required invariants:

- `utterance.text == join(words.raw_text ordered by word_index within utterance)`
- no orphan words
- no empty non-synthetic utterances
- contiguous monotonic `word_index`
- monotonic canonical word timing
- explicit detection of suspicious duplicate canonical spans after merge
- warning when a single-source finalize exceeds the auto-chunk threshold

This is a canonical-data gate, not a raw Deepgram payload gate.

### 2. Finalize Ordering

Reorder callback finalize so:

1. merge canonical normalized output
2. run canonical integrity gate
3. if gate fails, route to manual-review/failure handling
4. ingest transcript
5. run boundary engine
6. if boundary engine fails, route to manual-review/failure handling
7. only then mark job `complete`
8. trigger AI review last

This finalize reorder is the riskiest W22-1 change. Implement it as its own scoped
commit, separate from the integrity-gate module and failure-routing changes, so it has
an independent revert path.

### 3. Failure Routing

If canonical integrity fails:

- do not silently finalize
- persist only the minimum transcript summary needed for review visibility
- do not persist invalid canonical word/utterance rows
- mark job with explicit `NEEDS_MANUAL_REVIEW` reason

If boundary processing fails after ingest:

- clean up only the canonical rows ingested for that specific failing `job_id`
- never delete or touch canonical rows belonging to any other job
- persist the review-visible transcript summary
- mark job with explicit `NEEDS_MANUAL_REVIEW` reason
- do not mark job `complete`

### 4. Tests

Required tests:

- oversized utterance-text canonical mismatch
- normalized clean transcript passes
- orphan word detection
- suspicious duplicate-span detection
- single-source-over-threshold warning
- multifile finalize pass-through for `needs_manual_review`
- existing normalize / merge / boundary regressions remain green

## Explicit Non-Goals

- no schema changes
- no new dependencies
- no historical backfill
- no workspace/render/export work
- no speaker resolution
- no Q/A reconstruction
- no lexical correction
- no punctuation work
- no auto-chunk redesign

## Commits

Use two scoped commits:

1. `fix: harden canonical transcript intake integrity gate`
2. `fix: reorder transcript finalize after canonical and boundary gates`
