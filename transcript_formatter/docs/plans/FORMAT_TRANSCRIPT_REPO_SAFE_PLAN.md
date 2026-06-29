# Format Transcript Repo-Safe Plan

This plan is aligned to the current `transcript_formatter` repo state.

## Goal

Make one primary `Format Transcript` path that always runs:

1. structured blocks
2. `spec_engine.process_blocks(...)`
3. optional AI on structured blocks
4. `formatter.format_blocks(...)`
5. store/display pending corrections

Do this without:

- creating a second engine
- rewriting `document_builder.py`
- moving fallback structure recovery into `main.py`
- adding speculative dependencies

## Current Bug

`main.py::_run_format()` still has this bypass:

- if `_last_blocks` exists, it calls `format_blocks(self._last_blocks)` directly
- that skips `spec_engine.process_blocks(...)`
- so the rules engine can appear to do nothing

## Required Changes

### 1. Replace `_run_format` routing

Target behavior:

- if `_last_blocks` exists:
  - use those blocks
  - always run `process_blocks(blocks, job_config)` on them
- else:
  - use a proper pipeline/spec fallback helper, not UI-local sentence splitting
  - then run `process_blocks(...)`
- only after that:
  - optionally run `correct_blocks_with_ai(...)`
  - then `format_blocks(...)`

### 2. Add one unified button handler

Add a single handler like `_on_format_transcript_click()`.

It should:

- read the AI toggle if present
- call `_run_format(use_ai=...)`

Do not remove legacy buttons yet.
Relabel them as legacy only after the new path is in place.

### 3. Keep fallback structure recovery out of `main.py`

If fallback text-to-block recovery is needed, put it in:

- `pipeline/`
or
- `spec_engine/`

not in the GUI/controller layer.

### 4. Add correction visibility

In `spec_engine/corrections.py`, log:

- how many blocks were modified
- how many blocks were processed

This should be surfaced in logs for `_run_format`.

### 5. Add a diff helper

Add `utils/diff_viewer.py` to produce:

- diff summary
- human-readable line diff

Use it in `_run_format` after rendering so the log shows:

- how many lines changed

### 6. Keep `formatter.py` visual-only

Do not delete legacy functions yet.

But for the unified path:

- use `format_blocks(...)` only
- do not route unified formatting through `format_transcript(...)`

## What Not To Change In This Pass

- do not modify `spec_engine/document_builder.py`
- do not add `docxtpl`
- do not remove legacy AI buttons yet
- do not move AI onto final rendered text
- do not change `spec_engine.process_blocks()` ordering

## Validation

After implementation:

1. `python -m py_compile main.py`
2. `python -m py_compile spec_engine\corrections.py`
3. `python -m py_compile utils\diff_viewer.py`
4. run existing test suites
5. smoke test in app:
   - format with AI off
   - format with AI on
   - confirm spec engine always runs

## Expected Outcome

After this pass:

- `_run_format` no longer bypasses corrections
- one main format path exists
- AI remains block-based
- formatter remains visual-only
- legacy paths can stay temporarily for safety

