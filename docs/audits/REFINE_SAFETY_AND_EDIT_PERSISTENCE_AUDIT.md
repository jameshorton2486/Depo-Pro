# REFINE SAFETY AND EDIT PERSISTENCE AUDIT

Date: 2026-06-17
Mode: Read-only audit only
Scope: Refine apply path, workspace edit persistence, human-work detection signals, snapshot/restore options

## Decision Gate

Verdict: `SAFE TO IMPLEMENT WITHOUT SCHEMA CHANGE`

Reason:

- The minimum safety guard can be implemented with existing persisted signals:
  - canonical row edits via `working_text` / `edited`
  - reviewed-word progress
  - transcript audit-log events
  - speaker-resolution overlay/history
- A zero-schema confirmation gate is straightforward.
- A zero-schema pre-apply snapshot / undo is feasible as a session-scoped in-memory snapshot of the current transcript state, even if no durable persisted restore structure exists today.

This verdict applies only to the **minimal Refine guard**:

- detect human work
- warn before overwrite
- snapshot before apply
- one undo of last Refine

It does **not** mean the long-term corrections layer can be built without schema change.

## Short Summary

- `Refine` rebuilds canonical transcript-derived rows from preserved raw Deepgram JSON.
- Word edits currently write into `transcript_words` and `transcript_utterances`.
- Speaker reassignment currently writes into `transcript_utterances` and `transcript_words`, with overlay/history side writes to speaker-resolution tables.
- Review state writes into `transcript_words` and `transcript_review_state`.
- There is no separate durable corrections layer for word edits or Q/A operations today.
- Therefore Refine can overwrite the same rows human edits are stored in.
- Strong zero-schema detection signals already exist, so a warning gate can be added without schema work.

## A. Exact Refine Apply Path

### UI entry point

- [src/components/Toolbar/Toolbar.tsx:130](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/Toolbar/Toolbar.tsx:130)
  renders `TranscriptReassemblyDialog`
- [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:67](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:67)
  renders the `Refine` button

### Preview handler

- [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:18-39](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:18)
  `handlePreview()`

Behavior:

1. Opens dialog
2. Saves pending editor changes first if `state.dirty`
3. Calls `workspaceApi.getTranscriptReassemblyPreview(...)`

### Apply handler

- [src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:42-60](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/TranscriptReassembly/TranscriptReassemblyDialog.tsx:42)
  `handleApply()`

Behavior:

1. Calls `workspaceApi.applyTranscriptReassembly(...)`
2. Reloads document with `loadDocument()`

### Local workspace service path

- [src/api/workspaceService.ts:1309-1323](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1309)
  `workspaceApi.applyTranscriptReassembly(...)`
- [src/api/workspaceService.ts:889-924](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:889)
  `applyTranscriptReassembly(...)`
- [src/api/workspaceService.ts:783-886](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:783)
  `replaceTranscriptDerivedRows(...)`

Tables replaced in local path:

- [src/api/workspaceService.ts:789-794](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:789)
  delete from `transcript_words`
- [src/api/workspaceService.ts:798-803](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:798)
  delete from `transcript_utterances`
- [src/api/workspaceService.ts:807-812](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:807)
  delete from `transcript_speakers`
- [src/api/workspaceService.ts:866-882](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:866)
  insert rebuilt `transcript_speakers`, `transcript_utterances`, `transcript_words`

### Real API path

- [src/api/client.ts:151-152](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/client.ts:151)
  `POST /:jobId/reassembly/apply`
- [supabase/functions/editor-api/index.ts:1132-1169](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1132)
  `handlePostReassemblyApply(...)`
- [supabase/functions/editor-api/index.ts:1019-1124](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1019)
  `replaceTranscriptDerivedRows(...)`

Tables replaced in real API path:

- [supabase/functions/editor-api/index.ts:1027-1032](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1027)
  delete from `transcript_words`
- [supabase/functions/editor-api/index.ts:1036-1041](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1036)
  delete from `transcript_utterances`
- [supabase/functions/editor-api/index.ts:1045-1050](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1045)
  delete from `transcript_speakers`
- [supabase/functions/editor-api/index.ts:1104-1120](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1104)
  insert rebuilt `transcript_speakers`, `transcript_utterances`, `transcript_words`

### Refine source material

Both local and real API paths rebuild from preserved raw Deepgram JSON:

- [src/api/workspaceService.ts:744-777](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:744)
- [supabase/functions/editor-api/index.ts:977-1015](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:977)

## B. Where Human Edits Persist Today

## 1. Word text edits

### UI handler

