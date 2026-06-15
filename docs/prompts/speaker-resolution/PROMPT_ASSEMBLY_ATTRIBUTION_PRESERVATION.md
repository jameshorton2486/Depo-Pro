# PROMPT — ASSEMBLY ATTRIBUTION PRESERVATION

## Goal

Preserve existing word-level speaker attribution during canonical transcript assembly.

This prompt is **not** about improving attribution.

This prompt is about stopping the assembly layer from destroying attribution that already exists in the raw Deepgram response.

Current failure mode:

```text
Deepgram raw response
  word-level speaker attribution exists
    ↓
assembly / normalization
  mixed-speaker Deepgram utterance becomes one canonical utterance
    ↓
downstream rendering treats one utterance speaker as authoritative
```

Target behavior:

```text
Deepgram raw response
  mixed-speaker utterance
    ↓
normalization detects word.speaker transitions
    ↓
canonical utterance stream is split into speaker-pure segments
    ↓
downstream rendering receives preserved attribution instead of collapsed attribution
```

## Locked Inputs From The Audit

These findings are **locked** and must be treated as prerequisites, not rediscovered by changing scope:

1. Audited real transcript: `tr_1781456706021_4bdiwu`
2. Case: `case_20260614_esoh81`
3. Raw Deepgram response is preserved and retrievable.
4. The system currently treats `results.utterances` as canonical in:
   - `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`
5. The audited real transcript contains `114` Deepgram utterances with multiple `word.speaker` values.
6. Those mixed-speaker utterances survive into the stored database and become degraded block-level speaker authority downstream.
7. The audit’s single primary locus is:
   - **Assembly**

Do not broaden this prompt into:

- a reconstruction engine
- participant matching
- role inference
- speaker reassignment redesign
- Stage S work
- export changes
- UI redesign

## Scope

Allowed:

- characterization tests
- normalization / assembly changes
- deterministic utterance splitting
- audit rerun / before-after validation

Disallowed:

- schema changes
- migrations
- AI logic
- participant matching
- speaker correction heuristics
- role inference changes
- overlay architecture changes
- export formatting changes
- reassignment changes

## Required Development Shape

Implement in **three commits**, in order:

1. **Characterization tests**
2. **Normalization / assembly change**
3. **Audit re-validation**

Do not compress these into one commit.

## Task 0 — Re-verify Before Touching Code

Before implementation, verify and report:

1. `src/lib/transcript/normalize.ts: normalizeTranscriptResponse` still selects:

   ```ts
   const sourceUtterances = response.results.utterances?.length
     ? response.results.utterances
     : buildFallbackUtterances(sourceWords);
   ```

2. The audited transcript still has mixed-speaker raw utterances available in the downloaded raw response.
3. No later code has already solved this problem.

If any of the above are false, STOP and report.

## Required Behavior Change

For each Deepgram utterance:

- if `unique(word.speaker).length === 1`
  - leave it unchanged
- if `unique(word.speaker).length > 1`
  - split it into multiple **speaker-pure** canonical utterances at each word-level speaker transition

Example:

Raw Deepgram utterance:

```text
utterance speaker = 0
words speaker stream = 0 0 1 1 0
```

Required normalized output:

```text
canonical utterance A -> speaker 0
canonical utterance B -> speaker 1
canonical utterance C -> speaker 0
```

## Determinism And Lineage

This must preserve deterministic lineage back to the original raw Deepgram utterance even without a schema change.

Requirements:

- generated canonical utterance IDs must be deterministic
- generated IDs / ordering must allow a reviewer to prove that one raw Deepgram utterance became multiple canonical utterances
- ordering must remain sufficient to reconstruct:

```text
Raw utterance #57
  -> Canonical 57a
  -> Canonical 57b
  -> Canonical 57c
```

Do this through deterministic generation and ordering only.

Do **not** add schema columns for lineage in this prompt.

## Must Preserve

The change must preserve:

- word order
- global utterance order
- word IDs
- word timestamps
- utterance timestamps derived from the same contiguous speaker-pure word segments
- word confidence
- word speaker confidence if already available in the raw source and local types
- raw speaker identity
- overall speaker count
- total word count
- transcript text stream

## Must Not Change

The change must **not** change:

- schema
- migrations
- storage layout
- save paths
- speaker overlay architecture
- participant mapping architecture
- export behavior
- Stage S logic
- reconstruction logic

## Acceptance Criteria

These are binary gates.

### Fidelity Gates

1. Every canonical utterance after normalization must satisfy:

   ```text
   unique(word.speaker).length === 1
   ```

2. If **any** canonical utterance still contains multiple `word.speaker` values after normalization, the build is **FAILED**.

### Preservation Gates

3. Concatenating the post-change canonical utterances in order must reproduce the same word stream as before.
4. Total word count must remain unchanged.
5. Speaker count must remain unchanged.
6. Global ordering must remain unchanged.
7. Word timestamps must remain unchanged.
8. No words may be dropped, duplicated, or reordered.

### Blast-Radius Gates

9. No schema diff.
10. No migration files created or changed.
11. No export or reconstruction behavior changes in this prompt.

## Required Tests

### Commit 1 — Characterization Tests

Add tests that prove the current failure mode using the audited real transcript shape.

At minimum:

1. A mixed-speaker Deepgram utterance currently normalizes into one canonical utterance.
2. A speaker-pure Deepgram utterance remains unchanged.
3. The current normalized output can contain canonical utterances whose words span multiple speakers.

### Commit 2 — Normalization Change Tests

After the implementation:

1. Mixed-speaker Deepgram utterances split into speaker-pure canonical utterances.
2. Speaker-pure Deepgram utterances remain byte-equivalent except for deterministic generated IDs where required.
3. Word stream before/after remains identical.
4. Ordering remains identical.
5. Speaker count remains identical.
6. Total word count remains identical.

### Commit 3 — Audit Re-validation

Rerun the same audit logic against the same transcript target:

- `tr_1781456706021_4bdiwu`

Provide before/after comparison for:

- speaker counts at each stage
- number of mixed-speaker canonical utterances after normalization
- exact PASS / PARTIAL / FAILED stage table
- whether the first fidelity break moved forward or disappeared

## Expected Outcome

The expected post-change shape is approximately:

```text
Deepgram JSON        PARTIAL
Normalization        PASS
Database             PASS
Workspace            PASS
Rendering            PASS
```

This is an expectation, not a license to force the result.

If the audit rerun disproves that expectation, report it plainly.

## Deliverables

1. Three commits:
   - characterization tests
   - normalization / assembly change
   - audit re-validation
2. Updated `SPEAKER_ATTRIBUTION_AUDIT.md`
3. Verification block with:
   - before/after test counts
   - typecheck result
   - confirmation that no schema or migration changes were made
   - exact count of mixed-speaker canonical utterances before and after

## Stop Conditions

STOP and report instead of improvising if:

1. Fixing the issue would require a schema change.
2. Fixing the issue would require reconstruction heuristics rather than deterministic assembly splitting.
3. The audited transcript’s raw Deepgram response is no longer available.
4. Another earlier fidelity break is discovered that invalidates the audit’s conclusion that assembly is first.

## Final Constraint

Do not solve a bigger problem than the one proved by the audit.

This prompt is only for **preserving existing attribution evidence** during assembly.
