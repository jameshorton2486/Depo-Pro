# Retranscription Feature Validation

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`

## Validation Scope

Validated the retranscription workflow additions for:

- transcript-exists UI
- retranscription confirmation UI
- workspace transcript selection UI
- retranscription audit artifact payload
- source transcript id propagation into the live transcription start path

## Automated Checks

### Typecheck

Command:

```powershell
npm run typecheck
```

Result:

- `PASS`

### Tests

Command:

```powershell
npm run test
```

Result:

- `PASS`

Coverage added for:

- `src/components/TranscriptCreation/TranscriptHistoryPanel.test.tsx`
- `src/components/TranscriptCreation/RetranscriptionConfirmDialog.test.tsx`
- `src/components/WorkspaceTranscriptChooser.test.tsx`
- `src/lib/retranscription.test.ts`
- `src/api/transcriptionService.retranscription.test.ts`

### Build

Command:

```powershell
npm run build
```

Result:

- `PASS`
- Vite emitted the existing Bluebird `eval` warning during bundling, but the production build completed successfully.

## Functional Validation Targets

### Existing transcript preserved

Verified in implementation by design:

- retranscription uses the same `transcribe-start` path
- a new transcript id is always created
- no overwrite behavior was introduced

### New transcript creation path

Verified in implementation by design:

- retranscription passes `source_transcript_id`
- edge function still calls `createTranscriptBusinessId()`
- edge function still creates a fresh queued transcription job

### Workspace can open either transcript

Verified in implementation by design:

- Stage 2 can open a selected transcript explicitly
- Stage 3 chooser appears when multiple completed transcripts exist

### Audit entry creation

Verified in implementation by design:

- retranscription creates an append-only JSON audit artifact
- artifact includes source transcript, source audio, new transcript, and timestamp

## Notes

- This validation pass does not execute a live Deepgram rerun itself.
- The feature is intended to unlock that later product validation step inside the application.
