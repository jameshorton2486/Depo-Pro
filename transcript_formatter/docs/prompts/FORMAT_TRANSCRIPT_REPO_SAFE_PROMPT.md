You are working in this repo:

`C:\Users\james\transcript_formatter`

Your task is to implement a repo-safe unified `Format Transcript` path.

Do not perform a rewrite.
Do not create a second pipeline.
Do not add speculative dependencies.

## Architecture Rules

1. `spec_engine` owns correction and structure logic.
2. `formatter.format_blocks()` is visual-only.
3. AI must run on structured blocks, before `format_blocks()`.
4. AI may only modify block text, never order, labels, layout, or line types.
5. Do not move fallback structure recovery into `main.py`.
6. Do not delete legacy paths in this pass unless explicitly required.

## Current Bug To Fix

In `main.py`, `_run_format()` still bypasses corrections when `_last_blocks` exists by calling:

- `format_blocks(self._last_blocks)`

That must be fixed.

## Implement These Changes

### Task 1: Replace `_run_format` logic in `main.py`

Make `_run_format(use_ai: bool = False)` the unified path for formatting.

Required order:

1. get structured blocks
2. call `spec_engine.process_blocks(blocks, job_config)` every time
3. optionally run structured AI correction on those processed blocks
4. call `formatter.format_blocks(...)`
5. store/display the rendered result

Important:

- if `_last_blocks` exists, do not bypass `process_blocks`
- if `_last_blocks` does not exist, use a proper fallback helper from pipeline/spec code
- do not introduce UI-local sentence splitting logic in `main.py`

### Task 2: Add `_on_format_transcript_click`

Add one UI handler that:

- reads the AI enhancement toggle if present
- calls `_run_format(use_ai=...)`

### Task 3: Keep legacy controls, but do not let them be the main path

You may relabel existing buttons as legacy, but do not remove them yet.
The new `Format Transcript` button becomes the primary button.

### Task 4: Add correction-count visibility

In `spec_engine/corrections.py`, log how many blocks were modified in `apply_corrections(...)`.

Do this surgically.
Do not rewrite the file.

### Task 5: Add `utils/diff_viewer.py`

Create:

- `utils/__init__.py`
- `utils/diff_viewer.py`

It should provide:

- `generate_diff(original, corrected)`
- `count_changes(original, corrected)`
- `diff_summary(original, corrected)`

Use it in `_run_format()` after rendering so the format log includes a diff summary.

### Task 6: Do not delete legacy formatter functions in this pass

Do not remove `format_transcript(...)` or legacy string helpers yet.
But ensure the unified path uses `format_blocks(...)`, not `format_transcript(...)`.

## Do Not Do These Things

- do not add `docxtpl`
- do not change `spec_engine.process_blocks()` ordering
- do not rewrite `document_builder.py`
- do not move AI back onto rendered text
- do not add fallback text recovery to the UI/controller layer

## Validation

Run after edits:

1. `python -m py_compile main.py`
2. `python -m py_compile spec_engine\corrections.py`
3. `python -m py_compile utils\diff_viewer.py`
4. run relevant pytest suites already in the repo

## Deliverable

At the end, summarize:

- what changed
- what live path now runs for Format Transcript
- what legacy paths still remain
- what should be done next

