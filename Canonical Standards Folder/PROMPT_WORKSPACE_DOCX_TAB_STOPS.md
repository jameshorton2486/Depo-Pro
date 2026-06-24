# Codex Prompt — Workspace Transcript DOCX: UFM Tab Stops + DP-010 Sentence-Boundary Spacing

> **STATUS: REFERENCE DESIGN ONLY.** This document is not an active authority.
> It describes future or proposed work. Current authoritative behavior is governed
> by `DP-010`, `DP-011`, `DP-012`, and `CANONICAL_STANDARDS_INDEX.md`.

> Two related but **separately-committed** formatter fixes: (1) explicit UFM tab stops (§3), (2) DP-010 sentence-boundary & abbreviation spacing normalization (§3a). (§3a covers the full system — one space after abbreviations/honorifics, two after sentence-ending `.` `?` `!` — not honorifics alone.)

**Branch:** `feature/stage3-workspace-core`
**Mode:** BETA_FREEZE active. Display/formatting layer only. Audit-first. One scoped commit. No schema, no canonical mutation, no new dependencies, no push/merge without explicit approval.

> **Canonical formatting authority (read first).** Spacing is governed by **DP-010 — Sentence Boundary & Abbreviation Spacing** (APPROVED), which consolidates DP-009 (honorific spacing; retained for history). The abbreviation list is sourced from **`abbreviation_registry.json`** — the single source of truth; do **not** hardcode it. Geometry, tab placement, and paragraph continuation are governed by **DP-011**. Quotation-mark/terminal punctuation placement, the **three-tab paragraph rule** (new paragraphs within testimony begin at Tab3), and direct-address capitalization are governed by **DP-012**. This DOCX pass **renders** those decisions and must not reposition quotes or invent capitalization rules. In every conflict the certified *Etminan* transcript (Miah Bardot, CSR 12129) governs over any internal spec.

---

## 0. Objective (read fully before doing anything)

The workspace Word/DOCX export renders deposition colloquy and Q/A lines with the **correct UFM tab structure** (three tabs before a named-speaker label; `\t Q. \t text` for Q/A), but the tabs are **landing in the wrong horizontal positions**. Root cause hypothesis: the export's paragraph builder sets **no explicit tab stops**, so the tab characters fall on Word's default tab interval instead of the UFM positions.

A screenshot of the current export (formatting marks ON) shows:

- The colloquy line is built as `→ → →  THE VIDEOGRAPHER:··And good afternoon.··We are…`
  - Three literal tab characters (`→ → →`) precede the speaker label — **correct convention**.
  - Two spaces after the colon (`··`) and two spaces after sentence periods — **correct**.
  - The wrapped continuation line (`on the record…`) returns to the **left margin** — **correct**.
- **The defect:** the three tabs push `THE VIDEOGRAPHER:` well past the 1.5″ position it should land at, because there are no explicit tab stops pinning tabs to 0.5″ / 1.0″ / 1.5″.

**The fix is NOT to change tab counts or text.** It is to **define explicit tab stops on every transcript body paragraph** so the tabs land at the UFM positions.

---

## 0a. PHASE 0 RESULT — RECORDED (read before Phase 1; resolves the hard stop)

A repo audit (`depo-pro` workspace) returned a **hard stop**: the tab-based DOCX in the screenshot **does not exist in the `depo-pro` repo**. Findings:

- The live React **`ExportScreen.tsx` does not generate DOCX at all** — only TXT/JSON. It literally says "DOCX: not implemented in this local remediation pass."
- The only in-repo DOCX writer is the **wave8 Python reference path** (`reference/wave8/backend/export/docx_writer.py` + `transcript/export_render.py`), and it is **space-based, not tab-based**: Q/A uses `QA_INDENT = "    "` and `"Q.  "/"A.  "`, colloquy puts `LABEL:` on its own line with space-indented body, continuations are leading spaces, `tab_level=0` hardcoded. A bundled sample `.docx` contains **no `<w:tab/>` and no `w:tabs`** — confirming space-based.
- **`document_builder.py` is NOT in this repo**, and there is no `_set_tab_stops()` helper anywhere in `depo-pro`.
- Real wave8 geometry: **left 1.25″ (1800), right 0.75″ (1080), usable 6.5″.** Tab constants exist in `geometry/profile.py` as **(360, 900, 1440, 2160, 2880)** but are **never applied** by `docx_writer.py`.

