# PROMPT — SPEAKER-AWARE PARAGRAPH RENDERING

## Goal

Build a deterministic speaker-aware paragraph renderer for the transcript workspace so the visible transcript structure matches corrected deposition geometry more closely.

This prompt is **not** about improving diarization.

This prompt is **not** about speaker reconstruction.

This prompt is about taking already-preserved canonical utterances plus resolved speaker metadata and rendering them into the correct paragraph shapes:

- labeled colloquy paragraphs
- examination headings
- by-attribution lines
- `Q.` paragraphs
- `A.` paragraphs
- reporter/interpreter interruption paragraphs
- recess / continuation parentheticals

## Locked Inputs

These inputs are locked and must be treated as prerequisites:

1. `docs/audits/SPEAKER_ATTRIBUTION_AUDIT_2026-06-15.md`
2. `docs/audits/SPEAKER_ATTRIBUTION_AUDIT_POST_FIX_2026-06-15.md`
3. `docs/audits/TRANSCRIPT_REASSEMBLY_AUDIT.md`
4. `docs/audits/TRANSCRIPT_REASSEMBLY_VALIDATION_2026-06-15.md`
5. `docs/prompts/speaker-resolution/PROMPT_ASSEMBLY_ATTRIBUTION_PRESERVATION.md`
6. `docs/prompts/speaker-resolution/PROMPT_LIMITED_TRANSCRIPT_REASSEMBLY_ENGINE.md`

Locked conclusions:

1. Word-level speaker attribution is now preserved through assembly.
2. Reassembly can backfill stale transcripts so canonical utterances become speaker-pure.
3. The remaining gap is not only attribution preservation; it is visible paragraph geometry.
4. The corrected reference transcript demonstrates the target structure more clearly than the current workspace rendering.

## Normative Reference Artifact

Use this corrected transcript as the rendering reference:

- `C:\Users\james\projects\depo-pro\tmp_thomas_corrected.docx`

Observed target geometry from that document:

1. `PROCEEDINGS` is a heading.
2. Pre-examination colloquy is rendered as labeled speaker paragraphs:
   - `THE REPORTER:`
   - `MR. NUNEZ:`
   - `MS. ZHAN:`
   - `MR. THOMAS:`
3. Witness swearing / introductory ceremony is preserved as distinct structural paragraphs.
4. `EXAMINATION` is a heading.
5. `BY MR. NUNEZ:` is a standalone attribution line.
6. Questions render as standalone `Q.` paragraphs.
7. Answers render as standalone `A.` paragraphs.
8. Reporter interruptions break the Q/A stream and render as labeled reporter paragraphs.
9. Recesses render as standalone parenthetical paragraphs.
10. Continued examination returns to `Q.` / `A.` geometry after interruptions or recesses.
11. Speaker-labeled colloquy is a **single paragraph line**, not a label line followed by a body line.
12. Example target content shape:

```text
THE REPORTER:  Good afternoon, Mr. Nunez.
```

with:

- exactly two spaces after the colon
- the spoken text on the same paragraph line as the label
- rendered inside the colloquy margin defined by existing transcript geometry, not as a detached heading

13. The same colloquy geometry applies to lines such as:

- `THE REPORTER:  How are you?`
- `MR. NUNEZ:  Good afternoon.`
- `MR. NUNEZ:  Doing well.`
- `THE WITNESS:  Yes.`
- `MR. NUNEZ:  Objection.`
- `THE VIDEOGRAPHER:  We are off the record.`

## Branch

`feature/stage3-workspace-core`

## Scope

Allowed:

- rendering audit and characterization
- deterministic paragraph classification
- speaker-aware grouping in workspace rendering
- additive local renderer types
- renderer tests
- visual verification against the corrected DOCX reference

Disallowed:

- schema changes
- migrations
- transcript reassembly changes
- diarization changes
- speaker reconstruction logic
- participant inference heuristics
- AI / LLM logic
- export rewrites in this prompt
- certification workflow changes

## Problem Statement

Current state:

- canonical utterances can now be speaker-pure
- resolved speaker metadata exists
- workspace rendering still presents a mostly flat utterance stream
- `speaker_label` is stored as metadata but not expressed as correct paragraph geometry

Current failure mode:

```text
speaker-pure canonical utterances exist
  ↓
workspace rendering emits one generic utterance block per utterance
  ↓
visible transcript still resembles raw colloquy text
  ↓
speaker geometry remains hidden from the operator
```

Target behavior:

```text
speaker-pure canonical utterances + resolved speakers
  ↓
deterministic paragraph classifier
  ↓
speaker-aware paragraph stream
  ↓
visible transcript reflects proceedings / colloquy / Q-A / recess structure
```

## Task 0 — Re-verify Before Coding

Before touching code, verify and report:

1. The corrected DOCX remains available at the path above.
2. The current workspace renderer still flows through `src/lib/buildEditorContent.ts`.
3. No newer code has already introduced a speaker-aware paragraph renderer.
4. The audited / rebuilt transcript data for `tr_1781563788609_b38j6p` can still be used as the primary validation target.

If any of the above are false, STOP and report.

## Required Architecture

Build this in bounded layers.

### Layer 1 — Characterization

Characterize the current renderer and lock the failure mode with tests.

At minimum prove:

