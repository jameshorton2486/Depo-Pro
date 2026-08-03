> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# Corrections Panel Audit

## What the panel is

`CorrectionsPanel.tsx` is primarily a computed diagnostic/reporting view over the current `EditorDocument`. It reports summary counts, retranscription candidates, ambiguous defects, implausible money, speaker issues, deterministic corrections, and low-confidence words. It also embeds `AISuggestionsSection`, which performs persistent accept/reject/bulk-accept actions.

## Record origins

| Record shown | Origin | Persistence |
|---|---|---|
| Deterministic corrections | Current correction/CFE report helpers and registry-derived comparison | Derived report; underlying visible projection may already contain the correction |
| Ambiguous / monetary defects | Corrections report analysis | Derived only |
| Speaker issues | Current document/speaker analysis | Derived; fixed in Speaker Panel |
| Low confidence | Provider confidence and review state | Confidence persisted; queue is derived |
| Retranscription candidates | Defect/keyterm analysis | Derived; copy action only |
| AI suggestions | Live AI Review fields fetched through hooks/workspace API | Persisted on words/review metadata |
| Future CorrectionObjects | `corrections` and `correction_decisions` tables | First-class target records, not yet the sole panel source |

## Mutation behavior

- Most expandable sections only navigate or explain.
- AI Accept writes the suggestion into working text and records status/audit.
- AI Reject records status/audit without changing wording.
- Accept All bulk-applies pending suggestions.
- Speaker issues direct the reporter to a separate panel, where mutations occur.

## Architectural judgment

The panel should **survive**, but not as an independent correction engine. It is the natural unified results and review surface for Correct and Format Transcript. Its derived defects should be normalized into either CorrectionObjects (actionable proposed changes) or QC findings (non-mutating warnings). The distinction must be visible in both types and UI.

## Target responsibilities

1. Display one correction run and its provenance/version.
2. Group CorrectionObjects by concern: words, speakers, structure, editorial, formatting.
3. Allow accept, reject, edit, and jump-to-context.
4. Show deterministic proposals separately from AI proposals without implying different workflows.
5. Show QC findings that cannot be auto-applied.
6. Write every decision to the single append-only decision history.
7. Remove independent “run AI” behavior and unsafe unreviewed bulk acceptance.

The panel should not recompute an alternative correction truth from already transformed display text. Reports should be produced by the canonical run against a declared baseline/context hash.