- [src/context/DocumentContext.tsx:136-166](/abs/path/C:/Users/james/Projects/Depo-Pro/src/context/DocumentContext.tsx:136)
  `EDIT_UTTERANCE` stores draft changes in in-memory `workingTexts`
- [src/context/DocumentContext.tsx:374-389](/abs/path/C:/Users/james/Projects/Depo-Pro/src/context/DocumentContext.tsx:374)
  `saveNow()` persists those changes via `workspaceApi.saveWorking(...)`

### Save path — local

- [src/api/workspaceService.ts:447-523](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:447)
  `naivePersistWorking(...)`

Writes:

- [src/api/workspaceService.ts:481-486](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:481)
  updates `transcript_words`
  - `working_text`
  - `text`
  - `edited`
- [src/api/workspaceService.ts:507-511](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:507)
  updates `transcript_utterances.text`
- [src/api/workspaceService.ts:426](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:426)
  appends audit rows to `transcript_audit_log`

### Save path — real API

- [supabase/functions/editor-api/index.ts:561-580](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:561)
  validates save payload
- [supabase/functions/editor-api/index.ts:580-587](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:580)
  routes to `editor_apply_working_changes` RPC

### Persistence classification

Word edits persist into **CANONICAL transcript rows**:

- `transcript_words`
- `transcript_utterances`

There is no separate word-corrections record today.

## 2. Speaker reassignment

### Save path — local

- [src/api/workspaceService.ts:928-1098](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:928)
  `persistSpeakers(...)`

Writes:

- [src/api/workspaceService.ts:1023-1028](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1023)
  upserts `speaker_resolution_current`
- [src/api/workspaceService.ts:1033-1038](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1033)
  inserts `speaker_resolution_history`
- [src/api/workspaceService.ts:1046-1051](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1046)
  updates `transcript_utterances.speaker_id` / `speaker_label`
- [src/api/workspaceService.ts:1060-1064](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1060)
  updates `transcript_words.speaker_id`
- [src/api/workspaceService.ts:1079](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1079)
  appends audit rows to `transcript_audit_log`

### Save path — real API

- [supabase/functions/editor-api/index.ts:629-790](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:629)
  `handlePutSpeakers(...)`

Writes:

- [supabase/functions/editor-api/index.ts:715-720](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:715)
  upserts `speaker_resolution_current`
- [supabase/functions/editor-api/index.ts:725-730](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:725)
  inserts `speaker_resolution_history`
- [supabase/functions/editor-api/index.ts:737-742](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:737)
  updates `transcript_utterances`
- [supabase/functions/editor-api/index.ts:750-754](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:750)
  updates `transcript_words`
- [supabase/functions/editor-api/index.ts:771](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:771)
  appends audit rows to `transcript_audit_log`

### Persistence classification

Speaker reassignment is **mixed**:

- overlay/history are separate:
  - `speaker_resolution_current`
  - `speaker_resolution_history`
- but the effective transcript state is also written into canonical transcript rows:
  - `transcript_utterances`
  - `transcript_words`

Because Refine replaces canonical utterance/word rows, this still creates overwrite risk today.

## 3. Q/A split / merge

Finding:

- No direct user-facing Q/A split / merge persistence path was found in the current workspace save flows inspected here.
- Current transcript rendering classifies Q/A for display, but there is no proven dedicated correction action in the current workspace persistence path.

Persistence classification:

- No confirmed separate Q/A corrections layer exists today.

## 4. Flags / notes / review actions

### Review actions

Local save path:

- [src/api/workspaceService.ts:526-598](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:526)
  `persistReview(...)`

Writes:

- [src/api/workspaceService.ts:550-564](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:550)
  updates `transcript_words.reviewed`
- [src/api/workspaceService.ts:571-589](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:571)
  appends audit rows to `transcript_audit_log`

Real API path:

- [supabase/functions/editor-api/index.ts:580-628](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:580)
  `handlePutReview(...)`

Writes:

- [supabase/functions/editor-api/index.ts:590-603](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:590)
  updates `transcript_words.reviewed`
- [supabase/functions/editor-api/index.ts:618-623](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:618)
  upserts `transcript_review_state`

### Persistence classification

Review work is also **mixed**:

- canonical flag on `transcript_words.reviewed`
- separate summary/progress state in `transcript_review_state`

## Bottom-line persistence finding

Human edits do **not** live in a fully separate durable corrections layer.

Today they persist primarily into **CANONICAL transcript rows**, with some auxiliary side tables:

- canonical rows:
  - `transcript_words`
  - `transcript_utterances`
