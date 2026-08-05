# DEPO-PRO — Ratified Decisions

**Date ratified:** 2026-08-03 (amended 2026-08-04 via ADRs 0011–0014)
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

**F5b — Retired.** The proposed rule that a new colloquy paragraph by the same speaker "holds" at the third tab (1.5") was not observed in any of the four reference depositions and has no basis: every same-speaker continuation is either a line wrap to 0" (F5) or a freshly-labeled new turn. Retired by ADR-0012 (OQ-2).

**F6 — Stutter and interruption rendering.** Stutters, interrupted speech, and mid-sentence self-corrections render with a spaced double hyphen `--` (space, dash, dash, space), not an em-dash: `I -- I`, `but --`. Multiple occurrences in one sentence render identically. Amended from the original em-dash by [ADR-0011](adr/ADR-0011-stutter-double-hyphen.md) and confirmed across four produced transcripts.

**F7 — Objection spacing.** Follows F3. `Objection.  Form.` — two spaces after "Objection." ("Objection." is treated as a sentence.) The variant "Object to the form." is verbatim attorney speech, not a house format; F3 governs either way.

**F8 — Line numbering.** The certified 25-line-per-page numbering (solid format box, lines 1–25) is applied at Certification only and does not appear in the certified Transcript Workspace output. A separate per-utterance line-number gutter is displayed in the Workspace editor as a proofreading and collaboration aid; this gutter is exempt from the no-line-numbers rule and must be stripped by the export pipeline before any certified output is produced. Amended by ADR-0012; carve-out confirmed by Miah (CSR).

**F9 — Speaker labels.** Generic placeholders such as "Speaker 0" are never displayed. Display a real name, or a role title (THE REPORTER, THE VIDEOGRAPHER, THE WITNESS, THE COURT). Where neither is known, flag the paragraph for reporter assignment.

**F10 — Paragraph speaker reassignment.** The reporter can select any paragraph and reassign its speaker from a dropdown listing the names and role titles associated with that transcript.

**F11 — Witness answer format.** Following colloquy, a witness's answer to a question renders with the `A.` label, not `THE WITNESS:`. `THE WITNESS:` is used only when the witness speaks during attorney colloquy rather than answering a question. Confirmed across four produced depositions. Ratified by [ADR-0014](adr/ADR-0014-witness-answer-during-objection.md).

**F12 — Recess parenthetical.** A videographer "off the record" announcement renders the canonical parenthetical `(Whereupon, a recess was taken at [time].)`. It is stored as a reporter-authored notation (not a Deepgram utterance), its timestamp traces to a verifiable source (the videographer's spoken time preferred; AI inference prohibited), and it is generated deterministically from persisted data. Added by [ADR-0013](adr/ADR-0013-recess-parenthetical.md); observes A3/A9.

**F13 — Q./A. body wrapping.** Q./A. body continuation lines wrap flush to the left margin (0"), the same as colloquy (F5); only the first line carries the label/text indent. Amends the prior 1.0" wrap assumption.

**F14 — New paragraph within a Q or A.** A new paragraph by the same Q/A speaker begins at the text column (1.0") with no repeated Q./A. label; its continuation lines wrap to 0".

**F15 — Standalone examination by-line.** A standalone `BY MR./MS. NAME:` examination by-line renders flush left at 0", immediately below the centered examination header. This is distinct from the inline resumption form (F17). Implementation required per ADR-0012 (OQ-6).

**F16 — Witness name and oath line.** The witness name renders centered and bold. The sworn attestation line ("having been first duly sworn, testified as follows:") renders flush left at 0", not centered.

**F17 — Inline resumption by-line.** When questioning resumes after a colloquy interruption on the same page, it renders as `Q.` + tab + `(BY MR. NAME)` + two spaces + text — parenthetical form, no colon.

**F18 — Spelled-out words.** Spelled-out words render with an initial capital, lowercase remainder, hyphen-separated, and a terminal period: `B-e-r-m-a-d.`

**F19 — Workspace scope.** The Workspace renders transcript body only. Caption, appearances, certificate, and errata belong to the UFM/export section. The per-utterance line-number gutter is an exempt editing aid (see F8).

**F20 — Parenthetical rendering.** Parentheticals render at the third tab (1.5"), aligned with colloquy speaker labels, with no terminal period and no blank lines above or below. The earlier 1.0" and 2.0" values are superseded. Ratified by ADR-0012 (OQ-1).

**F21 — Exhibit marking.** The exhibit-marking parenthetical immediately follows the attorney's statement; examination then resumes with an inline by-line per F17.

**F22 — Inline resumption confirmed.** The F17 inline resumption form appears consistently across all four reference depositions. NOTE: all four were produced by the same reporter (Trisha Myler, CSR). The convention is therefore strongly established within this reporter's work, but cross-reporter generality is not independently established from this corpus.

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

## Recent Amendments

**ADR-0012 (2026-08-04)** — Six ratified decisions from the workspace pipeline audit:

- OQ-1: parenthetical indent → 1.5" (see F20)
- OQ-2: F5b retired (not a rule; no transcript evidence)
- OQ-3: AI Review button → rename to "Run AI Review"; deterministic (P-A) and AI (P-B) pipelines stay separate
- OQ-4: per-utterance line gutter in the Workspace → exempt editing aid (see F8); export must strip it
- OQ-5: "CERTIFIED TRANSCRIPT" header removed from the Workspace → working-draft indicator (exact wording pending Miah)
- OQ-6: standalone `BY MR./MS. NAME:` line → implement at 0" (see F15)

Also corrected F6 (em-dash → `--`, catching up to ADR-0011) and folded F11, F13–F22 into this document as the single source of truth.

**ADR reconciliation (2026-08-04)** — added standalone ADR files ADR-0011 (stutter `--`), ADR-0013 (F12 recess parenthetical), and ADR-0014 (F11 witness-answer-during-objection — renumbered from the "ADR-0012" drafted in the superseded PR #68). All ADRs now live under `docs/architecture/adr/` (the path this document cites); the earlier root-level ADRs were moved there. Added F12. OQ-4's export gutter-strip condition was verified — see `docs/audits/OQ4_GUTTER_STRIP_VERIFICATION.md`.

---

## Still Open

- Working-draft header exact wording (OQ-5) — pending Miah's copy sign-off before code PR 3.
- Miah to be informed that F6 was amended (em-dash → `--`) by the owner after she ratified it ([ADR-0011](adr/ADR-0011-stutter-double-hyphen.md)).
- Still Miah's call (not yet ratified): `THE REPORTER:` vs `THE COURT REPORTER:`, and whether `(continuing)` parentheticals are used at all.
- F1 left-margin discrepancy: F1 states a 1.5" left margin, but `geometryProfile.leftMarginInches` is 1.25" (DP-011 §A2). Reconcile which is canonical.
- Miah's confirmation of the A5 marking approach and the F10 dropdown behavior.
- Additions to the abbreviation list (A10) — AI proposes, list is curated.
