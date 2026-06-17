# GEOMETRY_ENGINE_RULES

**Purpose.** The deterministic transform specification for Depo-Pro's Geometry Engine — the
rules that turn raw Deepgram output into UFM/Morson's-compliant transcript text. Written to
*train and instruct the correction model*: every rule is a `current → expected` transform with
explicit requirements, so the rules double as few-shot examples. Consolidated and deduplicated
from `TRANSCRIPT_FIDELITY_BACKLOG.md`.

**What this file is NOT.** It is not the knowledge base. Background and provenance live in two
companion references:
- `TRANSCRIPT_ASSEMBLY_STANDARD.md` — Texas page geometry, document assembly, indexes, `^` fields,
  certificates.
- `MORSONS_TRANSCRIPT_RULES.md` — punctuation, numbers, capitalization, abbreviations, style
  marks, paragraphing.

This file is the *engine spec*: what transform to apply, and the before/after.

**Global classification (applies to every rule below unless a rule says otherwise):**
Deterministic: **Yes** · AI Required: **No** · Reusable across all transcripts: **Yes** ·
Transcript-specific hardcoding: **Never**. The engine applies these transcript-wide; it never
encodes a fix for one specific transcript. The only rules that defer to human/AI judgment are
explicitly marked **[CONTEXT]**.

---

## 0. CONFLICT STATUS

All four register conflicts are **resolved**. Master register: `TRANSCRIPT_ASSEMBLY_STANDARD.md`
§16.

### 0.1 Tab positions — RESOLVED (Formatter model)
The canonical tab model is the **Formatter model**, resolved in
`TRANSCRIPT_GEOMETRY_STANDARD.md` §5 and recorded as conflict #2 RESOLVED in
`TRANSCRIPT_ASSEMBLY_STANDARD.md` §16. The renderer, DOCX export, and PDF export all use it.

| Element | Inches | Twips | Used for |
|---|---|---|---|
| `Q.` / `A.` marker | 0.5″ | 720 | `Q.` / `A.` designations only |
| Q/A testimony text | 1.0″ | 1440 | Q/A testimony text and wrapped continuation |
| Speaker label | 1.5″ | 2160 | Speaker labels |
| `EXAMINATION` header | 1.5″ | 2160 | Examination heading |
| Parenthetical | 1.5″ | 2160 | Parentheticals |
| `BY MR./MS. ___:` byline | 0.0″ | 0 | Left-margin byline |

### 0.2 Honorific spacing — RESOLVED
**One space after every honorific period, everywhere** (court-reporter decision, James Horton):
- **Lowercase honorific in narrative/prose:** ONE space — `Mr. Thomas`, `Ms. Zahn`, `Dr. Smith`.
- **ALL-CAPS honorific in a speaker label or by-line:** ONE space — `MR. NUNEZ:`,
  `BY MS. MALONEY:`.
- Sentence-ending punctuation: TWO spaces. Colon in a speaker label: TWO spaces. (These are
  separate rules and are unchanged — only the *honorific period* takes one space.)

Supersedes the earlier "two spaces in ALL-CAPS labels" reading. Tracked as conflict #1 in
`TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.

### 0.3 Dash glyph — RESOLVED
The transcript record uses the **double hyphen `--`** for interruptions, false starts,
self-corrections, resumed thoughts, and mid-word cutoffs. The **em-dash glyph `—` is not used** in
the record. Recorded as conflict #3 RESOLVED in `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.

### 0.4 By-line attribution format — RESOLVED
Inline resumed-question attribution renders as `(BY MR. NUNEZ)` with **no colon after `BY`** and
travels at the **Q/A testimony-text position (1.0″ / 1440 twips)** with the resuming question.
Standalone `BY MR./MS. ___:` bylines render at the **left margin (0.0″ / 0 twips)**;
`EXAMINATION` renders at **1.5″ / 2160 twips**. Recorded as conflict #4 RESOLVED in
`TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.

---

## 1. Page geometry

| Property | Requirement |
|---|---|
| Page size | US Letter, 8.5″ × 11″ |
| Format box | Solid top/bottom/left/right marginal lines enclosing the text |
| Text area | Exactly 6.5″ wide |
| Text start | One character inside the left marginal line |
| Lines per page | Exactly 25, numbered 1–25, numbers **outside** the left format box |
| Line spacing | Body double-spaced; **blank lines prohibited** in testimony (anti-insertion) |
| Font | Courier New 12 pt (≈ 9–10 pitch court-reporting standard) |
| Pagination | 25 lines/page enforced; continuation handled by the pagination engine, never by blank padding |

Applies to every output target (§11).

---

## 2. Tab hierarchy

Enforce the fixed Formatter positions from §0.1.

- **0.5″ / 720 →** `Q.` / `A.` markers only.
- **1.0″ / 1440 →** Q/A testimony text immediately after the marker and on wrapped continuation.
- **1.5″ / 2160 →** speaker labels, examination headers, parentheticals.
- **0.0″ / 0 →** standalone `BY MR./MS. ___:` bylines at the left margin.

---

## 3. Q/A formatting

**Transform:**
```
current:   Q. Good afternoon. Can you please state your full name for the record?
           A. Heath Thomas.
