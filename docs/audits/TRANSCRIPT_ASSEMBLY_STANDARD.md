# TRANSCRIPT_ASSEMBLY_STANDARD

**(formerly `UFM_FORMATTING_DATA.md` — renamed to reflect its actual job: assembly, not formatting.)**

**Purpose.** The authoritative answer to three questions and nothing else:
**what pages exist, when they appear, and in what order.** This is the Assembly Engine
specification — the document order, the components, the jurisdiction/case-type gates, indexes,
certificates, and the `^` data fields that populate them. It does **not** specify how a page
looks (geometry) or how text is written (punctuation/style); those live in dedicated docs.

**The three-layer split (why this file is now assembly-only):**
- **How a page looks** → `TRANSCRIPT_GEOMETRY_STANDARD.md` (geometry: margins, tabs, line density,
  wrapping, label/parenthetical *placement*).
- **How text is written** → `MORSONS_TRANSCRIPT_RULES.md` (punctuation, numbers, dates, money,
  capitalization, italics, abbreviations) and `GEOMETRY_ENGINE_RULES.md` (deterministic transforms).
- **How a transcript is assembled** → **this file** (what components exist and their order/conditions).

The Geometry Engine consumes `TRANSCRIPT_GEOMETRY_STANDARD.md`; the Assembly Engine consumes this
file. They never read the same rule from two places.

