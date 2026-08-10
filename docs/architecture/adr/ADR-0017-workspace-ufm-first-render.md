---
authority_tier: T4
status: ACTIVE
owner: Workspace
scope: workspace-first-render-formatting
supersedes: null
superseded_by: null
approved_by: James
version: 1.0.0
effective_date: 2026-08-07
ratified_date: 2026-08-07
last_reviewed: 2026-08-07
next_review: 2027-08-07
ratification: RATIFIED
implementation_status: NOT_STARTED
---

# ADR-0017 — Workspace UFM-formatted first render (transcript body)

**Status:** Ratified 2026-08-07 (owner: James). The Part 2 code PR remains gated on the verified clean re-transcription.
**Date:** 2026-08-07
**Deciders:** James (owner, architecture); Miah (format authority — visual conventions)
**Relates to:** ADR-0016 (Format and Correct button — Option C); ADR-0012 F19 / OQ-4 / OQ-5 / OQ-6;
ADR-0015 (geometry); DTAS / transcript-reproducibility principle.
**Amends:** none. Complements ADR-0016 by recontextualizing the button as *correction on top of an
already-formatted view*.

> Filename note: the requesting task named this `ADR-0016-workspace-ufm-first-render`. ADR-0016 is
> already taken (`ADR-0016-format-and-correct-transcript-button.md`, ratified, DOC-0315), so this is
> **ADR-0017**.

---

## Context

Today the Workspace first render applies only light deterministic formatting (the P-A pipeline:
speaker-role inference in `workspacePresentation.ts`, basic Q/A classification in `qaFixer.ts`,
punctuation/objection spacing in `editorialEngine.ts`, geometry from `geometryProfile.ts`). The richer
structural elements — proceedings/region classification (`depositionRegionEngine.ts`) and off-record
parenthetical generation (`boundaryEngine.ts`) — run **only at export** (via `exportAdapter.ts`), never
on Workspace load. Result: the reporter opens the Workspace to something that reads like a cleaned STT
dump, and only sees the UFM-formatted document when she exports it.

That is backwards. The reporter cannot review, correct, or approve a document she cannot see in its
formatted state. (Audit, 2026-08-07: two read-only passes confirmed the first-render vs export-render
split above, and that caption/appearances/certificate/errata assembly is likewise export-only.)

## Decisions

### Decision 1 — The Workspace is the formatting surface, not the export
Formatting and corrections apply to the **working transcript**, in the Workspace, where the reporter
reviews and approves. **Export renders the approved working transcript — it never re-derives or
re-formats at export time.** This is the DTAS reproducibility principle: derived structure is persisted
and read, not recomputed downstream.

### Decision 2 — First render is UFM-formatted
When a transcript loads, the TipTap editor renders it in UFM form: Q./A. structure, colloquy labels,
objection placement, parentheticals, speaker roles, and spacing rules — the document as it will appear
when certified, minus the export-only elements (Decision 3). The formatted **Reporter View** is the
default surface; the raw **Canonical Baseline** remains a *separate, read-only* evidence view (the
existing `renderLayer` model is unchanged). This ADR requires that the Reporter View first render be
UFM-**complete** — including proceedings and off-record parentheticals — not the current light P-A pass.

### Decision 3 — F19 scope (restating ratified F19 / OQ-4 / OQ-5 / OQ-6)
The Workspace body renders **transcript body only**.

