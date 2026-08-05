# Data Reality Findings

## Three Load-Bearing Answers

1. **Raw Deepgram source preserved and traceable?** **PARTIAL.** The chosen transcript row preserves a `raw_storage_path`, the corresponding `transcription_jobs.response_path` exists, and `storage.objects` contains the raw response object for this transcript. That proves preservation-by-path and row-to-object traceability. What I could **not** prove read-only in this session is byte-level retrieval of that private object for field counting, because the `case-files` bucket is private and its `SELECT` policy requires an authenticated owner path match. Evidence: `supabase/functions/transcribe-callback/index.ts:98-108`, `supabase/functions/transcribe-callback/index.ts:219-239`, `public.transcripts.raw_storage_path`, `public.transcription_jobs.response_path`, `storage.objects`, `storage.buckets`, `pg_policies`.
2. **Layer-1 per-word timing actually persisted and populated?** **PASS.** `transcript_words` contains `12285` rows for `tr_1782164554896_cra5eh`, matching `public.transcripts.word_count`, and sampled rows include populated `word_id`, `raw_text`, `start_time`, `end_time`, `confidence`, `speaker_id`, and `utterance_id`. The null/plausibility check returned zero nulls for every sync-critical field. Evidence: `src/api/types.ts:8-19`, `src/api/workspaceService.ts:106-117`, `supabase/functions/editor-api/index.ts:267-289`.
3. **Destructive migration: past loss, non-event, or future risk?** **PAST LOSS, DATA REPOPULATED SINCE.** `supabase/migrations/20260606180456_add_owner_user_id_ownership.sql` explicitly deletes transcript/case data before adding `owner_user_id`, and that migration version is present in `supabase_migrations.schema_migrations`. Current row counts show the database has been repopulated since. Evidence: `supabase/migrations/20260606180456_add_owner_user_id_ownership.sql:13-27`.

## Verdict Table

| Probe | Verdict | One-line evidence |
|---|---|---|
| A | PARTIAL | Live schema is queryable and present, but `DEPO_PRO_DATABASE_SCHEMA.md` is absent from the working tree, so assumed-vs-actual can only be checked against `src/api/types.ts` and canonical docs. |
| B | PASS | `transcript_words` has `12285` populated word rows for the chosen transcript; null checks on `word_id/raw_text/start_time/end_time/confidence` all returned zero nulls. |
| C | PASS | `case_audio.storage_path` is populated and the Workspace maps clicked/highlighted words to `start_time` and audio seek/play. |
| D | PASS | Ownership migration `20260606180456` is applied, deletes transcript/case rows, and current row counts prove later repopulation. |
| E | PASS | Load path preserves `raw_text`, `word_id`, `start_time`, `end_time`, `confidence`; save path mutates `text/working_text` and audit rows, not Layer-1 identity/timing fields. |
| F | PASS | Export package is a text-only convenience format assembled from utterance text; timing omission is an export-path choice, not a DB absence. |
| G | PASS | Per-word confidence is stored and actively surfaced through the low-confidence plugin and panel at threshold `0.70`. |
| H | PASS | Ingest inserts `transcript_audit_log` rows, and the working-text RPC appends `bulk_save` audit rows on edit. |
| I | PARTIAL | Raw Deepgram response is preserved and traceable by storage path, but direct readback of the private JSON object was not provable in this read-only session. |
| J | PARTIAL | Grouping is centralized in `src/lib/format/grouping.ts`, but formatting/serialization still lives in multiple places (`buildEditorContent`, `pagination`, `ExportScreen`, `utteranceRender`). |
| K | FAIL | Layer-1 identity is preserved, but there is no proven non-mutating paragraph/format overlay for future AI structuring, and raw-object retrieval remains unproven here. |
| L | PARTIAL | Active code still violates adopted spacing/geometry decisions via hardcoded renderer/export behavior, but no evidence was found of raw-word/timestamp mutation or silent speech invention. |
| M | PARTIAL | `TRANSCRIPT_FIDELITY_BACKLOG.md` is absent; fallback coverage can be derived from `docs/audits/ERROR_COVERAGE_MATRIX.md` and the canonical changelogs. |
| N | PARTIAL | Workspace grouping is unified, but export/package output still uses a parallel serialization path rather than the same representation. |
| O | PASS | CFE Phase 1 can begin without schema changes; remaining issues are code-path unification/compliance issues, not blocking data-foundation gaps. |

