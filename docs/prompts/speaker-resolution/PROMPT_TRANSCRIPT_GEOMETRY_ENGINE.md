# TRANSCRIPT GEOMETRY ENGINE

## Branch

`feature/stage3-workspace-core`

## Mode

Implementation

## Goal

Improve the visible transcript geometry so the unified workspace/export transcript looks like a legal deposition transcript rather than a structurally-correct but visually-plain transcript.

This prompt is about layout geometry.

This is **not**:

- a representation-unification prompt
- a Q/A reconstruction prompt
- a speaker identity prompt
- a procedural reconstruction prompt

The transcript representation is already unified.
Use that shared paragraph model as the source of truth.

## Authoritative Inputs

- [TRANSCRIPT_REPRESENTATION_UNIFICATION_VALIDATION.md](/abs/path/C:/Users/james/Projects/Depo-Pro/docs/audits/TRANSCRIPT_REPRESENTATION_UNIFICATION_VALIDATION.md)
- [TRANSCRIPT_FIDELITY_GAP_AUDIT.md](/abs/path/C:/Users/james/Projects/Depo-Pro/docs/audits/TRANSCRIPT_FIDELITY_GAP_AUDIT.md)
- Gold-standard reference transcript:
  - `C:\Users\james\Projects\Heath_Thomas\Thomas_Heath_Deposition_2026-04-30.docx`
- Validation transcript:
  - `tr_1781559088619_7rch7i`

## Current State

The transcript now has:

- deterministic speaker identity resolution
- shared workspace/export paragraph representation
- Q/A / colloquy / by-line / examination structure preserved across workspace and export

The dominant remaining visible gap is geometry:

- colloquy margin treatment
- inline label spacing
- Q/A indentation
- by-line placement
- examination heading spacing
- deposition-style tab/margin feel

## In Scope

- improve workspace transcript geometry
- improve exported DOCX geometry from the same shared paragraph model
- preserve paragraph types and ordering
- preserve current labels and transcript text
- align visible layout more closely with deposition/UFM expectations

## Out of Scope

Do not introduce:

- new Q/A inference logic
- new identity resolution logic
- new procedural reconstruction logic
- recess/exhibit reconstruction
- certification changes
- AI logic
- schema changes
- migrations
- pagination redesign

## Source of Truth

Use the existing shared transcript paragraph model.

Do not create another transcript representation.

Geometry must be layered on top of the current unified representation.

## Target Geometry

Examples of desired shape:

Colloquy:

`THE REPORTER:  Good afternoon, Mr. Nunez.`

`MR. NUNEZ:  Good afternoon.`

`THE WITNESS:  Yes.`

Q/A:

`Q.  Please state your full name for the record.`

`A.  Heath P. Thomas.`

Structural lines:

`EXAMINATION`

`BY MR. NUNEZ:`

Geometry requirements:

- colloquy label and text stay on the same visible line
- exactly two spaces after the colon in transcript text forms where spacing is textual
- Q/A lines read like deposition lines, not generic prefixed paragraphs
- by-lines and examination headings visually separate correctly
- workspace and export continue to match structurally after geometry changes

## Acceptance Criteria

For `tr_1781559088619_7rch7i`, prove:

1. Workspace transcript geometry visibly improves toward the gold-standard transcript.
2. Export geometry improves from the same paragraph model.
3. Workspace/export paragraph parity remains intact.
4. Paragraph count remains unchanged unless explicitly justified by representation-preserving layout rules.
5. Speaker labels, Q/A labels, and text content remain unchanged.

Binary failure rule:

If geometry improvements introduce a new workspace/export divergence, the build is `FAILED`.

## Required Validation

Produce:

- `docs/audits/TRANSCRIPT_GEOMETRY_ENGINE_VALIDATION.md`

Include:

- files changed
- before/after examples
- workspace/export parity status after geometry changes
- which geometry gaps were improved
- which visible fidelity gaps remain

## Suggested Commit Sequence

### Commit 1 — Characterization

Add or tighten tests for current geometry output from the shared paragraph model.

### Commit 2 — Geometry

Implement layout/formatting improvements in workspace and export renderers while preserving the shared paragraph model.

### Commit 3 — Validation

Write the validation report and confirm parity remains intact.

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

The task is complete when geometry is improved and validation is written.
