# Transcript Version Labels Validation

Date: 2026-06-23
Branch: `feature/stage3-workspace-core`
Scope: UI/UX refinement only

## Summary

The transcript version labels pass is presentation-only and leaves transcript IDs, retranscription behavior, transcript storage, and audit behavior unchanged.

The UI now presents transcript chronology in reporter-friendly language:

- oldest transcript = `Original`
- second transcript = `Retranscription 1`
- later transcripts increment deterministically by creation timestamp

Raw transcript IDs remain visible as secondary detail in all updated views.

## Components Updated

### [src/components/TranscriptCreation/TranscriptHistoryPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptCreation/TranscriptHistoryPanel.tsx)

- Primary transcript label changed from raw `transcript_id` to version label.
- Summary now leads with `Version`, then `Created`, then `Transcript ID`.
- Added `Current` chip for the selected transcript.
- Status badge text normalized to `Processing`, `Complete`, or `Failed`.

### [src/components/WorkspaceTranscriptChooser.tsx](/C:/Users/james/projects/depo-pro/src/components/WorkspaceTranscriptChooser.tsx)

- Primary chooser label changed from raw `transcript_id` to version label.
- Raw transcript ID remains visible as supporting detail.
- Status badge text normalized.

### [src/components/TranscriptCreationScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptCreationScreen.tsx)

- Stage 2 job list now leads with human-readable version labels instead of raw transcript IDs.
- Created and updated timestamps remain visible.
- Raw transcript IDs remain visible as secondary detail.
- No changes were made to transcription triggering or retranscription architecture.

### [src/lib/transcriptVersionLabels.ts](/C:/Users/james/projects/depo-pro/src/lib/transcriptVersionLabels.ts)

- Added a shared display-only helper for timestamp ordering, version labels, and normalized status text.

## Expected Etminan Behavior

For the Etminan case, the UX should now read like this:

- `Original`
- `Retranscription 1`
- `Retranscription 2`

with the internal transcript IDs still visible below each label.

## Validation Coverage

Added or updated tests for:

- single transcript labeling
- multiple transcript labeling
- ordering by `created_at`
- retranscription numbering
- normalized status badge text
- transcript history rendering
- workspace chooser rendering

## Command Results

`npm run test`

- Passed
- 59 test files
- 291 tests

`npm run typecheck`

- Passed

`npm run build`

- Passed
- Existing Vite warning from `bluebird/js/release/util.js` about `eval` remains unchanged by this work

## Regression Check

Confirmed unchanged:

- transcript IDs remain intact
- transcript selection behavior remains intact
- retranscription still creates new transcripts
- workspace opening path remains intact
- no transcript model or storage changes were introduced
