# PROMPT — SPEAKER IDENTITY RESOLUTION ENGINE

## Branch

`feature/stage3-workspace-core`

## Mode

Implementation prompt.

Build only what is required for speaker identity resolution.

Do not expand scope into Q/A reconstruction, procedural reconstruction, or general transcript geometry beyond what is required to expose resolved identities safely.

## Authoritative Source

This prompt is derived from:

- `docs/audits/TRANSCRIPT_FIDELITY_GAP_AUDIT.md`

That audit is the governing evidence source for:

- why this engine is next
- what is already complete
- what remains missing
- why this work is deterministic-first

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

If deployment is required:

- generate exact commands
- generate validation steps
- stop with a `HANDOFF` section

The task is complete when the repository is implemented, tested, and documented.

## Goal

Build the next missing transcript engine:

- **Speaker Identity Resolution Engine**

This engine must convert generic speaker clusters such as:

- `SPEAKER 0`
- `SPEAKER 1`
- `SPEAKER 2`

into reusable participant identities such as:

- `reporter`
- `nunez`
- `thomas`
- `zhan`

and expose those identities to rendering without fusing identity to presentation.

## Critical Architectural Rule

Split this into two separate layers.

### Layer A — Identity Resolution

Resolve raw/generic speaker clusters into stable participant identities.

Examples:

- `Speaker 0 -> reporter`
- `Speaker 1 -> nunez`
- `Speaker 2 -> thomas`

This layer stores / computes identity.

This layer does **not** decide how labels appear on the transcript page.

### Layer B — Rendering Labels

Render the resolved identity appropriately for transcript geometry.

Examples:

- `reporter -> THE REPORTER:`
- `nunez -> MR. NUNEZ:`
- `thomas -> MR. THOMAS:`
- `zhan -> MS. ZHAN:`

This layer is presentation.

Do not fuse identity with transcript label formatting.

Reason:

- later rendering contexts may need different output, for example:
  - `MR. NUNEZ:`
  - `BY MR. NUNEZ:`

Identity must remain reusable independently of presentation.

## Scope

Allowed:

- deterministic identity-resolution logic
- additive local types
- additive read-path/view-model changes
- deterministic label rendering for resolved identities
- transcript/workspace tests
- audit/report updates if required by validation

Disallowed:

- schema changes
- migrations
- AI/LLM inference
- Q/A reconstruction
- colloquy/procedural reconstruction beyond what is needed to display resolved identities
- reassembly engine changes
- transcript data mutation unrelated to identity resolution
- export rewrites
- certification changes

## Inputs

Primary reference audit findings:

1. Current visible transcript output still shows generic labels like `SPEAKER 0:`
2. This is the largest visible gap between DEPO-PRO output and the corrected deposition
3. The gap is mostly deterministic
4. The next engine should be reusable across all transcripts, not a one-off correction

Known supporting foundations already built:

- raw Deepgram preservation
- word-level timing/confidence preservation
- speaker attribution preservation
- transcript reassembly engine
- candidate/preview/apply flow
- low-confidence review foundation
- basic editor foundation

## Task 0 — Re-Verify Before Coding

Before touching code, verify and report:

1. `docs/audits/TRANSCRIPT_FIDELITY_GAP_AUDIT.md` still identifies Speaker Identity Resolution Engine as the single next build.
2. Current transcript output evidence still shows generic labels such as `SPEAKER 0:` rather than resolved participant labels.
3. Current workspace rendering still flows through:
   - `src/lib/transcript/resolvedSpeakers.ts`
   - `src/lib/transcript/workspaceParagraphs.ts`
   - `src/lib/buildEditorContent.ts`
   - `src/extensions/UtteranceNode.ts`
4. Existing speaker overlay / mapping foundations already provide enough information to avoid AI-based identity inference in v1.

If any of the above are false, STOP and report.

## Problem Statement

Current state:

- transcript evidence is better preserved than before
- workspace rendering can display inline colloquy geometry
- but visible output still uses generic cluster labels

This means the system has:

- preserved evidence
- incomplete identity resolution

The corrected transcript proves the next missing engine is participant identity resolution, not another transcript-specific correction.

## Required Output Behavior

The engine must make it possible for the visible transcript to render:

- `THE REPORTER:`
- `MR. NUNEZ:`
- `MS. ZHAN:`
- `MR. THOMAS:`

instead of:

- `SPEAKER 0:`
- `SPEAKER 1:`
- `SPEAKER 2:`

without hard-coding a one-off transcript.

## Deterministic Sources Allowed

Identity resolution may use only deterministic existing sources such as:

- resolved speaker overlay data
- witness/case metadata
- attorney list / participant directory
- reporter identity
- existing role assignments

No AI inference.

No transcript-specific manual copy from the corrected DOCX.

## Required Design

### Layer A — Identity Model

Introduce an additive identity model if needed.

It should represent concepts like:

- participant key / identity key
- role
- display name components
- rendering label source

Do not change frozen contract types in `src/api/types.ts`.

### Layer B — Label Formatter

Add a deterministic formatter that turns resolved identities into transcript labels.

At minimum support:

- reporter -> `THE REPORTER`
- witness -> `MR./MS. SURNAME` where metadata supports it
- attorney -> `MR./MS. SURNAME`
- videographer -> `THE VIDEOGRAPHER`
- interpreter -> `THE INTERPRETER`

If deterministic information is insufficient for a full formal label, prefer a clearly bounded fallback over hallucination.

## Fallback Rules

Fallbacks must be explicit and safe.

Examples:

- if role is known but surname/honorific is missing, use the best deterministic role-safe label
- if no deterministic identity exists, keep a generic fallback rather than inventing one

The engine should reduce generic labels as much as possible without crossing into AI or hallucination.

## Validation Targets

Primary transcript:

- `tr_1781559088619_7rch7i`

The success condition is visible reduction of generic speaker labels and replacement with deterministic participant-aware labels.

## Acceptance Criteria

At minimum:

1. Generic visible labels like `SPEAKER 0:` materially decrease or disappear where deterministic identity exists.
2. Identity is stored/computed separately from presentation.
3. Rendering label formatting is additive and reusable.
4. No AI logic is introduced.
5. No transcript-specific copying from the corrected DOCX occurs.
6. No regressions to:
   - low-confidence highlighting
   - audio synchronization
   - transcript editing
   - reassembly/refinement flow

## Tests

### Commit 1 — Characterization

At minimum prove:

1. current transcript rendering still exposes generic labels in the unresolved path
2. current resolved speaker/view-model path does not yet provide enough formatted participant-aware labels

### Commit 2 — Engine

At minimum prove:

1. resolved identity and rendered label are separate concepts
2. reporter renders as `THE REPORTER`
3. attorney/witness labels use deterministic formal label generation when metadata supports it
4. generic fallback remains safe when identity is incomplete
5. no regression in low-confidence word markup or editor content generation

### Commit 3 — Validation

Provide a validation report showing:

- before generic label state
- after resolved identity label state
- remaining gaps deferred to later engines

## Required Deliverables

1. committed implementation series
2. validation report
3. explicit list of identity fields / local types introduced
4. final PASS/FAIL determination

## Final Constraint

Do not turn this into:

- a Q/A reconstruction engine
- a transcript geometry engine
- a procedural reconstruction engine
- an AI identity guesser

This prompt is narrower:

- resolve participant identity deterministically
- expose it safely to rendering
- reduce generic speaker labels across transcripts

