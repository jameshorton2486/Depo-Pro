# Speaker Save Concurrency Audit

Date: 2026-06-20
Branch: `feature/stage3-workspace-core`
Mode: Read-only audit. No behavior changes.

## Scope

Trace the speaker-save lifecycle for Stage 3 Workspace:

`SpeakerPanel` -> `workspaceApi.saveSpeakers()` -> `workspaceService` -> `transcriptRepository` / `editor-api` -> database

Questions answered:

1. Is the current persistence model immediate-save or batch-save?
2. Where do `lastKnownUpdatedAt`, transcript versioning, and optimistic concurrency enter the flow?
3. Why does `"Transcript changed elsewhere — reload"` fire?
4. What happens across multiple sequential speaker edits?
5. Can a batch-save model be introduced without breaking current contracts?
6. Is this issue segmentation-related, speaker-resolution-related, or persistence-related?

## Executive Summary

The current implementation is architected for `immediate persistence`, not batch save. Every speaker edit in `SpeakerPanel.commitEdit()` calls `workspaceApi.saveSpeakers()` immediately, passing `state.jobUpdatedAt` as the optimistic concurrency token ([src/components/SpeakerPanel/SpeakerPanel.tsx:125-147](../../src/components/SpeakerPanel/SpeakerPanel.tsx), [src/api/workspaceService.ts:649-664](../../src/api/workspaceService.ts)).

The `"Transcript changed elsewhere — reload."` error is raised client-side in `requireFreshTranscript()` before the actual speaker write runs, whenever the latest transcript row `updated_at` differs from the caller's `lastKnownUpdatedAt` ([src/api/workspaceService.ts:229-240](../../src/api/workspaceService.ts)). The failure is therefore a persistence/versioning problem, not a segmentation problem and not a speaker-resolution algorithm problem.

There are two concrete contributors:

1. `SpeakerPanel` sends one save per edit, using `state.jobUpdatedAt` from React state. Quick successive saves can race ahead of the `setTranscriptVersion()` state update from the previous save, so the next request carries a stale concurrency token ([src/components/SpeakerPanel/SpeakerPanel.tsx:136-147](../../src/components/SpeakerPanel/SpeakerPanel.tsx), [src/context/DocumentContext.tsx:161-162](../../src/context/DocumentContext.tsx), [src/context/DocumentContext.tsx:369-370](../../src/context/DocumentContext.tsx)).
2. In `real API` mode, `workspaceApi.saveSpeakers()` returns `target.updated_at` captured before the write, not a fresh post-save timestamp. That means even a successful save can leave the client holding the old version token for the next edit ([src/api/workspaceService.ts:655-661](../../src/api/workspaceService.ts)).

## Architecture Diagram

```text
SpeakerPanel.commitEdit()
  -> workspaceApi.saveSpeakers(jobId, payload, { lastKnownUpdatedAt: state.jobUpdatedAt })
    -> workspaceService.requireFreshTranscript(jobId, lastKnownUpdatedAt)
      -> transcriptRepository.getTranscriptJobByTranscriptId/jobId(...)
      -> compare job.updated_at against lastKnownUpdatedAt
      -> mismatch => throw "Transcript changed elsewhere — reload."
    -> if real API mode:
         contractApi.saveSpeakers(transcript_id, payload)
         return updatedAt: target.updated_at   // pre-save value
       else local persistence:
         persistSpeakers(...)
         updateTranscriptJob(...)
         return updatedAt: updatedJob.updated_at
  -> SpeakerPanel success path:
       updateSpeakers(...)
       setTranscriptVersion(result.updatedAt)
```

## 1. Persistence Model

Determination: `Immediate persistence`

Evidence:

- `SpeakerPanel.commitEdit()` saves as soon as the user commits one speaker card edit; there is no staged draft collection or separate "Save All" control ([src/components/SpeakerPanel/SpeakerPanel.tsx:125-147](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
- `UtteranceReassignment.reassign()` also saves immediately after the reassignment action ([src/components/SpeakerPanel/SpeakerPanel.tsx:404-454](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
- `workspaceApi.saveSpeakers()` accepts the whole speaker payload each time and executes the persistence path immediately ([src/api/workspaceService.ts:649-664](../../src/api/workspaceService.ts)).

Negative evidence for batch-save:

- No `dirty speaker mapping` state exists in `DocumentContext`; only transcript text edits track `dirty`, `workingTexts`, and `saveNow()` ([src/context/DocumentContext.tsx:23-38](../../src/context/DocumentContext.tsx), [src/context/DocumentContext.tsx:319-335](../../src/context/DocumentContext.tsx)).
- No speaker-specific save queue, debounce, or aggregate submit path exists in `SpeakerPanel`.

## 2. Concurrency Path

### Version token origin

- The document load stores the transcript version as `jobUpdatedAt` on `LOAD_OK` ([src/context/DocumentContext.tsx:78-89](../../src/context/DocumentContext.tsx)).
- `jobUpdatedAt` comes from `workspaceApi.getDocument()`, which forwards the transcript row `updated_at` from the workspace load path ([src/api/workspaceService.ts:110-129](../../src/api/workspaceService.ts)).

### Version token usage

- `SpeakerPanel.commitEdit()` passes `state.jobUpdatedAt` as `lastKnownUpdatedAt` to `workspaceApi.saveSpeakers()` ([src/components/SpeakerPanel/SpeakerPanel.tsx:136-143](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
- `UtteranceReassignment.reassign()` passes `jobUpdatedAt` the same way ([src/components/SpeakerPanel/SpeakerPanel.tsx:438-451](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
- `workspaceApi.saveSpeakers()` calls `requireFreshTranscript(jobId, options?.lastKnownUpdatedAt)` before writing ([src/api/workspaceService.ts:649-656](../../src/api/workspaceService.ts)).

### Optimistic concurrency guard

- `requireFreshTranscript()` resolves the current transcript row, then throws if `lastKnownUpdatedAt` is present and differs from the current `job.updated_at` ([src/api/workspaceService.ts:229-240](../../src/api/workspaceService.ts)).
- This guard runs in front of both:
  - the local persistence path (`persistSpeakers`) ([src/api/workspaceService.ts:457-462](../../src/api/workspaceService.ts))
  - the real API path (`contractApi.saveSpeakers`) ([src/api/workspaceService.ts:655-661](../../src/api/workspaceService.ts))

### Version refresh after save

- On success, `SpeakerPanel` calls `setTranscriptVersion(result.updatedAt)` ([src/components/SpeakerPanel/SpeakerPanel.tsx:147](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
- `DocumentContext` stores that through `SET_TRANSCRIPT_VERSION` by replacing `jobUpdatedAt` ([src/context/DocumentContext.tsx:161-162](../../src/context/DocumentContext.tsx), [src/context/DocumentContext.tsx:369-370](../../src/context/DocumentContext.tsx)).

## 3. Failure Analysis

### Triggering condition

The `"Transcript changed elsewhere — reload."` error is raised when:

- a caller provides `lastKnownUpdatedAt`, and
- the latest transcript row's `updated_at` no longer matches it.

Code path:

1. `SpeakerPanel.commitEdit()` invokes `workspaceApi.saveSpeakers(..., { lastKnownUpdatedAt: state.jobUpdatedAt })` ([src/components/SpeakerPanel/SpeakerPanel.tsx:136-143](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
2. `workspaceApi.saveSpeakers()` calls `requireFreshTranscript(jobId, options?.lastKnownUpdatedAt)` ([src/api/workspaceService.ts:649-656](../../src/api/workspaceService.ts)).
3. `requireFreshTranscript()` compares `job.updated_at` with `lastKnownUpdatedAt` and throws on mismatch ([src/api/workspaceService.ts:238-239](../../src/api/workspaceService.ts)).
4. `SpeakerPanel` catches that and surfaces `saveSpeakers failed` / the error message ([src/components/SpeakerPanel/SpeakerPanel.tsx:157-158](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).

### Why it happens in normal multi-edit use

Sequential flow:

1. User loads transcript at version `A`.
2. User saves Speaker 1 with token `A`.
3. Persistence succeeds and the transcript row is updated to version `B`.
4. Before React state reliably propagates `B`, user saves Speaker 2.
5. The second save still sends token `A`.
6. `requireFreshTranscript()` reads current version `B`, detects `A !== B`, and throws.

This is expected from the current immediate-save plus optimistic-concurrency design.

### Additional defect in real API mode

In real API mode, `workspaceApi.saveSpeakers()` returns:

- `updatedAt: target.updated_at`

where `target` was loaded before `contractApi.saveSpeakers()` ran ([src/api/workspaceService.ts:655-661](../../src/api/workspaceService.ts)).

That means the success path can set `jobUpdatedAt` back to the pre-save value instead of the new post-save value. Even without a rapid-click race, the next save can still carry a stale token. This is separate from React timing and makes the issue worse in real API mode.

The Edge Function itself does not perform a second concurrency check; `handlePutSpeakers()` directly updates rows after payload validation ([supabase/functions/editor-api/index.ts:503-560](../../supabase/functions/editor-api/index.ts)). The version check is therefore entirely in the client-facing workspace layer.

## 4. Multi-Edit Behavior

### Logical simulation

Edit Speaker 1 -> Save

- `commitEdit()` builds a full `speakers` array and saves immediately ([src/components/SpeakerPanel/SpeakerPanel.tsx:125-143](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
- On success, `updateSpeakers(updated)` updates local speaker labels and `setTranscriptVersion(result.updatedAt)` tries to refresh the concurrency token ([src/components/SpeakerPanel/SpeakerPanel.tsx:146-149](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).

Edit Speaker 2 -> Save

- If the new `jobUpdatedAt` has not propagated yet, the second call still uses the prior value from state ([src/components/SpeakerPanel/SpeakerPanel.tsx:143](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
- If running in real API mode, even the refreshed value may still be stale because the returned `updatedAt` is the pre-save timestamp ([src/api/workspaceService.ts:655-661](../../src/api/workspaceService.ts)).

Edit Speaker 3 -> Save

- Same failure mode repeats until the page reloads or the state is refreshed with a truly current version.

### Expected outcome

- `One-at-a-time, wait-for-completion` edits may succeed if the correct updated timestamp eventually reaches state.
- `Rapid successive edits` are expected to fail intermittently under the current design.
- In real API mode, even disciplined sequential edits are at risk because the returned version token is stale by construction.

## 5. Batch Save Feasibility

Determination: `Conditional yes`

### What already fits

- The existing `SpeakersPayload` already sends the full speaker list in one request, plus optional `utterance_speaker_map` ([src/api/types.ts:90-95](../../src/api/types.ts)).
- `handlePutSpeakers()` already accepts a full-array speaker payload and updates all speaker rows in one request ([supabase/functions/editor-api/index.ts:503-560](../../supabase/functions/editor-api/index.ts)).

That means a UI-level batch-save model for speaker card edits is compatible with the current API shape. The panel could accumulate local edits, then send one `saveSpeakers()` call containing the full speaker list when the user clicks a save control.

### What would need to change

At minimum:

- `src/components/SpeakerPanel/SpeakerPanel.tsx`
  - stop immediate per-edit persistence for speaker card edits
  - introduce staged draft state and one submit action
- potentially `src/context/DocumentContext.tsx`
  - only if the product wants central dirty/save state for speaker mappings analogous to transcript text

### Contracts affected

- API contract: likely unchanged for speaker-card batch save, because `SpeakersPayload` already supports full-array submission.
- UI contract: changed, because the panel would move from immediate persistence to deferred save semantics.
- Save UX: changed, because users would need explicit confirmation timing.

### Freeze implications

- This is not a schema or migration change.
- It is still a behavioral/product-flow change, not just a bug fix.
- Under freeze discipline, it should be treated as a separately scoped task with explicit approval rather than folded into unrelated transcript rendering work.

## 6. Segmentation Independence Check

Determination: `Persistence-related`

Evidence:

- The thrown error comes from `requireFreshTranscript()` in `workspaceService`, which compares transcript versions before persistence ([src/api/workspaceService.ts:229-240](../../src/api/workspaceService.ts)).
- `commitEdit()` and `reassign()` both hit the same `saveSpeakers()` path whether or not display-layer segmentation is enabled ([src/components/SpeakerPanel/SpeakerPanel.tsx:125-147](../../src/components/SpeakerPanel/SpeakerPanel.tsx), [src/components/SpeakerPanel/SpeakerPanel.tsx:404-454](../../src/components/SpeakerPanel/SpeakerPanel.tsx)).
- The segmentation feature affects utterance block rendering and panel guards, but does not create or own `jobUpdatedAt`, `lastKnownUpdatedAt`, or the `saveSpeakers()` concurrency check.

This issue is therefore not:

- a paragraph segmentation bug
- a speaker diarization/resolution bug

It is a speaker-save persistence/versioning bug.

## Root Cause

Primary root cause:

- The speaker panel is built for immediate, per-edit persistence with an optimistic concurrency guard keyed to `jobUpdatedAt`.

Contributing causes:

1. `SpeakerPanel` can issue the next save before the prior save's `setTranscriptVersion()` state update is reflected.
2. In real API mode, `workspaceApi.saveSpeakers()` returns a stale `updatedAt` value from before the save, so the client can remain out of date even after a successful response.

## Recommendation

Short term:

- Treat this as a dedicated speaker-save concurrency bug, separate from segmentation and speaker-resolution work.
- Fix the returned version handling first, because real API mode currently propagates a stale version token by design.
- Audit whether immediate-save should be serialized or temporarily locked between speaker saves if the product wants to preserve the current interaction model.

Product direction:

- If the intended reporter workflow is mapping multiple speakers together, a batch-save model is viable with the current API shape and would reduce version-churn failures substantially.
- Because that changes the interaction model, choose it deliberately as a separate scoped decision, not as an incidental bug fix.

## Final Answer

The current system is architected for `immediate persistence` and fails because speaker saves are guarded by a client-side optimistic concurrency token (`jobUpdatedAt`) that becomes stale across successive edits. The problem is firmly in the persistence/versioning layer. A batch-save model is feasible without schema changes, but it is a product-flow change and should be handled as its own scoped task.