## Probe A — Database Schema Reality

### Chosen Transcript

The requested identifier exists as a **transcript id**, not a job id.

```sql
SELECT id, case_id, transcript_id, job_id, status, word_count, updated_at
FROM public.transcripts
WHERE transcript_id = 'tr_1782164554896_cra5eh'
   OR job_id = 'tr_1782164554896_cra5eh'
ORDER BY updated_at DESC;
```

Result:

```text
d691d7f0-d6bd-4fa0-b623-1ef43a768621|case_20260622_x416k5|tr_1782164554896_cra5eh|81c0f534-a501-4734-98d0-f11730de3821|completed|12285|2026-06-22 21:43:13.320204+00
```

I traced **this same transcript** through the DB and code for Probes B, C, E, I, and K.

### Present Tables and Column Lists

```sql
SELECT table_name, string_agg(column_name || ':' || data_type, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'cases',
    'case_audio',
    'transcripts',
    'transcription_jobs',
    'transcript_words',
    'transcript_utterances',
    'transcript_speakers',
    'transcript_audit_log'
  )
GROUP BY table_name
ORDER BY table_name;
```

Result:

```text
case_audio|id:uuid, case_id:text, audio_id:text, original_filename:text, mime_type:text, duration_seconds:double precision, file_size_bytes:bigint, uploaded_at:timestamp with time zone, storage_path:text, media_url:text, created_at:timestamp with time zone, owner_user_id:uuid, source_index:integer
cases|id:uuid, case_id:text, version:text, proceeding_type:text, stage:text, notes:text, payload:jsonb, created_at:timestamp with time zone, updated_at:timestamp with time zone, owner_user_id:uuid
transcript_audit_log|id:uuid, transcript_id:text, change_id:text, utterance_id:text, word_id:text, old_text:text, new_text:text, source:text, suggestion_id:text, reviewer_user_id:uuid, created_at:timestamp with time zone, case_id:text, job_id:text, actor:uuid, action:text, before_text:text, after_text:text, owner_user_id:uuid
transcript_speakers|id:uuid, transcript_id:text, speaker_id:text, display_name:text, deepgram_speaker:integer, role:text, job_id:text, speaker_index:integer, speaker_label:text, assigned_name:text, speaker_role:text, word_count:integer, owner_user_id:uuid
transcript_utterances|id:uuid, transcript_id:text, utterance_id:text, speaker_id:text, start_time:double precision, end_time:double precision, ordinal:integer, job_id:text, utterance_index:integer, speaker_index:integer, speaker_label:text, text:text, avg_confidence:numeric, owner_user_id:uuid
transcript_words|id:uuid, transcript_id:text, utterance_id:text, word_id:text, speaker_id:text, ordinal:integer, text:text, raw_text:text, start_time:double precision, end_time:double precision, confidence:real, reviewed:boolean, edited:boolean, job_id:text, word_index:integer, working_text:text, speaker_index:integer, is_filler:boolean, removed:boolean, owner_user_id:uuid
transcription_jobs|id:uuid, case_id:text, transcript_id:text, owner_user_id:uuid, status:text, callback_token_hash:text, request_path:text, response_path:text, error:text, created_at:timestamp with time zone, updated_at:timestamp with time zone, source_audio_id:text, source_index:integer
transcripts|id:uuid, transcript_id:text, case_id:text, job_id:text, media_url:text, duration:double precision, based_on:text, deepgram_request_id:text, created_at:timestamp with time zone, updated_at:timestamp with time zone, session_id:text, source_filename:text, media_kind:text, status:text, engine:text, transcription_source:text, sequence_index:integer, duration_seconds:double precision, word_count:integer, utterance_count:integer, speaker_count:integer, avg_confidence:numeric, raw_storage_path:text, raw_checksum:text, last_error:text, speaker_map_confirmed:boolean, owner_user_id:uuid
```

### ASSUMED vs ACTUAL

