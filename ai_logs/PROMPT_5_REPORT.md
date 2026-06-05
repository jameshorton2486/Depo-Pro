## Prompt 5 Report

### Task 0 — verification gate and runtime schema delta

- `ai_logs/PROMPT_4A_REPORT.md` present.
- Verification completed before implementation:
  - `node scripts\verify-case-roundtrip.mjs`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Runtime schema audit result: the existing core schema already defined the transcript-domain tables, so Prompt 5 extended those tables instead of creating a parallel `transcript_jobs` model.

| Existing runtime table | Prompt 5 action |
| --- | --- |
| `transcripts` | Extended to carry transcript-job lifecycle/state, counts, raw packet storage metadata, provider metadata, `speaker_map_confirmed`, `last_error`, and `updated_at`-based save coordination. |
| `transcript_utterances` | Reused as the canonical utterance store; extended handling only in app code. |
| `transcript_words` | Extended with `working_text`, filler/review support, and immutable `raw_text` enforcement in the migration. |
| `transcript_speakers` | Reused for canonical speaker rows and later workspace assignment writes. |
| `transcript_audit_log` | Reused as the append-only audit trail for ingest and workspace mutations. |

### Commits

1. `a746790` `feat: transcript domain migration (file only)`
2. `bfada15` `feat: resumable audio upload with friendly size errors`
3. `8e8465f` `feat: deepgram batch ingestion with offline fixture mode`
4. `16c3d84` `feat: normalize deepgram response to canonical word storage`
5. `ada4961` `feat: workspace loads canonical transcript from supabase`
6. `3c2baca` `feat: persist workspace edits with audit log and conflict detection`
7. `e2fd658` `test: transcript persistence acceptance steps`

### What landed

- Migration file: `supabase/migrations/20260605222208_transcript_persistence_v2.sql`
  - extends the existing transcript schema
  - enforces `raw_text` immutability
  - adds transcript-job lifecycle fields and indexes
  - adds delete policies needed for cleanup of incomplete ingest jobs
- Audio upload behavior:
  - client-side 2 GB size gate
  - friendly server error mapping
  - single-shot upload retained because resumable TUS upload would require a new dependency
- Transcription service:
  - real Deepgram batch ingestion through `src/api/client.ts`
  - deterministic offline fixture mode when `VITE_TRANSCRIPTION_PROVIDER=offline` or no browser-visible Deepgram key is configured
  - immutable raw packet persisted once to Storage with checksum
- Canonical normalization:
  - maps provider packets into speakers, utterances, and words per the field/data-structure references
  - preserves fillers
  - keeps utterances one-to-one with the provider response
- Workspace persistence:
  - Stage 3 now loads transcript data from Supabase instead of MSW when `VITE_USE_MOCKS=false`
  - workspace edits write `working_text`, review flags, and speaker assignments durably
  - every persisted mutation appends transcript audit rows
  - stale-tab protection uses transcript `updated_at` and surfaces `Transcript changed elsewhere — reload.`
  - transient save failures retry with bounded backoff before surfacing failure

### Contract additions logged

- `CONTRACT_NOTES.md` updated with local transcript and workspace persistence helper types:
  - `DeepgramResponse` / `TranscriptCapture`
  - `NormalizedTranscriptData`
  - local transcript row types
  - `WorkspaceLoadResult` / `WorkspaceMutationResult`

### Decisions applied

#### Decision 1 — two-deponent / multi-session ambiguity

- Current prompt does **not** implement multi-session UI or automatic session splitting.
- Any future extraction/transcript logic that cannot determine a single unambiguous witness/session value must leave the field blank for manual entry rather than guessing.
- `session_id` support is prepared in the migration but remains nullable for now.

#### Decision 2 — audio lifecycle

- Audio remains retained while the case is active.
- Purge/archive enforcement is deferred to the certification-stage work.
- Video audio stripping remains deferred.

### Boundary log carried forward

- `ai_logs/BOUNDARY_LOG.md`
  - Prompt 5 Task 2 resumable upload boundary:
    - installed Supabase client does not expose first-party TUS helpers
    - official resumable path requires `tus-js-client`
    - prompt scope forbids adding that dependency
    - smallest safe resolution: truthful size/error handling over the existing upload path

### Verification completed in this run

- `node scripts\verify-case-roundtrip.mjs`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Task 7 also re-ran:

- `npm run typecheck`
- `npm run test`

### Manual verification script

- `scripts/verify-persistence.md` now includes transcript persistence acceptance coverage for:
  - offline or real ingestion
  - workspace text edits
  - review flags
  - speaker assignment persistence
  - audit-log visibility
  - `raw_text` immutability
  - stale-tab conflict detection

### DB push handoff — stop point

Prompt 5 is complete as a file-and-code delivery. The migration has **not** been pushed from this run.

James must run:

```powershell
npx supabase db push
```

Then paste the CLI output before any follow-on fixes are attempted.

After a successful push, run:

```powershell
node scripts\verify-transcript-ingest.mjs
```

Then complete the transcript browser flow in `scripts/verify-persistence.md`.

### Scope confirmation

- No changes to the frozen contract shapes in `src/api/types.ts`
- No migrations beyond the single Prompt 5 transcript migration file
- No correction-engine, Stage S, pagination, or export work
- No multi-session UI implementation
