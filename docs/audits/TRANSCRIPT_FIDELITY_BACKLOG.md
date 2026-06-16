# TRANSCRIPT_FIDELITY_BACKLOG

**Purpose.** The working gap tracker for transcript fidelity. Each item records an observed
difference between current application output and a correct certified transcript, classified so it
can be clustered into an engine and turned into a bounded implementation prompt. This is the
*driver* doc; canonical rule detail lives in the reference set.

**Workflow this serves:** review real transcripts → record each visible gap here → cluster items
into engines → build the next engine from the backlog. Items are reusable engine rules, never
one-off corrections for a single transcript.

**Reference set (canonical detail — backlog items cite these rather than duplicate them):**
- `TRANSCRIPT_GEOMETRY_STANDARD.md` — page geometry, canonical tab model, wrapping.
- `GEOMETRY_ENGINE_RULES.md` — deterministic transforms (current → expected).
- `MORSONS_TRANSCRIPT_RULES.md` — punctuation, numbers, capitalization, style marks.
- `TRANSCRIPT_ASSEMBLY_STANDARD.md` — assembly, indexes, certificates, open-conflict register (§16).
- `WORKSPACE_EDITING_AND_PROOFING.md` — editing + low-confidence proofing requirements.

**Item template:** Issue · Current → Expected · Classification (Engine / Category / Priority /
Deterministic / AI Required / Reusable / Transcript-Specific) · Requirements · Acceptance Criteria.

All items below cluster into the **Transcript Geometry Engine** (see §6). Build that engine first;
the Procedural Reconstruction and Word-Style Editing engines build on these standards.

---

## ITEM 1 — Q/A Formatting & Transcript Geometry

### Issue
Current rendering does not follow court-reporting Q/A geometry or Morson's punctuation spacing.

### Current → Expected
```
current:
Q. Good afternoon. Can you please state your full name for the record?
A. Heath Thomas.
Q. Okay. And can you please state your age and date of birth?
A. Fifty seven, May seventh, nineteen sixty eight.

expected:
[TAB]Q.[TAB]Good afternoon.  Can you please state your full name for the record?
[TAB]A.[TAB]Heath Thomas.
[TAB]Q.[TAB]Okay.  And can you please state your age and date of birth?
[TAB]A.[TAB]57, May 7, 1968.
```
(Two spaces after "afternoon." and "Okay."; ages → figures; date → `May 7, 1968`.)

### Classification
Engine: Transcript Geometry Engine · Category: Q/A Geometry, Transcript Formatting, Punctuation
Normalization · Priority: Critical · Deterministic: Yes · AI Required: No · Reusable: Yes ·
Transcript-Specific: No.

### Requirements
- `[TAB1]Q.[TAB2]text` / `[TAB1]A.[TAB2]text` per the canonical tab model
  (`TRANSCRIPT_GEOMETRY_STANDARD.md` §5). Markers at Tab 1, text at Tab 2.
- Wrapped lines return flush to the left text margin (0.0″), not under the Q./A. marker.
- Numbers/dates: ages → figures (Morson 175); complete date → figures, drop ordinals (Morson 179).
  Deterministic when context is unambiguous; otherwise human review.

### Acceptance Criteria
Tabbed Q/A with hanging indent, two-space terminal spacing, normalized numbers/dates, across
Workspace, Copy Transcript, DOCX, PDF, Certification. No transcript-specific hardcoding.

---

## ITEM 2 — Morson's Punctuation & Transcript Formatting Standards

### Issue
Transcript punctuation does not yet follow Morson's court-reporting standards. Transcript-wide
rules, applied once for every transcript.

### Classification
Engine: Transcript Geometry Engine · Category: Punctuation Standardization, Court-Reporting Style
· Priority: Critical · Deterministic: Yes (except [CONTEXT]) · AI Required: No · Reusable: Yes ·
Transcript-Specific: No.

