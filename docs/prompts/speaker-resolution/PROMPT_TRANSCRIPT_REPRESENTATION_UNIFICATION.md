# TRANSCRIPT REPRESENTATION UNIFICATION

## Branch

`feature/stage3-workspace-core`

## Mode

Implementation

## Goal

Unify workspace and export so they consume one canonical transcript paragraph representation for the same transcript.

This is not a fidelity-improvement prompt.

This is not a reconstruction prompt.

This is a representation-unification prompt.

The objective is:

One transcript
→ one paragraph model
→ shared by workspace and export

## Authoritative Inputs

- [TRANSCRIPT_SOURCE_OF_TRUTH_AUDIT.md](/abs/path/C:/Users/james/Projects/Depo-Pro/docs/audits/TRANSCRIPT_SOURCE_OF_TRUTH_AUDIT.md)
- [TRANSCRIPT_FIDELITY_GAP_AUDIT.md](/abs/path/C:/Users/james/Projects/Depo-Pro/docs/audits/TRANSCRIPT_FIDELITY_GAP_AUDIT.md)
- Transcript validation fixture:
  - `tr_1781559088619_7rch7i`

## Proven Problem

The source-of-truth audit proved:

- workspace and export read the same persisted transcript rows
- workspace and export do not share one paragraph engine
- workspace currently derives semantic structure from:
  - `buildEditorContent(...)`
  - `buildWorkspaceParagraphs(...)`
- export currently derives semantic structure from:
  - `buildStageSDocxParagraphSpecs(...)`
  - `renderStageS(...)`

For the same transcript:

- workspace semantic lines: `2134`
- export semantic lines: `2119`
- first divergence index: `0`

Workspace currently contains transcript intelligence that export discards.

## Required Decision

Choose one canonical paragraph model.

Recommended direction:

Workspace paragraph model becomes truth.

Export consumes that same paragraph model.

Do not keep parallel workspace/export paragraph engines after this task.

If implementation proves the opposite direction is safer, document the reason explicitly and still end with exactly one canonical model.

## In Scope

- define one shared paragraph representation for transcript rendering
- make workspace and export consume the same paragraph model
- preserve current transcript text content
- preserve current deterministic speaker identity resolution
- preserve current review/edit persistence behavior
- preserve current transcript IDs / word IDs / utterance IDs
- add validation proving workspace/export parity for the same transcript

## Out of Scope

Do not introduce:

- Q/A reconstruction improvements
- new speaker identity heuristics
- new speaker mapping behavior
- transcript geometry redesign
- procedural reconstruction improvements
- pagination improvements
- UFM formatting expansion
- certification logic changes
- PDF changes
- AI inference
- schema changes
- migrations

## Architectural Rules

1. One transcript representation only.
2. Export must not independently reclassify the same transcript if workspace already classified it.
3. Identity and presentation remain separate.
4. Word-level and utterance-level persisted data remain unchanged by this task.
5. This task unifies representation; it does not improve transcript intelligence.

## Expected Shape

Create or identify a shared paragraph-model layer that can represent at least:

- `COLLOQUY`
- `Q`
- `A`
- `PARENTHETICAL`
- `BY_LINE`
- `EXAMINATION`

Each paragraph should carry enough information for both:

- workspace rendering
- DOCX export rendering

At minimum:

- paragraph type
- label
- text
- source utterance IDs
- any heading / by-line metadata needed by both consumers

## Implementation Constraints

- reuse existing workspace intelligence where possible
- do not rebuild transcript text from a second independent classifier if one already exists
- smallest possible change set
- no duplicate parallel representation layers

## Validation Fixture

Use:

- `tr_1781559088619_7rch7i`

Validate against the actual current transcript state.

## Acceptance Criteria

For `tr_1781559088619_7rch7i`, prove:

1. Workspace paragraph types equal export paragraph types.
2. Workspace labels equal export labels.
3. Workspace paragraph count equals export paragraph count.
4. Workspace structure equals export structure.
5. First divergence index is eliminated.
6. The same transcript text content is preserved.
7. No transcript rows are modified as part of representation unification.

Binary failure rule:

If workspace and export still disagree on paragraph type, label, count, or structure for the same transcript after implementation, the build is `FAILED`.

## Required Validation Outputs

Produce:

- `docs/audits/TRANSCRIPT_REPRESENTATION_UNIFICATION_VALIDATION.md`

Include:

- before counts
- after counts
- first divergence index before / after
- files changed
- canonical representation chosen
- proof that only one paragraph model remains authoritative

## Suggested Commit Sequence

### Commit 1 — Characterization

Add or tighten tests that prove current divergence between workspace and export for the same transcript representation.

### Commit 2 — Unification

Implement the shared paragraph model and make both consumers use it.

### Commit 3 — Validation

Write the validation report and confirm parity for the fixture transcript.

## Final Deliverable

At completion, the system must have:

- one canonical transcript paragraph representation
- workspace consuming it
- DOCX export consuming it
- a validation report proving parity for `tr_1781559088619_7rch7i`

## Deployment Boundary

Repository work only.

Do not request:

- credentials
- passwords
- tokens
- connection strings

Do not:

- deploy
- run db push
- deploy edge functions

The task is complete when the repository is updated and the validation report is written.
