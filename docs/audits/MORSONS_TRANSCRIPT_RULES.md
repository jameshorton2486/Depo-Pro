# MORSONS_TRANSCRIPT_RULES

**Purpose.** The transcript-intelligence layer of Depo-Pro — how the spoken record is punctuated,
how numbers/dates/money render, capitalization, abbreviations, typography, and paragraphing. This
file eventually drives the Correction, Punctuation, Formatting, and AI-Review engines, so its
governing structure is the split between **what can be automated** and **what a court reporter must
decide**. That distinction (§2) is the spine of the document.

**Companion files.** Page geometry/tabs/wrapping → `TRANSCRIPT_GEOMETRY_STANDARD.md`;
assembly/indexes/certificates → `TRANSCRIPT_ASSEMBLY_STANDARD.md`; deterministic transforms (current →
expected) → `GEOMETRY_ENGINE_RULES.md`; editor behavior → `WORKSPACE_EDITING_AND_PROOFING.md`.

**Provenance & copyright.** Adapted from *Morson's English Guide for Court Reporters* (2nd ed.,
Lillian I. Morson, 1997). Rules **restated in plain form**, examples **original**. Rule numbers
preserved so engines can cite them. Internal engineering reference, not a substitute for the book.

**Source gap.** The uploaded copy ends at the index; the appended NCRA Transcript Format Guidelines
and worked selections (printed pp. 229–254) are absent and not included. §13 lists what to supply.