- `src/api/types.ts` does match the **shape** of `EditorDocument`/`Word`/`Utterance` (`src/api/types.ts:8-43`), but the live DB is richer than the API contract: `working_text`, `speaker_index`, `owner_user_id`, `raw_storage_path`, `deepgram_request_id`, `speaker_map_confirmed`, and audit metadata all exist in the DB and are not represented in the frozen contract.
- `DEPO_PRO_DATABASE_SCHEMA.md` could not be compared because it is **absent from the working tree**. Search evidence: `rg -n "DEPO_PRO_DATABASE_SCHEMA\\.md" .` returned only references inside docs, not the file itself.

## Probe B — Layer-1 Timing Persistence

Contract expectation: `Word` carries immutable `raw_text` plus `start_time`, `end_time`, and `confidence` in the runtime model (`src/api/types.ts:8-19`).

```sql
SELECT count(*) AS word_rows
FROM public.transcript_words
WHERE transcript_id = 'tr_1782164554896_cra5eh';
```

Result:

```text
12285
```

This matches `public.transcripts.word_count = 12285` for the chosen transcript.

```sql
SELECT word_id, raw_text, start_time, end_time, confidence, speaker_id, utterance_id
FROM public.transcript_words
WHERE transcript_id = 'tr_1782164554896_cra5eh'
ORDER BY word_index ASC
LIMIT 5;
```

Result:

```text
w_00000000|Good|0|0.32|0.9248|spk_000|utt_000000
w_00000001|afternoon.|0.32|0.96|1|spk_000|utt_000000
w_00000002|We|1.1999999|1.4399999|1|spk_000|utt_000001
w_00000003|are|1.4399999|1.68|1|spk_000|utt_000001
w_00000004|on|1.68|1.8399999|0.9961|spk_000|utt_000001
```

```sql
SELECT
  count(*) FILTER (WHERE word_id IS NULL) AS null_word_id,
  count(*) FILTER (WHERE raw_text IS NULL OR raw_text = '') AS null_raw_text,
  count(*) FILTER (WHERE start_time IS NULL) AS null_start_time,
  count(*) FILTER (WHERE end_time IS NULL) AS null_end_time,
  count(*) FILTER (WHERE confidence IS NULL) AS null_confidence,
  min(start_time) AS min_start_time,
  max(end_time) AS max_end_time,
  min(confidence) AS min_confidence,
  max(confidence) AS max_confidence
FROM public.transcript_words
WHERE transcript_id = 'tr_1782164554896_cra5eh';
```

Result:

```text
0|0|0|0|0|0|4993.603|0.1074|1
```

**Determination: PASS.** The Layer-1 timing/identity fields are not aspirational; they are populated and plausible in the live DB.

## Probe C — Audio Linkage & Playback Sync

```sql
SELECT case_id, audio_id, storage_path, original_filename, duration_seconds
FROM public.case_audio
WHERE case_id = 'case_20260622_x416k5';
```

Result:

```text
case_20260622_x416k5|f_1782164501272_s20t|76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260622_x416k5/audio/f_1782164501272_s20t_04-24-26_Dr_Mohammed_Etminan_MD_-_Audio_1_1.mp3|04-24-26 Dr Mohammed Etminan, MD - Audio (1) (1).mp3|4993.968
```

Code path:

- The Edge Function resolves a signed audio URL from `case_audio.storage_path` at `supabase/functions/editor-api/index.ts:291-318`.
- The runtime model preserves `start_time` and `end_time` when loading words at `src/api/workspaceService.ts:106-117`.
- Clicking a word seeks and plays audio by `data-start` at `src/components/TranscriptEditor/TranscriptEditor.tsx:174-180`.
- The highlight loop finds the active `word_id` from current audio time at `src/components/TranscriptEditor/TranscriptEditor.tsx:215-236`, using the binary-search timing map built in `src/lib/wordTimings.ts:65-101`.
- The confidence panel also seeks directly to `word.start_time` at `src/components/ConfidencePanel/ConfidencePanel.tsx:56-72`.

**Determination: PASS.**

## Probe D — Destructive Ownership Migration

Migration file: `supabase/migrations/20260606180456_add_owner_user_id_ownership.sql`.

