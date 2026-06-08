# DEPO-PRO Deepgram Pipeline Report

## Phase 0

### Reference Status

- `reference/wave8/` is already present and tracked in this repo.
- The required folders from the prompt are already available under `reference/wave8/backend/`:
  - `deepgram`
  - `models`
  - `ai_review`
  - `lexicon`
  - `export`
  - `packaging`
  - `diagnostics`
- Per `AGENTS.md`, `reference/wave8/` is read-only normative reference. No copy or extraction was required in this phase.
- Build/test/lint excludes were tightened explicitly:
  - `tsconfig.app.json` excludes `reference`
  - `eslint.config.js` ignores `reference/**`
  - `vite.config.ts` excludes `reference/**` from Vitest

### Wave 8 Deepgram Request Design

Source: `reference/wave8/backend/deepgram/client.py`

Wave 8 uses Deepgram pre-recorded REST transcription against `https://api.deepgram.com/v1/listen` with:

- `model=nova-3`
- `punctuate=true`
- `paragraphs=true`
- `diarize_model=latest`
- `filler_words=true`
- `utterances=true`
- `smart_format=true`
- repeated `keyterm` query params

Wave 8 does **not** use legacy `keywords`, `:boost`, or sounds-like mappings in the request builder.

Wave 8 design notes worth porting:

- keyterms are normalized and deduped case-insensitively before wire send
- keyterms are capped before request dispatch
- request artifacts are preserved separately from the canonical transcript
- the raw Deepgram response is treated as immutable input to normalization

### Wave 8 Response Parsing Design

Sources:

- `reference/wave8/backend/deepgram/client.py`
- `reference/wave8/backend/models/transcripts.py`

Reusable design:

- canonical transcript content should be derived from `results.utterances`
- word timing, confidence, and speaker data come from utterance word arrays
- the flat transcript string is not the canonical source of truth
- speaker assignment remains distinct from later speaker naming/review

This aligns with the existing Depo-Pro normalizer in `src/lib/transcript/normalize.ts`, which already prefers `results.utterances` and falls back to synthetic utterances only if needed.

### Current Depo-Pro Deepgram Request Facts

Source: `src/lib/deepgram/buildDeepgramRequest.ts`

Current request params:

- `model: "nova-3"`
- `punctuate: "true"`
- `paragraphs: "true"`
- `diarize: "true"`
- `diarize_model: "latest"`
- `filler_words: "true"`
- `utterances: "true"`
- `smart_format: "true"`

Current request behavior:

- repeated `keyterm` params are already used
- wire request is capped at 100 keyterms
- preview envelope exposes estimated token usage

### Current Keyterm Derivation Facts

Source: `src/lib/keytermDerivation.ts`

Exports already present:

- `DEEPGRAM_KEYTERM_HARD_TOKEN_CAP = 500`
- `DEEPGRAM_KEYTERM_HARD_TERM_CAP = 100`
- `DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP = 400`
- `DEEPGRAM_KEYTERM_SOFT_TERM_CAP = 90`
- `deriveKeytermsWithBudget`
- `deriveKeyterms`
- `shouldAutoSeedDerivedKeyterms`
- `estimateSelectedStoredKeytermTokens`
- `deriveCaseReferenceTerms`

Important current fact:

- the UI-side derivation already computes a budget result using the prompt-aligned soft caps (`<= 400` estimated tokens and `<= 90` terms)

### Current Storage Facts

Source: `src/api/fileService.ts`

- bucket name: `case-files`
- owner-prefixed storage path convention:
  - `<owner_user_id>/<case_id>/<category>/<file_id>_<sanitized_filename>`
- audio uploads use category `audio`
- signed URLs are already generated through Supabase Storage

### Current `case_audio` Shape

Source:

- `supabase/migrations/20260603210000_create_core_schema.sql`
- `src/api/fileService.ts`

Columns:

- `id uuid primary key`
- `case_id text not null references cases(case_id)`
- `audio_id text not null`
- `original_filename text not null default ''`
- `mime_type text not null default ''`
- `duration_seconds double precision`
- `file_size_bytes bigint`
- `uploaded_at timestamptz`
- `storage_path text`
- `media_url text`
- `created_at timestamptz not null default now()`
- unique `(case_id, audio_id)`

### Current Transcript Schema Shapes

Sources:

- `supabase/migrations/20260603210000_create_core_schema.sql`
- `supabase/migrations/20260605222208_transcript_persistence_v2.sql`
- `src/api/transcriptRepository.ts`

#### `transcripts`

Current effective columns used by the app:

