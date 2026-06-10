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