expected:  [TAB0.5]Q.[TAB1.0]Good afternoon.  Can you please state your full name for the record?
           [TAB0.5]A.[TAB1.0]Heath Thomas.
```
Requirements: `Q.`/`A.` at 0.5″ / 720; text at 1.0″ / 1440; markers and text each vertically aligned;
two spaces after every sentence-ending period (note the double space after "afternoon.").

**Wrapping — testimony-text continuation.** When testimony wraps, subsequent lines return to the
**Q/A testimony-text position (1.0″ / 1440 twips)**, never under the `Q.`/`A.` marker and never to
the left text margin
(`TRANSCRIPT_GEOMETRY_STANDARD.md` §6).
```
[TAB0.5]Q.[TAB1.0]Please state your name and address and
               your employer and your title.
```

---

## 4. Numbers & dates (deterministic when context is unambiguous)

**Transform:**
```
current:   A. Fifty seven, May seventh, nineteen sixty eight.
expected:  [TAB1]A.[TAB2]57, May 7, 1968.
```
- Ages → figures (Morson Rule 175): `Fifty seven` → `57`.
- Complete date → figures for day and year, drop ordinals (Morson Rule 179):
  `May seventh, nineteen sixty eight` → `May 7, 1968`.
- **[CONTEXT]** When the source is ambiguous (could be a number-as-word in another sense), defer
  to human review rather than forcing the transform.
- Display-layer only: never alter raw utterance timings. Full number table in
  `MORSONS_TRANSCRIPT_RULES.md` §3.

---

## 5. Speaker labels

### 5.1 Placement & typography
At 1.5″ / 2160 twips; **bold, uppercase, colon-terminated**, then **two spaces** before text.
```
current:   THE REPORTER: Good afternoon.
expected:  [TAB1.5]THE REPORTER:  Good afternoon.
current:   MR. NUNEZ: Please state your name.
expected:  [TAB1.5]MR. NUNEZ:  Please state your name.
```
Requirements: exactly one colon; two spaces after the colon; no `\xa0` non-breaking spaces.

### 5.2 Honorific normalization (deterministic map)
Normalize spoken/raw forms to canonical honorifics, then case them by context (§0.2).

| Raw | Canonical (prose) | Speaker label |
|---|---|---|
| mister / mr / Mr | Mr. | MR. |
| miss / ms / Ms | Ms. | MS. |
| missus / mrs / Mrs | Mrs. | MRS. |
| doctor / dr / Dr | Dr. | DR. |

```
current:   mister Nunez   |  miss Zahn    |  NUNEZ:      |  THOMAS:     |  KAHN:
expected:  Mr. Nunez      |  Ms. Zahn     |  MR. NUNEZ:  |  MR. THOMAS: |  MS. KAHN:
```
Requirements: exactly one trailing period; no duplicated punctuation; never omit the honorific;
preserve surname spelling. Honorific in a label is resolved from participant metadata, not
guessed.

### 5.3 Standardized labels by role
- **Attorneys:** `MR./MS./MRS./MISS LASTNAME:` — include first name only when two same-gender
  attorneys share a surname.
- **Court reporter:** always `THE REPORTER:` — never `THE COURT REPORTER:`.
- **Judge:** `THE COURT:`.
- **Videographer:** `THE VIDEOGRAPHER:`.
- **Interpreter:** `THE INTERPRETER:`.
- **Witness:** `THE WITNESS:` **only** during oath, procedural colloquy, or off-examination
  discussion. During examination, witness testimony is `A.`, never `THE WITNESS:`.

---

## 6. Interrupted examination (by-line attribution)

When examination resumes after an objection or colloquy, attribute the resuming question inline
rather than opening a new examination section.
```
expected:  [TAB0.5]Q.[TAB1.0](BY MR. NUNEZ)  Please state your name.
           [TAB0.5]Q.[TAB1.0](BY MS. ZAHN)  Did you see the incident?