**Authority note.** Where a Morson's rule and the platform spec disagree (dash glyph, by-line
alignment), the platform spec wins; tracked in `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16, not duplicated here.

---

## 1. Verbatim preservation (the overriding principle)

Court reporters reproduce English **without** the liberty of rearranging words for correctness or
clarity. Never "clean up" grammar, never delete disfluencies. Preserve fillers (`uh`, `um`,
`you know`, `like`, `I mean`, `so`, `well`, `okay`, `Mm-hmm`), false starts, stutters, incomplete
sentences, grammatical errors, and profanity exactly as spoken. Punctuation is the reporter's only
tool for shaping the record. This principle outranks every transform below: if applying a rule
would alter the words spoken, do not apply it.

### 1.1 Profanity & vulgarity (no-op, non-negotiable)
Profanity, vulgarity, and offensive language are part of the verbatim record.
- **Never censor.** Never substitute symbols (no `f***`, no `[expletive]`).
- **Never sanitize, soften, or paraphrase.**
- **No transform runs on it** — the correct engine behavior is to do *nothing* to it. This is a
  **preserve / no-op**, not a "deterministic transform": no code should ever *act* on profanity,
  because acting on it is how sanitizing creeps in. AI review must be explicitly barred from
  rewriting it.

---

## 2. Automation classification (the spine)

Every rule in this file is one of three kinds. The engines must respect these labels — automating a
Reporter-Judgment rule is a correctness failure, not a feature.

- **[DET] Deterministic** — a fixed transform with one correct output. Safe to run automatically.
  (Regex or simple pattern.)
- **[PAT] Pattern** — automatable, but requires parsing/context detection (number/date/money
  shapes). Safe to *propose* automatically; low risk, but validate.
- **[JUDG] Reporter Judgment** — depends on speaker intent, inflection, or meaning. **Never
  automatic.** The engine may flag/suggest, but a human decides.

Plus the special case from §1.1: **[NO-OP] Preserve** — never transformed at all.

### 2.1 Safe automatic transformations ([DET]/[PAT])
- Honorific **form** normalization: `mister → Mr.`, label spacing `MR. NUNEZ:` (one space after the
  honorific period) ([DET]) — *but the choice
  of which honorific attaches to a speaker comes from participant metadata, never inferred from
  context.*
- Ages → figures ([PAT], Rule 175)
- Complete dates → figures, drop ordinals ([PAT], Rule 179)
- Dollar amounts → figures with `$` ([PAT], Rules 189–195)
- Percentages → figures + "percent" ([PAT], Rule 199)
- `uh-huh` / `uh-uh` hyphenation ([DET])
- Two spaces after sentence-ending punctuation; two after a speaker-label colon ([DET])
- Citation-colon spacing `Title 2A:11-13` ([DET])

### 2.2 Never automatic ([JUDG])
- Question mark vs period on a fragment (depends on interrogative **inflection** — needs the audio)
- Semicolon vs period between independent clauses (reporter decides relatedness)
- Paragraph break placement / restructuring
- Whether a parenthetical is warranted, and its objective wording
- Emphasis, sarcasm, speaker intent
- Whether a foreign expression is "uncommon enough" to italicize (borderline cases)

### 2.3 Correction-engine mapping (feeds implementation)
| Layer | Handles | Examples |
|---|---|---|
| Deterministic regex | fixed string/spacing fixes | `uh-huh`, `uh-uh`, `mister→Mr.`, honorific spacing, double-space-after-period |
| Pattern engine | shape detection + transform | ages, dates, money, percentages, decimals, dimensions |
| Human review | intent/inflection/meaning | fragment punctuation, semicolon vs period, paragraphing, emphasis, borderline italics |
| Preserve / no-op | never touched | profanity, fillers, false starts, stutters, grammatical errors |

---

## 3. Number style

Split by automatability per §2.

### 3A. Deterministic / pattern number rules (safe to auto-propose) [PAT]
| Rule | Transform | Example |
|---|---|---|
| 170 | one–ten spelled out when isolated, not age/date/money/percent/fraction/measure | `three cars` |
| 172 | number beginning a sentence spelled out | `Fifteen people…` |
| 175 | ages → figures | `Fifty seven` → `57` |
| 179 | complete date → figures, drop ordinals | `May seventh, nineteen sixty eight` → `May 7, 1968` |
| 181 | abbreviated date → slant | `5/7/68` |
| 182–183 | addresses: house numbers figures (except "one"); streets one–ten words, >ten figures | `415 Elm`, `Fifth Avenue`, `42nd Street` |
| 185 | a.m./p.m. take figures | `4:30 p.m.` |
| 189–195 | money → `$` + figures; even amounts no decimal/ciphers; millions etc. word | `$500`, `$4.50`, `$5 million` |
| 196–197 | ordinals spelled out to tenth; mixed series → figures + ordinals | `third`, `3rd and 14th` |
| 198 | dimensions → figures, units spelled out | `6 feet 2 inches` |
| 199 | percentages → figures + "percent" | `15 percent` |
| 200 | decimals → figures | `0.5` |
| 202 | numbered references → figures | `Exhibit 3`, `page 73` |
| 203 | scores, ratios, odds, votes → figures | `7-2 vote` |

### 3B. Context-dependent number rules (propose, then review) [PAT→JUDG at the margin]
| Rule | Why it needs context |
|---|---|
| 171 | round numbers may be words or figures — house style call |
| 173–174 | fractions/mixed numbers — spell-out depends on sentence position |
| 176–178 | centuries/decades — words or figures both valid |
| 184, 186–188 | time expressions — "four o'clock" vs `4:00`, even-hour ciphers, title-page forms |
| 204 | two adjacent numbers forming a unit — which one to spell out |

All number transforms are **display-layer only** and must never alter raw utterance timings.

---

## 4. Punctuation marks

Each carries its automation class. `␣␣` = required double space.

**The Period (Rules 1–8) [DET spacing; JUDG fragment].** Ends statements, commands, indirect
questions, polite requests-as-questions, condensed fragment answers (`A.␣␣Not me.`). Two spaces
after a sentence-ending period [DET]. Period inside a closing quote. Abbreviation ending a sentence
keeps one period (`Mr. Thomas.`, never `..`) [DET]. *Whether a fragment is a statement is [JUDG] —
see Question Mark.*

**The Question Mark (Rules 9–18) [JUDG].** Direct questions, connected series, echo questions
(`It's true, isn't it?`). Two spaces after [DET]. **Fragment punctuation is reporter judgment:**
`Q.␣␣Approximately.` vs `Q.␣␣Approximately?` depends on interrogative inflection in the audio — the
engine flags, a human decides. Placement by quotation logic.

**The Exclamation Point [DET — remove].** Do not use in transcripts; replace with a period. Force
is carried by the words.

**The Semicolon (Rules 19–28) [JUDG].** Joins closely related independent clauses with no
conjunction — *the reporter decides how related they are, and may use a period instead.* Legal use:
appended verification question (`You were at the bar; isn't that right?`). Series items containing
commas. Outside closing quotes.

**The Colon (Rules 29–33) [DET structural; JUDG rhetorical].** Structural uses are deterministic:
two spaces after a speaker-label colon, after `QUESTION:`/`ANSWER:` readback [DET]. Rhetorical use
(introducing a list/explanation) is reporter style. Not after a preposition or "that". Outside
quotes. Capitalize the first word after when a sentence, proper noun, or `I` follows.

**The Comma (Rules 42–84) [JUDG].** Clauses joined by a conjunction, series, appositives, direct
address. Court-reporting nuance: comma after conversational fillers (`Now,` `Well,`) but **not**
after logical openers (`so`, `yet`, `hence`, `thus`). Largely judgment — comma placement reflects
meaning.

