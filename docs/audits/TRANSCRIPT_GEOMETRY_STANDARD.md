# TRANSCRIPT_GEOMETRY_STANDARD

**Purpose.** The canonical dimensional ground truth for Depo-Pro transcript rendering — page
boundaries, line density, the tab hierarchy with exact measurements, wrapping/indentation, and
line-shaping. This is the authority the renderer, DOCX export, PDF export, Copy Transcript, and
certification output all conform to. It is the specification the Geometry Engine implements.

**Authority.** This document **resolves the tab-position conflict** formerly open in
`GEOMETRY_ENGINE_RULES.md` §0.1 and `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16 (#4). The tab model in §5 is
**canonical**; any other tab values in earlier docs are superseded. It also **corrects the
hanging-indent rule**: wrapped Q/A and colloquy return flush to the left text margin (0.0″), not
to the text-body tab.

**Scope.** Geometry only. Punctuation/number/style rules → `MORSONS_TRANSCRIPT_RULES.md`;
assembly/indexes/certificates → `TRANSCRIPT_ASSEMBLY_STANDARD.md`; deterministic transforms →
`GEOMETRY_ENGINE_RULES.md`; editor behavior → `WORKSPACE_EDITING_AND_PROOFING.md`. Exact
responsibilities and exclusions are enumerated in §13.

---

## 1. Geometry Engine responsibilities & out of scope

The single most important boundary in this file. The Geometry Engine owns **shape and position**,
nothing else.

**In scope (the Geometry Engine owns these):**
- Page boundaries, margins, the format box
- The canonical tab hierarchy and tab placement
- Q/A marker and text placement
- Speaker-label *placement* (where the label sits — not what it says)
- Parenthetical *placement*
- Line shaping, wrapping, and hanging/block indentation
- Line density (25 lines) and line-number positioning

**Out of scope (owned by other engines/docs):**
- Speaker identity resolution → speaker-resolution overlay
- Q/A reconstruction → Q/A engine
- Procedural reconstruction (recess/exhibit/swearing-in) → reconstruction engine
- Punctuation, number/date normalization, capitalization → `MORSONS_TRANSCRIPT_RULES.md`
- Word correction, proofreading, low-confidence handling → `WORKSPACE_EDITING_AND_PROOFING.md`
- AI suggestions of any kind
- Page-break insertion → pagination engine (see §10)

If a question is "what does this say / mean / resolve to," it is not geometry. If it is "where does
this sit and what shape is the line," it is.

---

## 2. Page & text area

The physical boundaries are rigidly structured for universal citation and tamper resistance.

- **Page size:** 8.5″ × 11″ (US Letter).
- **Format box:** text enclosed within solid top, bottom, left, and right marginal lines.
- **Text area width:** exactly **6.5″** between the left and right margins.
- **Text start:** the left text margin begins **exactly one character inward** from the left
  marginal line.

---

## 3. Line density & numbering

### 3.1 Density
- Exactly **25 lines** of text per page.
- Double-spaced body (see §4).
- Headers, footers, and page numbers do not count toward the 25.

### 3.2 Line-number behavior
Line numbers are part of the **geometry layer** (§11), not content. They are strictly visual.
- Numbered **1 through 25**, placed **to the left of the format box**.
- **Visual only** — line numbers are never part of the transcript content.
- **Never editable** — a reporter cannot type into, alter, or delete a line number.
- **Regenerate automatically** — line numbers are recomputed from geometry on every render and
  after any edit; they are never stored as text.
- **Excluded from copy/paste** — selecting and copying transcript text never captures line numbers.

This separation must hold before Word-style editing is built, or editing corrupts numbering.

---

## 4. Spacing

- All transcript body text is **double-spaced**.
- **Blank lines are strictly prohibited** within the testimony body — this prevents unauthorized
  insertion of text into the record later. (Permitted only on administrative pages, when counsel
  requests, or when a setup block carries to the next page — those are assembly concerns, not
  geometry; see `TRANSCRIPT_ASSEMBLY_STANDARD.md`.)

---

## 5. Tabulation hierarchy (CANONICAL)

A strict sequence of tab stops, measured from the left text margin. For 10-pitch document
engineering:

| Tab | Space | Inches | Twips | Used for |
|---|---|---|---|---|
| **Tab 1** | 5th | 0.25″ | 360 | `Q.` and `A.` designations **only** |
| **Tab 2** | 10th | 0.625″ | 900 | Start of testimony text after `Q.`/`A.` |
| **Tab 3** | 15th | 1.0″ | 1440 | Speaker-label placement; start of new paragraphs |
| **Tab 4** | — | 1.5″ | 2160 | Parenthetical placement |
| **Tab 5** | — | 2.0″ | 2880 | Technical/scopist-flag indents |

(Navy-blue parenthetical text and orange scopist-flag text are **style-layer** concerns, §11 —
the table above governs only *position*.)

---

## 6. Text wrapping & indentation

Two wrap behaviors, by content type:

- **Hanging indent (Q/A and speaker colloquy):** when the line wraps, the continuation returns
  **flush to the left text margin (0.0″)** — to the left of the `Q.`/`A.` marker. This is the
  hanging-indent shape and it matches certified-transcript practice.
- **Block indent (parentheticals):** when a parenthetical spans multiple lines, **every**
  subsequent line **maintains the first line's indentation** (Tab 4). It does **not** return to the
  left margin.

---

## 7. Line shaping

The Geometry Engine shapes lines by position only; it does not decide label text or content.

- **Q. / A. lines:** a tab before the letter, then another tab before the text —
  `[TAB1]Q.[TAB2][question text]` / `[TAB1]A.[TAB2][answer text]`.
- **Speaker labels:** **three tabs** (landing at Tab 3, 1.0″/1440 twips). The label is rendered
  bold all-caps, colon-terminated, followed by two spaces before text begins — `[TAB3][LABEL]:  [text]`.
  (What the label *says* and its casing/honorific rules belong to
  `GEOMETRY_ENGINE_RULES.md` §5; geometry owns only the Tab 3 position and the two-space gap.)

---

## 8. Non-negotiable geometry invariants

These must **never vary**, on any output target, for any transcript:

1. **25 lines per page.**
2. **6.5″ text-area width.**
3. **Canonical tab hierarchy** (§5) — the five positions are fixed.
4. **Hanging-indent behavior** — Q/A and colloquy wrap to 0.0″ (§6).
5. **Block-indent behavior** — parentheticals hold their indent on wrap (§6).
6. **Speaker-label position** — Tab 3, 1.0″/1440 twips.
7. **Parenthetical position** — Tab 4, 1.5″/2160 twips.
8. **Line numbers** — visual, non-editable, auto-regenerated, copy-excluded (§3.2).

A change to any of these is a change to the legal shape of the record and requires deliberate
sign-off, not an implementation decision.

---

## 9. Rendering layers

Geometry is one of three layers. Separating them is what lets Workspace, DOCX, and PDF implement
the same transcript with different rendering technology without diverging.

- **Geometry layer (THIS DOCUMENT owns it):** tabs, margins, line numbers, page boundaries,
  wrapping, line shaping, density.
- **Content layer (owned elsewhere):** the words, speaker-label *text*, Q/A markers, parenthetical
  *text*. Source of truth is the canonical word/utterance stream; rules in
  `GEOMETRY_ENGINE_RULES.md` and `MORSONS_TRANSCRIPT_RULES.md`.
- **Style layer (owned elsewhere):** bold, italic, color (navy parentheticals, orange flags),
  underline. Rules in `MORSONS_TRANSCRIPT_RULES.md` (italics) and `GEOMETRY_ENGINE_RULES.md`.

The Geometry Engine positions; it does not decide content or styling. A renderer composites all
three layers, but each layer's rules live in one place to prevent drift.

---

## 10. Geometry vs pagination

A clean division to prevent future overlap:

- **Geometry defines shape** — where text, labels, and parentheticals sit; how lines wrap.
- **Pagination defines page boundaries** — where one page ends and the next begins, line-number
  reset per page, page numbering.
- **The Geometry Engine never inserts page breaks.** It produces shaped, positioned lines.
- **The Pagination engine consumes Geometry output** and divides it into 25-line pages, applying
  line numbers and page numbers.

Geometry is page-agnostic; pagination is geometry-agnostic about positioning. Neither reaches into
the other.

---

## 11. Worked example (structural)

Showing canonical tab stops, two-space terminal spacing, both wrap behaviors. **Content is shown as
placeholders** — geometry cares where things sit, not what they say.

```
col:   0.0"        0.25"   0.625"        1.0"                          1.5"
       |           |       |             |                             |
       [TAB1]Q.[TAB2][question text that is long enough to wrap to a
second line and therefore returns flush to the 0.0" left margin]
       [TAB1]A.[TAB2][answer text]
                     [TAB3][SPEAKER LABEL]:  [colloquy text]
                                       [TAB4]([parenthetical text that
                                       wraps and holds the Tab 4 indent
                                       on every subsequent line])
```

- `Q.`/`A.` markers at Tab 1; testimony text at Tab 2.
- The wrapped question line returns flush to **0.0″** — hanging indent (§6).
- Speaker label at Tab 3 (three tabs), colon, two spaces before text — *placement only*.
- The parenthetical wraps but each line holds Tab 4 — block indent (§6).
- Two spaces after each sentence-ending mark and after the speaker-label colon (the *spacing* is
  geometry-relevant; the punctuation *rules* live in `MORSONS_TRANSCRIPT_RULES.md`).

---

## 12. Output targets

Every rule in this document applies identically across: **Workspace transcript · Copy Transcript ·
DOCX export · PDF export · Certification output.** The rendering technology differs per target
(§9); the geometry does not.

---

## 13. Cross-reference & what this resolves

**Resolved here:**
- **Tab model:** Model A (0.25″/0.625″/1.0″/1.5″/2.0″ → 360/900/1440/2160/2880 twips) is canonical.
- **Speaker-label position:** three tabs → Tab 3 → 1.0″/1440 twips.
- **Hanging indent:** wrapped Q/A and colloquy return to 0.0″ (supersedes any "return to Tab 2" note).

**Owned elsewhere:**
- Punctuation, numbers, italics, capitalization → `MORSONS_TRANSCRIPT_RULES.md`
- Speaker-label text/casing/honorifics, deterministic transforms → `GEOMETRY_ENGINE_RULES.md`
- Assembly, indexes, certificates → `TRANSCRIPT_ASSEMBLY_STANDARD.md`
- Editor behavior, line-number interaction during editing → `WORKSPACE_EDITING_AND_PROOFING.md`

**Still open (not geometry):** dash glyph, by-line alignment — see `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.