**Open-conflict register.** §16 remains the master register for cross-document conflicts; other
files reference `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.

---

## 1. Assembly Engine responsibilities & out of scope

**In scope (the Assembly Engine owns these):**
- Build the caption/title page (correct variant by jurisdiction/case type)
- Build the appearances page
- Build the indexes (consolidated vs three-index vs master)
- Build the certificates (correct variant)
- Select the proper template per `JobConfig`
- Determine which components appear and in what order
- Apply the jurisdiction/case-type/record-type/interpreter/draft gates

**Out of scope (owned elsewhere):**
- Page geometry, tabs, margins, line density → `TRANSCRIPT_GEOMETRY_STANDARD.md`
- Punctuation, numbers, dates, italics, capitalization → `MORSONS_TRANSCRIPT_RULES.md`
- Speaker identity resolution → speaker-resolution overlay
- Q/A reconstruction, procedural reconstruction → reconstruction engines
- Proofreading, AI correction → `WORKSPACE_EDITING_AND_PROOFING.md`

If the question is "what page is this and when does it appear," it is assembly. If it is "how is
it shaped or worded," it is not.

---

## 2. Geometry & style — moved out (authority pointers)

These previously lived here and have moved. Pointers retained so nothing dangles:
- **Page geometry & layout** → `TRANSCRIPT_GEOMETRY_STANDARD.md` §2–4.
- **Tabulation hierarchy** → `TRANSCRIPT_GEOMETRY_STANDARD.md` §5.
- **Speaker-label placement / line shaping** → `TRANSCRIPT_GEOMETRY_STANDARD.md` §7.
- **Punctuation & spacing** → `MORSONS_TRANSCRIPT_RULES.md` §4; honorific/colon spacing → §2.1, §4.
- **Allowed speaker labels** (the assembly-relevant part — *which* designations are valid) is
  retained in §3 below; their *positioning* is geometry.

---

## 3. Allowed speaker designations (assembly-relevant only)

Which labels are valid (positioning/casing is geometry + `GEOMETRY_ENGINE_RULES.md` §5):
- Attorneys: `MR./MS./MRS./MISS LASTNAME:` (first name only if two same-gender attorneys share a
  surname).
- `THE REPORTER:` (never `THE COURT REPORTER:`), `THE COURT:`, `THE VIDEOGRAPHER:`,
  `THE INTERPRETER:`, `THE WITNESS:` (colloquy/oath only; examination testimony is `A.`).

---

## 4. Transcript assembly pipeline (component order)

The canonical order. Marker `**** TRANSCRIPT ****` is where the verbatim body is injected. Each
component is tagged **Required**, **Optional**, or **Conditional (gate)**.

| # | Component | Status | Condition |
|---|---|---|---|
| 1 | Corrections & Changes Log (internal; NOT filed) | Optional | scopist working doc; omitted from DOCX output |
| 2 | Real-Time Unedited Disclaimer (`WARNING!`) | Conditional | `Draft_Status = Unedited/Rough` → first page |
| 3 | Title / Caption Page | Required | variant by jurisdiction/case type (§5) |
| 4 | Appearances Page | Required | inlined into CNA when `Witness_Appeared = false` |
| 5 | Master Index ("Volume 1") | Conditional | `Volume_Count > 1` |
| 6 | Chronological Index | Conditional | Official record (§10) |
| 7 | Alphabetical Witness Index | Conditional | Official record (§10) |
| 8 | Capital Murder / Special Venire Index | Conditional | `Case_Type = Capital Murder` |
| 9 | Exhibit Index | Conditional | exhibits exist |
| 10 | Witness / Examination Setup Block | Required | interpreter variant if `Interpreter_Present` |
| 11 | Examination Heading + By-Line | Required | `DIRECT EXAMINATION` → `BY MR. SMITH:` |
| — | **`**** TRANSCRIPT ****`** (verbatim body) | Required | Q&A, colloquy, navy parentheticals |
| 12 | Post-Record Spellings block | Conditional | spellings given after "off the record" |
| 13 | Changes & Signature Page (Errata) | Conditional | Freelance depo, signature not waived |
| 14 | Certificate of Non-Appearance | Conditional | `Witness_Appeared = false` |
| 15 | Reporter's Certificate | Required | **always last page**; variant by jurisdiction/interpreter |
| 16 | Transcriber's Certification of Another's Notes/Audio | Conditional | transcribing others' work |
| 17 | Official Reporter's Certification for Exhibits | Conditional | exhibits in separate volume |

External administrative forms (Deputy Reporter Log, Evidence Inventory, Appellate forms) are **not
bound** in the transcript; tracked separately.

---

## 5. Assembly logic gates (decision-tree)

Evaluate `JobConfig`, then assemble.

**A. Jurisdiction**
- `Federal` → Federal District Court caption (District/Division headers) + Federal Compliance
  Certificate (FRCP 30(f)(1)).
- `State` (TX default) → Standard State/Civil caption + TRCP Rule 203 Reporter's Certificate.

**B. Case type**
- `Criminal` → Texas Criminal Co-Caption (`The State of Texas vs. [Defendant]`).
- `Capital Murder` → insert Capital Murder / Special Venire Index after the Alphabetical Index.

**C. Record type**
- `Official` (trial) → suppress Errata; **three-index** architecture (§10); chronological index
  includes all trial phases.
- `Freelance` (deposition) → Errata before the Certificate; **consolidated index** (§10). If
  `Witness_Appeared = false` → suppress body, insert CNA (appearances inlined, no standalone page).

**D. Interpreter** — `Interpreter_Present = true` → interpreter setup/oath block; witness block
"…testified through the duly sworn interpreter…"; Interpreted Transcript Compliance Certificate.

**E. Draft status** — `Unedited/Rough` → Unedited Disclaimer as absolute first page.

**F. Signature waiver** — waived → omit Errata; generate "Certification Page When Signature
Waived" (Fig 9/9A).

---

## 6. Transcript component registry

Quick-reference matrix for which components appear under which configuration.

| Component | State | Federal | Official | Freelance |
|---|:--:|:--:|:--:|:--:|
| Caption / Title | Required | Required (federal variant) | Required | Required |
| Appearances | Required | Required | Required | Required |
| Master Index | If Vol > 1 | If Vol > 1 | If Vol > 1 | If Vol > 1 |
| Chronological Index | — | — | Required | — |
| Alphabetical Witness Index | — | — | Required | — |
| Consolidated Index (Fig 11) | — | — | — | Standard |
| Exhibit Index | If exhibits | If exhibits | Required (columnar) | If exhibits |
| Errata / Signature Page | Conditional | Conditional | No (trials) | Yes unless waived |
| Certificate of Non-Appearance | If no-show | If no-show | — | If no-show |
| Reporter's Certificate | Required (TRCP 203) | Required (FRCP 30(f)(1)) | Required | Required |
| Exhibit Certification (sep. volume) | If applicable | If applicable | If applicable | If applicable |

---

## 7. Index architecture

- `Freelance` → **consolidated index** (UFM Fig 11). UFM §3.24(b): no required format, but all
  major portions must be indexed (appearances, stipulations, examinations, signature page,
  certificate, exhibits, certified questions, requested information). Continuous vertical flow,
  centered `INDEX`; placed front or back.
- `Official` → **three separate indexes** (UFM §3.23): Chronological, Alphabetical, Exhibit.
- `Volume_Count > 1` → **Master Index** in a dedicated "Volume 1" (§3.23(d), §17.1; Figs 24/26),
  merging all indexes, with a `VOL.` column on every entry; summarizing volume contents is prohibited.

Index detail: Alphabetical = columnar, witnesses A–Z with Direct/Cross/Voir Dire (+ `Vol.` in a
master). Exhibit (Official) = columnar with **Offered** and **Admitted** pages; Exhibit (Freelance)
= `NO.`/`DESCRIPTION`/`PAGE` only. Examination entries single-spaced; double-space between topic
changes. Index pages never Roman-numbered.

---

## 8. Exhibits

- Offered-but-not-admitted exhibits are still logged (offered page recorded; admitted blank/marked
  excluded) and still copied into the separate exhibit volume.
- Exhibit numbering is **user-configurable**, not hardcoded: default sequential within the current
  volume/job, with a manual "starting exhibit number" override. Practice varies (restart per depo
  vs continuous across a case).

---

## 9. Certificate variants (back-matter, final page)

- **Standard State** — TRCP Rule 203 time-used + fee tracking.
- **Federal Compliance** — FRCP 30(f)(1) signature-return language.
- **Interpreted Transcript & Signature Waiver** — interpreter present and/or signature waived.
- **Transcriber's Certification of Another's Notes/Audio** — transcribing others' work.
- **Official Reporter's Certification for Exhibits** — exhibits bound separately.

The reporter's certificate is **always the last page(s)** (UFM §3.4).

---

## 10. Caption / appearances detail

- Caption variants: Standard State/Civil (Fig 1/3); Federal District Court (District/Division
  headers); Texas Criminal Co-Caption (`The State of Texas vs. [Defendant]`).
- Case Style layout: Plaintiff block + `, Plaintiff,`; `vs.` with the **Cause Number on the same
  line**; Defendant block + `, Defendants.`; court info to the right via `)` rule.
- Terminology (assembly-enforced): **"Cause Number"** not "Case Number"; **"Case Style"** not "Case
  Name"; **Arabic** volume numerals.
- Appearances: all counsel with firm, address, SBOT; `ALSO PRESENT:` for videographer/interpreter/
  paralegal/etc. CNA inlines appearances (no standalone page).
- 60-character horizontal rule (`─` ×60) separates caption blocks and precedes `POST-RECORD
  SPELLINGS`.

---

## 11. `^` data-field placeholders (parser targets for population)

UFM figures denote a required field with a leading `^`. The parser matches `^` + token to inject
metadata into templates during assembly.

- **Case/court:** `^ PLAINTIFF(S)`, `^ DEFENDANT(S)`, `^ COUNTY NAME`, `^###` (district), `^ Judge's Name`, `^ Court Name`
- **Proceeding:** `^TITLE OF PROCEEDINGS`, `^ NAME OF PROCEEDING`, `Volume ^ ##`, `^ Date`, `^ Month`, `^Year`, `^Time (##:##)`, `^City`, `^ County`, `^ State`, `^ Office`, `^ Method`
- **Participants:** `^ Mr./Ms. Lawyer1/2/3`, `^ FIRM/OFFICE NAME`, `SBOT NO. ^########`, `^ Address`, `^Zip`, `Phone: ^ (###) ###-####`, `ATTORNEY FOR ^ PARTY`, `^ Party`, `^ Mr./Ms. Person` (ALSO PRESENT), `^ WITNESS NAME`, `^MR./MS. ^LAWYER` (body by-line), `^ VENIREPERSON`
- **Reporter/cert:** `^REPORTER'S NAME`, `Texas CSR ^ ####` / `NO. ^####`, `Expiration Date: ^ ##/##/##`, `^ Firm Registration No. ^ ####`, `^ NAME` (non-CSR), `^ HRS:MIN`, `^ Now` (return deadline), `^ Lawyer's Name` (custodial)
- **Indexing:** `^ DESC` / `^ DESCRIPTION`, `^ X` (page/volume/line in grids), `NO. ^ CHK`, `Tape ^ 1, Side ^ A.`

