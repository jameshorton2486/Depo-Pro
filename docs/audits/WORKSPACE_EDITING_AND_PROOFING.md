# WORKSPACE_EDITING_AND_PROOFING

**Purpose.** Requirements for the *interactive workspace* — what a court reporter can do to a
transcript on screen, and how those actions persist. This is the missing half of the reference
set: the four formatting docs describe how a transcript should *look*; this describes how the
reporter *works on it*. Covers (1) Word-style editing, (2) low-confidence highlighting for
proofreading, and (3) the edit-persistence constraints that keep edits from corrupting the
record.

**Companion files.** Output formatting → `TRANSCRIPT_ASSEMBLY_STANDARD.md`, `MORSONS_TRANSCRIPT_RULES.md`,
`TRANSCRIPT_GEOMETRY_STANDARD.md`, `GEOMETRY_ENGINE_RULES.md`. This file is workspace behavior,
not formatting rules.

**Grounding facts (from the Source-of-Truth audit of `tr_1781559088619_7rch7i`).** Workspace and
export now share one paragraph model (parity proven: 2134 = 2134, first divergence index NONE).
Workspace text is word-driven: `word.working_text ?? word.raw_text`
(`workspaceService.ts:151`). Export text is utterance-row-driven (`utterance.text`). Any editing
design must preserve that parity and must not reintroduce a second representation.

---

## 1. Canonical / display two-layer rule (the constraint everything obeys)

Every requirement in this file is subordinate to this:

- **Canonical layer** = raw utterances/words and their **timings**. Immutable post-ingest. The
  sync/correction source of truth. Edits **never** alter raw word timings.
- **Working text** = per-word `working_text` overlaid on `raw_text`. User word-edits write
  `working_text`; `raw_text` is preserved untouched so the original Deepgram output is always
  recoverable.
- **Display layer** = formatting applied for rendering (tabs, paragraph shaping, speaker labels,
  highlights, parenthetical color). Display formatting never mutates canonical text or timings.

Implication for editing: a reporter changing a word edits `working_text`; a reporter changing
layout (a tab, a carriage return) edits the display layer. Neither touches raw timings. This is
what lets the record stay legally defensible while still being editable.

---

## 2. MS Word-style editing (explicit requirement)

The workspace transcript must be directly editable, with the feel of a word processor — not a
read-only render with a side panel. Editor is TipTap v3 (existing).

### 2.1 Required edit operations
- **Click-and-type:** place the cursor anywhere and edit text inline.
- **Change words:** edit/replace word text; the change writes `working_text` for the affected
  word(s), preserving `raw_text` and timings (§1).
- **Carriage returns:** split a paragraph at the cursor (new Q, new A, new colloquy block).
- **Tabs:** insert/adjust tabulation consistent with the canonical tab model
  (`TRANSCRIPT_GEOMETRY_STANDARD.md` §5).
- **Paragraph splits and merges:** divide one paragraph into two, or join two into one.
- **Standard editing affordances:** selection, cut/copy/paste, undo/redo, backspace/delete.

### 2.2 Persistence rules
- Word-text edits persist to `working_text` at word granularity; raw word rows and timings are
  unchanged.
