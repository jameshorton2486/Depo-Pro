# COPY VISIBLE TRANSCRIPT BUTTON

## Branch

`feature/stage3-workspace-core`

## Mode

Implementation

## Goal

Add a `Copy Transcript` button to the Workspace screen that copies the transcript exactly as currently rendered in the Workspace view.

This is **not** an export feature.

This is **not** a DOCX feature.

This is a plain-text clipboard feature.

## Why

During active transcript-engine development, the fastest validation loop is:

Workspace transcript
→ copy exactly what the user sees
→ paste into Microsoft Word
→ compare against a corrected reference transcript

This avoids introducing a second formatting path through export while transcript rendering is still evolving.

## UI Placement

Add the button on the Workspace screen near existing transcript actions such as:

- `Refine`
- `Save`

Preferred label:

- `Copy Transcript`

Acceptable alternate label:

- `Copy Visible Transcript`

## Source of Truth

Use the canonical paragraph model shared by Workspace and Export.

After Transcript Representation Unification, the clipboard text must come from that same shared paragraph representation that drives the visible Workspace transcript and the unified export structure.

Do **not** use:

- `renderStageS(...)`
- `ExportScreen`
- `exportDocx.ts`
- DOCX paragraph specs
- any export-only formatter

The clipboard feature must not rebuild or reinterpret the transcript through a separate engine.

Do **not** create:

- a clipboard-specific paragraph model
- a new transcript formatter
- a third transcript representation

## Clipboard Output

### Version 1

Copy plain text preserving:

- visible transcript structure
- speaker labels
- `Q.` / `A.` labels
- `EXAMINATION`
- `BY ...:` lines
- parentheticals
- paragraph breaks
- visible ordering

### Version 2 (future, not part of this prompt)

Potential future enhancement:

- `Copy Transcript (Formatted)`

That future version may preserve richer Word-oriented formatting such as:

- tabs
- indentation
- UFM-style spacing

Do not implement Version 2 in this prompt.

Example target output:

`THE REPORTER:  Good afternoon, mister Nunez.`

`EXAMINATION`

`BY NUNEZ:`

`Q.  Good afternoon. How are you?`

`THE REPORTER:  I'm good. How are you? Doing well.`

`THE REPORTER:  Good.`

The clipboard does not need to preserve visual tabs or Word pagination. It must preserve the same logical paragraph structure and visible labels the user sees in the Workspace.

## Explicit Requirements

1. The copied text must match the Workspace transcript representation, not the export representation.
2. If the Workspace shows `THE REPORTER:`, the clipboard must contain `THE REPORTER:`.
3. If the Workspace shows `Q.`, the clipboard must contain `Q.`.
4. If the Workspace shows `EXAMINATION` and `BY ...:`, the clipboard must contain them in the same sequence.
5. Paragraph ordering must match the visible Workspace transcript.
6. No alternate formatter may be introduced.
7. No export code path may be reused as the source of truth.

## In Scope

- add a workspace button
- serialize the current visible transcript structure to plain text
- write it to the clipboard
- provide basic user feedback on success/failure

## Out of Scope

Do not introduce:

- DOCX export changes
- PDF export changes
- Stage S changes
- transcript representation changes
- speaker resolution changes
- Q/A reconstruction changes
- geometry redesign
- Word file generation

## Suggested Implementation Shape

1. Read from the canonical workspace paragraph model.
2. Convert each paragraph into plain text according to its visible workspace form.
3. Join paragraphs with blank-line or newline structure matching the current workspace transcript conventions.
4. Use the browser clipboard API.
5. Surface success/failure feedback in the workspace UI.

## Acceptance Criteria

User can:

1. Open transcript `tr_1781559088619_7rch7i`
2. Click `Copy Transcript`
3. Open Microsoft Word
4. Paste
5. See the same transcript structure that appeared in the Workspace

Required validation:

- clipboard populated
- paragraph breaks preserved
- speaker labels preserved
- `Q.` / `A.` labels preserved
- `EXAMINATION` / `BY ...:` lines preserved
- ordering preserved

Binary failure rule:

If the copied transcript text does not match the Workspace paragraph model, the build is `FAILED`.

## Validation Output

Produce a short validation note including:

- files changed
- clipboard source used
- example copied output
- PASS / FAIL

## Deployment Boundary

Repository work only.

Do not request:

- credentials
- passwords
- tokens
- connection strings

Do not:

- deploy
- run db push
- deploy edge functions

The task is complete when the button exists and copying from the Workspace works from the same transcript representation the user sees.