**The Dash (Rules 85–93) [DET spacing; JUDG placement].** Interruptions, false starts,
self-corrections, resumed thoughts. Mid-word cutoff attaches directly (`subp--`), no space [DET].
Never comma/colon/semicolon adjacent to a dash [DET]. Resumed word not capitalized unless proper
noun/`I` [DET]. *Glyph open — `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.* Whether a moment is an interruption is
[JUDG].

**Quotation Marks (Rules 94–117) [DET hierarchy; JUDG quote-vs-not].** Direct quotes, words-as-
words, short titles; nested = single quotes. Hierarchy [DET]: periods/commas inside; semicolons/
colons outside; question marks by logic. Whether something is a direct quote is [JUDG].

**Parentheses (Rules 118–125) [JUDG content; DET placement].** Reporter notations only. Placement
at Tab 4 is geometry. **Objectivity [JUDG]:** never describe distance, size, weight, intent, or
emotion. Whether a parenthetical is warranted and its wording is reporter judgment. Approved set in
`GEOMETRY_ENGINE_RULES.md` §7.6.

**The Apostrophe (Rules 126–147) [DET mostly].** Possession, contractions, omitted figures (`'57`),
decades (`'80s`), plurals of uncapitalized letters (`a's`), verb forms (`X'd out`) [DET]. A singular
noun ending in s/z takes `'s` only if the extra syllable is spoken [JUDG — depends on the audio].

**The Hyphen (Rules 148–169) [PAT/DET].** Compound adjectives before the noun; spelled-out
fractions; double surnames. Prefixes `pre/post/anti/non` solid unless proper noun or triple letters
[PAT]. `uh-huh`/`uh-uh` always hyphenated [DET].

---

## 5. Typography (authoritative source for italics)

All italics rules live here (Rules 265–269). Other docs reference this section; they do not restate
it.

**Case citations [DET].** Italicize the full case name **including `v.`**, everywhere it appears —
body, readback, argument, citations, **indexes, and tables of authorities (no index exception)**;
short-form references (`*Dolch*`). Do **not** italicize reporter citation, volume, page, court, or
year. `*Gold v. Shop-Rite, Inc.*, 384 U.S. 436`.

**Latin citation terms [DET].** `*supra*`, `*infra*`, `*ibid.*`, `*ex rel.*`, `*in re*`,
`*amicus curiae*`, and the full string containing them (`*United States ex rel. La Fera v. Jackson*`).

**Foreign expressions [JUDG].** Italicize uncommon/unfamiliar (`*res ipsa loquitur*`, `*voir dire*`,
`*de facto*`); leave common ones roman (`bona fide`, `pro rata`, `per annum`). Borderline = review.

**Words referred to as words [DET].** Italicize (avoids messy nested quotes).

**Titles of complete published works [DET].** Italicize.

Fallback: underscore when italics are unavailable. Italics must survive in Workspace, DOCX, PDF, and
rich clipboard; plain-text clipboard may drop them.

---

## 6. Ellipsis points & the slant