### Rules (canonical detail in `MORSONS_TRANSCRIPT_RULES.md`)
**1. Period.** Statements, commands, indirect questions, polite requests-as-questions, condensed
fragment answers (`A.  Not me.`). Two spaces after a sentence-ending period. Period inside a
closing quote. Sentence ending in an abbreviation keeps one period (`Mr. Thomas.`, never `..`).
**2. Question Mark.** Direct questions, connected series, echo questions (`It's true, isn't it?`).
Two spaces after. Placement by quotation logic.
**3. Exclamation Point.** Do not use — replace with a period.
**4. Semicolon.** Related independent clauses with no conjunction; appended verification question
(`You were at the bar; isn't that right?`); series items containing commas. Outside quotes.
**5. Colon.** Lists/enumerations/formal quotations; after speaker labels and `QUESTION:`/`ANSWER:`
readback; two spaces after a speaker-label colon; not after a preposition or "that"; outside quotes.
**6. Comma.** Clauses joined by a conjunction, series, appositives, direct address. Comma after
conversational fillers (`Now,` `Well,`) but not after logical openers (`so`, `yet`, `hence`, `thus`).
**7. Dash.** Interruptions, false starts, self-corrections, resumed thoughts. Spaced dash; mid-word
cutoff attaches directly (`subp--`); never comma/colon/semicolon adjacent; resumed word not
capitalized unless proper noun/`I`. **Glyph open — §5.**
**8. Quotation Marks.** Direct quotes, words-as-words, short titles; nested = single quotes;
periods/commas inside, semicolons/colons outside, question marks by logic.
**9. Parentheses.** Reporter notations only; complete sentence, capitalized, end punctuation inside,
Tab 4, navy blue. **[CONTEXT]** no subjective qualifiers (distance/size/weight/intent/emotion).
**10. Apostrophe.** Possession, contractions, omitted figures (`'57`), decades (`'80s`), plurals of
uncapitalized letters (`a's`), verb forms (`X'd out`); singular noun ending s/z takes `'s` only if
the extra syllable is spoken.
**11. Hyphen.** Compound adjectives before the noun, spelled-out fractions, double surnames;
prefixes `pre/post/anti/non` solid unless proper noun or triple letters; `uh-huh`/`uh-uh` always
hyphenated.
**12. Italics.** See ITEM 4 (citations/Latin) — elevated to its own item.
**13. Ellipsis.** Three spaced periods internal, four at sentence-ending omission; trailing-off =
three spaced periods; distinct from the dash.
**14. Slant.** Figure dates, per/over ratios (`24/7`, `120/80`), interchangeable (`and/or`),
dual-purpose nouns (`cashier/checker`), poetry/song line breaks; numeric citation colon no spaces
(`Title 2A:11-13`).

### Acceptance Criteria
Conforms to Morson's wherever deterministic; reusable; no hardcoding; compatible with UFM geometry.

---

## ITEM 3 — Speaker Label Formatting & Standardized Designations

### Issue
Labels render as bare surnames without honorifics and without UFM placement.

### Current → Expected
```
current:  THOMAS:        NUNEZ:        mister Nunez     BY NUNEZ:
expected: MR. THOMAS:    MR. NUNEZ:    Mr. Nunez        BY MR. NUNEZ:
```

### Classification
Engine: Transcript Geometry Engine · Category: Speaker Label Formatting, UFM Compliance · Priority:
Critical · Deterministic: Yes · AI Required: No · Reusable: Yes · Transcript-Specific: No.

### Requirements
- **Placement:** Tab 3 (three tabs → 1.0″ / 1440 twips). Wrapped text → hanging indent to 0.0″.
- **Typography:** BOLD ALL CAPS, colon-terminated, two spaces after the colon.
- **Honorific:** normalized from participant metadata; honorific always included; exactly one period;
  no duplicated punctuation. **One space after the honorific period** in a label/by-line
  (`MR. NUNEZ:`) — resolved, §5.
- **Standardized designations:**
  - Attorneys → `MR./MS./MRS./MISS LASTNAME:` (first name only if two same-gender attorneys share a
    surname).
  - Court reporter → `THE REPORTER:` (never `THE COURT REPORTER:`).
  - Judge → `THE COURT:`. Videographer → `THE VIDEOGRAPHER:`. Interpreter → `THE INTERPRETER:`.
  - Witness → `THE WITNESS:` only in oath/colloquy/off-examination; during examination it is `A.`.
- **Interrupted examination:** resuming question carries inline attribution `Q.  (BY MR. NUNEZ)  …`;
  preserve attorney identity; do not open a new examination section for an objection/colloquy.
  (By-line punctuation form pending §5.)

### Acceptance Criteria
Correct labels, placement, casing, and colon spacing across all outputs. Detail in
`GEOMETRY_ENGINE_RULES.md` §5–6, `TRANSCRIPT_GEOMETRY_STANDARD.md` §5–7. No hardcoding.

---

## ITEM 4 — Legal Citation & Latin Term Formatting (Italics)

### Issue
Legal citations and Latin terms render as plain text. This is a deterministic rendering/export
rule, not a transcription problem — the words are already present.

### Current → Expected
```
current:  Gold v. Shop-Rite, Inc., 384 U.S. 436
expected: *Gold v. Shop-Rite, Inc.*, 384 U.S. 436
current:  Miranda v. Arizona, 384 U.S. 436
expected: *Miranda v. Arizona*, 384 U.S. 436
```

### Classification
Engine: Transcript Geometry Engine · Category: Legal Citation Formatting, Typography · Priority:
High · Deterministic: Yes (except [CONTEXT]) · AI Required: No · Reusable: Yes · Transcript-Specific: No.

### Requirements
- **Italicize:** the full case name **including `v.`**, everywhere it appears — body, readback,
  legal argument, citations, **indexes, and tables of authorities (no index exception)**; short-form
  references (`*Dolch*`).
