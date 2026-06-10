# Multi-file Build Report — 2026-06-10

## Task 0 — Build Gate

### Baseline

- Branch: `release/stage3-rc`
- `npm run typecheck`: pass
- `npm run test`: pass (`229/229`)
- `git status --short`: source tree clean except untracked `.tmp/`

### Re-verified assumptions

- `transcribe-start` still selects the latest case audio row:
  - `supabase/functions/transcribe-start/index.ts:84`
  - `supabase/functions/transcribe-start/index.ts:217-224`
- The one-active-job-per-case unique index is still enforced:
  - `supabase/migrations/20260607204500_transcription_jobs.sql:22-24`
- `case_audio` currently lacks explicit source ordering in the generated DB types:
  - `src/types/database.ts:42-69`
- `transcription_jobs` is still the active orchestration table used by both functions:
  - `supabase/functions/transcribe-start/index.ts:242-290`
  - `supabase/functions/transcribe-callback/index.ts:141-396`

### Additive schema delta confirmation

The approved deltas are additive against the current schema:

- `case_audio.source_index integer not null default 0`
- `transcription_jobs.source_audio_id text null`
- `transcription_jobs.source_index integer null`

They do not alter existing keys, status checks, or the one-active-job-per-case index.

## Task 1 — Additive Schema Delta

### Delivered

- Added migration `supabase/migrations/20260610165436_add_multifile_source_columns.sql`
- Added `case_audio.source_index integer not null default 0`
- Added `transcription_jobs.source_audio_id text null`
- Added `transcription_jobs.source_index integer null`
- Added supporting indexes:
  - `case_audio_case_source_idx`
  - `transcription_jobs_case_source_idx`

### Single-file safety

- Existing `case_audio` rows default to `source_index = 0`
- Existing `transcription_jobs` rows keep null source binding fields without changing status semantics
- The one-active-job-per-case unique index is untouched
- Local transcription job types now include the new nullable binding fields

### Verification

- `npm run typecheck`: pass
- `npm run test`: pass (`229/229`)

## Task 5 — SpeakerPanel File Context

### Delivered

- SpeakerPanel now derives source-file context from namespaced speaker ids
- Namespaced speakers render with a visible `File N` badge instead of only `SPK N`
- Reassignment choices also show source-file context, so cross-file `SPK 0` collisions are no longer visually ambiguous

### Single-file safety

- Single-file speakers do not receive a file badge because their ids keep the legacy shape
- Speaker editing and reassignment flows are unchanged apart from the added context labels

### Verification

- `npm run typecheck`: pass
- `npm run test`: pass (`229/229`)

## Task 4 — Callback Sequencing And Canonical Merge

### Delivered

- `transcribe-callback` now binds each callback to the parent job’s active `source_audio_id` / `source_index`
- Each source file’s raw Deepgram response is archived separately using deterministic per-source filenames
- Intermediate callbacks no longer persist partial transcript rows; they queue the next source file instead
- The final callback loads all archived per-source responses, normalizes each, rebases timings and ordinals, namespaces speakers, and persists one canonical transcript row set
- Multi-file runs now emit a merge manifest artifact in storage for auditability; single-file runs keep the legacy raw response artifact path

### Single-file safety

- Single-file callbacks still persist exactly one normalized transcript
- Single-file raw artifact naming remains unchanged
- The canonical transcript tables are only written once, after a complete callback cycle, matching the prior single-file completion point

### Verification

- `npm run typecheck`: pass
- `npm run test`: pass (`229/229`)

## Task 3 — Sequential Parent-job Orchestration

### Delivered

- `transcribe-start` now loads ordered `case_audio` rows instead of only the latest upload
- The parent `transcription_jobs` row is created with the first source file bound in `source_audio_id` / `source_index`
- The first outbound Deepgram request is archived with deterministic per-source filenames for multi-file cases
- Shared helpers now support legacy single-file artifact names and indexed multi-file artifact names

### Single-file safety

- Single-file jobs still use the legacy `jobid_deepgram_request.json` and `jobid_deepgram_response.json` artifact names
- The one-active-job-per-case invariant is unchanged because only the parent job row is inserted
- The UI contract for `startTranscription` is unchanged apart from the additive source binding fields

### Verification

- `npm run typecheck`: pass
- `npm run test`: pass (`229/229`)

## Task 2 — Intake Multi-file Attach And Ordering

### Delivered

- `case_audio` is now treated as an ordered list in the client, not a single latest upload
- New audio uploads are assigned the next `source_index`
- Intake audio listing now renders all attached source files in order
- Intake provides persisted move-up / move-down ordering controls backed by `case_audio.source_index`
- Document upload cards for notice, scheduling, and supporting documents remain unchanged

### Single-file safety

- A case with one audio file still shows a single ready source and the same upload flow
- The intake record’s legacy `record.audio` pointer remains untouched
- No transcript orchestration logic changed in this task

### Verification

- `npm run typecheck`: pass
- `npm run test`: pass (`229/229`)
