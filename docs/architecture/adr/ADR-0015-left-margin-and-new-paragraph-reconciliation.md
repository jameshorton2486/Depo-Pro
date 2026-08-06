---
authority_tier: T4
status: ACTIVE
owner: Rendering
scope: geometry-decision-evidence
supersedes: null
superseded_by: null
approved_by: James
version: 1.0.0
effective_date: 2026-08-05
ratified_date: 2026-08-05
last_reviewed: 2026-08-05
next_review: 2027-08-05
ratification: RATIFIED
implementation_status: VERIFIED
---

# ADR-0015 — Left-margin reconciliation and DP-011 new-paragraph correction

**Status:** Accepted
**Date:** 2026-08-05
**Decider:** James (owner); Miah (format authority) to be informed
**Amends:** F1 (prose only — page-margin figure); corrects DP-011 §A2/§7 derived layout
**Confirms:** F14 (unchanged), F20 (unchanged)
**Related:** A8/A10 (versioned deterministic rendering)

## Context

Two geometry conflicts were open:

1. **Left margin (F1 vs code).** Ratified F1 asserted a "standard 1.5" left margin," giving a colloquy label 3.0" from the paper edge. But `geometryProfile.leftMarginInches` = **1.25"**, and DP-011 §A2 records the page margin as **1.25" (1800 twips), confirmed from a CSR source DOCX (`w:left="1800"`)**. The deployed formatter also uses 1.25". This was tracked as an open item.

2. **New-paragraph indent (DP-011 vs F14).** DP-011 (§ tab table / §7) states a hard paragraph break in long testimony starts at **Tab 3 (1.5"/2160)**. Ratified **F14** says a new paragraph by the same Q/A speaker begins at the **text column (1.0")**, and F5b (the 1.5"-hold) is retired.

## Evidence

Reference transcripts rendered at 150 DPI and measured border-relative:

- **Page margin:** DP-011's `w:left="1800"` = 1.25" is a direct read of a CSR's source-DOCX attribute — stronger than a pixel estimate. The earlier "~3.1" → 1.5"" reading was the **format-box-shifted text position** in a *certified* PDF, not the page margin. A 1.25" page margin plus the box inset (~0.35") renders the label ~3.1" from the edge, which is what was measured (Shaw). So the ~3.0" paper-edge label position F1 cited is approximately preserved; only the *page-margin attribution* (1.5") was wrong.
- **New paragraph:** measured at **1.0"** (text column) on both the question side (Shaw pp. 5, 19: "Would you state…", "Prior to…", "If you would…") and the **answer/testimony side** (Shaw p. 54: "Going back to the agreement…" — a new paragraph inside an ongoing answer, first line at 1.0", continuation wrapping to 0"). No new-paragraph line measured at 1.5" anywhere. DP-011's 1.5"-for-testimony claim is corpus-refuted.

## Decision

1. **Page left margin is 1.25"** (1800 twips), DOCX-confirmed. F1's prose is corrected: the page margin is 1.25", not 1.5"; the colloquy label's tab offset remains 1.5" from the text margin (the code constant). In certified boxed output the label renders ~3.0–3.1" from the paper edge (the format box places text ~0.35" inside the page margin). `geometryProfile.leftMarginInches` (1.25") is already correct — **no code change**.

2. **New paragraph within a Q or A begins at 1.0"** (text column), continuation wrapping to 0" — F14 stands, now verified on both the question and testimony sides. DP-011's Tab-3 (1.5") new-paragraph/hard-break figure is corrected to 1.0".

## Consequences

- F1 prose corrected in `RATIFIED_DECISIONS.md`; the open "F1 left-margin discrepancy" item is resolved. F1 is a Miah-ratified format rule, so she is to be informed of the margin clarification (same courtesy as the F6 amendment).
- DP-011 §A2 (page margin 1.25") is unchanged and correct; its derived new-paragraph indent is corrected to 1.0". DP-011 remains authoritative for its DOCX-attribute facts but not for derived layout figures that conflict with the corpus.
- The pre-certification CSR sample (`gen_csr_format_sample.py`) has no format box, so its margin choice is a separate presentation question handled with the #50 sample, not by this ADR.
