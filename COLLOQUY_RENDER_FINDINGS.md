# Colloquy Rendering Findings (retires Prompt B → A2 evidence)

**Branch:** `docs/colloquy-render-findings`
**Authority:** `docs/architecture/RATIFIED_DECISIONS.md` — F1 (colloquy label 1.5" from a 1.5" margin = 3.0" from paper edge), F6 (stutters render with an em-dash `—`), F8 (line numbers at Certification only).

## Why Prompt B was retired, not implemented

Prompt B's central instruction was to change `TAB_COLL_LABEL = Inches(3.0)` to `Inches(1.5)`, one tab to three, three colon-spaces to two. **None of that matches the tracked source.** `TAB_COLL_LABEL` exists nowhere in the tree — only in gitignored `.tmp/pr18/` and `reference/wave8/` (non-authoritative). The prompt was drafted against a code snapshot that no longer exists. Fabricating the constant would have "fixed" nothing and masked the real problem.

The real problem is **two divergent tracked Python DOCX formatters**, and reconciling them is A2 (single layout builder), not a rendering tweak — you cannot reconcile two formatters without deciding which one wins, and that decision *is* the consolidation. So this document is the evidence base for **A2**, and Prompt B is retired.

## The two formatters

| | `transcript_formatter/ufm_engine/document_builder.py` | `formatter_core/docx_exporter.py` (deployed Cloud Run) |
|---|---|---|
| Left margin | not set here (page geometry in `ufm_formatter.py`) | **`Inches(1.25)`** (`:38`) |
| Colloquy tabs | `Inches(0.3)` + `Inches(1.5)` (`:371-372`); left-indent `Inches(1.5)` (`:352`) | 5 stops `_TAB1..5` = 0.5/1.0/1.5/2.0/3.25; `_TAB3=1.5"` "Speaker label" (`:13,:48,:245`) |
| Em-dash | **converts `—` → `" -- "`** (`:343`) | (not converted here) |
| Sentence spacing | `[.!?]\s+` → two spaces (`:344`) — F3 ✓ | — |
| Line spacing | EXACTLY 28pt (`:383`) | per-line render |
| Line numbers | none | **1–25 on every line, always** (`:501` `add_run(f"{line_number:2d} ")`) |

Neither uses the ratified **three left tabs at 0.5"/1.0"/1.5"** scheme from F1.

## Ratified decisions violated in DEPLOYED code

1. **F6 — em-dash.** `document_builder.py:343` rewrites every em-dash to `--`. Miah ratified the em-dash for stutters (`I — I`). If this path renders output, it overrides her decision. **Violation.**
2. **F8 — line numbering.** `formatter_core/docx_exporter.py:501` stamps line numbers 1–25 on every rendered line, unconditionally. F8 places line numbers **at Certification only**. If `formatter_core` runs pre-certification / for the Workspace, it violates F8. **Violation (pending confirmation of when this formatter runs).**
3. **F1 — margin/label geometry.** `formatter_core` uses a **1.25"** left margin (`:38`) with the speaker label at `_TAB3 = 1.5"`. That puts the label **2.75" from the paper edge, not 3.0"**. The ratified fixed point ("3.0" from paper edge") assumed a **1.5"** margin. One of the two numbers is wrong. **Needs Miah.**

## The one question that needs Miah (add to the PR #50 packet)

> The deployed formatter uses a **1.25" left margin**, which places the colloquy label at **2.75" from the paper edge**. We reconciled F1 on the assumption of a **1.5" margin** (label at 3.0"). Which is correct — should the left margin be 1.5", or is the label's paper-edge position different from what we recorded? The fixed point is where the label sits on the printed page; one number has to move.

## Recommendation

- **Retire Prompt B.** It cannot be implemented as written.
- **Fold this into A2.** When the two `buildTranscriptParagraphs` / DOCX builders are consolidated into one shared intermediate model with thin DOM + DOCX renderers, this document is the delta list the single renderer must satisfy: the F1 tab scheme + margin (pending Miah), F6 em-dash preservation, and F8 Certification-only line numbering.
- **Do not consolidate before the corpus exists (Prompt E).** Merging two formatters that disagree on three ratified points is exactly the change you cannot make safely without golden before/after fixtures.
