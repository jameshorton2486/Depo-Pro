# Decision Record — Refine safety guard accepted; corrections layer deferred to post-freeze

**Date:** 2026-06-17
**Status:** Accepted
**Context:** BETA_FREEZE (no schema changes, no new features without explicit approval)

## Decision
Keep the Refine safety guard as the interim protection for human transcript edits. Do NOT break
BETA_FREEZE to build the durable corrections layer now. Treat the corrections layer as the FIRST
deliberate post-freeze architecture build.

## Evidence behind the decision
A manual correction pass in the live workspace was performed and observed:
1. Word edit — persisted across navigation/reload.
2. Speaker reassignment — persisted across navigation/reload.
3. Review marks — persisted across navigation/reload.

All three survived. Corrections are therefore beta-usable today.

Audit findings (see `REFINE_SAFETY_AND_EDIT_PERSISTENCE_AUDIT.md`):
- Edits persist to the database and reload correctly, so normal use is safe.
- But edits are written into canonical rows (`transcript_words` / `transcript_utterances`), the same
  rows Refine rebuilds — this is the architectural weakness.
- Speaker reassignment already writes an overlay (`speaker_resolution_current` / `_history`) and
  mutates canonical, so a corrections-layer pattern exists but is not authoritative.

## Interim protection
Shipped in commit `73db99d`.

- Refine Apply now shows a hard confirmation when human work is detected.
- Detection uses a strong combined signal:
  - `working_text` / `edited`
  - review progress
  - speaker-resolution overlay/history
  - workspace audit-log edit actions
- Pre-apply snapshot captures the live edited rows.
- `Undo Last Refine` restores that snapshot.

## Accepted residual risks for beta
- Edits still live in canonical rows, not a separate durable corrections layer.
- Undo after Refine is session-scoped and does not survive refresh or tab close.
- Therefore the confirmation gate is the primary protection and undo is convenience.
- Normal editing/navigation/reload behavior is acceptable based on the manual survival test.

## Post-freeze build
Definition of done for the corrections layer:

- Introduce a separate durable corrections record keyed to canonical word/utterance IDs.
- Cover:
  - word edits
  - speaker reassignment
  - Q/A split/merge
  - flags
  - notes
- Make the overlay authoritative and stop mutating canonical rows on edit.
- Render display as canonical plus corrections.
- Ensure corrections survive Refine and re-transcription:
  - re-apply by ID when anchors still match
  - surface conflicts when they do not
  - never silently drop corrections
- Extend the existing speaker overlay pattern rather than inventing a parallel system.

This is a schema change and requires explicit approval to proceed.

## Open items
These do not block the deferral decision, but should be closed deliberately:

- Confirm whether `main` is a deploy branch or only a working branch. The Refine guard commit landed
  locally on `main` and was not pushed, deployed, or merged.
- Confirm the Refine confirmation control is a deliberate gate and not easy to dismiss accidentally,
  because it is the primary protection while undo remains session-scoped.

