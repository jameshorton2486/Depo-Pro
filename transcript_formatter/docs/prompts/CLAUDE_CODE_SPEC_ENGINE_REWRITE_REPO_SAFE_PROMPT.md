You are working in the existing Python repo at:

`C:\Users\james\transcript_formatter`

Your task is to incrementally refactor the current repo toward a safer block-based legal transcript pipeline.

Do not perform a wholesale rewrite.
Do not create a second engine.
Do not create a parallel DOCX/export system.

## Architecture Rules

These rules are mandatory:

1. `pipeline` remains orchestration only.
2. `spec_engine` owns structure and deterministic logic.
3. `formatter.py` is visual only.
4. AI must not run on final rendered transcript text.
5. AI may only modify structured text fields.
6. Verbatim preservation is absolute.
7. Do not collapse or modify newline structure before block processing.
8. Do not duplicate correction/classification logic across files.

## Repo Constraints

Work with the current repo structure. Use these files as the main backbone:

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

Do not introduce a standalone `depo_formatter.py`.
Do not replace the GUI flow in one pass.

## Phase 1: Speaker Resolution And Validation

Implement this first.

1. Add `spec_engine/speaker_resolver.py`.
   - normalize `speaker_id` to `int`
   - resolve role/display name from verified `speaker_map`
   - keep heuristic suggestion logic separate from final resolved speaker identity

2. Integrate speaker resolution into the existing block pipeline.
   - prefer surgical changes in `spec_engine/processor.py` and `spec_engine/classifier.py`
   - do not replace the whole object model unless required

3. Add a lightweight validator, for example `spec_engine/validator.py`.
   - unresolved speakers after verification become explicit validation errors or flags
   - detect obvious near-duplicate adjacent segments
   - detect damaged Q/A ordering where possible

4. Preserve current UI behavior.
   - keep `SpeakerVerifyDialog`
   - keep the fix that auto-applies the last typed manual speaker label on confirm
   - keep final speaker-map logging before `run_pipeline(...)`

## Phase 2: Classifier Upgrade

Strengthen the existing classifier without overbuilding it.

Requirements:

- speaker role is the primary signal
- punctuation is secondary
- previous-block context is tertiary
- imperative attorney prompts like `State your name` should classify as `Q`
- witness blocks after a `Q` should classify as `A`
- expanded embedded-answer splitting is allowed
- answer blocks created by splitting should be treated as witness answers

Keep objection extraction and trailing-`Okay.` fixes as post-processing, not renderer logic.

## Phase 3: AI Boundary Migration

This is the most important architecture correction after speaker resolution.

Current problem:
- the live AI legal correction flow still operates on rendered preview text

Target:
- AI works on structured blocks/segments only
- AI can modify only the text field
- AI cannot change:
  - segment count
  - order
  - speaker labels
  - speaker roles
  - line types

Requirements:

1. Keep the current legal-correction validator in `ai_tools.py` or strengthen it.
2. Add a structured AI correction entry point.
3. Migrate the main AI correction flow away from rendered-text input.
4. Keep Word review mode separate if still needed.

## Phase 4: Renderer Cleanup

Clean up rendering/output without creating a parallel output path.

Requirements:

1. Audit `formatter.py`.
   - remove any remaining structure decisions
   - keep only visual/text-normalization helpers that truly belong there

2. Audit `spec_engine/document_builder.py` and related output helpers.
   - extend the existing output path
   - do not create another DOCX builder
   - ensure renderer code does not classify or remap transcript structure

3. Add tests for:
   - wrap behavior
   - continuation alignment
   - speaker label formatting
   - no accidental relabeling in renderer

## Phase 5: UFM Output Hardening

Only after the pipeline is stable:

- tighten 65-char normal wrap
- tighten 56-char Q/A wrap
- ensure continuations align under content
- improve page/line behavior in the existing document builder/export flow

## Safety Rules

- Prefer minimal, surgical patches over rewrites.
- Do not revert unrelated existing changes.
- Use `apply_patch` for edits.
- Add tests for every behavior change.
- Run `py_compile` and targeted `pytest` after each meaningful phase.

## Deliverables

Implement the work in phases and keep the repo runnable after each phase.

At minimum, modify only the files needed among:

- `spec_engine/speaker_resolver.py` (new)
- `spec_engine/validator.py` (new)
- `spec_engine/processor.py`
- `spec_engine/classifier.py`
- `spec_engine/speaker_mapper.py`
- `pipeline/processor.py`
- `main.py`
- `ai_tools.py`
- `formatter.py`
- `spec_engine/document_builder.py`
- relevant tests under `spec_engine/tests/`

## Final Instruction

Do not do a wholesale rewrite.
Do not create a second engine.
Incrementally refactor the current repo toward:

`Deepgram -> blocks -> spec_engine -> AI on structured text -> formatter -> existing DOCX/export path`

Proceed phase by phase, keeping the current application working after each phase.

