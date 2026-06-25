# Changelog — QA-Review Incorporation Pass (DP-012)

**Date:** 2026-06-21
**Source:** Four QA reviews of structured medical-deposition output (lameness/layman's block; disc-degeneration block ×2; whiplash-article block).
**Discipline:** Audit-first. No spoken testimony content changed. Two QA "corrections" that conflict with approved canon were **rejected/gated**, not encoded.

---

## Conflict resolutions (most important)

| QA feedback said | Canon says | Resolution |
|------------------|-----------|------------|
| Capitalize direct-address `Doctor` (Morson Rule 215) | **DP-011** (APPROVED): lowercase per certified *Etminan* record (13 instances) | **REJECTED.** Reinforced DP-011 with an explicit "do not re-introduce" guard in DP-002b + DP-012 §5. Correct form: `yourself, doctor,` |
| Strip date ordinal `August 17th → August 17` as a flat fix | **DP-008** (locked): date reformat is suggestion-only, human-confirmed | **GATED.** Folded into DP-008 as a gated transform; DP-012 §4 records it. Not auto-applied. |

Evidence hierarchy applied throughout: **certified transcript > Depo-Pro decision > Morson/UFM**.

---

## New canonical record

### `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` (NEW, status: PROPOSED)
Consolidates the legitimately-new rules surfaced by the QA reviews so prompts cite one source instead of hardcoding:
- §1 Quote before interrupting dash (Morson 92) — ADOPT
- §2 Question mark outside the quote when the sentence (not the quote) is the question (Morson 16/108) — ADOPT
- §3 Two spaces after a sentence-ending closing quote — cross-ref DP-010 (not new)
- §4 Date-ordinal omission — GATED under DP-008
- §5 Capitalize direct-address title (Morson 215) — REJECTED, defer to DP-011
- §6 Inline garble flags — flag, never silently correct (format + sequential numbering + clean-delivery stripping)
- §7 One answer = one continuous paragraph (Return-To-Margin Continuation; "hanging indent" retired)

Marked PROPOSED — §1/§2/§6/§7 need owner ratification to become APPROVED.

---

## Prompt edits

### `PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md`
- Authority header: added DP-012.
- §3 invariant: added quotation/terminal punctuation normalization per DP-012 (flag-on-ambiguity).
- **DP-002b:** added a ⚠ "known QA-feedback conflict — do not act on it" guard against the Rule 215 capitalization.
- **DP-004b (new):** inline garble-flag rule — word-grain, verbatim-preserving, sequential numbering, retain-token-on-strip; distinguished from DP-007 name correction.
- **DP-005b (new):** one answer = one continuous paragraph / one block.
- **DP-008:** added the `August 17th → August 17` ordinal example and a DP-012 §4 cross-reference, keeping it gated.

### `PROMPT_WORKSPACE_DOCX_TAB_STOPS.md`
- Authority header: added DP-012, clarifying placement is decided **upstream** (structuring layer) and the DOCX pass **renders** it — it must not reposition quotes or split answers.
- §1.2 invariants: added "each answer renders as one continuous paragraph."
- §4 verification: added checks for one-paragraph-per-answer and for quote-punctuation rendered-not-altered.

### Untouched (verbatim)
`DP-009`, `DP-010`, `abbreviation_registry.json` — DP-010 already owns the closing-quote two-space rule; DP-012 cross-references it rather than duplicating authority.

---

## Verification run
- No prompt prescribes capitalizing a direct-address `Doctor` (only DP-011's "not capitalized" rule appears).
- Inline garble-flag format is byte-identical across DP-012 and the engine prompt.
- `hanging indent` appears only in retired/do-not-use contexts.
- DP-012 cited 6× (engine) and 4× (workspace).

## Out of scope (live repo follow-up)
The Python `depo_qa_fixer.py` clean-delivery stripper should be confirmed to handle **inline** flags (strip the bracket span, keep the verbatim token), not only whole `[SCOPIST: FLAG]` lines — that is a code change, not a documentation change.