---

## 12. Attendee intake — required fields by role

Capture exactly these (no fields the UFM never uses):
- **Attorney:** prefix, first/last, suffix, firm (`^ FIRM/OFFICE NAME`), SBOT, address/city/state/zip,
  phone, email, party represented, **time used (HRS:MIN)** (TRCP 203).
- **Court reporter:** name (`^ REPORTER'S NAME`), CSR no., CSR expiration, firm registration, firm
  name/address/phone.
- **Witness:** prefix/title, name (`^ WITNESS NAME`), party affiliation, post-record spellings,
  **signature status** (read-and-sign vs waived → Errata vs Fig 9 waiver cert).
- **Interpreter:** prefix, name (`^ INTERPRETER_NAME`), source language (`^LANGUAGE`), sworn in?
- **Videographer / Also Present:** prefix, name (`^ Mr./Ms. Person`), role/title.

---

## 13. Reporting on "Also Present" attendees

Anyone not the deponent or examining/defending counsel → `ALSO PRESENT:`. Three handling paths:
appearances-page listing; in-text colloquy (ALL-CAPS label at Tab 3; videographer timestamp cues
trigger procedural parentheticals like `(Whereupon, a recess was taken at 2:14 p.m.)`); and
structural blocks/certificate changes (interpreter forces oath block, altered witness setup, and
the Interpreted Transcript Compliance Certificate).

