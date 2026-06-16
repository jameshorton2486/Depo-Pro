# PROMPT — TRANSCRIPT FIDELITY GAP AUDIT

## Branch

`feature/stage3-workspace-core`

## Mode

Read-only audit.

No code changes.

No schema changes.

No migrations.

No fixes.

Evidence only.

## Deployment Boundary

Repository work only.

Do not request:

- credentials
- passwords
- tokens
- connection strings

Do not:

- deploy
- run `supabase db push`
- deploy edge functions

If environment changes are required:

- generate exact commands
- generate validation steps
- stop with a `HANDOFF` section

The task is complete when the audit is written.

## Audit Target

Current DEPO-PRO transcript:

- `tr_1781559088619_7rch7i`

Gold-standard reference:

- `Thomas_Heath_Deposition_2026-04-30.docx`

Treat the corrected DOCX as the normative transcript reference for this audit.

## Goal

Compare the transcript currently produced and rendered by DEPO-PRO against the corrected deposition transcript.

Identify every transcript-fidelity gap.

Do not fix anything.

Do not modify code.

Produce:

- `docs/audits/TRANSCRIPT_FIDELITY_GAP_AUDIT.md`

## Context

Recent work already completed:

- speaker attribution preservation
- transcript reassembly
- speaker-aware rendering

The remaining question is not whether the repo compiles.

The question is:

How far is the current DEPO-PRO transcript from the corrected finished deposition transcript?

This audit exists to stop guessing and produce a concrete transcript-fidelity roadmap based on a real corrected deposition.

## Task 0 — Re-Verify Before Auditing

Before continuing, verify and report:

1. `tr_1781559088619_7rch7i` is available in the live environment.
2. `Thomas_Heath_Deposition_2026-04-30.docx` is available to inspect as the gold-standard reference.
3. The current transcript can be viewed after:
   - attribution preservation
   - reassembly
   - speaker-aware rendering
4. The audit can compare the DEPO-PRO transcript against the corrected transcript without modifying either artifact.

If any of the above are false, STOP and report.

## Required Audit Categories

Audit all of the following:

1. Speaker Identity
2. Colloquy Geometry
3. Q/A Formatting
4. Examination Sections
5. Swearing-In Ceremony
6. Recess Handling
7. Exhibit Handling
8. Objections
9. Parentheticals
10. Transcript Formatting
11. Pagination
12. Certification Elements
13. Rule Classification
14. Editor Capability Gap

## Required Questions Per Category

For each category, provide:

1. Current State
2. Expected State
3. Recoverable Deterministically?
4. Needs AI?
5. Priority
6. Files Likely Responsible

Where possible, also include:

- concrete example from current DEPO-PRO transcript
- concrete example from the corrected DOCX
- whether the gap is data, rendering, geometry, or formatting

## Root Cause Classification

For every identified gap, classify whether it is primarily solvable by:

- deterministic code
- regex / pattern rules
- AI assist
- human review only

Do not treat the corrected transcript as a correction source.

Treat it as a gold-standard reference used to learn:

- what rules can be generalized
- what structure can be reconstructed
- what still requires human review

The question is:

Can we build a reusable transcript engine for all future transcripts?

Not:

Can we copy one corrected transcript into one DEPO-PRO transcript?

## Required Comparison Areas

The audit must explicitly identify differences in:

- speaker identity
- colloquy geometry
- Q/A geometry
- examination section structure
- swearing / introductory ceremony structure
- recess and off-record handling
- objections
- parentheticals
- exhibit references
- indentation
- spacing
- pagination
- certification / final transcript elements
- editor capabilities relative to Word-style transcript editing

## Classification Rules

Do not stop at “different.”

For each gap, classify whether it is primarily:

- identity gap
- assembly gap
- rendering gap
- formatting gap
- pagination gap
- certification/export gap

If a gap spans multiple areas, name the first proven locus.

For each gap, also state whether it is:

- reusable engine work
- transcript-specific manual correction
- likely impossible without missing source evidence

## Required Evidence Standard

Use evidence from:

- the live DEPO-PRO transcript
- the corrected DOCX
- repository file/symbol references

Distinguish:

- proven facts
- inferences

Do not speculate without labeling it as inference.

## Output Structure

Write:

- `docs/audits/TRANSCRIPT_FIDELITY_GAP_AUDIT.md`

Include:

1. audit target summary
2. gold-standard reference summary
3. category-by-category gap analysis
4. recoverability assessment
5. deterministic vs AI-needed assessment
6. likely file/symbol responsibility
7. prioritized roadmap summary
8. editor capability gap summary
9. engine inventory

## Final Recommendation

End with a prioritized roadmap grouped roughly by waves.

At minimum, distinguish:

- highest-priority fidelity gaps
- medium-priority fidelity gaps
- lower-priority formatting / pagination gaps

The final recommendation should answer:

1. What is missing?
2. What is recoverable deterministically?
3. What should be built next?

## Engine Inventory Requirement

The audit must include an `Engine Inventory` section that classifies the current system as:

- `Complete`
- `Partial`
- `Missing`

At minimum, inventory the following engines:

- Deepgram Ingestion
- Raw Deepgram Preservation
- Word-Level Confidence / Timing Preservation
- Speaker Attribution Preservation
- Transcript Reassembly Engine
- Candidate / Preview / Apply Workflow
- Audit Trail Infrastructure
- Low-Confidence Review
- Basic Transcript Editor
- Speaker Identity Resolution Engine
- Q/A Reconstruction Engine
- Transcript Geometry Engine
- Procedural Reconstruction Engine
- Word-Style Editing Engine

The purpose of this section is to prevent the final audit from collapsing into “we need a transcript engine.”

The audit should explicitly distinguish:

- foundations already built
- engines partially built
- engines still missing

## Editor Capability Requirement

The audit must explicitly compare the current editor against the desired Word-style workflow for:

- word editing
- punctuation editing
- carriage returns
- tabs
- paragraph splitting
- paragraph merging
- parenthetical creation
- transcript block manipulation
- low-confidence highlighting during proofreading

This section must distinguish:

- transcript generation gaps
- transcript editor capability gaps

## Final Rule

This is an audit, not an implementation prompt.

Do not repair anything.

Do not change transcript data.

Do not change rendering.

Do not change exports.

Do not change certification logic.

Only identify the gaps and write the audit.
