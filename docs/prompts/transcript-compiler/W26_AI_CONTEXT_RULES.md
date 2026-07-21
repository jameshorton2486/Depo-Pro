# W26 — AI Context Rules

| Field | Value |
|-------|-------|
| **Owner** | Wave 26 |
| **Purpose** | AI Context Review (unresolved ambiguity only) |
| **Inputs** | Punctuated Transcript (from Wave 25) |
| **Outputs** | Professional Draft Transcript |
| **Consumers** | Reporter proofreading |

**Layer:** Wave 26 AI Context Review
**Authority (design):** `Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md`
(additive, flag-gated, default OFF; never mutates canonical data)
**Pipeline:** (after W25) → **W26** → Professional Draft Transcript

## Purpose

Handle **only unresolved ambiguity.** W26 is the sole layer permitted to reason
contextually — and it is never permitted to make a deterministic correction. It
**flags and suggests; it never mutates the record.**

**Question answered:** *"What remains genuinely uncertain after every
deterministic layer has run?"*

## Owns

- Unknown names (not in the Participant Directory or keyterms)
- Low-confidence speech
- Contextual suggestions requiring judgment
- **Legally significant, ambiguous transformations** routed here from earlier
  layers — e.g. money (`$7.50` → `$750`) as Needs Verification (high confidence)

**Disposition.** Suggestion + confidence only. Output is byte-identical to input
unless a human accepts a suggestion. Anything W26 could resolve
*deterministically* belongs to an earlier layer (W21/W24/W25), not here.

## Hard rule

> W26 never performs deterministic corrections. If a fix is certain, it is not a
> W26 concern — move it to its deterministic owner.

## Does NOT own

Anything deterministic: recognition (W21), semantics (W22), production (W23),
geometry (TP-5), dictionary corrections (W24), punctuation (W25).
