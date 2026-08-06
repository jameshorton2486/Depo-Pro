# DEPO Editor Backend Audit

Date: 2026-06-06  
Branch: `feature/stage3-workspace-core`

## 1. Contract ↔ Schema Mapping

The frozen contract in [src/api/types.ts](C:/Users/james/Projects/Depo-Pro/src/api/types.ts) maps to the current runtime schema as created by:

- [supabase/migrations/20260603210000_create_core_schema.sql](C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260603210000_create_core_schema.sql)
- [supabase/migrations/20260605222208_transcript_persistence_v2.sql](C:/Users/james/Projects/Depo-Pro/supabase/migrations/20260605222208_transcript_persistence_v2.sql)

### `EditorDocument`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `job_id` | `transcripts.job_id` | Edge route business key is `transcripts.transcript_id`; response still returns `job_id`. |
| `media_url` | `case_audio.storage_path` or `case_audio.media_url` | Prefer signed Storage URL from `storage_path`; fallback to `media_url`; fallback `""`. |
| `duration` | `transcripts.duration_seconds` fallback `transcripts.duration` | Later migration made `duration_seconds` canonical. |
| `speakers[]` | `transcript_speakers` | Ordered by `speaker_index`. |
| `utterances[]` | `transcript_utterances` | Ordered by `utterance_index`; `word_ids` assembled from `transcript_words`. |
| `words[]` | `transcript_words` | Ordered by `word_index`. |

### `Word`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `word_id` | `transcript_words.word_id` | Business key, stable. |
| `text` | `transcript_words.working_text ?? transcript_words.text` | Current runtime stores working override in `working_text`; legacy rows may still use `text`. |
| `raw_text` | `transcript_words.raw_text` | Immutable by DB trigger. |
| `speaker_id` | `transcript_words.speaker_id` | Updated on speaker reassignment. |
| `utterance_id` | `transcript_words.utterance_id` | FK to utterance business key. |
| `start_time` | `transcript_words.start_time` | Direct. |
| `end_time` | `transcript_words.end_time` | Direct. |
| `confidence` | `transcript_words.confidence` | Direct. |
| `reviewed` | `transcript_words.reviewed` | Direct. |
| `edited` | derived from `coalesce(working_text, text) <> raw_text` | Stored `edited` exists, but response should remain truthful to displayed text. |

### `Utterance`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `utterance_id` | `transcript_utterances.utterance_id` | Business key. |
| `speaker_id` | `transcript_utterances.speaker_id` | Direct. |
| `start_time` | `transcript_utterances.start_time` | Direct. |
| `end_time` | `transcript_utterances.end_time` | Direct. |
| `word_ids` | assembled from `transcript_words.word_id` ordered by `word_index` | No dedicated column; assembled at read time. |

### `Speaker`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `speaker_id` | `transcript_speakers.speaker_id` | Business key. |
| `display_name` | `coalesce(transcript_speakers.assigned_name, transcript_speakers.display_name, transcript_speakers.speaker_label)` | Response should surface assigned override first. |
| `deepgram_speaker` | `transcript_speakers.speaker_index` fallback `transcript_speakers.deepgram_speaker` | Later migration normalized `speaker_index`. |
| `role` | `transcript_speakers.speaker_role` fallback `transcript_speakers.role` | Contract uses uppercase enum; DB stores free text. Needs normalization at response/write boundary. |

### `AiSuggestion`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `suggestion_id` | `transcript_suggestions.suggestion_id` | Business key. |
| `word_id` | `transcript_suggestions.word_id` | Direct. |
| `utterance_id` | `transcript_suggestions.utterance_id` | Direct. |
| `original_text` | `transcript_suggestions.original_text` | Direct. |
| `suggested_text` | `transcript_suggestions.suggested_text` | Direct. |
| `reason` | `transcript_suggestions.reason` | Direct. |
| `confidence` | `transcript_suggestions.confidence` | Direct. |
| `status` | `transcript_suggestions.status` | DB allows `edited`; contract allows only `pending|accepted|rejected`. `edit` must persist as `accepted` plus applied text mutation to stay within contract. |

### `Exhibit`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `exhibit_id` | `case_exhibits.exhibit_id` | Direct. |
| `label` | `case_exhibits.label` | Direct. |
| `description` | `case_exhibits.description` | Direct. |
| `file_url` | `case_exhibits.storage_path` or `case_exhibits.file_url` | Signed Storage URL if storage-backed; fallback raw `file_url`; fallback `""`. |

### `CertifyChecklist`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `review_complete` | computed from `transcript_words.reviewed` / `transcript_review_state` | No single source-of-truth column in contract shape. |
| `speaker_mapping_complete` | `transcripts.speaker_map_confirmed` or computed from `transcript_speakers` | Current runtime already stores `speaker_map_confirmed`. |
| `confidence_review_complete` | computed | No dedicated column. |

