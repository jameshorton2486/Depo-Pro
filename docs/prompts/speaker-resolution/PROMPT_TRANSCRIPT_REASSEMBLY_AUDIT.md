# PROMPT — TRANSCRIPT REASSEMBLY AUDIT

## Title

Read-only investigation before building transcript rebuild infrastructure.

## Branch

`feature/stage3-workspace-core`

## Mode

`AUDIT ONLY`

No code changes.
No schema changes.
No migrations.
No implementation.

## Objective

Determine whether existing transcripts can be safely and deterministically rebuilt using newer transcript assembly logic **without rerunning Deepgram transcription**.

The goal is to establish whether DEPO-PRO can support:

`Apply Latest Assembly Logic`

against already-transcribed jobs.

## Locked Context

These findings are already established and must be treated as locked context unless the audit proves they no longer hold:

1. Raw Deepgram responses are preserved and retrievable for at least some completed transcripts.
2. `transcript_words` preserve word-level speaker attribution.
3. The speaker-attribution audit identified **Assembly** as the first proven attribution fidelity break.
4. The Assembly Attribution Preservation change reduced:
   - mixed canonical utterances: `114 -> 0`
5. That change preserved:
   - word count
   - speaker count
   - ordering
   - timestamps
   - confidence

Question now:

Can the same principle be generalized into a transcript rebuild engine?

## Audit Targets

Use one locked real transcript:

- transcript_id: `tr_1781456706021_4bdiwu`
- case_id: `case_20260614_esoh81`

And at least one additional completed real transcript.

Do **not** use:

- mocks
- offline fixtures
- unit-test fixtures
- seeded demo transcripts

## Audit Gate

Before continuing, confirm for each selected transcript:

1. transcript exists and completed successfully
2. original raw Deepgram response can be located
3. current persisted transcript rows can be loaded
4. transcript is not a mock or fixture

Record:

- transcript_id
- case_id
- job_id
- source audio filename
- raw Deepgram response path

If a raw Deepgram response cannot be located for a selected transcript, STOP and report.

## Required Questions

### 1. Source-of-Truth Audit

For each completed transcript, determine the highest-fidelity source still available.

Rank these sources:

- Raw Deepgram JSON
- `transcript_words`
- `transcript_utterances`
- `EditorDocument`
- export artifacts

For each source, report:

- location
- persistence
- completeness
- rebuild suitability

### 2. Rebuild Feasibility

Determine whether `transcript_words` alone can recreate:

- canonical utterances
- speaker attribution
- utterance ordering
- timestamps
- confidence
- transcript geometry

Answer:

- `YES`
- `NO`

with evidence.

### 3. Dependency Audit

Identify every normalization / assembly stage that currently runs during ingest.

For each stage, report:

- file
- symbol
- purpose
- deterministic?
- reusable during rebuild?

Required table:

| Stage | File | Symbol | Deterministic | Reusable |
|------|------|--------|---------------|----------|

### 4. Persistence Audit

Determine what tables would change during rebuild.

Analyze:

- `transcripts`
- `transcript_speakers`
- `transcript_utterances`
- `transcript_words`
- `transcript_review_state`
- `transcript_suggestions`
- `transcript_audit_log`

For each table, classify:

- must rebuild
- must preserve
- must invalidate
- unknown

### 5. Speaker Attribution Audit

Determine whether speaker attribution can be fully regenerated from:

- `transcript_words`
- or raw Deepgram response

without retranscription.

Answer:

- `YES`
- `NO`

with evidence.

### 6. Future-Proofing Audit

Determine whether future assembly fixes could be applied through rebuild.

Examples:

- speaker attribution
- interruption handling
- objection handling
- colloquy grouping
- parenthetical handling
- Stage S geometry

For each example, answer:

- `YES`
- `NO`

with explanation.

### 7. Blast Radius Analysis

Choose exactly one safest rebuild model:

- `A. Rebuild in place`
- `B. Create replacement transcript version`
- `C. Side-by-side preview then commit`
- `D. Other`

Provide rationale.

### 8. Rebuild Trigger Design

Determine whether rebuild should support:

- single transcript
- case-wide
- bulk admin
- automatic on version change

Provide recommendation and reasoning.

## Evidence Requirements

Use real repository and live-data evidence only.

For every conclusion, provide:

- file:symbol references
- concrete table names
- concrete transcript IDs
- exact source path when available

Distinguish:

- proven facts
- inferences

## Required Output

Create:

`TRANSCRIPT_REASSEMBLY_AUDIT.md`

The report must include:

1. selected transcript set
2. audit gate status
3. source-of-truth ranking
4. rebuild-feasibility finding
5. dependency table
6. persistence table
7. blast-radius recommendation
8. final build / do-not-build recommendation

## Final Recommendation

Choose exactly one:

- `BUILD REASSEMBLY ENGINE`
- `BUILD LIMITED REASSEMBLY ENGINE`
- `DO NOT BUILD`

No hybrid answer.

The final recommendation must include:

- feasibility
- risk
- blast radius
- estimated implementation complexity

## Stop Conditions

STOP and report if:

1. `transcript_words` are insufficient to rebuild deterministically
2. raw Deepgram responses are unavailable
3. rebuild would require retranscription
4. rebuild would destroy auditability
5. rebuild would invalidate certified transcripts

## Final Constraint

This is an audit prompt, not a build prompt.

Do not design implementation details beyond what is necessary to decide:

- whether a rebuild engine should exist
- what rebuild model is safest
- whether the preserved data is sufficient to support it