**Resolution (two codebases — they were conflated):**
- `document_builder.py` (tab-based, `_set_tab_stops`, the screenshot's source) lives in the **separate standalone desktop app** `depo_transcribe` (`C:\Users\james\PycharmProjects\depo_transcribe\`) — *not* in the `depo-pro` SaaS repo. The screenshot is the audit's "**path A: external document_builder.py flow**."
- The `depo-pro` SaaS DOCX is the **wave8 space-based path**, and DOCX is **not yet wired into the live UI** at all.

**Therefore the original premise of this prompt ("existing tabs land in the wrong place; just add tab stops") is true only for `document_builder.py` (desktop), and false for `depo-pro` (SaaS).** Phase 1 must be chosen, not assumed — see §1.2a.

> **Margin/geometry discrepancies to reconcile against the certified *Etminan* PDF (do not guess):**
> 1. **Right margin:** wave8 uses **0.75″**; the canonical platform note says **1.0″** others. The certified transcript governs — verify which the certified PDF uses.
> 2. **Tab constants:** wave8 `profile.py` = (360, 900, 1440, 2160, 2880) = 0.25″/0.625″/1.0″/1.5″/2.0″; the canonical Depo-Pro geometry (this prompt, `document_builder.py`, DP-012 §7) = **720/1440/2160/2880** = 0.5″/1.0″/1.5″/2.0″. These **do not match**. If wave8 is converted to tab-based, use the **canonical** stops and reconcile `profile.py`, not wave8's current constants.

---

## 1. Ground truth — canonical UFM tab geometry

These values are authoritative (sourced from `document_builder.py`). Courier New 12pt, 10 CPI, so each 0.5″ = 5 characters.

| Stop | Inches | Twips (DXA = in × 1440) | Used by |
|------|--------|-------------------------|---------|
| Tab1 | 0.5″ | 720 | Q./A. designation lands here |
| Tab2 | 1.0″ | 1440 | text after Q./A. lands here |
| Tab3 | 1.5″ | 2160 | named-speaker label + **first line of any new (non-Q/A) paragraph** land here |
| Tab4 | 2.0″ | 2880 | **parentheticals** (e.g. `(Exhibit No. 7 was marked for identification.)`) land here |
| Center | text-area center | see §1.1 | centered/page-center items (secondary) |

All four primary stops are **LEFT-aligned**.

### 1.1 Center tab / margins — RESOLVED by Phase 0 audit

The audit read the actual wave8 section setup: **left 1.25″ / right 0.75″ / usable 6.5″** (`geometry/profile.py`). So the wave8 text area is 6.5″ (not 6.25″). Center tab (if used) = left-offset + (6.5″ ÷ 2). ⚠ The **0.75″ right margin** conflicts with the canonical "1.0″ others" note — verify against the certified *Etminan* PDF before locking (see §0a).

### 1.2a Phase 1 — TARGET DECIDED: **Option B** (owner ratified, for beta)

**Decision:** for the beta release, keep `document_builder.py` (the standalone **`depo_transcribe`** desktop app, `C:\Users\james\PycharmProjects\depo_transcribe\`) as the certified-DOCX path. The SaaS wave8 DOCX conversion (Option A) is **deferred post-beta**, and the SaaS `ExportScreen.tsx` stays at **TXT/JSON** for beta.

**So this prompt now targets `depo_transcribe`, not `depo-pro`.** Do not modify the SaaS wave8 export for this task.

Re-scoped Phase 1 (still audit-first):
1. **Phase 0 against `depo_transcribe`:** the earlier audit ran against `depo-pro` and could not see `document_builder.py`. Re-run findings against the desktop repo — report `document_builder.py`'s current `_set_tab_stops()` coverage and which of the *current* rule-set it already implements vs. needs:
   - four LEFT tab stops at **720/1440/2160/2880** (0.5/1.0/1.5/2.0″);
   - per-line geometry (§1.2): Q./A. at Tab1/Tab2; speaker IDs **and new-paragraph first lines** at Tab3; **parentheticals at Tab4** with canonical wording;
   - the §3a DP-010 spacing pass; DP-012 punctuation (§1/§2/§2b), garble flags (§6), and the no-colon resumption by-line (§9).
2. **Hard stop**, report the gap, then implement only the missing pieces — one scoped commit each — in `depo_transcribe`.
3. Verify per §4 against the certified *Etminan* fixture, including the two geometry items in §0a (right margin 0.75″ vs 1.0″; tab constants) — those still need confirming against the certified PDF.

(Option A, the SaaS wave8 space→tab conversion, is retained in §0a as the post-beta plan; do not start it now.)

### 1.2 Per-line tab structure (already correct in the export — DO NOT change the text)

| Line type | Emitted text | Lands at (with stops set) | Continuation |
|-----------|--------------|---------------------------|--------------|
| Q. designation | `\tQ.\t{text}` | Q. at Tab1 (0.5″), text at Tab2 (1.0″) | returns to **left margin** |
| A. designation (first paragraph of an answer) | `\tA.\t{text}` | A. at Tab1 (0.5″), text at Tab2 (1.0″) | returns to **left margin** |
| New paragraph *within* testimony (a legitimate hard break inside an answer, non-Q/A) | `\t\t\t{text}` (three tabs, no label) | first line at Tab3 (1.5″) | returns to **left margin** |
| Named-speaker colloquy | `\t\t\t{LABEL}:  {text}` (two spaces after colon) | label at Tab3 (1.5″) | returns to **left margin** |
| Parenthetical (e.g. `(Exhibit No. 7 was marked for identification.)`) | `\t\t\t\t({canonical wording})` (four tabs) | first line at Tab4 (2.0″) | returns to **left margin** |
| Section header (`EXAMINATION`, `BY MR. ___:`) | centered / left-margin per current code | n/a | n/a |

**Invariants to PRESERVE (the screenshot already gets these right — do not regress them):**
- Colloquy and Q/A continuation lines return to the **left margin** (i.e. `left_indent = 0`; the indent is achieved by the leading tabs on the first line only, NOT by a paragraph left-indent).
- **Two** spaces after a sentence-ending period / `?` / `!`; **two** spaces after the colon in a speaker label.
- **One** space after an abbreviation or honorific period (`Mr.`, `Mrs.`, `Ms.`, `Dr.`, `M.D.`, `a.m.`, `p.m.`, `No.`) — in **both** speaker labels and running text. (See the separate honorific-spacing fix in §3a — the current export emits **two** here, which is wrong.)
- No non-breaking spaces (`\xa0`) anywhere — regular spaces only.
- An answer **may legitimately span multiple paragraphs.** The first paragraph carries the `A.` designation (Tab1/Tab2). Every **subsequent new paragraph** begins its first line at **Tab3 (1.5″, three leading tabs)** — the same stop as speaker IDs (parentheticals sit deeper, at Tab4 / 2.0″) — and its wrapped lines return to the **left margin (0.0″)**. Do **not** force-combine legitimate paragraphs into one block (this corrects an earlier over-correction); do **not** split a single paragraph on soft visual wrapping. A hard paragraph break → Tab3; a soft wrap → left margin. (UFM §2.11 / §9.2 / §16.5; DP-012 §7)
- Verbatim text is untouched.

> Note: `document_builder.py`'s COLLOQUY branch sets `left_indent = 1.5″`, which would hold the *continuation* at 1.5″. The certified reference transcript and the current workspace export both return colloquy continuation to the **left margin**. Match the certified-reference behavior (continuation at left margin). If you find the live export already does this, preserve it; do not copy `document_builder.py`'s 1.5″ left-indent for colloquy.

> **Return-To-Margin Continuation (DP-009/DP-010):** the rule name is **Return-To-Margin Continuation** (UFM §2.11 / §16.3) — the legacy term "hanging indent" is retired. Implement it with explicit tab stops + `left_indent = 0` + literal tabs (`\tQ.\t{text}`). **Do NOT use a negative `first_line_indent`** — that creates a true Word-style hanging indent which pushes *continuation* lines to the **right** (the opposite of this rule). Q. at 0.5″, text at 1.0″, every wrapped line back to 0″.

---

## 2. Phase 0 — AUDIT ONLY. Stop and report. Do not edit code.

1. **Identify the exact code path that produced the Word document in the screenshot.** Candidates to check and disambiguate:
   - `document_builder.py` (canonical Python formatter — already has `_set_tab_stops`; if this is the live path, the defect may be an older build).
   - `reference/wave8/backend/export/docx_writer.py` + `reference/wave8/backend/stage_s/line_builder.py` + `stage_s/formatting.py` (geometry-driven `TAB_COLLOQUY` / `TAB_QA_DESIGNATION` / `TAB_PARENTHETICAL` / `TAB_MARGIN`).
   - Any DOCX export wired into the live Workspace/Export screen. (Note: `src/components/ExportScreen/ExportScreen.tsx` currently states "DOCX: not implemented in this local remediation pass" and only exports TXT — so confirm whether the screenshot comes from a standalone Python run or a wired path.)
   - **If more than one DOCX path exists and it is unclear which generated the screenshot, STOP and report both. Do not change either until the human confirms which is live.**

2. For the identified path, report:
   - The function that builds each body paragraph and writes the tab-prefixed text.
   - Whether it currently sets explicit tab stops (`w:tabs` / `paragraph_format` tab stops, or docx-js `tabStops`). Quote the lines, or state "none found."
   - The exact tab counts emitted per line type (Q/A, colloquy, parenthetical, BY-line).
   - The section margins (left/right) actually set, and the resulting usable width.
   - Whether colloquy/Q-A continuation lines use a paragraph `left_indent` (and its value) or rely on first-line tabs only.

3. Produce a short findings block: **"Current tab handling: [explicit stops? yes/no] · [margins] · [per-line tab counts] · [continuation mechanism]."** Then **stop** for confirmation before Phase 1.

---

## 3. Phase 1 — Implementation (only after Phase 0 is confirmed)

Single scoped change: **set explicit LEFT tab stops at 0.5″/1.0″/1.5″/2.0″ (720/1440/2160/2880 twips) on every transcript body paragraph**, mirroring `document_builder.py._set_tab_stops()`. (Tab4 = 2.0″ is required for parenthetical lines; if the live code only sets three stops, four-tab parentheticals fall on Word's default interval — the same class of defect this fix targets.)

- Add/route a helper that, for each body paragraph, defines tab stops at `[720, 1440, 2160, 2880]` DXA, all left-aligned. (If the live path is `document_builder.py` itself, reconcile to its existing `_set_tab_stops`; if it's the wave8/TS path, port the equivalent.)
- Do **not** alter the emitted text, tab counts, spacing, or speaker labels.
- Keep `left_indent = 0` on Q/A and colloquy paragraphs so continuations return to the left margin (preserve current behavior).
- If parentheticals exhibit the same missing-stops defect, include them in the same explicit-stops pass (**Tab4, 2.0″**) and emit the canonical wording `(Exhibit No. N was marked for identification.)`; if they are centered, reconcile to the Tab4 left-aligned rule.
- Center tab: only touch if §1.1 confirms it's needed and currently broken; otherwise leave and note.

Commit message (one scoped change):
`fix(export): set explicit UFM tab stops (0.5/1.0/1.5in) on transcript body paragraphs`

---

## 3a. Phase 1b — Sentence Boundary Normalization (SEPARATE scoped commit)

This is a **distinct concern** from tab stops and must be a **separate commit** — do not bundle it. It implements **DP-010 (APPROVED — Sentence Boundary & Abbreviation Spacing)**, which consolidates the honorific rule and the sentence-spacing rule into **one system**: at every `.` `?` `!`, decide *sentence boundary (two spaces)* vs *abbreviation (one space)* using the **canonical abbreviation registry** (`abbreviation_registry.json`). There are **two complementary defects** in the current export, and they are the same decision applied in two directions:

1. **Honorific over-spacing** — the export emits **two** spaces after an honorific period (observed: `Ms.  Vargas`). Should be **one**.
2. **Sentence-ending under-spacing after `?`/`!`** — the export emits **one** space after a sentence-ending question mark / exclamation (observed: `happen? Anything`, `bit? What`), while it correctly emits **two** after a period. The two-space rule must apply to **all** sentence-ending punctuation `.` `?` `!`, not just `.`.

**Read the abbreviation list from the canonical registry — do not hardcode it.** If no shared registry is wired in yet, the audit must flag that, and the fix should source its list from `abbreviation_registry.json` (or a single shared module derived from it), not a private per-file list.

The correct UFM spacing, verified against the certified reference transcript (Miah Bardot, CSR 12129) at character grain in Courier (monospace), is:

| Context | Spaces | Verified example (certified PDF) |
|---------|--------|----------------------------------|
| After an **honorific / abbreviation** period (registry token) | **ONE** | `Ms. Vargas` (running text); `MR. ETMINAN:` (speaker label) — one cell after `MR.` |
| After the **colon** in a speaker label | **TWO** | `MR. ETMINAN:  I do.` — two cells after the colon |
| After a **sentence-ending period** | **TWO** | `1991.  No.  No.  No.  I'm sorry.  2001.` |
| After a **sentence-ending `?` or `!`** | **TWO** | `bit?  What do you mean` (certified p.7) — two cells, same as the period gap |
| After a **sentence end inside a closing quote** | **TWO** (after the quote) | `they're hurting."  And I take` (certified p.10) — two cells after the `"` |

Key points:
- The single-space honorific rule applies in **both** speaker labels and running Q/A body text. Honorifics in **running text are mixed case** (`Ms. Vargas`, `Dr. Etminan`), not all-caps; only the speaker-label designation is all-caps (`MR. ETMINAN:`), and even there the honorific period takes **one** space.
- This is a **pure-formatting** normalization (no meaning change, fully within the allowed normalization scope) and must not touch canonical data.
- The two normalizations **share an abbreviation/initial exclusion set** — the same list decides "this period is an abbreviation → one space" and "this period is sentence-ending → two spaces." Implement once, apply to `.` `?` `!`.
- Do **not** over-correct: don't run a blunt "collapse all double spaces" pass (that destroys the legitimate two-space sentence and colon gaps), and don't blindly two-space every `". "` (that breaks honorifics/initials). Disambiguate by the token preceding the period.
- Exclusion set (one space) = the **canonical registry** (`abbreviation_registry.json`): honorifics `Mr. Mrs. Ms. Dr.` (mixed) and `MR. MS. MRS. DR.` (label caps); single-letter initials (`J.` `R.`); inner-dotted abbreviations (`M.D.` `a.m.` `p.m.` `U.S.`); `No.`/`NO.`, `Inc.`, `Co.`, `VS.`, etc. Source this list from the registry, not a private copy.
- **`No.` carve-out:** one space only when it means "number" (followed by a figure: `No. 12129`, `NO. C-5722-24-L`). When `No.` is the spoken word *No* ending a sentence (`1991.  No.  No.  No.  I'm sorry.  2001.`) it keeps **two** spaces — never collapse `No.  No.` runs.

Reference implementation (validated against the certified fixture):
```js
const ABBR=/^(Mr|Mrs|Ms|Miss|Dr|MR|MRS|MS|DR|No|NO|St|ST|Inc|INC|Jr|Sr|vs|Vs|VS|Eur|Co|CO|Ltd|Mt)$/;
text = text.replace(/([.?!]["']) (?=[A-Z])/g, "$1  ");    // sentence end inside a closing quote
text = text.replace(/([?!]) (?=[A-Z])/g, "$1  ");          // sentence-ending ? / !
text = text.replace(/(\S+)\. (?=[A-Z])/g, (_, pre) =>
  ABBR.test(pre) || /^[A-Z]$/.test(pre) || /[A-Za-z]\.[A-Za-z]$/.test(pre)
    ? pre + ". "    // abbreviation / initial → one space
    : pre + ".  "); // sentence-ending → two spaces
```

Audit in Phase 0: locate where the export post-processes spacing (e.g. a `_post_process_text` step) and report (a) whether it inserts two spaces after honorifics, and (b) whether its two-space-after-sentence logic covers `?`/`!` or only `.`. Then fix both in Phase 1b.

Commit message:
`fix(export): UFM spacing — one space after honorifics/abbreviations, two after all sentence-ending punctuation (. ? !)`

---

## 4. Verification (required before declaring done)

1. Regenerate the workspace Word document for the Etminan fixture (or current test transcript).
2. Open in Word, enable **Show All / formatting marks (¶)**.
3. On the PROCEEDINGS page, confirm with the ruler:
   - `THE VIDEOGRAPHER:` (and every named-speaker label) — label glyph begins at exactly **1.5″**.
   - `Q.` / `A.` — designation at **0.5″**, answer/question text at **1.0″**.
   - Colloquy and Q/A continuation (wrapped) lines start at the **left margin (0″)**.
   - Two spaces after the colon and after sentence periods; no `\xa0`.
   - **One** space after honorific/abbreviation periods: `Ms. Vargas`, `Dr. Etminan`, `MR. ETMINAN:` (not `Ms.  Vargas` / `MR.  ETMINAN:`). Confirm the two-space sentence and colon gaps were **not** collapsed by the same pass.
   - **Two** spaces after a sentence-ending `?` / `!`: `bit?  What`, `happen?  Anything` (not `bit? What`). Confirm `?`/`!` get the same two-space treatment as `.`
   - **Two** spaces after a sentence end inside a closing quote: `hurting."  And` (not `hurting." And`).
   - **Lowercase** direct-address titles (DP-012): `entail, doctor?`, `Good afternoon, doctor.` stay lowercase — do **not** capitalize to `Doctor` (only sentence-initial `Doctor,` is capitalized).
   - **Multi-paragraph answers begin at Tab3** (DP-012 §7): where a long answer has a legitimate hard paragraph break, the new paragraph's first line begins at **1.5″** (three tabs, no label), and its wrapped lines return to the left margin. The first paragraph still carries the `A.` at 0.5″. Confirm a soft-wrapped line was *not* turned into a Tab3 paragraph, and a true new paragraph was *not* flattened into the prior one.
   - **Quote punctuation rendered, not altered** (DP-012): where the structuring layer placed a closing quote before a dash (`one-year" --`) or a `?` outside a quote (`August 17"?`), confirm the DOCX pass preserved it and did not reposition it.
   - **Parentheticals at Tab4 + canonical wording** (DP-012 §7): exhibit/procedural parentheticals begin at **2.0″** (four tabs) and read in full canonical form (`(Exhibit No. 7 was marked for identification.)`), not flush-left or abbreviated (`(Exhibit 7 marked)`).
4. Capture a formatting-marks screenshot of that page and present it for human verification (the human verifies in-browser/Word at each stage before proceeding).

---

## 5. Hard stops / scope boundaries

- STOP and ask if: (a) two live DOCX export paths exist; (b) the margin question in §1.1 changes the page geometry; (c) fixing tab landing would require altering emitted text or tab counts (it should not).
- Do NOT: change the Prisma/Postgres schema, mutate canonical rows, add dependencies, refactor the export architecture, touch line spacing / fonts / page size, or run `git add -A` / `git add .` (stage by explicit path only).
- One scoped change. Branch `feature/stage3-workspace-core`. No push/merge without explicit approval.