- auxiliary records:
  - `transcript_audit_log`
  - `transcript_review_state`
  - `speaker_resolution_current`
  - `speaker_resolution_history`

This is exactly why Refine can overwrite human work today.

## C. Signals that Human Work Already Exists

## Strong zero-schema signals

### 1. `transcript_words.working_text IS NOT NULL` or `edited = true`

Why strong:

- directly indicates human text edits were persisted
- written by word-edit save path

Evidence:

- [src/api/workspaceService.ts:483-485](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:483)
- [supabase/functions/editor-api/index.ts:1094-1097](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1094)
  shows Refine resets `edited = false`, `working_text = null`

### 2. Review progress exists

Strong forms:

- any `transcript_words.reviewed = true`
- or `transcript_review_state` row exists

Why strong:

- indicates real review work happened

Evidence:

- [src/api/workspaceService.ts:550-564](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:550)
- [supabase/functions/editor-api/index.ts:618-623](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:618)

### 3. Speaker-resolution overlay/history exists

Strong forms:

- row exists in `speaker_resolution_current`
- row exists in `speaker_resolution_history`

Why strong:

- indicates real speaker-mapping work happened

Evidence:

- [src/api/workspaceService.ts:1023-1038](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:1023)
- [supabase/functions/editor-api/index.ts:715-730](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:715)

### 4. Transcript audit-log entries from workspace edit/review/speaker actions

Strong forms:

- `source = workspace`
- actions like:
  - `edit_word`
  - `mark_reviewed`
  - `assign_speaker`

Why strong:

- indicates explicit human interaction already persisted

Evidence:

- [src/api/workspaceService.ts:397-426](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:397)
- [supabase/functions/editor-api/index.ts:1153-1164](/abs/path/C:/Users/james/Projects/Depo-Pro/supabase/functions/editor-api/index.ts:1153) shows Refine also writes audit events, so action/source filtering matters

## Weak zero-schema signals

### 1. `transcript_review_state` row count alone

Why weak:

- useful, but can lag or summarize rather than prove the most current per-word state by itself

### 2. Suggestion-resolution state

Why weak:

- may indicate AI/workflow interaction, but not necessarily durable human correction worth blocking Refine for by itself

### 3. Transcript existence / transcript row presence

Why weak:

- proves nothing about human work
- would fire on every transcript

## Recommended detection signal

Recommended production gate signal:

Treat **human work present** as true if **any** of these are found:

1. any edited words:
   - `working_text IS NOT NULL`
   - or `edited = true`
2. any reviewed words or review-state progress
3. any speaker-resolution overlay/history rows
4. any workspace-origin audit-log entries for:
   - `edit_word`
   - `mark_reviewed`
   - `assign_speaker`

This is strong/specific and does not collapse into “transcript exists”.

## D. Snapshot / Restore Capability Today

## Existing snapshot / restore

Finding:

- No dedicated transcript snapshot / restore mechanism exists today for Refine.
- No existing revert endpoint for `Apply Refinements` was found.
- No durable prior-version restore path for transcript words/utterances/speakers was found.

What exists today:

- raw Deepgram JSON in storage
- transcript audit log
- review-state rows
- speaker-resolution overlay/history

These are not sufficient as a full automatic restore of pre-Refine transcript rows by themselves.

## Zero-schema snapshot feasibility

### Persisted zero-schema restore

Finding:

- No obvious safe persisted zero-schema location was proven in this audit for storing a full pre-Refine transcript snapshot.
- Existing tables are not designed as generic transcript state snapshots.

### Session-scoped zero-schema restore

Finding:

- Feasible.

Smallest safe option:

- capture the current loaded transcript state in memory immediately before Apply
- include:
  - current speakers
  - current utterances
  - current words
  - current transcript metadata needed to restore the prior editor state
- expose one `Undo last Refine` in the same browser session

Limitation:

- session-only undo dies on refresh/tab close
- therefore the **confirmation gate** is the primary safety mechanism

## Final Branch-Deciding Findings

### 1. Decision-gate verdict

`SAFE TO IMPLEMENT WITHOUT SCHEMA CHANGE`

for the minimal guard only.

### 2. Edit persistence

Edits live primarily in **canonical transcript rows**, not in a separate durable corrections layer.

### 3. Best human-work detection signal

Use a combined **strong** signal:

- edited word state (`working_text` / `edited`)
- review progress (`reviewed` / `transcript_review_state`)
- speaker-resolution overlay/history
- workspace-origin audit-log entries for edit/review/speaker actions

This is strong and specific. It should not fire merely because a transcript exists.