Destructive lines:

- `delete from public.transcript_words;` (`supabase/migrations/20260606180456_add_owner_user_id_ownership.sql:13`)
- `delete from public.transcript_utterances;` (`...:14`)
- `delete from public.transcript_speakers;` (`...:15`)
- `delete from public.transcript_audit_log;` (`...:18`)
- `delete from public.case_audio;` (`...:22`)
- `delete from public.transcripts;` (`...:24`)
- `delete from public.cases;` (`...:27`)

```sql
SELECT version
FROM supabase_migrations.schema_migrations
WHERE version = '20260606180456';
```

Result:

```text
20260606180456
```

Current row counts:

```sql
SELECT count(*) AS cases_count FROM public.cases;
SELECT count(*) AS transcripts_count FROM public.transcripts;
SELECT count(*) AS transcript_words_count FROM public.transcript_words;
```

Result:

```text
23
4
36843
```

**Determination:** already applied and destructive to earlier rows; current case/transcript data exists because the database was repopulated afterward.

## Probe E — EditorDocument Round-Trip Integrity

### Load

`EditorDocument` is assembled from DB rows in `src/api/workspaceService.ts:97-117`:

- utterance ids and timing: `src/api/workspaceService.ts:98-103`
- `word_id`: `src/api/workspaceService.ts:107`
- working text fallback: `src/api/workspaceService.ts:108`
- immutable `raw_text`: `src/api/workspaceService.ts:109`
- timing + confidence: `src/api/workspaceService.ts:112-114`

The Edge Function load path selects those same fields from `transcript_words` at `supabase/functions/editor-api/index.ts:257-289` and maps them to the API `Word` at `supabase/functions/editor-api/index.ts:354-367`.

### Save

The save RPC call is `editor_apply_working_changes` at `supabase/functions/editor-api/index.ts:390-415`.

The RPC implementation updates:

- `transcript_words.text`
- `transcript_words.working_text`
- `transcript_words.edited`
- `transcript_utterances.text`
- inserts one append-only `transcript_audit_log` row

Evidence: `supabase/migrations/20260606113000_editor_api_working_rpc.sql:61-77`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:79-81`, `supabase/migrations/20260606113000_editor_api_working_rpc.sql:83-125`.

It does **not** update `raw_text`, `start_time`, `end_time`, or `word_id`.

**Determination: PASS** on Layer-1 integrity.

### ASSUMED vs ACTUAL

- Assumed in the design language: save writes only `working_text`/working fields.
- Actual: the live RPC also updates `transcript_words.text` and `transcript_utterances.text` while preserving `raw_text` and timing fields.

## Probe F — Export Reality

`src/components/ExportScreen/ExportScreen.tsx` builds a local JSON package from text only:

- serializes each utterance as `${utterance.utterance_id} [${utterance.speaker_id}]: ${words}` at `src/components/ExportScreen/ExportScreen.tsx:49-60`
- emits package fields `job_id`, `case_name`, `case_number`, `generated_at`, `transcript_text`, `word_count` at `src/components/ExportScreen/ExportScreen.tsx:62-76`
- explicitly states `DOCX: not implemented in this local remediation pass` at `src/components/ExportScreen/ExportScreen.tsx:159-164`

**Determination:** timing is omitted because this export is a text-only convenience package, not because timing data is unavailable in the DB.

## Probe G — Confidence & Flagging Data

Low-confidence support is live:

- threshold constant `CONFIDENCE_THRESHOLD = 0.70` at `src/extensions/ConfidencePlugin.ts:6`
- plugin extracts `word_id`, `utterance_id`, `start_time`, `end_time`, `confidence` from `wordMark` attrs at `src/extensions/ConfidencePlugin.ts:38-56`
- words below threshold are pushed into the review queue at `src/extensions/ConfidencePlugin.ts:49-56`
- the panel seeks audio using the stored `start_time` at `src/components/ConfidencePanel/ConfidencePanel.tsx:56-72`

**Determination: PRESENT / PASS.**

## Probe H — Audit Log Durability

Ingest writes an audit row at `supabase/functions/transcribe-callback/index.ts:312-389`.

Working edits append audit rows in the RPC at `supabase/migrations/20260606113000_editor_api_working_rpc.sql:83-125`.

The client-side persistence helper also writes rows to `transcript_audit_log` at `src/api/workspaceService.ts:268-281`.

For the chosen transcript:

```sql
SELECT action, count(*)
FROM public.transcript_audit_log
WHERE transcript_id = 'tr_1782164554896_cra5eh'
GROUP BY action
ORDER BY action;
```

Result:

```text
ingest|1
```

This transcript has not yet accumulated user edit rows, but the insert path exists and the ingest row is present.

**Determination: PASS.**

## Probe I — Deepgram Source Reality

### Preserved raw object path

```sql
SELECT transcript_id, speaker_map_confirmed, raw_storage_path, deepgram_request_id
FROM public.transcripts
WHERE transcript_id = 'tr_1782164554896_cra5eh';
```

Result:

```text
tr_1782164554896_cra5eh|f|76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260622_x416k5/transcription/81c0f534-a501-4734-98d0-f11730de3821_deepgram_response.json|019ef149-0853-7b60-b324-c15017a79181
```

```sql
SELECT bucket_id, name
FROM storage.objects
WHERE name = '76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260622_x416k5/transcription/81c0f534-a501-4734-98d0-f11730de3821_deepgram_response.json';
```

Result:

```text
case-files|76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260622_x416k5/transcription/81c0f534-a501-4734-98d0-f11730de3821_deepgram_response.json
```

The callback stores the raw JSON artifact before ingest and writes its path into the transcript row at `supabase/functions/transcribe-callback/index.ts:98-108`, `supabase/functions/transcribe-callback/index.ts:219-239`, `supabase/functions/transcribe-callback/index.ts:312-339`.

### Why direct retrieval could not be proven here

```sql
SELECT id, name, public
FROM storage.buckets
WHERE id = 'case-files';
```

Result:

```text
case-files|case-files|f
```

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
```

