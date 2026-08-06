# ADR-0011 — Stutter rendering: double hyphen, not em-dash

**Status:** Accepted
**Date:** 2026-08-03
**Decider:** James (owner), amending a prior decision by Miah (CSR)
**Supersedes:** F6 as originally ratified 2026-08-03

## Decision

Stutters, false starts, and interruptions render as a **spaced double hyphen** (`" -- "`), not an em-dash (`—`).

The spaced form matches what `transcript_formatter/ufm_engine` already produces (`document_builder.py:343`, `replace("—", " -- ")`): a space on each side, e.g. `I -- I`.

## Context

F6 originally specified the em-dash on Miah's direct answer. A subsequent formatting review argued for the double hyphen. The owner has elected the double hyphen.

Note on the source of that review: it also cited spec sections and rule numbers that do not exist, and it argued for several changes that conflict with ratified decisions. Only the double-hyphen point was adopted; the rest was rejected. A source being right once does not make it authoritative.

## Consequences

- `transcript_formatter/ufm_engine` already produces `--`; this is **no longer a deployed violation**. `docs/audits/COLLOQUY_RENDER_FINDINGS.md` (PR #67) must be corrected to remove F6 from its violation list.
- The CSR sample in PR #50 was generated with em-dashes and must be regenerated with `--` before it reaches Miah.
- **Miah should be informed** that a format decision she made has been amended by the owner.

## Enforcement

The golden corpus (Prompt E) asserts `--` in all stutter / false-start / interruption output. Any em-dash in that position is a defect. Rendering is deterministic and versioned (A8, A10).

## Open precision (for the golden-corpus regex, not decided here)

- Spacing is the **spaced** form (`I -- I`), matching `ufm_engine`. If the unspaced form (`I--I`) is ever preferred, that is a further amendment.
- The three input classes (stutter = repeated token; false start / interruption = truncated utterance) are distinguishable in the data, but they render **identically** as `--`. One rendering rule; classification is an engine concern.
