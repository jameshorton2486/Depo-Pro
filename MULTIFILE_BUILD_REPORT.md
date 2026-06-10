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