Result:

```text
case_files_bucket_insert_owner|INSERT|
case_files_bucket_select_owner|SELECT|((bucket_id = 'case-files'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)))
case_files_bucket_update_owner|UPDATE|((bucket_id = 'case-files'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)))
```

That policy means the raw response object is preserved but not anonymously readable from this shell session.

### What is still provable

Canonical row counts reconcile to the chosen transcript:

```sql
SELECT count(*) AS utterance_rows
FROM public.transcript_utterances
WHERE transcript_id = 'tr_1782164554896_cra5eh';
```

```text
1062
```

```sql
SELECT count(DISTINCT speaker_index) AS speaker_clusters
FROM public.transcript_words
WHERE transcript_id = 'tr_1782164554896_cra5eh';
```

```text
3
```

```sql
SELECT count(*) AS speaker_rows
FROM public.transcript_speakers
WHERE transcript_id = 'tr_1782164554896_cra5eh';
```

```text
3
```

Deepgram request flags are explicitly enabled in code:

- `model: "nova-3"` `src/lib/deepgram/buildDeepgramRequest.ts:48-49`
- `punctuate`, `paragraphs`, `diarize`, `filler_words`, `utterances`, `smart_format`, `mip_opt_out` at `src/lib/deepgram/buildDeepgramRequest.ts:50-56`

Normalization preserves utterances, words, speakers, confidence, and timing:

- `word_id`, `raw_text`, `speaker_id`, `start_time`, `end_time`, `confidence` at `src/lib/transcript/normalize.ts:149-158`
- `utterance_id`, `speaker_id`, `start_time`, `end_time`, `text`, `avg_confidence` at `src/lib/transcript/normalize.ts:176-184`
- speaker rows with unresolved identity defaults at `src/lib/transcript/normalize.ts:191-194`

**Determination: PARTIAL.** Raw source preservation is real; byte-level retrieval for this specific private object was not provable read-only in this session.

## Probe J — Current Formatting Authorities

