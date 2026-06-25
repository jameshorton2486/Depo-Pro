# P1 Save Review Freshness Audit

Date: 2026-06-24
Branch: `feature/stage3-workspace-core`
Scope: read-only audit of `saveReview` freshness failures

## Symptom

Confidence review saves fail with:

`Transcript changed elsewhere — reload.`

The throw site is `requireFreshTranscript()` in [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:229). The failure is surfaced by [src/components/ConfidencePanel/ConfidencePanel.tsx](C:/Users/james/projects/depo-pro/src/components/ConfidencePanel/ConfidencePanel.tsx:102).

## Files inspected

- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts)
- [src/components/ConfidencePanel/ConfidencePanel.tsx](C:/Users/james/projects/depo-pro/src/components/ConfidencePanel/ConfidencePanel.tsx)
- [src/components/SpeakerPanel/SpeakerPanel.tsx](C:/Users/james/projects/depo-pro/src/components/SpeakerPanel/SpeakerPanel.tsx)
- [src/context/DocumentContext.tsx](C:/Users/james/projects/depo-pro/src/context/DocumentContext.tsx)
- [src/api/client.ts](C:/Users/james/projects/depo-pro/src/api/client.ts)
- [src/lib/runtime/mode.ts](C:/Users/james/projects/depo-pro/src/lib/runtime/mode.ts)
- [supabase/functions/editor-api/index.ts](C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts)
- [supabase/migrations/20260603210000_create_core_schema.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260603210000_create_core_schema.sql)

## Finding

The freshness check is comparing `DocumentContext.state.jobUpdatedAt` against the current `transcripts.updated_at` value:

- `ConfidencePanel` passes `docState.jobUpdatedAt` into `workspaceApi.saveReview(..., { lastKnownUpdatedAt })`.
- `workspaceService.requireFreshTranscript()` resolves the transcript row and throws when `job.updated_at !== lastKnownUpdatedAt`.

That guard is not inherently wrong. The failure is caused by a stale version token on the frontend in real-API mode.

## Root cause

### 1. Real-API mutation wrappers return the pre-save timestamp

In real-API mode, these wrappers return `target.updated_at`, which is the value read before the mutation:

- `workspaceApi.saveWorking()`
- `workspaceApi.saveReview()`
- `workspaceApi.saveSpeakers()`

See:

- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:631)
- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:643)
- [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:655)

`DocumentContext` and sidebar panels then store that returned value back into `jobUpdatedAt`, so the client can keep an outdated concurrency token after a successful mutation.

### 2. `transcripts.updated_at` is an actual version token

The `transcripts` table has a `before update` trigger that always sets `updated_at = now()`:

- [supabase/migrations/20260603210000_create_core_schema.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260603210000_create_core_schema.sql:25)
- [supabase/migrations/20260603210000_create_core_schema.sql](C:/Users/james/projects/depo-pro/supabase/migrations/20260603210000_create_core_schema.sql:112)

So once any transcript-row update happens, the old token becomes invalid immediately.

### 3. Speaker saves are the clean repro path

`handlePutSpeakers()` in the editor API updates `public.transcripts`:

- it writes `speaker_map_confirmed`
- that fires the `transcripts_set_updated_at` trigger

See:

- [supabase/functions/editor-api/index.ts](C:/Users/james/projects/depo-pro/supabase/functions/editor-api/index.ts:506)

But `workspaceApi.saveSpeakers()` in real-API mode returns the old `target.updated_at`, not the new one. After that, the next `saveReview()` call reuses a stale `jobUpdatedAt` and `requireFreshTranscript()` throws.

This matches the reported symptom precisely:

1. load workspace
2. save speakers
3. `jobUpdatedAt` remains old
4. use Confidence Review
5. `saveReview()` freshness check compares old token to current transcript row
6. throws `Transcript changed elsewhere — reload.`

## Non-findings

- `saveReview()` itself does not update `public.transcripts`; it writes `transcript_words` and `transcript_review_state`.
- The failure is not caused by confidence review mutating the transcript row directly.
- The freshness guard is not comparing the wrong column. The issue is that the client keeps the wrong value for that column.

## Secondary risk

The same stale-token bug exists on the other real-API wrappers:

- `saveWorking()`
- `saveSpeakers()`

Even when they do not immediately surface in Confidence Review, they are using the same broken return-path pattern.

## Freeze-safe fix proposal

Do not remove the freshness guard.

Fix the real-API wrappers in [src/api/workspaceService.ts](C:/Users/james/projects/depo-pro/src/api/workspaceService.ts) so they refresh the transcript row after a successful mutation and return the post-save `updated_at`.

Scoped change:

1. In the real-API branches of `saveWorking`, `saveReview`, and `saveSpeakers`, call the contract API mutation first.
2. Then re-resolve the transcript via `requireFreshTranscript(jobId)` or `resolveWorkspaceTarget(jobId)` without passing `lastKnownUpdatedAt`.
3. Return the fresh `updated_at` from that post-save lookup.

Why this is freeze-safe:

- no schema change
- no contract shape change
- no migration
- no removal of concurrency protection
- local frontend/service-layer fix only

## Recommended follow-up

Implement the narrow fix above and add tests for:

1. real-API `saveSpeakers()` returns the post-save version token
2. real-API `saveReview()` returns the post-save version token
3. a speaker save followed by confidence save does not trip the freshness guard when no true external change occurred

## Verdict

Root cause identified.

The transcript is not being changed "elsewhere" in the user-facing sense. The app is keeping a stale `updated_at` token after successful real-API mutations, and the next review save is correctly rejected by the freshness guard.
