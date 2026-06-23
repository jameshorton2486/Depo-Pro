# DP-012 — Quotation Punctuation, Date Reconciliation & Inline Garble Flags

| Field | Value |
|-------|-------|
| **Decision ID** | DP-012 |
| **Title** | Quotation Punctuation, Date Reconciliation & Inline Garble Flags (Morson reconciliation surfaced from medical-deposition QA review) |
| **Status** | **APPROVED — ratified 2026-06-23, with revised owner-approved text in §1 and §5.** |
| **Authority** | Certified Transcript Ground Truth — *Etminan* validation fixture (Miah Bardot, CSR 12129) |
| **Source** | QA review of structured medical-deposition output (disc-degeneration / whiplash-article blocks) |
| **Scope** | AI Structuring Layer (primary) · Copy Transcript · DOCX/PDF export rendering |
| **Defers to** | DP-010 (spacing) |

---

## Authority hierarchy (the rule that resolves every conflict in this record)

> **Certified transcript > Depo-Pro decision record > Morson / UFM external guide.**

Morson's *English Guide for Court Reporters* and the Texas UFM are adopted as the typography standard **only where they do not conflict with the certified record or an existing DP decision.** Where they conflict, the certified record governs and the Morson rule is rejected for this platform. This record adopts the approved punctuation, normalization, flagging, paragraph, and capitalization rules listed below as binding formatting authority for the covered topics.

---

## 1. Quote / dash interruption handling — REVISED AND APPROVED

When dashed interruption formatting is applied, **no comma is used immediately before the interrupting dash**, and dash placement must remain consistent with the approved interrupting-dash rule in this record.

Approved outcome:

- remove any comma that sits immediately against the interrupting dash
- place the dash outside the quoted material when the speaker breaks off after the quotation
- do not create a conflict with §2b

```
one-year," -- no.      →   one-year" -- no.
from, um, -- as a person grows   →   from, um -- as a person grows
```

The formatting authority here is the approved owner outcome, not the earlier rejected wording.

## 2. Question mark outside the closing quote when the sentence — not the quote — is the question (Morson Rules 16 & 108) — ADOPT

When the **entire sentence** is a question but the **quoted material is not**, the question mark goes **outside** the closing quotation mark.

```
August 17th?"          →   August 17"?      (sentence is the question; the cited title is not)
```

(Contrast: if the *quoted material itself* is the question, the `?` stays inside the quote. This rule requires judging which is the case — so it is applied with confidence and flagged when ambiguous; see §6.)

## 2b. No comma introducing or ending dashed material (Morson Rule 91) — ADOPT

A comma is **never** used to introduce or close dashed (em-dash) material. Drop a comma that sits immediately against a dash; leave all other commas untouched.

```
from, um, -- as a person grows   →   from, um -- as a person grows
```

The filler (`um`) is preserved verbatim — only the comma immediately before the dash is removed. Do not remove commas that are not adjacent to a dash.

## 3. Two spaces after a sentence-ending closing quote — ALREADY DP-010 (cross-reference only)

```
tissue damage." That's not   →   tissue damage."  That's not
support of it." And I'll      →   support of it."  And I'll
```

This is **not new** — it is the closing-quote clause of **DP-010** (the two spaces follow the closing quote). Listed here only because the QA review surfaced it; the authority remains DP-010 and `abbreviation_registry.json`.

## 4. Number / date normalization — APPROVED

Number and date normalization governed by fixed court-reporting rules is treated in this platform as **deterministic transcript formatting**, not AI correction.

Approved examples include:

- `August 17th` → `August 17`
- `fifty-seven` → `57` where the governing transcription rule calls for figures
- ages rendered as figures where the governing transcription rule calls for figures

These transforms may be applied automatically by the Canonical Formatting Engine when the governing rule is clear and deterministic.

Transforms with no clear governing deterministic rule remain outside this section and should not be guessed at automatically.

## 5. Capitalizing a direct-address title (Morson Rule 215) — REVISED AND APPROVED

Direct-address titles of respect are treated in this platform as **deterministic transcript formatting** when the title is being used in direct address rather than as a descriptive noun.

Approved examples:

- `Doctor`
- `Judge`
- `Counselor`

Examples in use:

- `Tell us, Doctor, what dosage you prescribed.`
- `Would you clarify that, Judge?`
- `Go ahead, Counselor.`

Boundary conditions:

- this rule applies to direct address
- `Dr.` + surname (`Dr. Etminan`) remains unaffected
- descriptive lower-case uses that are not direct address are not rewritten by this rule
- this authority is housed in `DP-012`; it does not defer to `DP-011`

## 6. Inline garble flags — flag, never silently correct — ADOPT

A suspected **ASR (speech-to-text) garble** with **no authoritative registry/CaseRecord match** is **flagged inline, never corrected.** This is distinct from DP-007 (name correction), which *applies* a fix only when an exact authoritative participant match exists. A garble has no such match, so the verbatim token is preserved and a scopist flag carries the suspected reading for human audio verification.

**Canonical inline format:**

```
<verbatim-token> [SCOPIST: FLAG N: "<flagged token>" — verify from audio; likely "<suspected reading>"]
```

- The **verbatim token stays in the text** (testimony is never rewritten).
- `N` is numbered **sequentially within the block/section**, and **each occurrence gets its own number** even when the same token recurs.
- The suspected reading is offered as `likely "…"` and is **not applied**.

**Verified examples from the QA review:**

