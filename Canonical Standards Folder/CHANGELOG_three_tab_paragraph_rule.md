# Changelog — Three-Tab Paragraph Rule Correction

**Date:** 2026-06-21
**Trigger:** Owner correction — new paragraphs within testimony begin at Tab3 (1.5″) unless the line begins with `Q.` or `A.`. Authority: Texas UFM §2.11, §9.2, §16.5.

---

## What this reverses

The previous pass encoded "an answer = one continuous paragraph; never split on hard breaks" (DP-005b, DP-012 §7) directly from the QA-review documents, which repeatedly instructed combining answers into one block. **That was an over-correction.** A lengthy answer may legitimately contain multiple paragraphs; the UFM specifies their indentation.

## Corrected tab architecture

| Tab | Position | Used for |
|-----|----------|----------|
| Tab 1 | 0.5″ | `Q.` / `A.` designation only |
| Tab 2 | 1.0″ | text immediately after `Q.` / `A.` |
| Tab 3 | 1.5″ | speaker IDs, parentheticals, **and the first line of any new paragraph within testimony** |

A paragraph begins with three tabs **unless** it opens with `Q.` or `A.`. Subsequent (wrapped) lines of every paragraph return to the left margin (0.0″). A **hard paragraph break** → Tab3; a **soft visual wrap** → left margin (not a new paragraph).

## Files changed

- **DP-012 §7** — retitled "Paragraphs within testimony: the three-tab rule (CORRECTED)"; added a correction notice, the full tab architecture, and the owner's worked example.
- **PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md** — DP-005b rewritten from "one continuous paragraph" to the three-tab rule, keeping the hard-break vs soft-wrap distinction.
- **PROMPT_WORKSPACE_DOCX_TAB_STOPS.md** — Tab3 geometry row updated; new "New paragraph within testimony" row added to the per-line table; the §1.2 invariant and the §4 verification check rewritten; authority-header line corrected (removed "must not split answers").

Unchanged: DP-009, DP-010, abbreviation_registry.json (spacing only — unaffected). Return-To-Margin Continuation is unchanged and still governs wrapped-line behavior for every paragraph type.

---

## ⚠ One discrepancy to reconcile (not changed here)

The owner's stated architecture places **parentheticals at Tab3**. A separate recorded convention has parentheticals at **4 tabs** (with navy-blue styling). The Workspace prompt still reads "Tab3 (1.5″) or centered — confirm in audit" for parentheticals; I did **not** silently change the parenthetical tab count in either direction. Please confirm the intended parenthetical indent (Tab3 vs 4 tabs) so it can be locked. This pass only changed the **new-paragraph** rule, which was the explicit instruction.
