> **STATUS: GEOMETRY SUPERSEDED BY DP-011 (2026-06-22).** The stale numeric
> geometry values formerly included in this document are removed to prevent
> drift. Use `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` for all geometry.
> Non-geometry prose (line-number positioning, format-box definition) is
> retained where consistent with DP-011.

# TRANSCRIPT_GEOMETRY_STANDARD

**Purpose.** The canonical dimensional ground truth for Depo-Pro transcript rendering — page
boundaries, line density, the tab hierarchy with exact measurements, wrapping/indentation, and
line-shaping. This is the authority the renderer, DOCX export, PDF export, Copy Transcript, and
certification output all conform to. It is the specification the Geometry Engine implements.

**Authority.** Geometry authority now lives in
`DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`. This document is retained only for
historical context where its non-geometry prose still agrees with DP-011.

**Scope.** Geometry only. Punctuation/number/style rules → `MORSONS_TRANSCRIPT_RULES.md`;
assembly/indexes/certificates → `UFM_FORMATTING_DATA.md`; deterministic transforms →
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
- Line shaping, wrapping, and Return-To-Margin / block indentation
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
  geometry; see `UFM_FORMATTING_DATA.md`.)

---

## 5. Tabulation hierarchy (SUPERSEDED)

**GEOMETRY SUPERSEDED — see `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` for all
canonical tab, margin, format-box, and line-spacing values.** The numeric
geometry values formerly listed here were stale and are removed to prevent
drift.

What remains true at the conceptual level:

- the transcript uses a fixed tab hierarchy
- `Q.` / `A.` designations, testimony text, speaker-label placement, and
  parenthetical placement each have distinct canonical positions
- style treatment is separate from geometry

---

## 6. Text wrapping & indentation

Two wrap behaviors, by content type:

- **Return-To-Margin Continuation (Q/A and speaker colloquy):** when the line
  wraps, the continuation returns **flush to the left text margin (0.0″)** —
  to the left of the `Q.`/`A.` marker. This matches certified-transcript
  practice.
- **Block indent (parentheticals):** when a parenthetical spans multiple lines, **every**
  subsequent line **maintains the first line's indentation** (Tab 4). It does **not** return to the
  left margin.

---

## 7. Line shaping

The Geometry Engine shapes lines by position only; it does not decide label text or content.

- **Q. / A. lines:** a tab before the letter, then another tab before the text.
- **Speaker labels:** the canonical speaker-label position is governed by
  `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`. The label is rendered bold
  all-caps, colon-terminated, followed by two spaces before text begins.
  (What the label *says* and its casing/honorific rules belong to
  `GEOMETRY_ENGINE_RULES.md` §5; geometry owns only position and the two-space
  gap.)

---

## 8. Non-negotiable geometry invariants

These must **never vary**, on any output target, for any transcript:

1. **25 lines per page.**
2. **6.5″ text-area width.**
3. **Canonical tab hierarchy** — see `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`.
4. **Return-To-Margin Continuation** — Q/A and colloquy wrap to 0.0″ (§6).
5. **Block-indent behavior** — parentheticals hold their indent on wrap (§6).
6. **Speaker-label position** — see `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`.
7. **Parenthetical position** — see `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`.
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

Showing canonical structure, two-space terminal spacing, and both wrap
behaviors. **Content is shown as placeholders** — geometry cares where things
sit, not what they say. For exact tab-stop values, see
`DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`.

```
       [TAB1]Q.[TAB2][question text that is long enough to wrap to a
second line and therefore returns flush to the 0.0" left margin]
       [TAB1]A.[TAB2][answer text]
                     [TAB3][SPEAKER LABEL]:  [colloquy text]
                                       [TAB4]([parenthetical text that
                                       wraps and holds the Tab 4 indent
                                       on every subsequent line])
```

- `Q.`/`A.` markers and testimony text follow the canonical tab hierarchy in
  `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`.
- The wrapped question line returns flush to **0.0″** — Return-To-Margin
  Continuation (§6).
- Speaker-label placement is canonical per
  `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`.
- The parenthetical wraps but each line holds its parenthetical indent —
  block indent (§6).
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
- line-number behavior remains visual-only and non-editable
- the format-box concept remains part of the geometry layer
- wrapped Q/A and colloquy return to 0.0″ via Return-To-Margin Continuation

**Canonical numeric geometry values:**
- **GEOMETRY SUPERSEDED — see `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` for
  all canonical tab/margin/box/line-spacing values.** The values formerly here
  were stale and are removed to prevent drift.

**Owned elsewhere:**
- Punctuation, numbers, italics, capitalization → `MORSONS_TRANSCRIPT_RULES.md`
- Speaker-label text/casing/honorifics, deterministic transforms → `GEOMETRY_ENGINE_RULES.md`
- Assembly, indexes, certificates → `UFM_FORMATTING_DATA.md`
- Editor behavior, line-number interaction during editing → `WORKSPACE_EDITING_AND_PROOFING.md`

**Still open (not geometry):** dash glyph, by-line alignment — see `UFM_FORMATTING_DATA.md` §16.