```
Requirements: preserve attorney identity across the interruption; maintain examination
continuity; do **not** start a new examination heading solely because of an objection/colloquy.
The inline `(BY MR./MS. ___)` attribution sits at the **Q/A testimony-text position (1.0″ /
1440 twips)** and travels with the question text; it is distinct from the standalone
`BY MR./MS. ___:` byline at the **left margin (0.0″ / 0 twips)**. (Inline attribution punctuation
resolved in §0.4.)

---

## 7. Punctuation

### 7.1 Period & question mark
- Statements/polite requests → period; two spaces after a sentence-ending period.
  `Please tell us your name and address.`
- Direct questions → question mark; two spaces after.
  `[TAB1]Q.[TAB2]Were you in the pub when the fight started?`

### 7.2 Condensed fragments **[CONTEXT]**
Fragments that function as complete statements take a period:
`Not me.` in answer form · `Approximately.` in question form · `Objection.  Form.`
A fragment phrased as a question takes a question mark **only** when interrogative inflection is
present: `Approximately?` vs `Approximately.` in question form — this distinction depends on the audio,
so flag for review when inflection is uncertain.

### 7.3 Sentence vs abbreviation spacing
- Two spaces after sentence-ending `.`/`?`: `The witness complied.  The examination continued.`
- One space after a mid-sentence abbreviation: `Mr. Thomas`, `Ms. Zahn`, `Dr. Smith`.
- An abbreviation that ends a sentence keeps **one** period (no doubling):
  `I spoke with Mr. Thomas.` — never `Mr. Thomas..`.

### 7.4 Dash (glyph per §0.3)
- Mid-sentence interruption / false start / self-correction: `--`.
  `I was walking -- no, I was running.`
- Resumed thought: a second dash, resumed word not capitalized unless proper noun / `I`.
  `I was going to -- no, wait.  -- tell you what happened.`
- Mid-word cutoff: `--` with **no** surrounding spaces. `Let me expl--` · `subp--`
- **Never** place a comma, colon, or semicolon immediately before or after a dash.

### 7.5 Comma
Standard Morson's comma rules (see `MORSONS_TRANSCRIPT_RULES.md` §2).
`The clerk will reread page 73, and we will count each use of the word.`

### 7.6 Parentheticals
Reporter-added notations at Tab 4: complete sentence, first word capitalized, end punctuation
**inside** the closing paren, no blank lines before/after.
- Multi-line parentheticals keep the Tab 4 indent on wrap; do not return to the left margin.
- **Objectivity [CONTEXT]:** parentheticals may record gestures, procedural events, readbacks,
  exhibit markings, non-verbal responses — but **never** describe distance, size, weight, intent,
  or emotion. The reporter does not testify for the witness.
- Approved set: `(Indicating.)` `(Moving head up and down.)` `(Moving head side to side.)`
  `(Pointing.)` `(Drawing.)` `(Pausing.)` `(Weeping.)` `(Witness complies.)`
  `(No verbal response.)` `(The witness was sworn.)` `(A recess was taken at 12:05 p.m.)`

---

## 8. Legal citations & Latin (italics)

### 8.1 Case names
Italicize the full case name **including `v.`**, everywhere it appears (body, readback, argument,
indexes, tables of authorities). Do **not** italicize the reporter citation, volume, page, court,
or year.
```
current:   Gold v. Shop-Rite, Inc., 384 U.S. 436
expected:  *Gold v. Shop-Rite, Inc.*, 384 U.S. 436
current:   Miranda v. Arizona, 384 U.S. 436
expected:  *Miranda v. Arizona*, 384 U.S. 436
```

### 8.2 Short-form references
Remain italicized: `The Dolch case` → `*Dolch*`.

### 8.3 Citation reference terms & Latin
Italicize `*supra*`, `*infra*`, `*ibid.*`, `*ex rel.*`, `*in re*`, `*amicus curiae*`, and the
full string containing them: `*United States ex rel. La Fera v. Jackson*`.

### 8.4 General foreign expressions **[CONTEXT]**
Italicize uncommon/unfamiliar expressions (`*res ipsa loquitur*`, `*voir dire*`, `*de facto*`);
commonly accepted ones may stay unitalicized (`bona fide`, `pro rata`, `per annum`). Borderline
cases → review.

### 8.5 Citation spacing
Numeric citation components separated by a colon take **no** surrounding spaces:
`Title 2A : 11-13` → `Title 2A:11-13`. Applies to statutes, regulations, chapter/verse, reporter
references.

### 8.6 Italics across outputs
Italics must survive in: Workspace transcript view, DOCX export, PDF export, and clipboard copy
when the target supports formatting (plain-text clipboard may drop them).

---

## 9. Verbatim preservation (overrides cleanup)

Never remove fillers (`uh`, `um`, `so`, `well`, `okay`, `Mm-hmm`), false starts, stutters,
grammatical errors, or profanity. The engine formats; it does not rewrite the record. Acknowledg-
ment "Okay" before a new question is its own sentence: `Okay.`, not a comma splice.

---

## 10. Output targets & acceptance criteria

Every rule applies consistently across: **Workspace transcript · Copy Transcript · DOCX export ·
PDF export · Certification output.**

The result must visually resemble a certified Texas deposition transcript:
- 25-line page geometry with format box and line numbers
- chosen UFM tab model applied uniformly (§0.1)
- hanging-indent Q/A
- correct speaker-label placement, casing, and colon spacing
- parentheticals at the parenthetical tab, navy blue
- double-spaced body, Courier New 12 pt, no blank testimony lines
- citation/Latin italics preserved
- honorific spacing per §0.2; dash glyph per §0.3; by-line form per §0.4

**No transcript-specific hardcoding. All transforms deterministic and reusable, except items
marked [CONTEXT], which defer to human/AI review.**

---

## 11. Cross-reference
- Geometry/assembly knowledge → `TRANSCRIPT_ASSEMBLY_STANDARD.md`
- Punctuation/number/style knowledge → `MORSONS_TRANSCRIPT_RULES.md`
- Open conflicts master list → `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16 (plus §0 here for engine-blocking items)
