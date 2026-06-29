# Spec Engine Rewrite Repo Plan

This is the safe version of the rewrite plan for the current `transcript_formatter` repo.

It keeps the existing architecture and upgrades it in-place.

## Goals

- Keep `pipeline` as orchestration.
- Keep `spec_engine` as structure and deterministic logic.
- Keep `formatter.py` visual-only.
- Keep AI out of final rendered text.
- Avoid parallel engines and large one-shot rewrites.

## Non-Goals

- Do not create a standalone `depo_formatter.py`.
- Do not create a second competing DOCX/export path.
- Do not move correction/classification logic back into `formatter.py`.
- Do not replace the GUI flow in one pass.

## Current Repo Backbone

These files remain the backbone:

- `main.py`
- `pipeline/block_builder.py`
- `pipeline/processor.py`
- `spec_engine/processor.py`
- `spec_engine/classifier.py`
- `spec_engine/corrections.py`
- `spec_engine/speaker_mapper.py`
- `spec_engine/document_builder.py`
- `formatter.py`
- `ai_tools.py`
- `ai_engine/review.py`

## Phase 1: Speaker Resolution And Validation

Objective: make speaker identity deterministic and auditable before any downstream structure decisions.

Tasks:

1. Add a small `spec_engine/speaker_resolver.py`.
   - Normalize `speaker_id` to `int`.
   - Resolve role/display name from verified `speaker_map`.
   - Keep heuristic suggestions separate from final resolved output.

2. Use `speaker_resolver` inside the existing block pipeline.
   - Integrate into `spec_engine/processor.py` and/or `spec_engine/classifier.py`.
   - Do not replace the whole pipeline object model.

3. Add a lightweight validator.
   - Reject or flag unresolved speakers after verification.
   - Detect damaged Q/A ordering or obvious duplicate segments.
   - Surface validation issues as flags, not silent failures.

4. Preserve current UI flow.
   - Keep `SpeakerVerifyDialog`.
   - Keep the recent fix that auto-applies the last manual speaker entry on confirm.
   - Keep final speaker-map logging before `run_pipeline(...)`.

Success criteria:

- verified speaker maps always reach the block pipeline intact
- no int/string speaker-id mismatch
- unresolved speakers become explicit flags

## Phase 2: Classifier Upgrade

Objective: improve classification without rewriting the entire spec engine.

Tasks:

1. Strengthen `spec_engine/classifier.py`.
   - Use speaker role first.
   - Use punctuation second.
   - Use previous-block context third.
   - Preserve current phased/simple approach.

2. Improve embedded Q/A splitting.
   - Expand answer-token coverage.
   - Ensure split answer blocks are treated as witness answers.
   - Keep objection/admin text out of Q/A when deterministically identifiable.

3. Keep post-processing separate.
   - Trailing `Okay.` repair
   - objection extraction
   - partial transcript detection

Success criteria:

- witness blocks following a question become `A` reliably
- imperative attorney prompts classify as `Q`
- objections are no longer merged into witness answers when deterministically extractable

## Phase 3: AI Boundary Migration

Objective: stop the main AI correction flow from operating on rendered transcript text.

Tasks:

1. Keep `run_ai_tool()` guarded in the short term.
   - Preserve the new legal-correction output validator.

2. Introduce a structured AI correction entry point.
   - AI receives indexed block/segment lines, not final rendered transcript text.
   - AI may modify only `text`.
   - AI may not change count, order, speaker labels, or line types.

3. Move the main AI correction feature to the block stage.
   - `spec_engine` / block pipeline
   - AI correction on structured text
   - formatter/renderer after AI

4. Keep `run_ai_review_tool()` separate for Word review mode if needed.

Success criteria:

- no AI after formatting
- no AI edits to tabs/layout/wrapping
- AI failures fall back safely to deterministic output

## Phase 4: Renderer Cleanup

Objective: make rendering/output visual-only while reusing the existing output path.

Tasks:

1. Audit `formatter.py`.
   - Remove any remaining structure decisions.
   - Keep only visual/text-normalization helpers that belong there.

2. Audit `spec_engine/document_builder.py` and emitter/output helpers.
   - Extend the existing DOCX/output path instead of creating a parallel one.
   - Keep speaker/QA/classification decisions out of renderer code.

3. Add layout-focused tests.
   - Q/A wrap width
   - continuation alignment
   - speaker label formatting
   - no accidental Q/A relabeling in renderer

Success criteria:

- renderer consumes already-structured output
- no classification/correction logic in formatter/emitter
- existing DOCX path remains the only DOCX path

## Phase 5: UFM Output Hardening

Objective: finish court-usable output after the pipeline is stable.

Tasks:

1. Tighten wrap behavior.
   - 65-char normal wrap
   - 56-char Q/A wrap

2. Tighten continuation behavior.
   - continuations align under content, not labels

3. Tighten page model in the existing document builder/export flow.
   - line counting
   - page/section behavior
   - line numbers if supported by current design

4. Expand regression tests for output correctness.

Success criteria:

- visually consistent UFM-style output
- no reintroduction of string-based structural hacks

## Implementation Order

Use this order:

1. speaker resolver + id normalization
2. validator
3. classifier upgrade
4. structured AI boundary
5. formatter/document-builder cleanup
6. UFM output hardening

## Rules For Implementation

- Do not create a parallel DOCX system.
- Do not create a second spec engine.
- Do not collapse or modify newline structure before block processing.
- Do not duplicate correction/classification logic across files.
- All structure logic belongs in `spec_engine`.
- `formatter.py` must remain visual-only.
- AI may only modify structured text fields, never layout/spacing/structure.

