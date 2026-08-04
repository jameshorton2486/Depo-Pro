# DEPO-PRO — Ratified Decisions

**Date ratified:** 2026-08-03
**Format authority:** Miah (Certified Shorthand Reporter)
**Architecture authority:** James (Owner)

These decisions are binding on all implementation. They change only via a numbered ADR in `docs/architecture/adr/`.

---

## CSR Format Decisions

**F1 — Colloquy speaker label position.** The colloquy speaker label is preceded by three LEFT-aligned tab stops at 0.5", 1.0", and 1.5". The label therefore begins 1.5" from the left margin. With the standard 1.5" left margin this is 3.0" from the paper edge. The code constant is 1.5", not 3.0".

**F2 — Colon spacing.** Two spaces between the colon following a speaker label and the body text that follows.

**F3 — Sentence spacing.** Two spaces after the end of every sentence.

**F4 — Abbreviation spacing.** One space after an abbreviation.

**F5 — Colloquy body and wrapping.** Body text begins on the same line as the speaker label. Continuation lines wrap flush to the left margin (0").

**F6 — Stutter rendering.** Stutters, false starts, and interruptions render as a spaced double hyphen: `I -- I`. *(Amended by [ADR-0011](adr/ADR-0011-stutter-double-hyphen.md); supersedes the original em-dash form, which was Miah's call and was reversed by the owner.)*

**F7 — Objection spacing.** Follows F3. `Objection. Form.` — two spaces.

**F8 — Line numbering.** 25 numbered lines per page. Applied at Certification only. Line numbers do not appear in the Transcript Workspace.

**F9 — Speaker labels.** Generic placeholders such as "Speaker 0" are never displayed. Display a real name, or a role title (THE REPORTER, THE VIDEOGRAPHER, THE WITNESS, THE COURT). Where neither is known, flag the paragraph for reporter assignment.

**F10 — Paragraph speaker reassignment.** The reporter can select any paragraph and reassign its speaker from a dropdown listing the names and role titles associated with that transcript.

**F11 — Witness answers during objection colloquy.** A witness answering the pending question — including immediately after an objection — renders as an `A.` line, never a `THE WITNESS:` speaker-label block. `THE WITNESS:` (F9) is reserved for genuine non-Q/A colloquy. *(Added by [ADR-0012](adr/ADR-0012-witness-answer-during-objection.md).)*

**F12 — Recess parenthetical.** A videographer "off the record" announcement triggers the canonical parenthetical `(Whereupon, a recess was taken at [time].)`. It is stored as a **reporter-authored notation** (not a Deepgram utterance), its timestamp traces to a verifiable source (the videographer's spoken time preferred; AI inference prohibited), and it is generated deterministically from persisted data. *(Added by [ADR-0013](adr/ADR-0013-recess-parenthetical.md); observes A3/A9.)*

---

## Architecture Decisions

**A1 — Corrections are recorded.** Corrections are stored as real correction records capturing original text, new text, originating engine, and engine version.

**A2 — One layout builder.** The duplicate transcript paragraph builders merge into a single shared intermediate model with thin DOM and DOCX renderers.

**A3 — Python is layout only.** The Python formatter performs layout only and does not change words. Its content-changing logic (garble maps, Q/A fixers) moves to the engine. Its oath synthesis is deleted and not ported anywhere.

**A4 — One owner for speaker identity.** A single component owns speaker name resolution. No consumer re-infers a speaker's name.

**A5 — AI corrections apply automatically, with recording and visible marking.** Per-change approval is not required. Conditions:

- every applied change is recorded per A1;
- changed text is visibly marked in the Workspace, with the original viewable;
- the reporter's full read-through, recorded at the Certification checklist, is the human decision covering the applied set;
- speaker label changes are marked more prominently than word changes.

Silent, unrecorded mutation remains prohibited.

**A6 — Proceedings structure is persisted.** Proceedings and region structure (oath, examination boundaries, off-record periods) are persisted as evidentiary data. Rendering reads them and never re-infers them.

**A7 — Migration files are the schema authority.** Production is reconciled to migration history via a catch-up migration. CI enforces parity between migration-built schema, generated types, and production.

**A8 — Rendering reads; rendering never writes.** A formatting pass is not a correction. Rendering rules are versioned, and the version is stamped on any certified artifact.

**A9 — Deepgram is the immutable baseline.** Verbatim filler words, stutters, and false starts are preserved exactly in every output path.

**A10 — Deterministic rendering.** The abbreviation list and all formatting rules are stored as versioned data. Rendering never calls an AI model. AI may propose additions to the abbreviation list; the list is data, and its version is stamped on certified output.

---

## Still Open

- Miah's visual confirmation of F1–F5 and F9 against the sample document (Prompt D), including the F1 left-margin question (1.25" deployed vs 1.5" reconciled).
- **Miah to be informed that F6 was amended** (em-dash → `--`) by the owner after she ratified it ([ADR-0011](adr/ADR-0011-stutter-double-hyphen.md)).
- Still Miah's call (not yet ratified): `THE REPORTER:` vs `THE COURT REPORTER:`, and whether `(continuing)` parentheticals are used at all.
- Miah's confirmation of the A5 marking approach and the F10 dropdown behavior.
- Additions to the abbreviation list (A10) — AI proposes, list is curated.