**In the Workspace body:** Q. and A. lines; colloquy (reporter, attorneys, videographer); objections on
their own lines; parentheticals (off-record, exhibits, recesses); the proceedings section (oath,
appearances, on/off-record statements) **as actually spoken** (see Decision 5); `BY MR./MS. NAME:` lines
(flush left 0", per F15 / OQ-6); `EXAMINATION` section headers. Pre-certification header wording is
"Working Transcript" (OQ-5), never "CERTIFIED …".

**Not in the Workspace body (generated at export from Intake metadata):** caption page, appearances
page, certificate page, errata/signature page, the certified 25-line format box, and line numbers — the
per-utterance editing gutter is the sole exempt line-number affordance (OQ-4 / F8).

Geometry (tab stops, margins, wrap) is owned by ADR-0015 / `geometryProfile.ts` and is **not**
re-specified here.

### Decision 4 — Correction application model
AI corrections are **applied automatically** to Layer 2 (the working transcript), **not** surfaced as
pending suggestions. Every applied change is recorded (`original_word` immutable, `corrected_word`,
rule ID, confidence, `source_utterances` back-reference) and **visibly marked** in the Workspace with the
original viewable on inspection. Per A5, the reporter's full read-through at Certification is the human
decision covering the applied set; there is **no per-change approval gate**. (This revises the earlier
suggestion-only framing; ADR-0016's button is the trigger that runs this correction pass.)

**4a — Scope of correction.** In scope: speaker identification and merge; STT misrecognition (proper
nouns, homophones, domain terms); proceedings and off-record structure; Q/A segmentation, objections,
exhibit markers; assembly at export.

**4b — Fabrication boundary (inherited, not new).** The engine corrects words that are in the audio and
were misrecognized. It does **not** author words that are absent from the audio. Specifically prohibited:
templated insertion of expected-but-unverified content (oath responses, stipulations, standard colloquy),
and reconstruction of dropped or unintelligible speech from context. Unrecoverable audio renders
`[inaudible]`; ambiguous-but-present audio renders the best transcription plus `[VERIFY: ...]`. This is
the correction-engine application of platform invariant **A11** (RATIFIED_DECISIONS — no fabrication of
the spoken record); the same concepts are implemented in
`docs/ai-pipeline-spec/ENGINES_3_4_Structure_Corrections.md` (implementation reference, not authority).
It is **not** a new constraint introduced by this ADR. (Implementation guard: the Python desktop
`spec_engine/classifier.py` oath-synthesis branch — the `OATH_RE` handler — violates A11 / §4b and must
never enter the web pipeline; A3 already bars porting it.)

**4c — Rationale.** A misrecognized word corrected wrongly is an error a reporter catches on read-through
against the audio. An **invented** word has no audio to check it against — it reads as clean testimony and
survives certification undetected. The two failure modes are not symmetric, which is why the boundary
sits at "present in audio" rather than at a confidence threshold.

## Consequences

- The export-only structural engines (`depositionRegionEngine.ts`, `boundaryEngine.ts`) must feed the
  **first render**. Per DTAS, their output should persist to the working transcript and the renderer
  should *read* it, rather than re-infer at render time. (Part 2 wires this.)
- Export becomes a pure renderer of the approved working transcript (Decision 1) — no divergence between
  what the reporter approved and what certifies.
- ADR-0016's button runs the Decision 4 correction pass (auto-apply + record + visibly mark), not a suggestion queue.

## Open items (resolve before/along with Part 2)

- **Parenthetical color.** The requesting task specified navy `#1E3A5F` for parentheticals. This is **not
  a ratified CSR convention** — F20 (OQ-1) specifies parenthetical *position and spacing only*, and
  "navy parentheticals" was flagged as unverified external guidance not present in the four reference
  transcripts. Treat any color as a **UI affordance**, not a certified-format rule; do not encode it as
  a format requirement without Miah's confirmation.
- First render must be exercised against a **complete, faithful** transcript. The recent ingestion fix
  (auto-chunk disable) is a prerequisite — formatting the corrupted/truncated transcript would validate
  nothing.

## Part 2 boundary (no code in this ADR)

Part 2 (`fix/workspace-ufm-first-render`) wires `buildEditorContent.ts` to produce a UFM-formatted TipTap
document on first load, drawing proceedings/off-record structure from the (persisted) working transcript.
Part 2 is gated on: (1) this ADR ratified by the owner, and (2) the clean re-transcription verified.
Part 2 must not touch the export pipeline (it reads the working transcript), migrations/schema, or
auto-apply any AI correction.