- `id uuid primary key`
- `transcript_id text not null unique`
- `case_id text not null references cases(case_id)`
- `job_id text not null`
- `media_url text`
- `duration double precision`
- `based_on text`
- `deepgram_request_id text`
- `session_id text`
- `source_filename text`
- `media_kind text not null default 'audio'`
- `status text not null default 'queued'`
- `engine text`
- `transcription_source text not null default 'deepgram'`
- `sequence_index integer not null default 0`
- `duration_seconds double precision`
- `word_count integer not null default 0`
- `utterance_count integer not null default 0`
- `speaker_count integer not null default 0`
- `avg_confidence numeric(5,4)`
- `raw_storage_path text`
- `raw_checksum text`
- `last_error text`
- `speaker_map_confirmed boolean not null default false`
- `created_at timestamptz`
- `updated_at timestamptz`

Checks/indexes:

- unique index on `job_id`
- status check:
  - `queued`
  - `preprocessing`
  - `transcribing`
  - `assembling`
  - `completed`
  - `failed`
- transcription source check:
  - `deepgram`
  - `offline-fixture`

#### `transcript_speakers`

Current effective columns used by the app:

- `id uuid primary key`
- `transcript_id text not null references transcripts(transcript_id)`
- `speaker_id text not null`
- `display_name text not null default ''`
- `deepgram_speaker integer not null`
- `role text`
- `job_id text`
- `speaker_index integer`
- `speaker_label text`
- `assigned_name text`
- `speaker_role text`
- `word_count integer not null default 0`

#### `transcript_utterances`

Current effective columns used by the app:

- `id uuid primary key`
- `transcript_id text not null references transcripts(transcript_id)`
- `utterance_id text not null`
- `speaker_id text not null`
- `start_time double precision not null`
- `end_time double precision not null`
- `ordinal integer not null`
- `job_id text`
- `utterance_index integer`
- `speaker_index integer`
- `speaker_label text`
- `text text`
- `avg_confidence numeric(5,4)`

#### `transcript_words`

Current effective columns used by the app:

- `id uuid primary key`
- `transcript_id text not null references transcripts(transcript_id)`
- `utterance_id text not null`
- `word_id text not null`
- `speaker_id text not null`
- `ordinal integer not null`
- `text text not null`
- `raw_text text not null`
- `start_time double precision not null`
- `end_time double precision not null`
- `confidence real not null`
- `reviewed boolean not null default false`
- `edited boolean not null default false`
- `job_id text`
- `word_index integer`
- `working_text text`
- `speaker_index integer`
- `is_filler boolean not null default false`
- `removed boolean not null default false`

Integrity rule:

- `raw_text` is immutable via the `reject_raw_text_change()` trigger

#### `transcript_review_state`

Current effective columns:

- `id uuid primary key`
- `transcript_id text not null unique references transcripts(transcript_id)`
- `updated_at timestamptz not null default now()`
- `reviewed_word_ids jsonb not null default '[]'`
- `unreviewed_word_ids jsonb not null default '[]'`
- `review_complete boolean not null default false`
- `review_pct integer`

### Current Canonical Ingestion / Editor Expectations

Sources:

- `src/lib/transcript/normalize.ts`
- `src/api/transcriptRepository.ts`
- `src/api/workspaceService.ts`

Current Depo-Pro already has the core normalization seam required by the prompt:

- `normalizeTranscriptResponse(response)` builds canonical:
  - speakers
  - utterances
  - words
- canonical data is derived from `results.utterances`
- if utterances are absent, fallback utterances are built from word-level speaker changes
- speaker IDs are deterministic: `spk_###`
- utterance IDs are deterministic: `utt_######`
- word IDs are deterministic: `w_########`
- canonical words preserve:
  - `raw_text`
  - timing
  - confidence
  - filler-word flag

Current persistence seam:

- `insertNormalizedTranscript(job, normalized)` inserts into:
  - `transcript_speakers`
  - `transcript_utterances`
  - `transcript_words`
  - `transcript_audit_log`

Important current mismatch with the new prompt:

- `insertNormalizedTranscript` currently writes transcript job state into `transcripts`
  only indirectly; it does not introduce a separate `transcription_jobs` table
- cleanup today uses delete policies on incomplete `transcript_*` rows
- the new prompt wants a separate `transcription_jobs` table for request/callback lifecycle

### Low-Confidence Behavior

Sources:

- `src/extensions/ConfidencePlugin.ts`
- `src/lib/buildEditorContent.ts`

Current fact confirmed:

- low-confidence review is computed from per-word `confidence` values already stored on editor nodes
- the editor does not depend on a separate low-confidence table

### Phase 0 Boundary Notes

- `reference/wave8/` is already vendored and tracked, consistent with current repo conventions and `AGENTS.md`
- the existing transcript schema **can** represent Deepgram utterance/word output without destructive change
- the existing normalization seam is already close to the target callback-ingestion design
- Phase 1 can proceed with a separate `transcription_jobs` table layered beside the existing `transcripts` table