| Verbatim (kept) | Inline flag | Suspected reading |
|-----------------|-------------|-------------------|
| `lameness` | `[SCOPIST: FLAG 1: "lameness" — verify from audio; likely "layman's"]` | layman's |
| `know` (…did know in MRIs) | `[SCOPIST: FLAG 1: "know" — verify from audio; likely "note"]` | note |
| `metastructures` (1st) | `[SCOPIST: FLAG 1: "metastructures" — verify from audio; likely "ligamentous structures"]` | ligamentous structures |
| `metastructures` (2nd) | `[SCOPIST: FLAG 2: "metastructures" — verify from audio; likely "ligamentous structures"]` | ligamentous structures |
| `level` (operating level) | `[SCOPIST: FLAG 3: "level" — verify from audio; likely "table"]` | table |

**Two flag grains coexist:**
- **Block/line grain** (existing DP-004): speaker/structure uncertainty, e.g. `[SCOPIST: FLAG] Unable to confidently identify SPEAKER 1. Review audio at 00:14:32.`
- **Inline word grain** (this rule): suspected content garble embedded in the testimony text.

**Clean-delivery stripping:** the existing rule "remove `[SCOPIST: FLAG]` lines" handles block-grain flags. For inline flags, strip the bracketed `[SCOPIST: FLAG N: …]` span **only**, and **retain the preceding verbatim token**. Never drop the token with the flag.

---

## 7. Paragraphs within testimony: the three-tab rule (CORRECTED)

> **Correction notice.** An earlier version of this section (and the QA reviews that fed it) said a long answer must be combined into *one continuous paragraph*. That was an **over-correction.** A lengthy answer **may legitimately contain multiple paragraphs**, and the UFM specifies exactly how they are indented.

**Authority:** Texas UFM §2.11, §9.2, §16.5. A paragraph begins with three tabs **unless** it begins with a `Q.` or `A.` designation.

**Tab architecture:**
- **Tab 1 (0.5″)** — the `Q.` / `A.` designation only.
- **Tab 2 (1.0″)** — the text immediately following `Q.` / `A.`.
- **Tab 3 (1.5″)** — speaker IDs (`MR. RAMON:`) **and the first line of any new paragraph** within testimony.
- **Tab 4 (2.0″)** — **parentheticals**, which use the **full canonical wording** (`(Exhibit No. 7 was marked for identification.)`, not `(Exhibit 7 marked)`). *(This resolves an earlier ambiguity: a prior note listed parentheticals at Tab3; the certified/QA authority places them at the **fourth** tab stop, consistent with the recorded 4-tab parenthetical convention.)*

In every case, subsequent (wrapped) lines return to the **left margin (0.0″)** via Return-To-Margin Continuation — never a Word-style hanging indent (the legacy term "hanging indent," which appeared in the QA-review prose, is retired; see DP-009/DP-010).

Hold the distinction: a **hard paragraph break** in lengthy testimony starts a new paragraph at **Tab 3**; a **soft visual line-wrap** simply returns to the left margin and is **not** a new paragraph. Do not force-combine legitimate paragraphs, and do not fragment one paragraph on soft wraps.

**Visual example — a paragraphed answer (`[TAB]` = one tab):**
```
[TAB]A.[TAB]Sure.  So, in my experience treating patients for the past 24, 25 years,
it is seldom when a person is involved in a single event, such as a car accident,
where essentially they're seated, seat belted, what have you, um, where they don't
sustain any other injuries, and they sustain isolated disc pathology.
[TAB][TAB][TAB]However, this is based on reasonable medical probability more likely
than not.  I mean, is it possible that somebody has disc pathology?  It's possible,
but it's unlikely.
```
The first paragraph opens with `[TAB]A.[TAB]` (Tab 1 designation, Tab 2 text). The second paragraph opens with `[TAB][TAB][TAB]` (three tabs → first line at Tab 3, 1.5″). Both paragraphs' wrapped lines return to the left margin.

---

## 9. Resumption by-line format (RATIFIED) — `(BY MR. ___)`, no colon

When examination resumes after a colloquy interruption (objection, etc.), the examining attorney is re-identified with an **inline resumption by-line** at the start of the `Q.` text:

```
[TAB]Q.[TAB](BY MR. BENTLEY) So, I guess having said that, do you...
```

- Geometry: `\tQ.\t(BY MR. ___) {question text}` — `Q.` at Tab1 (0.5″), tab to Tab2 (1.0″), then `(BY MR. ___)`, then **one** space, then the question. Wrapped lines return to the left margin.
- Form: **`(BY MR. ___)` with no colon after `BY`.** This **supersedes** the earlier recorded convention `(BY: MR. JENKINS)` (colon); the no-colon form is the one the certified-style QA reviews use and is now canonical.
- One space after the honorific period inside the by-line (`MR. BENTLEY`, DP-010).

## Directive

1. `DP-012` approves §2, §2b, §4, §6, §7, and §9 as written in their ratified form, and approves the revised owner-aligned text in §1 and §5. Reaffirm §3 under `DP-010`.
2. Consuming prompts **cite DP-012** rather than re-deriving or hardcoding these rules.
3. Apply §1/§2 as confidence-gated formatting; **flag on ambiguity** rather than guessing which clause is the question.
4. **Do not change spoken testimony content.** Only punctuation placement, spacing, and flagging.
5. The Canonical Formatting Engine may apply deterministic formatting under this record and may emit deterministic flags under §6, but it may not guess at uncertain content.