### `SaveWorkingPayload`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `changes[].utterance_id` | `transcript_utterances.utterance_id` / `transcript_words.utterance_id` | Route targets words under this utterance. |
| `changes[].working_text` | `transcript_words.working_text` and `transcript_words.text` | Tokenized across existing utterance word IDs. |
| `source` | audit only | Contract field has no storage home; belongs in `transcript_audit_log.source`. |

### `ReviewPayload`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `reviewed_word_ids[]` | `transcript_words.reviewed`, `transcript_review_state.reviewed_word_ids` | Both word rows and review state row update together. |
| `unreviewed_word_ids[]` | `transcript_words.reviewed`, `transcript_review_state.unreviewed_word_ids` | Same. |

### `SpeakersPayload`

| Contract field | Schema home | Notes |
| --- | --- | --- |
| `speakers[].speaker_id` | `transcript_speakers.speaker_id` | Direct. |
| `speakers[].display_name` | `transcript_speakers.assigned_name`, `display_name`, `speaker_label` | Update all user-facing speaker label columns to keep current runtime consistent. |
| `speakers[].role` | `transcript_speakers.speaker_role`, `role` | Normalize to DB text. |
| `utterance_speaker_map[].utterance_id` | `transcript_utterances.utterance_id` | Direct. |
| `utterance_speaker_map[].speaker_id` | `transcript_utterances.speaker_id`, `transcript_words.speaker_id` | Reassign utterance and all words in it. |

### Columns with no contract field

- `transcripts.transcript_id` — route key / business key only
- `transcripts.case_id`
- `transcripts.media_kind`
- `transcripts.status`
- `transcripts.engine`
- `transcripts.transcription_source`
- `transcripts.sequence_index`
- `transcripts.word_count`
- `transcripts.utterance_count`
- `transcripts.speaker_count`
- `transcripts.avg_confidence`
- `transcripts.raw_storage_path`
- `transcripts.raw_checksum`
- `transcripts.last_error`
- `transcripts.speaker_map_confirmed`
- `transcript_words.is_filler`
- `transcript_words.removed`
- `case_exhibits.filename`, `marked_by`, `admitted`, `page_reference`, `line_reference`
- `case_certifications.*` beyond possible future checklist derivation

### Contract fields with no direct single column

- `Utterance.word_ids` — assembled from ordered word rows
- `EditorDocument.media_url` — derived signed URL
- `CertifyChecklist.*` — computed booleans
- `SaveWorkingPayload.source` — audit metadata only

## 2. MSW Behavioral Spec Extraction

Source: [src/mocks/handlers.ts](C:/Users/james/Projects/Depo-Pro/src/mocks/handlers.ts)

### `GET /:jobId/document`

- Method: `GET`
- Path: `*/:jobId/document`
- Request body: none
- Query behavior: `?big=1` swaps in 30k-word fixture
- Response: `200` JSON `EditorDocument`
- State mutation: none
- Observable semantics:
  - returns `workingDocumentState` overlaid with reviewed-word and speaker override state
  - `jobId` is ignored by the mock

### `PUT /:jobId/working`

- Method: `PUT`
- Path: `*/:jobId/working`
- Request body: `SaveWorkingPayload`
- Response: `200` JSON `{ saved: changes.length }`
- State mutation:
  - loops each `changes[]`
  - tokenizes `working_text` with `trim().split(/\\s+/)` or `[""]`
  - preserves existing utterance `word_ids`
  - updates each existing word’s `text`
  - updates `edited = (text !== raw_text)`
  - does not mutate `raw_text`
  - last word receives the remainder of tokens joined with spaces
  - persists updated `workingDocumentState`

### `PUT /:jobId/review`

- Method: `PUT`
- Path: `*/:jobId/review`
- Request body: `ReviewPayload`
- Response: `200` JSON `{ ok: true, reviewed_count: reviewedWordIds.size }`
- State mutation:
  - adds `reviewed_word_ids` to `reviewedWordIds`
  - removes `unreviewed_word_ids` from `reviewedWordIds`
  - persists reviewed ID list

### `PUT /:jobId/speakers`

- Method: `PUT`
- Path: `*/:jobId/speakers`
- Request body: `SpeakersPayload`
- Response: `200` JSON `{ ok: true }`
- State mutation:
  - upserts `speakerOverrides` keyed by `speaker_id`
  - if `utterance_speaker_map` present:
    - updates matching utterance `speaker_id`
    - updates all words under that utterance to new `speaker_id`
  - persists `workingDocumentState`

### `GET /:jobId/suggestions`

- Method: `GET`
- Path: `*/:jobId/suggestions`
- Request body: none
- Response: `200` JSON `AiSuggestion[]`
- State mutation: none
- Observable semantics:
  - returns live mutable suggestion map including resolved items

### `POST /:jobId/suggestions/:id/resolve`

