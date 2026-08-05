# ADR-0012 — Workspace Open Questions: Six Ratified Decisions

**Status:** Ratified
**Date:** 2026-08-04
**Format authority:** Miah (Certified Shorthand Reporter) — confirmed F8 carve-out (OQ-4)
**Architecture authority:** James (Owner)
**Supersedes/amends:** F6 (stale em-dash → `--`), F8 (line-numbering carve-out)
**Evidence base:** Four real produced Texas deposition transcripts (CSR Trisha Myler:
Shaw, Yean, Moore, Embry), reviewed directly; UFM / Morson's English Guide for Court Reporters;
Depo-Pro Transcript Specifications.

These six decisions resolve the open questions raised by the Workspace pipeline audit
(`docs/audits/WORKSPACE_PIPELINE_AUDIT_MERGED_2026-08-04.md`). No code changes are
authorized by this ADR itself; it is the ratified target for the subsequent code PRs.

---

## OQ-1 — Parenthetical indentation

**DECISION: Ratify 1.5″ as the authoritative parenthetical indent.**

- Parentheticals align with the colloquy speaker label at the third tab (1.5″).
- Directly measured from the reference transcripts: two parentheticals of different
  lengths — `(Exhibit 1 marked)` and `(Requested portion was read)` — begin at the
  identical column as `MR. HURLEY:` / `MR. WALTON:` labels (a fixed indent, not centering).
- The 2.0″ in legacy code and the 1.0″ in the audit prompt are both wrong.

Code impact: `geometryProfile.ts` `parentheticalInches` 2.0 → 1.5; `src/index.css:154`
`.utterance-block--parenthetical` margin-left → 1.5in (same commit — geometry authority is split).

## OQ-2 — Colloquy paragraph wrapping (F5b)

**DECISION: Do not ratify F5b. Standard wrapping (F5) stands.**

- A colloquy line wrap returns flush left to 0″ (F5a / F5). A new paragraph by the same
  speaker takes a fresh speaker label at the third tab; there is no "hold at 1.5″" rule.
- F5b ("new paragraph, same speaker, no repeated label → hold at 1.5″") was **not observed**
  in any of the four reference transcripts. Every same-speaker continuation was either a
  wrap → 0″ or a freshly-labeled turn (e.g., embry p15 has `MR. HURLEY:` on lines 2 and 6).

Code impact: none. Current merge/wrap behavior is correct. F5b is retired.

## OQ-3 — Button rename and behavior

**DECISION: Option A — rename to "Run AI Review". Pipelines stay separate.**

- The button triggers the AI suggestion pass (P-B), not the deterministic formatter (P-A,
  which runs automatically on load). The label must describe what it does.
- Deterministic formatting and non-deterministic AI suggestions are different operations;
  AI must never silently overwrite verbatim testimony. No rewiring.

Code impact: `AIReviewBanner.tsx` "Re-review" → "Run AI Review", "Re-reviewing..." →
"Running AI Review..."; update `AIReviewBanner.test.tsx`. The `RightSidebar.tsx:34` tab
label "AI Review" is already accurate.

## OQ-4 — Line-number gutter in the Workspace body (F8 carve-out)

**DECISION: Classify the per-utterance line-number gutter as an intentional, exempt
editing aid. Keep it in the Workspace. (F8 amended — Miah confirmed.)**

- Two distinct things: (a) the certified 25-line-per-page numbered format box (F8) — UFM /
  export only; (b) the per-utterance editor gutter — an indispensable proofreading/collaboration
  aid in the Workspace. They are not the same feature.
- Condition: the export pipeline **must strip** the editor gutter and apply UFM 25-line
  numbering during PDF/DOCX compilation. Verify as part of the export pipeline audit.

Code impact: none to the Workspace body. Export pipeline must be verified to strip the gutter.

## OQ-5 — "CERTIFIED TRANSCRIPT OF DEPOSITION" header

**DECISION: Remove from the Workspace now; show a working-draft indicator.**

- Labeling an unproofread, uncertified draft "CERTIFIED" is a compliance risk (UFM §4.1).
- The certified header belongs to the final export/certification render path only.

Code impact: `TranscriptEditor.tsx:437–451` "CERTIFIED TRANSCRIPT OF DEPOSITION" →
"WORKING DRAFT — NOT CERTIFIED" (placeholder — **confirm exact copy with Miah** before implementing).

## OQ-6 — Standalone `BY MR./MS. NAME:` line (F15)

**DECISION: Implement the standalone by-line at 0″ flush left.**

- A standalone examination by-line at 0″, immediately below the centered examination header,
  is required (confirmed in all four transcripts). It is currently dropped entirely — a real gap.
- The inline parenthetical resumption form `(BY MR. NAME)` (F17) is a different construct,
  used only when returning to questioning after a colloquy interruption. Both forms are required.

Code impact: `buildEditorContent.ts:320–322` emit BY_LINE instead of dropping it;
`geometryEngine.ts` add a dedicated 0″ BY_LINE branch (currently falls through to speaker at 1.5″);
`src/index.css:140–142` `.utterance-block--by-line` text-indent → 0; add tests.

---

## Summary

| OQ | Decision | Code? |
|---|---|---|
| OQ-1 parenthetical indent | **1.5″ ratified** (retire 1.0″/2.0″) | YES — geometryProfile.ts + index.css |
| OQ-2 F5b colloquy wrap | **Retired — not a rule** | NO |
| OQ-3 button rename | **Option A: "Run AI Review"** | YES — AIReviewBanner.tsx + test |
| OQ-4 line-number gutter | **Exempt editing aid — keep** (F8 amended) | NO (export must strip) |
| OQ-5 certified header | **Remove now → "WORKING DRAFT"** | YES — TranscriptEditor.tsx (copy TBD) |
| OQ-6 BY-line | **Implement at 0″** | YES — 3 files + tests |

## Code PR sequence (after this ADR is committed)

- **PR 1** — geometry: `parentheticalInches` 2.0 → 1.5 (`geometryProfile.ts` + `index.css:154`,
  same commit) + one-space objection fix `correctionRegistry.ts:154`. Tests updated.
- **PR 2** — button rename: `AIReviewBanner.tsx` + `AIReviewBanner.test.tsx`.
- **PR 3** — certified header → working-draft indicator: `TranscriptEditor.tsx` (needs Miah's
  exact wording first).
- **PR 4** — standalone BY-line at 0″: `buildEditorContent.ts` + `geometryEngine.ts` + `index.css`
  + tests. Most complex; do not fold into PR 1/PR 2.

PR 1 and PR 2 can proceed immediately once this ADR lands. PR 3 is blocked on Miah's copy.
PR 4 is separate.
