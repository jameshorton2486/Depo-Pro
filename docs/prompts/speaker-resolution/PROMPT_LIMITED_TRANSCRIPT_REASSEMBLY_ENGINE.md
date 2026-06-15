# PROMPT — LIMITED TRANSCRIPT REASSEMBLY ENGINE

## Goal

Build a **limited** transcript reassembly engine that allows an operator to preview and explicitly apply the latest deterministic assembly logic to an existing transcript **without retranscribing audio**.

This is **not** a general rebuild engine.

This is **not** an automatic upgrade system.

This is a transcript-scoped, preview-first, explicit-apply workflow for non-certified, non-export-locked transcripts only.

## Locked Inputs

This prompt is downstream of:

- `docs/audits/TRANSCRIPT_REASSEMBLY_AUDIT.md`
- `docs/audits/SPEAKER_ATTRIBUTION_AUDIT_2026-06-15.md`
- `docs/audits/SPEAKER_ATTRIBUTION_AUDIT_POST_FIX_2026-06-15.md`

Locked conclusions:

1. Raw Deepgram JSON is the authoritative rebuild source.
2. `transcript_words` alone are insufficient for highest-fidelity general rebuild.
3. Rebuild is feasible, but should be **limited**.
4. Safest model is:
   - side-by-side preview
   - explicit apply
   - no in-place first mutation
5. Immediate value already exists:
   - `tr_1781456706021_4bdiwu` has `114` stale mixed canonical utterances
   - `tr_1781563788609_b38j6p` has `112` stale mixed canonical utterances

## Branch

`feature/stage3-workspace-core`

## Scope

Allowed:

- load preserved raw Deepgram JSON for one transcript
- run latest deterministic normalization / assembly logic against it
- produce a candidate rebuilt transcript
- compute before/after metrics
- preview the candidate before commit
- explicitly apply the candidate only after user acceptance
- replace transcript-derived rows only where required by rebuilt canonical structure:
  - `transcript_speakers`
  - `transcript_utterances`
  - `transcript_words` if canonical relinking requires it
- append rebuild events to audit history

Forbidden:

- certification changes
- export changes
- audit-history rewrites
- automatic rebuilds
- case-wide rebuilds
- bulk rebuilds
- review-state mutation without an explicit rule
- suggestion mutation without an explicit rule
- speaker reconstruction logic
- AI / LLM logic
- schema changes
- migrations

## Hard Safety Rule

**A rebuild never mutates the existing transcript first.**

The engine must:

1. create a candidate rebuilt transcript state
2. compute preview metrics and impacts
3. require explicit user acceptance
4. only then promote the candidate

Do not implement any path that rewrites the live transcript before preview.

## Gating Rules

V1 must support only transcripts that are:

- transcript-scoped
- non-certified
- non-export-locked

If any transcript is certified, export-locked, or otherwise blocked by downstream lifecycle state, STOP and report rather than weakening the guard.

## Required UX Shape

The UI does not need to be polished, but the workflow must expose:

### Entry

For one transcript:

- current assembly version
- latest assembly version
- improvements available
- `Preview Rebuild`

### Preview

Preview must report:

- Mixed Utterances
  - Before: `X`
  - After: `Y`
- Utterance Count
  - Before: `X`
  - After: `Y`
- Speaker Count
  - Before: `X`
  - After: `Y`
- Review State Impact
- Suggestions Impact
- Audit Impact

And must expose:

- `Apply`
- `Cancel`

### Apply

Apply must only be available after preview completes successfully.

## Review State / Suggestion Rules

You may **not** silently mutate review-state or suggestion semantics.

For V1:

- if review-state preservation is not provably safe, mark review-state impact explicitly and block or invalidate with a logged rule
- if suggestions cannot be safely remapped, mark suggestions as stale and require explicit invalidation rather than silent carry-forward

Do not guess.
Do not “best effort” hidden remaps.

If preservation cannot be made deterministic, prefer:

- explicit invalidation
- explicit user-visible impact report

## Task 0 — Audit Re-verify

Before coding, verify and report:

1. `docs/audits/TRANSCRIPT_REASSEMBLY_AUDIT.md` still supports `BUILD LIMITED REASSEMBLY ENGINE`
2. raw Deepgram response objects still exist for:
   - `tr_1781456706021_4bdiwu`
   - `tr_1781563788609_b38j6p`
3. current rebuild-relevant downstream state still matches the audit assumptions:
   - review-state
   - suggestions
   - certification
   - exports
4. no newer code has already introduced transcript rebuild infrastructure

If any of these are false, STOP and report.

## Required Architecture

Build the engine in bounded layers.

### Layer 1 — Candidate Reassembly Core

Given:

- transcript id
- preserved raw Deepgram JSON

Produce:

- candidate normalized transcript using latest assembly logic
- before/after metrics
- impact assessment

This layer must be deterministic and pure.

### Layer 2 — Lifecycle Guard

Before any apply:

- verify transcript is allowed for rebuild
- reject certified transcripts
- reject export-locked transcripts
- report review/suggestion impacts

### Layer 3 — Explicit Apply

Only after preview acceptance:

- replace the transcript-derived canonical rows
- preserve append-only auditability
- never erase existing audit history

## Required Metrics

At minimum every preview must compute:

1. mixed canonical utterances before/after
2. utterance count before/after
3. speaker count before/after
4. word count before/after
5. review-state impact
6. suggestion impact
7. certification/export block status

## Required Validation Targets

Use the audited real transcripts:

- `tr_1781456706021_4bdiwu`
- `tr_1781563788609_b38j6p`

The first target must demonstrate:

- mixed canonical utterances: `114 -> 0`

The second target must demonstrate:

- mixed canonical utterances: `112 -> 0`

If those numbers do not clear in preview, the build is **FAILED**.

## Required Commit Shape

Implement in ordered commits:

1. characterization / lifecycle tests
2. candidate reassembly core
3. preview metrics + guard layer
4. explicit apply path
5. validation report

Do not compress everything into one commit.

## Required Tests

At minimum:

### Characterization

- blocked when certified
- blocked when export-locked
- blocked or explicitly flagged when stale downstream state cannot be preserved safely

### Candidate Reassembly

- candidate uses raw Deepgram JSON, not persisted `transcript_utterances`, as source of truth
- candidate runs latest normalization / assembly logic
- word count preserved
- ordering preserved
- speaker count preserved where expected

### Preview

- preview reports before/after metrics correctly
- preview reports downstream impacts
- preview does not mutate live transcript state

### Apply

- apply is impossible without preview
- apply appends audit event
- apply replaces only the intended canonical transcript rows
- apply never rewrites certification/export state

## Deliverables

1. committed implementation series
2. validation report against both audited real transcripts
3. before/after metrics for each target
4. final PASS/FAIL block

## Stop Conditions

STOP and report if:

1. raw Deepgram JSON is unavailable for a target transcript
2. safe preview-before-apply cannot be achieved without schema changes
3. review-state or suggestion handling cannot be made explicit and deterministic
4. certification/export lock detection cannot be implemented safely in current architecture
5. the engine would need to mutate live transcript state before preview

## Final Constraint

This prompt is for a **limited reassembly engine**, not a universal transcript upgrade platform.

Build the smallest safe capability that:

- previews rebuilt transcript state from raw preserved data
- applies only after explicit user approval
- protects certified/export-locked transcripts
- makes downstream impact visible instead of guessing
