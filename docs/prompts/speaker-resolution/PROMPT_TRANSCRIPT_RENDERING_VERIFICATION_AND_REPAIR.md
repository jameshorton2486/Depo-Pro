# PROMPT — TRANSCRIPT RENDERING VERIFICATION AND REPAIR

## Branch

`feature/stage3-workspace-core`

## Target Commit

`856b3b6`

## Mode

Verification First.

Repair Only If Verification Fails.

## Deployment Boundary

Repository work only.

Do not request:

- credentials
- passwords
- tokens
- connection strings

Do not:

- deploy
- run `supabase db push`
- deploy edge functions

If deployment or environment changes are required:

- generate exact commands
- generate validation steps
- stop with a `HANDOFF` section

The task is complete when the repository is verified or repaired and ready for deployment, not when deployment has occurred.

## Context

Speaker Attribution Preservation was completed.

Transcript Reassembly Engine was completed.

Speaker-Aware Paragraph Rendering was implemented in:

- `856b3b6` `feat(workspace): add transcript refinement rendering and dev auth fallback`

Tests pass.

Typecheck passes.

However, the implementation was not browser-verified against a real transcript in the live workspace.

The goal of this task is to determine whether the rendering actually produces proper deposition geometry in the live UI.

Do **not** assume the implementation is correct.

Verify first.

## Audited Transcripts

Primary transcript:

- `tr_1781456706021_4bdiwu`

Secondary transcript:

- `tr_1781563788609_b38j6p`

Use the actual workspace UI.

Use `Refine` / `Apply Refinements` if required.

Do not use mocks.

## Expected Geometry

### Colloquy

Colloquy lines must render as:

```text
THE REPORTER:  Good afternoon, Mr. Nunez.
MR. NUNEZ:  Good afternoon.
THE WITNESS:  Yes.
THE VIDEOGRAPHER:  We are off the record.
```

Rules:

- speaker label and speech remain on the same rendered line
- exactly two spaces appear after the colon
- speaker labels render using deposition colloquy geometry, not chat geometry

Correct:

```text
THE REPORTER:  Good afternoon.
```

Incorrect:

```text
THE REPORTER:
Good afternoon.
```

Incorrect:

```text
THE REPORTER: Good afternoon.
```

### Q / A

Questions and answers must remain `Q.` / `A.`

Correct:

```text
Q.  Please state your name.
A.  Heath Thomas.
```

Incorrect:

```text
MR. NUNEZ:  Please state your name.
THE WITNESS:  Heath Thomas.
```

Q/A geometry must survive rendering.

### Parentheticals

Parentheticals remain parentheticals.

Examples:

```text
(Discussion off the record.)
(Exhibit 1 marked.)
```

Do not convert parentheticals into colloquy speakers.

### Objections

Objections remain isolated.

Correct:

```text
MS. ZAHN:  Objection. Form.
```

Do not merge objections into surrounding paragraphs.

## Task 0 — Re-Verify Before Touching Code

Before making any edits, verify and report:

1. `856b3b6` is present in the current branch history.
2. The workspace still renders transcript content through:
   - `src/components/TranscriptEditor/TranscriptEditor.tsx`
   - `src/lib/buildEditorContent.ts`
   - `src/extensions/UtteranceNode.ts`
3. The `Refine` / `Apply Refinements` flow still exists in the workspace.
4. Both audited transcripts are still available in the live environment.

If any of the above are false, STOP and report.

## Verification

Capture evidence from the live workspace.

Answer:

1. Does colloquy render correctly?
2. Does Q/A render correctly?
3. Do parentheticals render correctly?
4. Do objections render correctly?
5. Does spacing match deposition geometry?
6. Does speaker-aware rendering visibly improve the transcript?

Classify each as:

- `PASS`
- `PARTIAL`
- `FAILED`

## Repair Rule

Only if verification fails.

Repair the smallest possible rendering layer.

Do **not** touch:

- assembly logic
- transcript reassembly engine
- attribution preservation
- transcript data
- review state
- certification
- exports

Repair rendering only.

## Acceptance Criteria

Live workspace verification must show:

- inline colloquy geometry
- two spaces after speaker labels
- preserved Q/A
- preserved parentheticals
- preserved objections

No transcript fidelity regressions.

## Required Output

- `docs/audits/TRANSCRIPT_RENDERING_VALIDATION.md`

Include:

1. screenshots or evidence references
2. `PASS` / `PARTIAL` / `FAILED` table
3. exact files changed, if any
4. before / after examples
5. final determination

## Final Rule

If everything already renders correctly:

- make no code changes
- report `PASS`

If verification fails:

- identify exact file
- identify exact symbol
- identify exact rendering defect
- perform the smallest repair possible

