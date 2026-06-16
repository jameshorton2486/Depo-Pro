# GEOMETRY_ENGINE_DEFINITION

**What this is.** The responsibility contract for the **Geometry Engine** — the boundary of what
it does and, just as importantly, what it must refuse to do. This is the spec a Codex
implementation prompt points at. It is a *contract*, not a rule book: the rules themselves live in
the standards this engine consumes (see Dependencies); this file says which rules apply and where
the engine's job stops.

**The one-sentence test.** The Geometry Engine answers only: *where does the text go, how does it
wrap, how does it indent, how does it appear on the page?* Anything answering *who / what / why* is
a different engine.

---

## Purpose

Transform a **correctly classified** transcript into a properly formatted, UFM-compliant Texas
transcript. It controls placement, indentation, tabs, wrapping, spacing, line shaping, and page
geometry. It does **not** determine who is speaking, what was said, judgment-dependent punctuation,
reconstruction, or procedural inference.

---

## Inputs

The engine assumes its inputs are already correct and does not second-guess them.

- **Canonical paragraph model** with classified kinds: `Q`, `A`, `COLLOQUY`, `EXAMINATION`,
  `BY_LINE`, `PARENTHETICAL`.
- **Already-resolved speaker labels** (e.g. `THE REPORTER`, `MR. NUNEZ`, `MR. THOMAS`, `MS. ZAHN`).
  Identity resolution happened upstream (speaker-resolution overlay); the engine renders what it is
  given.

If a label is wrong or a paragraph is misclassified, that is an upstream defect — the Geometry
Engine still renders it faithfully rather than "fixing" it.

---

## Output

One geometry specification, consumed identically by every target:
- Workspace rendering
- Copy Transcript output
- DOCX formatting model
- PDF formatting model
- Certification formatting model

All targets consume the **same** geometry. Rendering technology differs per target; the geometry
does not.

---

## Rendering-layer boundary

Per `TRANSCRIPT_GEOMETRY_STANDARD.md` §9, output composites three layers. The Geometry Engine owns
the **geometry layer** and applies exactly one delegated **style-layer** rule (citation italics,
Responsibility 6). It never touches the **content layer** (the words, label text). Naming this
keeps "the engine also italicizes citations" from looking like scope creep — it is one explicitly
delegated style rule, not general styling authority.

---

## Responsibilities

### 1. Q/A geometry
`Q. text` → `[TAB0.5]Q.[TAB1.0]text`; `A. text` → `[TAB0.5]A.[TAB1.0]text`. Wrapped lines continue
at the **Q/A testimony-text position (1.0″ / 1440 twips)**, not under the Q./A. marker and not at
the left text margin.

### 2. Speaker-label geometry
Render at 1.5″ / 2160 twips: bold, uppercase, colon-terminated, **two spaces after the
colon**. **One space after the honorific period** (`MR. NUNEZ:`, not `MR.  NUNEZ:`) — resolved,
one space after every honorific period everywhere; the two-space rule applies only to the colon and
to sentence-ending punctuation. The engine renders the label text it is given; it does not decide
casing or which honorific attaches (that is upstream / `GEOMETRY_ENGINE_RULES.md` §5).

### 3. Parenthetical geometry
Render at 1.5″ / 2160 twips. Wrapped parentheticals retain block indentation — do **not** return
to the left margin. Navy blue in Workspace (style layer; preserved per target capability).

### 4. Examination / BY-line geometry
Render `EXAMINATION` and `BY MR. NUNEZ:` by **placement only** — no reconstruction.
`EXAMINATION` is bold all-caps at **1.5″ / 2160 twips**. `BY MR. NUNEZ:` is bold at the **left
margin (0.0″ / 0 twips)**. Neither is centered.

### 5. Page geometry
Apply 25 lines per page, line numbering, the format box, Courier New 12 pt, double spacing. This
output **feeds the Pagination Engine** — the Geometry Engine itself never inserts page breaks
(`TRANSCRIPT_GEOMETRY_STANDARD.md` §10).

### 6. Citation typography (delegated style rule)
Apply display-layer italics only: case citations and Latin citation phrases
(`*Miranda v. Arizona*`, `*United States ex rel. La Fera v. Jackson*`). Authority is
`MORSONS_TRANSCRIPT_RULES.md` §5. **No transcript content changes** — display only; the words are
untouched.

---

## Explicitly out of scope

The Geometry Engine must **not**:
- identify speakers
- create or pair Q/A
- infer objections, exhibits, recesses, or any procedural event
- modify transcript wording
- alter punctuation requiring judgment (fragment `?` vs `.`, semicolon vs period, paragraphing)
- perform AI correction or proofreading

These belong to separate engines. The implementation temptation will be to fix visible transcript
problems (Q/A reconstruction, speaker fixes, objection/recess inference) because they are obvious
on screen. **Do not.** A visible defect outside the list above is logged for the responsible
engine, not fixed here. This refusal is the engine's most important property.

---

## Dependencies (consume, never duplicate)

- `TRANSCRIPT_GEOMETRY_STANDARD.md` — canonical geometry (tabs, margins, wrapping, line shaping,
  invariants). Primary authority.
- `MORSONS_TRANSCRIPT_RULES.md` — the one style rule the engine applies (citation italics, §5) and
  the spacing rules it honors.

**Does NOT consume `TRANSCRIPT_ASSEMBLY_STANDARD.md`.** Assembly decides *what pages exist and
when* — outside geometry's scope. Depending on it would be the exact scope-bleed this contract
guards against. The Assembly Engine consumes that file; the Geometry Engine does not.

The engine must not restate rules from its dependencies — it references them. If a geometry value
is needed, it comes from `TRANSCRIPT_GEOMETRY_STANDARD.md`, not a copy here.

---

## Position in the engine sequence

Built **first** (highest-value, highest-blast-radius — a geometry error propagates to Workspace,
Copy, DOCX, PDF, and Certification at once). Engines built after, each consuming Geometry output:

1. Procedural Reconstruction Engine (recess/exhibit/swearing-in detection→generation)
2. Word-Style Editing Engine (`WORKSPACE_EDITING_AND_PROOFING.md` §2)
3. Proofreading & Confidence Engine (`WORKSPACE_EDITING_AND_PROOFING.md` §3)

---

## Acceptance (engine-level)

- Every output target renders from the one geometry spec; no target-specific geometry forks.
- All eight non-negotiable invariants (`TRANSCRIPT_GEOMETRY_STANDARD.md` §8) hold.
- The engine renders misclassified input faithfully rather than correcting it (scope proof).
- No rule from a dependency is duplicated here.
- The resolved register decisions (#2 tab model, #3 dash glyph, #4 by-line alignment) are honored
  exactly and are not reinterpreted per target.