- Structural edits (splits/merges, returns, tabs) persist to the **shared paragraph model** so
  workspace and export stay in parity (the audit's proven invariant). A structural edit must not
  create a workspace-only or export-only representation.
- Edits are atomic and survive reload (persisted, not session-only).
- **[DESIGN OPEN]** How structural display edits (a manual paragraph split that does not
  correspond to a raw utterance boundary, a manually inserted tab) serialize against a
  word/utterance-derived paragraph model is not yet specified. This needs a deliberate design
  decision before implementation — it is the one place editing can silently diverge from the
  canonical stream. Resolve before building §2.1 structural ops.

### 2.3 What editing must not do
- Must not alter raw utterance/word timings.
- Must not overwrite `raw_text` (only `working_text`).
- Must not break workspace/export paragraph parity.
- Must not silently re-run AI correction (AI correction stays explicit per existing principle).

---

## 3. Low-confidence word highlighting (explicit requirement)

Low-confidence words must be identifiable and highlighted in the workspace so proofreading and
correction are faster.

### 3.1 Source & trigger
- Source is the **Deepgram word-level confidence score** already persisted on `transcript_words`.
  No new data needed.
- Words below a confidence threshold are visually highlighted. Threshold should be a constant the
  engine controls (and may later be reporter-configurable); start with a single platform default
  rather than per-transcript tuning.

### 3.2 Visual & interaction
- Highlight is a **display-layer** treatment only — it never alters canonical text or timings
  (§1).
- A flagged word is visually distinct (highlight/underline); the treatment must coexist with
  speaker-label bold, parenthetical navy, and scopist-flag orange without clashing.
- Clicking a flagged word focuses it for correction (cursor lands ready to edit, per §2).
- Optional toggle to show/hide highlighting for a clean reading pass.

### 3.3 Lifecycle
- When a flagged word is edited/corrected (its `working_text` is set) or explicitly marked
  reviewed, its flag clears. This ties to the existing review-completion state
  (`confidence_review_complete`).
- Highlighting recomputes from confidence on load; corrected/reviewed words do not re-flag.
- Highlighting is proofreading scaffolding only and is **not** part of any export/certification
  output — it never appears in DOCX/PDF.

---

## 4. Procedural reconstruction (partially covered — flagged, not fully specified here)

The audit and gold-standard comparison show the transcript should contain reconstructed
procedural elements the raw output lacks:
- `(Recess from 1:34 p.m. to 1:35 p.m.)`
- `(Exhibit 1 marked.)`
- `(Read and sign requested.)` / signature waiver handling
- swearing-in ceremony block

**Coverage today:** parenthetical *formatting* and the approved set live in
`GEOMETRY_ENGINE_RULES.md` §7.6; the videographer-timestamp *trigger* concept is in
`TRANSCRIPT_ASSEMBLY_STANDARD.md` §14; the witness/interpreter swearing-in *blocks* are in
`TRANSCRIPT_ASSEMBLY_STANDARD.md` §8–9. **Not covered:** the detection→generation logic — recognizing the
spoken cue (e.g., "we're going off the record at 1:34 p.m." paired with "back on the record at
1:35 p.m.") and emitting the correct parenthetical with paired times. That pairing is sequence-
dependent and partly **[CONTEXT]/AI**, so it is its own engine, not a deterministic transform.

This file does not spec that engine — it would be guessing at the trigger logic. It is recorded
here as a known, bounded next engine ("Procedural Reconstruction Engine") to be designed
deliberately, consistent with the user's stated sequencing (geometry first, then reconstruction
engines).

---

## 5. Relationship to the live label bug

The reported behavior — changing Speaker 2 to "Mr. Thomas" but the label rendering as `THOMAS`
instead of `MR. THOMAS:` — is **not** a missing rule. The rule (honorific always included, label
in `MR./MS. LASTNAME:` form, colon + two spaces) is specified in `GEOMETRY_ENGINE_RULES.md`
§5.2–5.3. The audit shows workspace labels are stored as bare surnames (`THOMAS`, `NUNEZ`), so
this is an **implementation** gap in the label renderer / speaker-identity map
(`speakerIdentity.ts`), to be fixed against the existing rule — not a documentation change.

---

## 6. Cross-reference
- Edit persistence / canonical timings → §1 here + speaker-resolution overlay architecture.
- Tab model for inserted tabs → `TRANSCRIPT_GEOMETRY_STANDARD.md` §5.
- Label formatting the renderer must satisfy → `GEOMETRY_ENGINE_RULES.md` §5.
- Parenthetical formatting for reconstructed procedurals → `GEOMETRY_ENGINE_RULES.md` §7.6.
- Open conflicts (tabs resolved; honorific/dash/by-line pending) → `TRANSCRIPT_ASSEMBLY_STANDARD.md` §16.
