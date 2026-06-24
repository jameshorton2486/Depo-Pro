# DP-012 — Quotation Punctuation, Date Reconciliation & Inline Garble Flags

| Field | Value |
|-------|-------|
| **Decision ID** | DP-012 |
| **Title** | Quotation Punctuation, Date Reconciliation & Inline Garble Flags (Morson reconciliation surfaced from medical-deposition QA review) |
| **Status** | **APPROVED — ratified 2026-06-23; amended 2026-06-24: §4 split into 4a deterministic figures / 4b suggestion-only date ordinals; §5 reverted to certified-aligned (no auto-capitalization). Supersedes the 2026-06-23 §4/§5 text.** |
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

## 4. Number / date normalization — APPROVED (figures), SUGGESTION-ONLY (date ordinals)

> **Supersedes the 2026-06-23 version of §4**, which framed all number/date normalization as
> deterministic and auto-applicable (example `August 17th → August 17`). That framing contradicted
> the certified record (which retains spoken-date ordinals) and the locked normalization-scope
> decision (interpretive transforms removed from auto-apply). Corrected below.

Number and date handling splits into two distinct classes:

**4a. Figures-for-numbers — APPROVED as deterministic (bounded).**
Spoken numbers are rendered as figures **only where the governing transcription rule is
unambiguous** and the result matches certified practice. The Canonical Formatting Engine may apply
these automatically.
- `fifty-seven` → `57` (ages and similar counts rendered as figures)
- `50 to 60 percent` → figures (matches certified usage)

This is **not** a blanket spoken-number→digit pass. Do **not** auto-convert where the rule is not
clearly determinate, including: sentence-initial numbers, "one" used as a pronoun ("the one who…"),
fractions, and idiomatic quantities ("a hundred"). Where ambiguous, leave the token as transcribed.
The certified Etminan transcript is the boundary reference for which conversions are in-scope.

**4b. Date ordinal stripping — SUGGESTION-ONLY (not auto-applied).**
Stripping the ordinal from a spoken date (`August 17th` → `August 17`) is **not** an automatic
transform. The certified record retains spoken-date ordinals — "September 15th, 2023," "October
18th," "May 23rd," "December 19th" — so auto-stripping would diverge from certified style.
- Handle as a **reversible, human-confirmable suggestion** only (per DP-008), recorded in
  `transforms` with `reversible: true`, never silently auto-applied, shipped disabled by default.
- This matches the AI Structuring prompt's DP-008 handling; §4b and DP-008 must stay in agreement.

## 5. Direct-address title capitalization — certified record governs; NOT auto-capitalized

> **Supersedes the 2026-06-23 version of §5**, which adopted Morson Rule 215 to capitalize
> direct-address titles ("Doctor," "Judge," "Counselor") as deterministic formatting. That reversed
> the prior certified-aligned decision and contradicted (a) the certified Etminan record (lowercase,
> 13 instances), (b) the AI Structuring prompt's DP-002b, (c) CHANGELOG_dp012_qa_review (REJECTED),
> and (d) DP-012's own authority hierarchy (certified > Morson). Corrected below.

A professional title used as **direct address without a surname** is **not** capitalized, and is
**never auto-capitalized** by any engine. The certified record governs.

- Correct (certified): `Good afternoon, doctor.` · `what does that surgery entail, doctor?` ·
  `read the whole thing to yourself, doctor.`
- The only capital form is **sentence-initial**, which is ordinary sentence capitalization
  (`Doctor, I'm going to mark...`), not a direct-address capitalization rule.
- `Dr.` + surname (`Dr. Etminan`) is unaffected — that is an honorific abbreviation, not a
  direct-address title.

**Morson Rule 215 is rejected for this platform** on this point, because the certified record
outranks Morson. Distinguishing vocative direct address from descriptive use ("the doctor said") is
a judgment call, not a deterministic transform; therefore even as a suggestion it must **flag, not
auto-correct.** Do not let any QA pass re-introduce the capital (see the standing guard in the AI
Structuring prompt's DP-002b).

> **House-style override clause (only if the owner later chooses to depart from certified):** Adopting
> Morson-style capitalization going forward would be a deliberate departure from certified ground
> truth. If ever chosen, it must be recorded **as an explicit override of the authority hierarchy**
> in a new decision record — not encoded here as if consistent with the certified record — and it
> still may not be auto-applied (vocative detection is not deterministic).

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

1. §5 directs that direct-address titles follow the certified record (lowercase, not auto-capitalized); Morson Rule 215 is rejected on this point. §4a (figures) may be applied deterministically within its bounds; §4b (date ordinals) is suggestion-only per DP-008.
2. Consuming prompts **cite DP-012** rather than re-deriving or hardcoding these rules.
3. Apply §1/§2 as confidence-gated formatting; **flag on ambiguity** rather than guessing which clause is the question.
4. **Do not change spoken testimony content.** Only punctuation placement, spacing, and flagging.
5. The Canonical Formatting Engine may apply deterministic formatting under this record and may emit deterministic flags under §6, but it may not guess at uncertain content.