---

## 14. Hard invariants (assembly)

- Mandatory jurisdiction pages (required caption, required indexes, reporter's certificate) **cannot
  be disabled** by a firm — firms may restyle/toggle *optional* pages and lock their own templates,
  but disabling a mandated page manufactures a non-compliant record (CRCB discipline / court-ordered
  re-do). Owner-confirmed.
- Reporter's certificate is always the final page.
- Texas terminology: "Cause Number", "Case Style", Arabic volume numerals.
- The Corrections & Changes Log is internal only; never in DOCX output.

---

## 15. NCRA Format Guidelines — not in source

The NCRA Transcript Format Guidelines and worked selections referenced by Morson's (printed
pp. 229–254) are absent from the uploaded source. To complete, supply those pages or NCRA's
published guidelines. (Mirror of the note in `MORSONS_TRANSCRIPT_RULES.md` §13.)

---

## 16. Open-conflict register (master)

Master register for cross-document conflicts. Other files reference this section. Each entry:
Conflict · Authority A · Authority B · Decision · Status.

| # | Conflict | Authority A | Authority B | Decision | Status |
|---|---|---|---|---|---|
| 1 | Honorific spacing | Morson (one space) | Earlier platform reading (two spaces in labels) | **One space after every honorific period, everywhere** (`MR. NUNEZ:`, `Mr. Nunez`). Court-reporter decision (James Horton). Sentence-ending and after-colon two-space rules unchanged. | **RESOLVED** |
| 2 | Tab model | Backlog "Nth space" (0.25/0.625/1.0/1.5/2.0) | Earlier platform stops (0.5/1.0/1.5) | **Model A** (0.25″/0.625″/1.0″/1.5″/2.0″ → 360/900/1440/2160/2880 twips), per `TRANSCRIPT_GEOMETRY_STANDARD.md`. | **RESOLVED** |
| 3 | Dash glyph | Morson / backlog (spaced hyphen ` - `) | Platform memory (em dash `—`) | Default to platform (em dash) until confirmed; rules written glyph-agnostic. | **OPEN** |
| 4 | BY-line / EXAMINATION alignment | Drafts (centered) | Platform spec (left-aligned) | Default **left-aligned** (`EXAMINATION` / `BY MR. JENKINS:`). | **OPEN — resolve against primary UFM figure** |

**Note on the stored platform standard:** conflict #1's resolution (one space) must also be applied
to the stored platform memory / system standard, which an engine prompt may read independently of
these docs. The docs say one space; verify the stored standard agrees to avoid drift.

---

## 17. Cross-reference
- Geometry/tabs/placement → `TRANSCRIPT_GEOMETRY_STANDARD.md`
- Punctuation/numbers/italics/style → `MORSONS_TRANSCRIPT_RULES.md`
- Deterministic transforms → `GEOMETRY_ENGINE_RULES.md`
- Editor behavior / proofing → `WORKSPACE_EDITING_AND_PROOFING.md`
- Gap tracker / engine sequencing → `TRANSCRIPT_FIDELITY_BACKLOG.md`
