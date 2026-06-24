# Transcript Version Labels Plan

Date: 2026-06-23
Branch: `feature/stage3-workspace-core`
Scope: UI/UX refinement only

## Purpose

Preserve transcript IDs and retranscription behavior exactly as implemented while replacing ID-first transcript labels with reporter-friendly version labels derived from transcript creation timestamps.

## Current Rendering

### [src/components/TranscriptCreation/TranscriptHistoryPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptCreation/TranscriptHistoryPanel.tsx)

Current behavior:

- Summary card leads with `Transcript ID`.
- Each transcript option renders the raw `transcript_id` as the primary label.
- Created time is secondary.
- Status is shown, but there is no friendly version label and no explicit `Current` marker.

### [src/components/WorkspaceTranscriptChooser.tsx](/C:/Users/james/projects/depo-pro/src/components/WorkspaceTranscriptChooser.tsx)

Current behavior:

- Each chooser row renders the raw `transcript_id` as the primary label.
- Created time is secondary.
- Status is shown, but there is no version naming based on chronology.

### [src/components/TranscriptCreationScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptCreationScreen.tsx)

Current behavior:

- The Stage 2 `Transcript Jobs` list leads with raw `transcript_id` values.
- Status is shown, but transcript history is not presented with reporter-friendly labels.

## Proposed Rendering

Shared display rule:

- Order transcript versions by `created_at` ascending.
- Oldest transcript = `Original`
- Next transcript = `Retranscription 1`
- Next transcript = `Retranscription 2`
- Continue incrementally for later runs.

Presentation rules:

- Keep `transcript_id` visible as supporting detail only.
- Keep selection and open behavior unchanged.
- Keep retranscription workflow unchanged.
- Add clear status chips for `Processing`, `Complete`, and `Failed`.
- Add a distinct `Current` chip for the currently selected transcript where applicable.

## Implementation Plan

1. Add a shared display-only helper that derives transcript labels from `created_at`, not from transcript IDs.
2. Update [src/components/TranscriptCreation/TranscriptHistoryPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptCreation/TranscriptHistoryPanel.tsx) to show version labels first and transcript IDs second.
3. Update [src/components/WorkspaceTranscriptChooser.tsx](/C:/Users/james/projects/depo-pro/src/components/WorkspaceTranscriptChooser.tsx) to show the same labels and ordering.
4. Update [src/components/TranscriptCreationScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptCreationScreen.tsx) job rendering so transcript history is human-readable on the creation screen.
5. Add focused tests for single transcript, multiple transcripts, timestamp ordering, numbering, and status chip rendering.

## Non-Goals

- No transcript ID changes
- No storage changes
- No schema changes
- No retranscription workflow changes
- No audit logging changes
- No Deepgram or keyterm changes