- Method: `POST`
- Path: `*/:jobId/suggestions/:id/resolve`
- Request body: `{ action: "accept" | "reject" | "edit"; edited_text?: string }`
- Response: `200` JSON `{ ok: true }`
- State mutation:
  - if suggestion exists:
    - `reject` → status `rejected`
    - `accept` → status `accepted`
    - `edit` → status `accepted`, `suggested_text = edited_text`
  - no document mutation in MSW today
- Important ambiguity:
  - the prompt requires document mutation on accept/edit
  - the mock does not currently apply it
  - current client also does not fetch refreshed suggestions after resolve

### `GET /:jobId/exhibits`

- Method: `GET`
- Path: `*/:jobId/exhibits`
- Request body: none
- Response: `200` JSON `Exhibit[]`
- State mutation: none

### `GET /:jobId/certify/status`

- Method: `GET`
- Path: `*/:jobId/certify/status`
- Request body: none
- Response: `200` JSON static `FIXTURE_CERTIFY`
- State mutation: none
- Important ambiguity:
  - mock is static, not computed
  - prompt Phase 6 requires computed booleans “mirror exactly how the mock computes it”
  - there is no mock computation to mirror

## 3. Adapter Inventory

### [src/adapters/editorDocumentToWorkingTranscript.ts](C:/Users/james/Projects/Depo-Pro/src/adapters/editorDocumentToWorkingTranscript.ts)

Provides:
- direct structural copy from `EditorDocument` to local transcript file shape
- preserves `document.job_id` / `existing.job_id`
- copies words, utterances, speakers without additional tokenization logic

Useful for this task:
- minimal structural mapping reference only

Not sufficient for Edge Function:
- does not implement `SaveWorkingPayload` tokenization semantics
- does not map DB rows to contract types

### [src/adapters/caseToEditorDocument.ts](C:/Users/james/Projects/Depo-Pro/src/adapters/caseToEditorDocument.ts)

Provides:
- mapping from local working transcript + review state into `EditorDocument`
- reviewed-flag overlay logic from review state
- speaker-role inference from case metadata

Useful for this task:
- response-shape reference for `EditorDocument`
- reviewed overlay semantics if `transcript_review_state` must be respected

Port / import decision:
- These are client-side TS modules; importing them directly into Deno Edge code would create app-layer coupling and likely fail on unrelated imports.
- Safer approach is to port the small mapping logic needed into Edge-local helpers.

## 4. Auth Reality Check

Current session bootstrap:
- [src/lib/supabase.ts](C:/Users/james/Projects/Depo-Pro/src/lib/supabase.ts) auto-runs `signInAnonymously()` when no session exists.
- `getSupabaseClient()` waits for that session.

Current client request behavior:
- [src/api/client.ts](C:/Users/james/Projects/Depo-Pro/src/api/client.ts) sends no `Authorization` header today.
- all editor fetches are unauthenticated HTTP requests from the browser perspective

Conclusion:
- client wiring must add bearer token attachment in `src/api/client.ts`
- Edge Function must reject missing auth header with `401`

## 5. Media URL Plan

Relevant columns:
- `case_audio.storage_path`
- `case_audio.media_url`
- `case_exhibits.storage_path`
- `case_exhibits.file_url`

Plan:
- `EditorDocument.media_url` comes from the transcript’s `case_id`
- look up the most recent `case_audio` row for that case
- if `storage_path` exists:
  - generate 1-hour signed URL from Storage bucket `case-files`
- else if `media_url` exists:
  - return it unchanged
- else:
  - return `""`
  - log `console.warn`

Same pattern applies to exhibits.

## 6. Gap List

### Non-blocking gaps

1. **Generated DB types are stale.**
   - [src/types/database.ts](C:/Users/james/Projects/Depo-Pro/src/types/database.ts) still reflects the pre-Prompt-5 schema for transcript tables.
   - Current runtime code works around this with local row types in [src/api/transcriptRepository.ts](C:/Users/james/Projects/Depo-Pro/src/api/transcriptRepository.ts).
   - Edge code can define its own local row interfaces; no contract break.

2. **Mock suggestion resolve does not mutate document text.**
   - Prompt requires accept/edit to mutate the target word.
   - Mock only mutates suggestion state.
   - This is an ambiguity between prompt intent and current mock behavior, not a contract blocker.

3. **Mock certify checklist is static.**
   - No real computation exists in MSW to mirror.
   - Need to choose a runtime rule. Existing non-mock `workspaceService.getTranscriptChecklist()` is the best in-repo precedent.

4. **Atomic save helper does not exist yet.**
   - `PUT /working` and suggestion accept/edit should use additive SQL helper(s) or a carefully scoped multi-step transaction strategy.
   - This is additive only.

### Blocking gaps

None found that require:
- contract changes
- destructive schema changes
- writes to `raw_text`
- mutation of audit rows
- service-role usage in deployed runtime

## Gate Decision

Proceed to Phase 1.
