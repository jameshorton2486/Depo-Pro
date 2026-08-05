# ADR-0013 — Recess parenthetical with provenance

**Status:** Accepted
**Date:** 2026-08-03
**Decider:** James (owner)
**Adds:** F12 (new ratified decision)
**Related:** A3 (no synthesized text), A9 (Deepgram immutable baseline), A6 (proceedings persisted), A8/A10 (deterministic, versioned rendering)

## Decision

**F12.** A videographer "off the record" announcement triggers a canonical recess parenthetical:

```
(Whereupon, a recess was taken at [time].)
```

This is a reporter-authored notation, not transcribed testimony — and it MUST be represented as such in the data, not merely in our understanding of it.

## The A9/A3 tension (named explicitly)

`(Whereupon, a recess was taken at 10:42 a.m.)` is text nobody spoke. Structurally that is the **same operation** as the Python formatter's oath synthesis, which A3 deletes and forbids porting. The distinction that makes F12 legitimate — parentheticals are reporter-authored notations by convention — is only valid if it exists **in the data**. Three requirements make it real:

1. **Marked as reporter-authored.** The parenthetical is stored as a reporter notation, NOT as an utterance carrying (or faking) Deepgram provenance. If it is stored as a normal `transcript_utterances` row, F12 has reintroduced the exact problem A3 exists to remove. (Cf. the boundary engine's `is_synthetic` synthetic utterances flagged in `docs/audits/CORRECTION_RECORDING_AUDIT.md` — a warning, not a pattern to copy.)
2. **Timestamp traces to a verifiable source.**

   | Source | Reproducible? | Verdict |
   |---|---|---|
   | Videographer's spoken time (in the Deepgram baseline, e.g. "the time is 10:42 a.m.") | ✅ Yes | **Preferred** |
   | Audio-timeline offset + persisted deposition start time | ⚠️ Only if the start time is persisted | Acceptable, requires a stamp |
   | AI inference | ❌ No | **Prohibited** |

3. **Deterministic + versioned.** Generated deterministically from persisted data (A8/A10), so a re-render two years later produces the identical string. The recess-parenthetical rule is versioned; its version stamps on certified output.

## Consequences

- The CSR sample in PR #50 renders `(Whereupon, a recess was taken at 10:42 a.m.)`, the time taken from the videographer's spoken "The time is 10:42 a.m." (source 1).
- The engine (not the render layer) owns generating the parenthetical from persisted proceedings/region data (A6). Rendering reads it; rendering never writes it (A8).

## Enforcement

Golden corpus asserts the canonical parenthetical string for a recess, and asserts its timestamp equals the videographer's spoken time where present. A recess parenthetical whose timestamp cannot be traced to a persisted, verifiable source is a defect.
