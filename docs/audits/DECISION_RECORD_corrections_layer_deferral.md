# Decision Record — Unified Layer-2 Overlay deferred to post-freeze

**Date:** 2026-06-24  
**Status:** Accepted  
**Supersedes:** 2026-06-17 corrections-layer deferral note  
**Context:** BETA_FREEZE (no schema changes, no migrations, no contract changes without explicit approval)

## Decision

Do **not** break BETA_FREEZE to build durable paragraph-boundary persistence or a durable corrections layer now.

Treat these as one unified post-freeze architecture decision:

- durable word/utterance corrections
- durable speaker reassignment overlay
- durable paragraph-boundary persistence
- other human structural decisions that must survive save/reload, Refine, and retranscription

The platform will continue through beta with the current freeze-safe behavior:

- normal word edits persist
- speaker reassignment persists
- review state persists
- paragraph merge/split does **not** ship as a persistent feature

## Why these belong together

Two separate audits converged on the same architectural gap:

1. Corrections-layer deferral
2. Paragraph-structure persistence audit

Both reached the same conclusion:

- canonical words/utterances are the timing and identity backbone
- current Stage 3 persistence writes directly into canonical rows
- the frozen contract has no persisted Layer-2 place to store human structural/editorial decisions

That means paragraph boundaries, speaker corrections, and durable transcript corrections are not three unrelated features. They are one class of missing capability: **persisted human-authored overlay state on top of canonical transcript identity**.

Designing them separately would create multiple partial schema changes around the same problem. The correct post-freeze move is one coherent overlay design.

## Evidence behind the decision

### A. Current beta editing is usable

A manual correction pass in the live workspace previously established that these survive navigation/reload:

1. word edit
2. speaker reassignment
3. review marks

That means normal beta editing remains acceptable today.

### B. Corrections still mutate canonical rows

The prior corrections-layer audit found:

- edits persist to the database and reload correctly
- but they are written into `transcript_words` / `transcript_utterances`, the same canonical rows later rebuild paths rely on
- speaker reassignment already has an overlay pattern, but canonical rows are still mutated

That is the architectural weakness the post-freeze layer must resolve.

### C. Paragraph persistence is blocked under the frozen contract

The paragraph audit found:

- the Stage 3 contract is still `EditorDocument { speakers, utterances, words }`
- the live editor disables native paragraph nodes
- render-time segmentation exists, but save/reload still collapses everything back to one `working_text` per `utterance_id`
- there is no persisted paragraph entity or paragraph-boundary overlay

Therefore a persistent merge/split feature cannot be built cleanly inside the current freeze.

References:

- [docs/audits/PARAGRAPH_STRUCTURE_AUDIT.md](C:/Users/james/projects/depo-pro/docs/audits/PARAGRAPH_STRUCTURE_AUDIT.md)
- [docs/audits/AUDIT_TRANSCRIPT_TRANSFORM_PIPELINE.md](C:/Users/james/projects/depo-pro/docs/audits/AUDIT_TRANSCRIPT_TRANSFORM_PIPELINE.md)

## Interim beta posture

### Keep

- the Refine safety guard as the interim protection for human edits
- the existing persisted word-edit / speaker / review workflow
- the current freeze boundary

### Do not ship

- session-local-only paragraph merge/split as a production feature
- canonical utterance regrouping as a shortcut around the missing overlay

Session-only paragraph editing would erode trust because edits would disappear on reload. Canonical regrouping would solve the wrong problem by mutating Layer 1 for what is fundamentally a Layer-2 concern.

## Accepted residual risks for beta

- edits still live in canonical rows, not a separate durable corrections layer
- Refine protection is still an interim guard, not a final architecture
- paragraph merge/split is unavailable as a persistent workflow
- structural user intent beyond plain text edits is not yet first-class

These are accepted for beta because they do not block core transcript creation, review, or certification.

## Post-freeze build

Definition of done for the unified Layer-2 overlay:

- introduce a separate durable overlay keyed to canonical word and utterance identities
- make the overlay authoritative for human-authored editorial/structural state
- preserve canonical timing, word identity, and raw transcript fidelity

Minimum capability set:

- word edits
- speaker reassignment
- paragraph-boundary overrides
- Q/A split or regroup decisions, if approved
- flags
- notes

Required behavior:

- render display as canonical plus overlay
- stop treating canonical row mutation as the long-term editing model
- survive Refine and retranscription when anchors still match
- surface conflicts explicitly when anchors do not match
- never silently drop human corrections or structural decisions
- extend the existing speaker overlay pattern instead of inventing multiple parallel systems

## Priority guidance

Do not prioritize this overlay by architecture alone.

Before post-freeze design begins, weigh the feature mix using real reporter workflow:

- corrections friction
- speaker correction friction
- paragraph-boundary friction

That user evidence should determine whether paragraph persistence is a first-wave overlay requirement or a later extension.

## Open items

- Confirm whether `main` is a deploy branch or only a working branch. Earlier Refine-guard work landed locally and remained undeployed at that time.
- When post-freeze planning starts, convert this decision into an implementation brief for a unified Layer-2 overlay rather than separate prompts for corrections, speaker persistence, and paragraph persistence.
