# TRANSCRIPT_GEOMETRY_STANDARD

**Purpose.** The canonical dimensional ground truth for Depo-Pro transcript rendering — page
boundaries, line density, the tab hierarchy with exact measurements, wrapping/indentation, and
line-shaping. This is the authority the renderer, DOCX export, PDF export, Copy Transcript, and
certification output all conform to. It is the specification the Geometry Engine implements.

**Authority.** This document **resolves the tab-position conflict** formerly tracked in
`GEOMETRY_ENGINE_RULES.md` §0.1 and `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16 (#2/#4). The Formatter
tab model in §5 is **canonical**; any other tab values in earlier docs are superseded. It also
**resolves the hanging-indent rule**: wrapped Q/A continues at the testimony-text tab (1.0″ /
1440 twips), not at the left text margin.

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

A strict sequence of placement stops, measured from the left text margin. This is the **Formatter
model** and is the only live geometry.

| Element | Inches | Twips | Used for |
|---|---|---|---|
| `Q.` / `A.` marker | 0.5″ | 720 | The `Q.` / `A.` designation only |
| Q/A testimony text | 1.0″ | 1440 | Start of testimony text after `Q.` / `A.` |
| Speaker label | 1.5″ | 2160 | `THE REPORTER:`, `MR. NUNEZ:`, etc. |
| `EXAMINATION` header | 1.5″ | 2160 | Examination heading placement |
| Parenthetical | 1.5″ | 2160 | Parenthetical placement |
| `BY MR./MS. ___:` byline | 0.0″ | 0 | Left-margin byline placement |

(Navy-blue parenthetical text is a **style-layer** concern, §11 — the table above governs only
*position*.)

---

## 6. Text wrapping & indentation

Two wrap behaviors, by content type:

- **Q/A continuation:** when a question or answer wraps, the continuation returns to the **Q/A
  testimony-text position (1.0″ / 1440 twips)**, not to the left text margin.
- **Speaker colloquy:** label remains at the speaker-label position; the colloquy text continues in
  the same text body after the colon.
- **Block indent (parentheticals):** when a parenthetical spans multiple lines, **every**
  subsequent line **maintains the first line's indentation** (1.5″ / 2160 twips). It does **not**
  return to the left margin.

---

## 7. Line shaping

The Geometry Engine shapes lines by position only; it does not decide label text or content.

- **Q. / A. lines:** tab to **0.5″ / 720 twips**, render the marker, then tab to **1.0″ / 1440
  twips** before the text — `[TAB0.5]Q.[TAB1.0][question text]` /
  `[TAB0.5]A.[TAB1.0][answer text]`.
- **Speaker labels:** rendered at **1.5″ / 2160 twips**. The label is bold all-caps,
  colon-terminated, followed by two spaces after the colon —
  `[TAB1.5][LABEL]:  [text]`.
  (What the label *says* and its casing/honorific rules belong to
  `GEOMETRY_ENGINE_RULES.md` §5; geometry owns only the 1.5-inch position and the two-space gap.)
- **`EXAMINATION` header:** rendered at **1.5″ / 2160 twips**, bold all-caps.
- **`BY MR./MS. ___:` byline:** rendered at the **left margin (0.0″ / 0 twips)**, bold.

---

## 8. Non-negotiable geometry invariants

These must **never vary**, on any output target, for any transcript:

1. **25 lines per page.**
2. **6.5″ text-area width.**
3. **Canonical tab hierarchy** (§5) — the Formatter positions are fixed.
4. **Q/A continuation behavior** — wrapped Q/A continues at 1.0″ / 1440 twips (§6).
5. **Block-indent behavior** — parentheticals hold their indent on wrap (§6).
6. **Speaker-label position** — 1.5″ / 2160 twips.
7. **`EXAMINATION` header position** — 1.5″ / 2160 twips; **BY-line position** — 0.0″ / 0 twips.
8. **Parenthetical position** — 1.5″ / 2160 twips.
9. **Line numbers** — visual, non-editable, auto-regenerated, copy-excluded (§3.2).

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

Showing canonical tab stops, the Q/A tab shape, and both wrap behaviors. **Content is shown as
placeholders** — geometry cares where things sit, not what they say.

```
col:   0.0"                  0.5"          1.0"                        1.5"
       |                     |             |                           |
                 [TAB0.5]Q.[TAB1.0][question text that is long enough
                                 to wrap and continue at the 1.0" text tab]
                 [TAB0.5]A.[TAB1.0][answer text]
[BY MR. NUNEZ:]
                                                               [TAB1.5]EXAMINATION
                                                               [TAB1.5][SPEAKER LABEL]:  [colloquy text]
                                                               [TAB1.5]([parenthetical text that
                                                               wraps and holds the same indent
                                                               on every subsequent line])
```

- `Q.`/`A.` markers at 0.5″; testimony text at 1.0″.
- The wrapped question line continues at **1.0″** — Q/A continuation (§6).
- Speaker label and `EXAMINATION` header at **1.5″**; `BY MR./MS. ___:` at the left margin.
- The parenthetical wraps but each line holds the 1.5″ indent — block indent (§6).
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
- **Tab model:** Formatter model is canonical: Q/A marker 0.5″/720; Q/A text + wrap 1.0″/1440;
  speaker labels / `EXAMINATION` / parentheticals 1.5″/2160; byline 0.0″/0.
- **Speaker-label position:** 1.5″ / 2160 twips.
- **Q/A continuation:** wrapped Q/A continues at 1.0″ / 1440 twips (supersedes any "return to
  0.0″" or "return to Tab 2" note).
- **Q/A line shape:** tab to marker, tab to text; no `Q.` + two-space line-shape rule survives.

**Owned elsewhere:**
- Punctuation, numbers, italics, capitalization → `MORSONS_TRANSCRIPT_RULES.md`
- Speaker-label text/casing/honorifics, deterministic transforms → `GEOMETRY_ENGINE_RULES.md`
- Assembly, indexes, certificates → `TRANSCRIPT_ASSEMBLY_STANDARD.md`
- Editor behavior, line-number interaction during editing → `WORKSPACE_EDITING_AND_PROOFING.md`

**Resolved in the register and consumed here:** dash glyph `--`; `EXAMINATION` at 1.5″ and byline
at the left margin — see `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.