| Function / module | Responsibility | Location | Duplicated? |
|---|---|---|---|
| `segmentUtterance()` | Display-layer turn grouping | `src/lib/format/grouping.ts:3-79` | N |
| `buildEditorContent()` | Builds TipTap utterance blocks, word marks, page breaks, speaker attrs | `src/lib/buildEditorContent.ts:154-210` | Y |
| `buildPages()` / `estimateLineCount()` | Pagination and geometry estimates | `src/editor/pagination.ts:14-74` | Y |
| `getUtterancePrefix()` / `abbreviateUtteranceLabel()` | Q/A prefix and colloquy label abbreviation | `src/editor/utteranceRender.ts:4-23` | Y |
| `UtteranceNode.renderHTML()` | Renders line number, prefix, utterance block HTML | `src/extensions/UtteranceNode.ts:33-95` | Y |
| `extractUtteranceTextsFromDoc()` / `reassembleUtteranceTexts()` | Reassembly from split display fragments | `src/lib/format/editorFragments.ts:35-60` | N |
| `getActiveUtteranceInfoFromDoc()` | Multi-segment active-utterance logic for Speaker panel | `src/lib/format/editorFragments.ts:62-87` | N |
| `ExportScreen.transcriptText` | Separate export/package serialization | `src/components/ExportScreen/ExportScreen.tsx:49-76` | Y |

**Determination:** grouping is centralized post-`770e386` in `src/lib/format/grouping.ts`, but formatting/serialization still does **not** live in exactly one place.

## Probe K — AI Structuring Readiness

### Present

- `word_id` is preserved end to end in contract, DB, and load path: `src/api/types.ts:8`, `src/api/workspaceService.ts:107`, `supabase/functions/editor-api/index.ts:357`.
- `utterance_id` is preserved end to end: `src/api/types.ts:21`, `src/api/workspaceService.ts:98`, `supabase/functions/editor-api/index.ts:361`.
- Raw Deepgram object preservation is present by storage path/object metadata (Probe I).

### Missing

- No paragraph/format overlay table exists today. The only live overlay-style table I found is `speaker_resolution_current`. `speaker_resolution_history` is referenced in older design notes but is not implemented in shipped migrations.

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('speaker_resolution_current','speaker_resolution_history')
ORDER BY table_name;
```

Result:

```text
speaker_resolution_current
```

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='speaker_resolution_current'
ORDER BY ordinal_position;
```

Result:

```text
id|uuid
transcript_id|text
speaker_id|text
proposed_display_name|text
proposed_role|text
confidence|numeric
evidence|text
authority|text
ai_suggested|boolean
verified|boolean
created_at|timestamp with time zone
updated_at|timestamp with time zone
```

`speaker_resolution_history` remains a design-note concept only. It is not present in the live schema and should be treated as not implemented unless a future numbered migration adds it.

There is no equivalent paragraph-boundary overlay for future AI structuring proposals. That would be a **net-new schema decision**, not something already available.

**Determination: FAIL** for AI structuring readiness as phrased in the prompt.

## Probe L — Canonical Decision Compliance Matrix

| Decision | Compliant? | Violation location | Notes |
|---|---|---|---|
| DP-001 / DP-002 family: may not invent speech | PARTIAL | No active violation found in load/save/render paths inspected | I found no evidence that the active editor/export paths synthesize new Layer-1 words. |
| DP-003: identity may be inferred but not silently applied | PASS | No active violation found | Normalization seeds generic `Speaker N` labels and null assignment, not silent real-name identity inference: `src/lib/transcript/normalize.ts:191-194`. |
| DP-009 / DP-010: spacing authority | FAIL | `src/lib/buildEditorContent.ts:50-79`, `src/components/ExportScreen/ExportScreen.tsx:49-76` | Current renderer/export joins words with single spaces and does not consume `abbreviation_registry.json`; `rg -n "abbreviation_registry" src supabase reference` returned no imports. |
| DP-011: geometry as injected config | FAIL | `src/editor/pagination.ts:14-16`, `src/editor/pagination.ts:33-74` | Pagination constants are hardcoded (`LINES_PER_PAGE`, `CHARS_PER_LINE`, `AVG_CHARS_PER_WORD`) rather than coming from an injected profile. |
| DP-012: punctuation placement; garbles flagged never rewritten | PARTIAL | No active flagged-token rewrite path found | I found no runtime garble-flag engine in the active Workspace/export path, so there is no proven violation, but the standard is not implemented. |