1. the current renderer emits one generic block per utterance
2. it stores speaker labels as metadata rather than visible structure
3. it does not currently emit examination / Q-A / parenthetical paragraph types

### Layer 2 — Speaker-Aware Paragraph Model

Introduce an additive local paragraph model for workspace rendering only.

Suggested local paragraph categories:

- `heading`
- `speaker_colloquy`
- `witness_intro`
- `examination_heading`
- `by_attribution`
- `question`
- `answer`
- `parenthetical`

Do **not** change frozen contract types.

### Layer 3 — Deterministic Classifier

Classify canonical utterances into paragraph shapes using only deterministic inputs:

- speaker role
- resolved speaker label
- utterance text
- local transcript state / sequence context

No heuristics that require AI.

No participant reconstruction.

## Required Rendering Rules

### Proceedings / Colloquy

Outside examination mode:

- consecutive utterances from the same resolved speaker may merge into one labeled colloquy paragraph if no structural break occurs
- colloquy paragraphs must visibly render speaker labels such as:
  - `THE REPORTER:`
  - `MR. NUNEZ:`
  - `MS. ZHAN:`
  - `MR. THOMAS:`
- colloquy paragraphs must render as one line/paragraph in the form:

```text
SPEAKER LABEL:  text...
```

- colloquy geometry must align with existing transcript architecture and Stage S / export conventions:
  - inline speaker label
  - exactly two spaces after the colon
  - rendered within the colloquy margin
  - label is not treated as a heading
  - content remains one colloquy paragraph, not split into separate label/body blocks
- do **not** render:
  - label on its own line
  - label as a detached block above the speech
  - a single-space form like `THE REPORTER: Good afternoon...`
  - chat-style speaker blocks

Where existing repo geometry is already established, follow it rather than inventing a new one. In particular:

- existing colloquy/export formatting in `src/components/ExportScreen/docxFormatter.ts`
- Stage S colloquy two-space rule in `src/editor/stageS/colloquy.ts`
- transcript structure references in `docs/DATA_STRUCTURES_REFERENCE.md`

### Examination

Inside examination mode:

- examining attorney utterances render as `Q.` paragraphs
- witness utterances render as `A.` paragraphs
- reporter / interpreter / other interruptions render as labeled colloquy paragraphs, not Q/A
- examiner changes render a `BY MR./MS. ...` attribution line before the next `Q.`

### Parentheticals

Standalone procedural text such as:

- recess lines
- continuation markers
- swearing / ceremonial transitions when not colloquy

must render as standalone parenthetical or structural paragraphs rather than plain transcript lines.

## Must Preserve

The renderer change must preserve:

- utterance order
- speaker order
- word content
- timestamps and marks already attached to words
- audio synchronization behavior
- immutable raw word text semantics
- existing contract shapes

## Must Not Change

This prompt must **not** change:

- normalization
- reassembly logic
- transcript persistence
- overlay architecture
- export behavior
- Stage S logic
- certification logic

## Required Validation Target

Primary validation target:

- `tr_1781563788609_b38j6p`

Compare against the corrected reference DOCX:

- `tmp_thomas_corrected.docx`

Validation is successful when the workspace visible paragraph structure moves materially closer to the corrected transcript shape in these specific ways:

1. labeled colloquy appears in proceedings
2. examination heading / by-attribution appear
3. Q/A paragraphs are visibly distinct
4. reporter interruptions break Q/A flow
5. recesses appear as standalone parentheticals

## Required Commit Shape

Implement in ordered commits:

1. characterization tests
2. speaker-aware paragraph model + renderer
3. validation report

Do not compress everything into one commit.

## Required Tests

### Commit 1 — Characterization

At minimum:

1. current renderer produces one generic utterance block per utterance
2. current renderer does not emit visible speaker-labeled colloquy structure
3. current renderer does not surface `EXAMINATION` / `BY` / `Q.` / `A.` geometry

### Commit 2 — Renderer

At minimum:

1. proceedings colloquy renders with visible speaker labels
2. proceedings colloquy renders as a single paragraph with inline label geometry and exactly two spaces after the colon
3. examination utterances render as `Q.` / `A.` by role
4. reporter interruptions break examination flow correctly
5. recess parentheticals render as standalone structural paragraphs
6. consecutive same-speaker colloquy can merge when no structural break exists
7. no change to word order or utterance order

### Commit 3 — Validation

Provide a validation report that compares:

- current workspace rendering behavior
- post-change workspace rendering behavior
- corrected DOCX reference geometry

Include at least one concrete before/after excerpt using the Thomas transcript shape.

## Deliverables

1. committed implementation series
2. validation report against `tr_1781563788609_b38j6p`
3. explicit list of paragraph categories introduced
4. final PASS/FAIL block

## Stop Conditions

STOP and report if:

1. matching the corrected transcript requires upstream diarization or reassembly changes instead of rendering work
2. correct visible geometry cannot be produced without changing frozen contract types
3. audio sync would be broken by the paragraph renderer
4. the corrected DOCX reference proves incompatible with the current workspace editor architecture

## Final Constraint

Do not turn this prompt into a reconstruction project.

The objective is narrower:

- expose already-preserved speaker geometry
- render correct paragraph structure
- move the workspace visibly toward the corrected deposition transcript

without changing the underlying attribution architecture again.