**Ellipsis (Rules 270–273) [DET/JUDG].** Three spaced periods for an internal omission in quoted
matter; four at a sentence-ending omission. Trailing-off thought = three spaced periods [JUDG —
whether a thought trailed off vs was cut off is the reporter's call; distinct from the dash].

**Slant (Rules 274–280) [DET].** Figure dates (`1/6/95`), per/over ratios (`24/7`, `120/80`),
interchangeable words (`and/or`), dual-purpose nouns (`cashier/checker`), poetry/song line breaks.

---

## 7. Capitalization (Rules 205–249) [DET/PAT]

Grouped by what they govern; mostly deterministic given a name/term dictionary.
- Sentence/quotation openers (205); headings/titles (206–207).
- Personal titles (208–216): respect titles before a name; appositive titles lowercase; prominent
  persons; abbreviated titles after names; direct address; relative-titles as names.
- Numbered/lettered items (217) — except page, line, stanza, verse, size, vitamins.
- Directions/regions (218–222). Government/courts/juries (223–227) — **`grand jury`/`petit jury`
  lowercase**; `Court` capitalized when it means the judge.
- Citations (228); anatomy/medicine named for persons (229–230); trade/brand names (231).
- Nations/nationalities/races/languages/military (232–234); degrees and course titles (235–236);
  organizations, acts, historical events, parties, religions, celestial bodies, awards, geographic
  and roadway names (237–248).
- **Negative rule (249):** do **not** capitalize *deposition, interrogatories, motion, petition,
  stipulation, will* and similar in running text.

---

## 8. Abbreviations (Rules 250–264) [DET/PAT]

Abbreviate verbatim spoken titles/symbols (250); `Jr.`/`Sr.` (251); "doctor" only before a name
(252); spell out titles of dignity in running text (253); `v.` in citations (254); **never
abbreviate "okay"** (255); `No.` before a figure (256); `etc.` (257); no periods on chemical
symbols, metric units, call letters (258), acronyms (262), shortened forms (264); single-letter
last-name initial takes a period (259); ampersand only in firm names that use it (260); capitalize
an abbreviation only when its expansion is capitalized (261); time-zone abbreviations (263).

---

## 9. Objection formatting [DET render; JUDG/reconstruction detect]

How objections **render** (detection/insertion is a later Procedural Reconstruction concern, not
here). An objection is colloquy: speaker label at Tab 3, then the objection text.
- Standard short forms render as their own sentences: `Objection.␣␣Form.` · `Objection.␣␣Leading.`
  · `Objection.␣␣Foundation.` · `Objection.␣␣Nonresponsive.` · `Objection.␣␣Hearsay.`
- Two spaces after each period [DET]. Do not expand, abbreviate, or normalize the objecting
  attorney's wording beyond Morson's spacing/punctuation.
- After an objection/colloquy block, the resuming question carries inline attribution
  (`Q.␣␣(BY MR. NUNEZ)␣␣…`) — placement/format in `GEOMETRY_ENGINE_RULES.md` §6.

---

## 10. Paragraphing (six guides) [JUDG]

Not deterministic. Aim for three or four paragraphs per page, ~six to eight lines each; a one-
sentence transitional paragraph is sometimes the only logical break; start a new paragraph each
time the speaker changes within dialogue inside an answer; break up lengthy responses, charges, and
discussions. **Paragraph break placement is reporter judgment** — the engine never restructures
paragraphs automatically.

---

## 11. Proofreaders' symbols

Markup legend for the review layer: add a space · capitalize · close up · delete · insert · let it
stand (stet) · lowercase · new paragraph · insert apostrophe/single quote · insert comma · insert
period · insert quotation marks · transpose.

---

## 12. Implementation classification matrix

The index into every rule above. **DET** = deterministic transform, **PAT** = pattern/shape
detection, **AI** = AI may propose, **HUMAN** = reporter decides, **NO-OP** = never transformed.

| Rule area | DET | PAT | AI | HUMAN | NO-OP |
|---|:--:|:--:|:--:|:--:|:--:|
| Honorific form/spacing | X | | | | |
| Ages → figures | | X | | | |
| Dates → figures | | X | | | |
| Money → figures | | X | | | |
| Percentages / decimals / dimensions | | X | | | |
| `uh-huh` / `uh-uh` | X | | | | |
| Double-space after sentence/colon | X | | | | |
| Citation italics (case names, Latin terms) | X | | | | |
| Citation-colon spacing | X | | | | |
| Exclamation → period | X | | | | |
| Quotation punctuation hierarchy | X | | | | |
| Prefix-solid hyphenation | | X | | | |
| Capitalization (with dictionary) | X | X | | | |
| Round numbers / centuries / time forms | | X | | X | |
| Foreign-expression italics (borderline) | | | X | X | |
| Fragment: question mark vs period | | | X | X | |
| Semicolon vs period | | | | X | |
| Comma placement | | | X | X | |
| Paragraph break placement | | | X | X | |
| Whether a parenthetical is warranted / its wording | | | | X | |
| Trailing-off vs interruption (ellipsis vs dash) | | | X | X | |
| Profanity / vulgarity | | | | | X |
| Fillers, false starts, stutters, grammar errors | | | | | X |

**Reading the matrix:** anything with a HUMAN mark must never run unattended; anything NO-OP must
never have a transform written for it at all. DET/PAT rows are the automatable core; AI rows may
generate *suggestions* a reporter accepts or rejects.

---

## 13. NCRA Format Guidelines — NOT in the uploaded source

The contents page references NCRA Transcript Format Guidelines and worked testimony/jury-charge
selections (printed pp. 229–254), absent from the uploaded PDF. To complete: supply those pages or
NCRA's current published guidelines, and they will be restated here in the same classified style.

---

## 14. Cross-reference
- Geometry/tabs/placement → `TRANSCRIPT_GEOMETRY_STANDARD.md`
- Deterministic transforms (current → expected) → `GEOMETRY_ENGINE_RULES.md`
- Assembly/indexes/certificates → `TRANSCRIPT_ASSEMBLY_STANDARD.md`
- Editor behavior / proofing → `WORKSPACE_EDITING_AND_PROOFING.md`
- Open conflicts (dash glyph, by-line alignment) → `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16