## Probe M — Transcript Fidelity Backlog Coverage

`TRANSCRIPT_FIDELITY_BACKLOG.md` is absent from the working tree. I used `docs/audits/ERROR_COVERAGE_MATRIX.md` and the canonical changelogs as the fallback catalog.

| Backlog item / error class | Rule exists? | Engine/code exists? |
|---|---|---|
| Spacing / abbreviation boundary errors | Y | Partial |
| Q/A vs colloquy formatting | Y | Partial |
| Speaker-label formatting | Y | Partial |
| Garble handling must flag, not rewrite | Y | Partial |
| Hard paragraph breaks inside testimony | Partial | N |

The unresolved gap still called out in `docs/audits/ERROR_COVERAGE_MATRIX.md` is the lack of a paragraph-boundary entity for intra-testimony hard breaks.

## Probe N — Representation Unification

- Workspace preview consumes `EditorDocument` via `buildEditorContent()` at `src/components/TranscriptEditor/TranscriptEditor.tsx:102-104`.
- Grouping authority is unified in `src/lib/format/grouping.ts:3-79`.
- Export/package output does **not** consume the same representation; it separately serializes raw utterance text at `src/components/ExportScreen/ExportScreen.tsx:49-76`.

**Determination: PARTIAL / DRIFTED.** Workspace grouping is unified, but export/package remains a parallel representation path.

## Probe O — CFE Readiness Verdict

- **Can Phase 1 begin?** **PASS**
- **Any schema changes required for Phase 1?** **NO**
- **Any unresolved standards / active DP violations?** **YES**
- **Any blocking data gaps from Probe B or I?** **NO** for Phase 1 CFE; **YES/PARTIAL** for future AI-structuring work that needs direct raw-object analysis
- **Recommended next action:** **BUILD CFE PHASE 1**

Justification:

1. The data foundation the CFE depends on is present: per-word timing is real (Probe B), audio linkage is real (Probe C), and Layer-1 identity/timing survives round-trip (Probe E).
2. The remaining issues are code-authority unification and standards-compliance problems (Probes J, L, N), which is exactly what CFE Phase 1 is intended to fix without schema changes.

## ASSUMED vs ACTUAL

1. **Assumed:** `DEPO_PRO_DATABASE_SCHEMA.md` is available for comparison.  
   **Actual:** file not present in the working tree; only citations to it exist in docs.
2. **Assumed:** save path writes only working fields.  
   **Actual:** the live RPC also updates `transcript_words.text` and `transcript_utterances.text`, while preserving `raw_text`, `word_id`, and timing fields.
3. **Assumed:** one unified formatting path already exists post-grouping unification.  
   **Actual:** grouping is unified, but formatting and export serialization remain spread across multiple modules.
4. **Assumed:** raw Deepgram response can be directly audited from the live object store in a read-only shell session.  
   **Actual:** preservation is provable, but direct retrieval is blocked by private storage policy in this session.

## Blocking Risks (ranked)

1. **Private raw-response accessibility gap for audit/AI work.** Raw Deepgram response is preserved, but direct retrieval is not universally available read-only. That is not a Phase 1 CFE blocker, but it is a real blocker for deeper upstream-forensics and future AI-structuring verification.
2. **Parallel formatting authorities remain live.** `buildEditorContent`, `pagination`, `utteranceRender`, `UtteranceNode`, and `ExportScreen` still split responsibility, which is the exact drift risk the CFE is meant to eliminate.
3. **Standards-compliance gaps are still runtime-real.** Spacing and geometry remain hardcoded/non-canonical in the active renderer/export path.
4. **No paragraph overlay for future AI proposals.** Any future non-mutating paragraph regroup/overlay remains a net-new schema decision.

## What Could Not Be Determined Read-Only

1. **Exact raw Deepgram field counts and samples from the preserved private object** for `tr_1782164554896_cra5eh`.  
   Needed access: authenticated storage download rights for the object path under `case-files`, or a service-mediated read endpoint that returns the preserved JSON without exposing secrets.
2. **Comparison to `DEPO_PRO_DATABASE_SCHEMA.md`.**  
   Needed access: the missing document must exist in the working tree or canonical corpus.
