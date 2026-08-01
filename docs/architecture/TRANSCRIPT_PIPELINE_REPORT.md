# Depo-Pro Transcript Pipeline Report

**Last regenerated:** 2026-07-28, verified against the repository source (globbed the transcript library and edge functions; grepped each module's imports, `.from(...)` table writes, and call sites). Filenames, wiring, and table names below reflect the actual code.

**Verification boundary:** This report describes the **code**. Deployment/runtime state (which functions are live, Cloud Run revision IDs, hosting provider) cannot be verified from the repository and is not asserted here — those are owner-managed and must be confirmed against the live GCP/Supabase environment.

---

## Pipeline overview (verified files)

```
Recognition request     → src/lib/deepgram/buildDeepgramRequest.ts
        ↓                  (invoked by supabase/functions/transcribe-start/index.ts)
Callback + raw persist  → supabase/functions/transcribe-callback/index.ts
        ↓                  (flips last chunk to `finalizing`, dispatches Cloud Task)
Finalize dispatch       → supabase/functions/transcribe-callback/finalizeTasks.ts
        ↓                  (Cloud Tasks → Cloud Run)
Cloud Run finalize      → transcript_finalize_service/main.ts  (+ Dockerfile)
        ↓                  (calls finalizeTranscriptJob in the shared module)
Shared finalize logic   → supabase/functions/_shared/transcriptFinalize.ts
   ├─ normalize         → src/lib/transcript/normalize.ts
   ├─ merge             → src/lib/transcript/multifileMerge.ts
   ├─ finalize+integrity→ src/lib/transcript/finalizationPipeline.ts
   │                       └─ integrity gate → src/lib/transcript/canonicalIntegrity.ts
   └─ boundary/regions  → src/lib/transcript/boundaryEngine.ts (+ depositionRegionEngine.ts)
        ↓
AI review (separate fn) → supabase/functions/ai-review/index.ts
                            └─ src/lib/transcript/aiReview.ts + aiSuggestionEngine.ts (Anthropic)
        ↓
Workspace load          → src/api/workspaceService.ts → src/context/DocumentContext.tsx
        ↓
Presentation + editor   → src/lib/buildEditorContent.ts → src/lib/transcript/workspacePresentation.ts
                            → src/components/TranscriptEditor/TranscriptEditor.tsx

Reliability: supabase/functions/transcribe-watchdog/index.ts  (+ src/lib/transcript/watchdogPolicy.ts)
             supabase/functions/recover-transcript/index.ts   (+ src/lib/transcript/recoveryPolicy.ts)
```

---

## Stage 1 — Recognition request

**File:** `src/lib/deepgram/buildDeepgramRequest.ts`
**Invoked by:** `transcribe-start` (`buildDeepgramRequestFromStoredKeyterms`).

Current wire parameters (`DEEPGRAM_REQUEST_PARAMS`):

```js
{
  model: "nova-3",
  punctuate: "true",
  diarize: "true",        // explicit enable
  filler_words: "true",   // preserved; stripped later at Editorial (editorialEngine.ts)
  numerals: "true",
  utterances: "true",
  utt_split: "0.8",
  smart_format: "true",
  language: "en",
  mip_opt_out: "true",
  keyterm: [...]          // up to MAX_KEYTERMS = 100 selected terms
}
```

`diarize_model` is **not** sent: Deepgram rejects it (`400 INVALID_QUERY_PARAMETER — "diarize_model cannot be used together with diarize or diarize_version."`), and nova-3 diarizes on `diarize=true` alone. Its removal is in PR #37. The keyterm count cap is `MAX_KEYTERMS = 100`; the 500 figure is the token estimate cap (`DEEPGRAM_KEYTERM_HARD_TOKEN_CAP`).

**Pending (not yet changed):** `utt_split=1.0` and `paragraphs=true` alignment (deferred; separate future change).

---

## Stage 2 — Callback + raw-response persistence

**File:** `supabase/functions/transcribe-callback/index.ts`
**Trigger:** Deepgram callback URL, per chunk/source.
**Imports (verified):** `integrityAudit.ts`, `multifileCallbackFlow.ts` (`advanceOrFinalizeMultifileJob`), `autoChunking.ts`, `transcriptionJobs.ts`, `_shared/transcriptFinalize.ts`, `finalizeTasks.ts`, `types.ts`.

Behavior: validates the response, persists the raw Deepgram payload to **Supabase Storage** (the raw responses are stored as artifacts — there is no `transcription_responses` table in the callback/finalizer paths inspected; treat that name as unconfirmed), reads `transcripts`, signs audio URLs, and — on the final chunk — **flips the job to `finalizing` and dispatches a Cloud Task** (`dispatchFinalizeTask`). The webhook **no longer finalizes inline** (Phase 2 change): heavy work is handed to the Cloud Run worker.

`integrityAudit.ts` is used **here, in the callback** — not in the finalize pipeline (the finalize gate is `canonicalIntegrity.ts`, Stage 5).

**Dispatch helper:** `supabase/functions/transcribe-callback/finalizeTasks.ts` — `dispatchFinalizeTask`, enqueues the Cloud Task to the finalize worker.

---

## Stage 3 — Cloud Run finalize worker

**File:** `transcript_finalize_service/main.ts` (+ `transcript_finalize_service/Dockerfile`)

The actual Cloud Run entrypoint — a `Deno.serve` HTTP server exposing `POST /tasks/finalize` (and `GET /healthz`). It calls `finalizeTranscriptJob(...)` from the shared module, enforces a finalize lease (`FINALIZE_LEASE_TTL_SECONDS`, default 900s), and marks the job `failed` with cause on error.

`_shared/transcriptFinalize.ts` is **shared logic imported by both the callback and the Cloud Run worker** — it is not itself "the Cloud Run function."

---

## Stage 4 — Shared finalize logic

**File:** `supabase/functions/_shared/transcriptFinalize.ts` (~1,100+ lines)
**Imports (verified):** `normalize.ts` (`normalizeTranscriptResponse`), `finalizationPipeline.ts` (`finalizeTranscript`), `multifileMerge.ts`, `boundaryEngine.ts`, `canonicalIntegrity.ts` (type), `models.ts`, `types.ts`.

Orchestration: rebuilds the transcript canonically from **stored** Deepgram responses (no re-call to Deepgram) — normalizes each stored response, runs the finalization pipeline (merge + integrity), persists canonical data, and runs boundary/region detection. Idempotent and lease-protected.

**Tables written (verified `.from(...)`):** `transcripts`, `transcript_speakers`, `transcript_utterances`, `transcript_words`, `transcript_audit_log`, `transcription_jobs`; reads `cases`, `case_audio`. Canonical data lives in **`transcripts`** (not a `transcriptions` table); job metadata/status lives in **`transcription_jobs`**.

---

## Stage 5 — Normalize → Merge → Integrity

- **Normalize:** `src/lib/transcript/normalize.ts` (`normalizeTranscriptResponse`). Parses `results.utterances` (or reconstructs from flat words), groups by `word.speaker`, assigns stable IDs, preserves per-word timing/confidence/`raw_text`, splits utterances on mid-utterance speaker change. Called directly by `transcriptFinalize.ts`.
- **Merge:** `src/lib/transcript/multifileMerge.ts`. Reconciles multiple sources/chunks, unifies speaker clusters across seams, deduplicates overlaps, resequences IDs. Invoked via `finalizationPipeline.ts`.
- **Integrity gate:** `src/lib/transcript/canonicalIntegrity.ts` (`auditCanonicalTranscript`), invoked by `finalizationPipeline.ts`. This is the finalization integrity gate. (`integrityAudit.ts` is a different module used in the callback — Stage 2.)

**Orchestrator:** `src/lib/transcript/finalizationPipeline.ts` (`finalizeTranscript`) — imports `canonicalIntegrity.ts`, `multifileMerge.ts`, `normalize.ts`.

---

## Stage 6 — Enrichment

- **Record boundaries / regions:** `src/lib/transcript/boundaryEngine.ts` (with `depositionRegionEngine.ts`). Imported by `transcriptFinalize.ts`, so it runs **within the Cloud Run finalize worker** — marks pre/off/post-record regions and drives `excluded_from_output`.
- **AI review:** `supabase/functions/ai-review/index.ts` — a **separate Edge Function**, not a call inside `transcriptFinalize.ts`. It imports `aiReview.ts` and `aiSuggestionEngine.ts` (`generateAISuggestions`, Anthropic via `PRIMARY_MODEL`), reads `transcripts` / `transcript_utterances` / `transcript_words` / `transcript_speakers` / `speaker_resolution_current` / `cases`, and writes AI suggestions to `transcript_words` (`ai_suggestion`, `ai_suggestion_status`) plus `transcript_audit_log`. It never overwrites `raw_text`.
  - *Unverified:* the exact trigger for `ai-review` (post-finalize dispatch vs. workspace/operator-initiated) was not confirmed in this pass.

---

## Stage 7 — Workspace load + presentation

- **Load:** `src/api/workspaceService.ts` (`getDocument`) returns an `EditorDocument` assembled from the `transcript_*` tables. It does not call `workspacePresentation` or `buildEditorContent`.
- **State:** `src/context/DocumentContext.tsx` holds the `EditorDocument`, autosave, dirty tracking, and structure flags. The deployed context state uses `structureConfirmed` / `keepRawLabels` and `workingTexts`. (The only layer-selection state anywhere is PR #34's `renderLayer: "reporter" | "canonical"`, which is in-progress, not deployed.)
- **Presentation build:** `src/lib/buildEditorContent.ts` is called by **`TranscriptEditor.tsx`** (its `editorContent` memo), and it in turn calls **`src/lib/transcript/workspacePresentation.ts`** (`buildDisplayDocument`, `buildTranscriptParagraphs`, `resolveWordDisplay`) plus the CFE formatter. TipTap JSON is produced here.
- **Render:** `src/components/TranscriptEditor/TranscriptEditor.tsx` renders the TipTap content, word-click audio sync, and confidence coloring. Edits flow back through `DocumentContext`, never overwriting `raw_text`.

Call graph: `workspaceService → EditorDocument`; `TranscriptEditor → buildEditorContent → workspacePresentation`.

---

## Reliability — Watchdog & Recovery

- **Watchdog:** `supabase/functions/transcribe-watchdog/index.ts` with policy `src/lib/transcript/watchdogPolicy.ts`. Sweeps stalled `queued`/`processing`/`finalizing` jobs; re-submits Deepgram or re-dispatches finalize; attempt caps; stale-lease aware.
- **Recovery:** `supabase/functions/recover-transcript/index.ts` with policy `src/lib/transcript/recoveryPolicy.ts`. Operator-invoked; refuses if no stored responses; promotes to `finalizing` and re-dispatches.

---

## Verified file inventory

| Stage | File | Kind |
|---|---|---|
| 1 | `src/lib/deepgram/buildDeepgramRequest.ts` | lib |
| 1 | `supabase/functions/transcribe-start/index.ts` | edge fn |
| 2 | `supabase/functions/transcribe-callback/index.ts` | edge fn |
| 2 | `supabase/functions/transcribe-callback/finalizeTasks.ts` | lib |
| 2 | `src/lib/transcript/integrityAudit.ts` | lib (callback-side) |
| 2 | `src/lib/transcript/multifileCallbackFlow.ts` | lib |
| 2 | `src/lib/transcript/autoChunking.ts` | lib |
| 3 | `transcript_finalize_service/main.ts` (+ `Dockerfile`) | Cloud Run entrypoint |
| 4 | `supabase/functions/_shared/transcriptFinalize.ts` | shared lib |
| 5 | `src/lib/transcript/normalize.ts` | lib |
| 5 | `src/lib/transcript/multifileMerge.ts` | lib |
| 5 | `src/lib/transcript/finalizationPipeline.ts` | lib (orchestrator) |
| 5 | `src/lib/transcript/canonicalIntegrity.ts` | lib (finalize gate) |
| 6 | `src/lib/transcript/boundaryEngine.ts` (+ `depositionRegionEngine.ts`) | lib |
| 6 | `supabase/functions/ai-review/index.ts` | edge fn |
| 6 | `src/lib/transcript/aiReview.ts` | lib |
| 6 | `src/lib/transcript/aiSuggestionEngine.ts` | lib |
| 7 | `src/api/workspaceService.ts` | service |
| 7 | `src/context/DocumentContext.tsx` | React context |
| 7 | `src/lib/buildEditorContent.ts` | lib |
| 7 | `src/lib/transcript/workspacePresentation.ts` | lib |
| 7 | `src/components/TranscriptEditor/TranscriptEditor.tsx` | React component |
| R | `supabase/functions/transcribe-watchdog/index.ts` (+ `watchdogPolicy.ts`) | edge fn |
| R | `supabase/functions/recover-transcript/index.ts` (+ `recoveryPolicy.ts`) | edge fn |

**Verified DB tables:** `transcripts`, `transcript_speakers`, `transcript_utterances`, `transcript_words`, `transcript_audit_log`, `transcription_jobs`, `cases`, `case_audio`, `speaker_resolution_current`.

---

## Architectural invariants

- **No overwrites of canonical data:** `raw_text` is immutable; every transformation produces a derived view or an overlay.
- **Finalize from stored responses:** the worker rebuilds canonically from stored Deepgram payloads, never re-calling Deepgram.
- **Idempotent + lease-protected finalize:** safe to retry; concurrent duplicate finalization is prevented by a timestamp lease.
- **Reliability net:** watchdog re-drives stalled jobs; recovery is operator-invoked and refuses when no stored responses exist.
