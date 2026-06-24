# Retranscription Feature Implementation

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: implementation audit

## Purpose

Enable users to intentionally generate a new transcript from the existing case audio using the current transcription pipeline, without overwriting prior transcripts.

Primary use cases:

- Etminan A/B retranscription validation
- future Deepgram model upgrades
- future keyterm pipeline upgrades
- future diarization improvements

## Current Flow Before This Change

### Entry path

Stage 1 proceeds to Stage 2 through:

- `src/components/IntakeScreen/IntakeScreen.tsx`
- `handleProceed()`
- `setStage("creation")`

### Transcription trigger

Stage 2 starts transcription through:

- `src/components/TranscriptCreationScreen.tsx`
- `runTranscription()`
- `src/api/transcriptionService.ts`
- `startTranscription(caseId)`
- `supabase/functions/transcribe-start/index.ts`

### Prior redirect behavior

Two different behaviors caused retranscription to be unreachable:

1. `TranscriptCreationScreen` automatically advanced to Workspace whenever it found a completed job.
2. Reopened cases restored their last saved stage, so cases saved in Workspace reopened directly into Stage 3.

### Current flow diagram before fix

```text
Intake
  -> setStage("creation")
  -> TranscriptCreationScreen loads jobs
  -> if completed transcript exists
     -> auto-open Workspace

Reopen saved case
  -> CaseProvider restores record.stage
  -> if record.stage === "workspace"
     -> user lands directly in Workspace
```

Result:

- no explicit Stage 2 retranscription choice
- no explicit transcript selection when multiple transcripts existed
- no safe A/B path inside the product

## Implementation Summary

### 1. Stage 2 no longer auto-opens Workspace

`src/components/TranscriptCreationScreen.tsx`

The screen now:

- loads all transcript jobs for the case
- keeps completed transcripts visible
- lets the user explicitly choose one transcript to open
- offers `Retranscribe Audio` without overwriting older transcripts

### 2. Transcript history panel added

New component:

- `src/components/TranscriptCreation/TranscriptHistoryPanel.tsx`

Behavior:

- shows `Transcript Already Exists`
- displays transcript id, created date, and audio filename
- lists completed transcripts for explicit selection
- offers:
  - `Open Workspace`
  - `Retranscribe Audio`

### 3. Retranscription confirmation added

New component:

- `src/components/TranscriptCreation/RetranscriptionConfirmDialog.tsx`

Behavior:

- warns that retranscription creates a new transcript
- preserves the prior transcript
- requires explicit confirmation before running

### 4. Workspace now supports explicit transcript selection

New component:

- `src/components/WorkspaceTranscriptChooser.tsx`

New Stage 3 gating behavior:

- `src/components/DepoEditor.tsx`

Behavior:

- if exactly one completed transcript exists, Workspace opens it directly
- if multiple completed transcripts exist, the user must choose one
- Workspace no longer silently chooses the latest transcript when multiple options exist

### 5. Workspace target is now explicit in stage state

Updated:

- `src/context/StageContext.tsx`

Added:

- `workspaceTargetId`
- `setWorkspaceTargetId(...)`
- `openWorkspace(targetId?)`

This lets Stage 2 and the transcript chooser open a specific transcript in Stage 3.

### 6. Reopened Workspace now has a route back to Stage 2

Updated:

- `src/components/Toolbar/Toolbar.tsx`

Added:

- `Transcript Creation` button

This makes retranscription reachable even when a previously saved case reopens directly into Workspace.

### 7. Retranscription keeps existing transcripts intact

Updated:

- `src/api/transcriptionService.ts`
- `supabase/functions/transcribe-start/index.ts`

Behavior:

- Stage 2 passes optional `source_transcript_id`
- the edge function validates that the source transcript belongs to the same case
- a brand-new transcription job and transcript id are still created through the existing pipeline
- no overwrite path was introduced

### 8. Append-only retranscription audit artifact added

Updated:

- `src/lib/retranscription.ts`
- `src/lib/transcriptionJobs.ts`
- `supabase/functions/transcribe-start/index.ts`

Behavior:

- retranscription requests now generate an append-only JSON audit artifact
- recorded fields include:
  - `source_transcript_id`
  - `source_audio_id`
  - `new_transcript_id`
  - `requested_at`

## Files Changed

- `src/context/StageContext.tsx`
- `src/components/TranscriptCreationScreen.tsx`
- `src/components/Toolbar/Toolbar.tsx`
- `src/components/DepoEditor.tsx`
- `src/components/TranscriptCreation/TranscriptHistoryPanel.tsx`
- `src/components/TranscriptCreation/RetranscriptionConfirmDialog.tsx`
- `src/components/WorkspaceTranscriptChooser.tsx`
- `src/api/transcriptionService.ts`
- `src/lib/transcriptionJobs.ts`
- `src/lib/retranscription.ts`
- `supabase/functions/transcribe-start/index.ts`

## No-Change Boundaries Honored

- no schema changes
- no migrations
- no Deepgram contract change
- no keyterm pipeline change
- no CFE change

## Outcome

The application now has a permanent retranscription capability that supports:

- controlled Etminan A/B validation
- future transcript reruns under changed models or request logic
- explicit transcript selection when multiple transcripts exist