- **Do NOT italicize:** reporter citation, volume, page, court reference, year.
- **Latin citation terms:** `*supra*`, `*infra*`, `*ibid.*`, `*ex rel.*`, `*in re*`,
  `*amicus curiae*`, and the full string containing them (`*United States ex rel. La Fera v. Jackson*`).
- **General foreign expressions [CONTEXT]:** italicize uncommon/unfamiliar (`*res ipsa loquitur*`,
  `*voir dire*`, `*de facto*`); leave common ones unitalicized (`bona fide`, `pro rata`, `per annum`);
  borderline → review.
- **Citation spacing:** numeric components take no space around the colon (`Title 2A:11-13`); applies
  to statutes, regulations, chapter/verse, reporter references.
- **Fallback:** underscore when italics are unavailable.
- **Outputs:** italics preserved in Workspace, DOCX, PDF, and rich clipboard; plain-text clipboard
  may drop them.

### Acceptance Criteria
Case names and Latin terms render italic across all outputs; ancillary citation parts stay roman.
Detail in `GEOMETRY_ENGINE_RULES.md` §8. No hardcoding.

---

## ITEM 5 — Global Page Layout & Tab Hierarchy

### Issue
The transcript does not yet render with UFM page geometry (format box, 25-line density, tab
hierarchy, double spacing). This is the core specification for the Transcript Geometry Engine.

### Classification
Engine: Transcript Geometry Engine · Category: Page Layout, UFM Compliance, Q/A Formatting · Priority:
Critical · Deterministic: Yes · AI Required: No · Reusable: Yes · Transcript-Specific: No.

### Requirements (canonical detail in `TRANSCRIPT_GEOMETRY_STANDARD.md`)
- **Page:** US Letter 8.5″ × 11″; format box (solid top/bottom/left/right lines); 6.5″ text area;
  text begins one character inside the left marginal line.
- **Lines:** exactly 25 per page, numbered 1–25 outside the left box; double-spaced; **no blank lines**
  in the body (anti-insertion); pagination engine handles continuation.
- **Typography:** Courier New 12 pt (≈ 9–10 pitch).
- **Tab model (canonical — Model A, resolved §5):** Tab 1 0.25″/360 (Q./A.); Tab 2 0.625″/900 (text);
  Tab 3 1.0″/1440 (speaker labels, new paragraphs); Tab 4 1.5″/2160 (parentheticals, navy blue);
  Tab 5 2.0″/2880 (scopist flags).
- **Wrapping:** Q/A and colloquy → hanging indent to 0.0″; parentheticals → block indent holding Tab 4.

### Acceptance Criteria
Transcript visually resembles a certified Texas deposition (25-line geometry, UFM tabs, hanging-indent
Q/A, label/parenthetical placement, double-spaced Courier New, no blank testimony lines), applied
across Workspace, Copy Transcript, DOCX, PDF, Certification. No hardcoding.

---

## 5. Open conflicts

Master register in `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.

1. **Tab model — RESOLVED.** Model A (0.25″/0.625″/1.0″/1.5″/2.0″ → 360/900/1440/2160/2880 twips),
   per `TRANSCRIPT_GEOMETRY_STANDARD.md`.
2. **Honorific spacing — RESOLVED.** One space after every honorific period, everywhere — in
   ALL-CAPS labels and by-lines (`MR. NUNEZ:`) and in lowercase prose (`Mr. Nunez`). Court-reporter
   decision (James Horton); supersedes the earlier two-space-in-labels reading. (The two-space rules
   for sentence-ending punctuation and after a speaker-label colon are separate and unchanged.)
3. **Dash glyph — OPEN.** Spaced hyphen ` - ` (these drafts / Morson's as rendered) vs em dash `—`
   (platform memory) vs typed `--`. Default per authority (platform) until confirmed; rules written
   glyph-agnostic.
4. **BY-line / EXAMINATION alignment — OPEN.** Drafts say *centered*; platform spec says
   *left-aligned* (`EXAMINATION` / `BY MR. JENKINS:`, no centering spaces). **Default: left-aligned.**
   Resolve against the primary UFM figure before building the BY-line renderer.

---

## 6. Engine clustering (prompt sequencing)

- **Transcript Geometry Engine** — ITEMs 1–5 (Q/A geometry, punctuation, speaker labels, citation
  italics, page layout/tabs). Highest priority; the biggest visible gap. Build first.
- **Procedural Reconstruction Engine** — recess/exhibit/read-and-sign/swearing-in detection→generation
  (`WORKSPACE_EDITING_AND_PROOFING.md` §4). Later; partly AI.
- **Word-Style Editing Engine** — `WORKSPACE_EDITING_AND_PROOFING.md` §2. Later.

The reconstruction and editing engines build on these geometry/punctuation standards rather than
introducing separate formatting rules.
