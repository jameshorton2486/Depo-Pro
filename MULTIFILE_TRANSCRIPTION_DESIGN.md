# Multi-file Transcription Design — 2026-06-10

## Scope

Read-only Task 0 audit and design for ordered multi-file deposition transcription and merge.

This document stops at the decision gate. No implementation is performed here.

## Baseline

- Branch observed: `release/stage3-rc`
- `npm run typecheck`: pass
- `npm run test`: pass (`229/229`)
- `git status --short`: not fully clean because `.tmp/` is untracked

That baseline divergence is limited to local untracked temp state; no source-file drift blocked this design pass.

## 0.1 Current single-file path

The current transcription pipeline is explicitly single-source and latest-audio oriented.

### Start path

- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:222) selects the latest `case_audio` row with:
  - `.order("uploaded_at", { ascending: false }).limit(1).maybeSingle()`
- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:74) rejects a second active case job before starting
- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:106) creates exactly one `transcription_jobs` row
- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:123) archives a single request artifact

### Callback / persist path

- [supabase/functions/transcribe-callback/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:190) normalizes one Deepgram response into one canonical stream
- [supabase/functions/transcribe-callback/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:302) inserts one transcript ingest audit row
- [supabase/functions/transcribe-callback/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:318) deletes one transcript set on failure

### UI assumptions

- [src/components/TranscriptCreationScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptCreationScreen.tsx:36) uses `audioRows[0]` only
- [src/api/fileService.ts](/C:/Users/james/projects/depo-pro/src/api/fileService.ts:390) lists audio rows ordered by `uploaded_at desc`

### Important single-file race already present

The callback also reloads audio by latest upload:

- [supabase/functions/transcribe-callback/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:286) calls `loadLatestAudio(...)`
- that function also does `.order("uploaded_at", { ascending: false }).limit(1)`

That means the persisted `based_on`, `source_filename`, and `media_url` are resolved at callback time from the latest case audio row, not from a job-bound source file identity. This is tolerable only under the current single-file/latest-upload assumption and is not safe for multi-file orchestration.

## 0.2 Ordering

### Can order be derived from `uploaded_at`?

No. `uploaded_at` is ingestion time, not deposition sequence.

Why it is insufficient:

- a reporter may upload parts out of sequence
- a reporter may replace/re-upload an earlier segment later
- latest-upload does not mean segment N
- legal transcript ordering must be explicit and reviewable

### Recommendation

Minimal correct approach: **explicit order is required**.

Recommended representation:

- add `source_index` / `sequence_index` on `case_audio`

Why this is the minimal correct place:

- ordering is a property of each source file, not of the merged transcript rows
- `case_audio` already persists one row per uploaded source
- the UI can reorder by updating one integer field instead of rewriting payload blobs

I do **not** recommend deriving order from `uploaded_at` for v1.

## 0.3 Schema decision

### Can the canonical merged transcript fit the existing transcript tables?

Yes, **the final merged canonical transcript can fit the existing `transcripts`, `transcript_utterances`, and `transcript_words` model without adding columns to those tables**, if the merge step does all of the following:

- rebases `start_time` / `end_time` into one continuous absolute timeline
- emits continuous `word_index` / `utterance_index` / `ordinal`
- re-derives globally unique `word_id` / `utterance_id`
- namespaces `speaker_id` per source file so speakers never collide

Current contract types already treat these ids as opaque strings, so source-file namespacing can live inside ids without reshaping the API contract.

### But is there still a schema delta required?

Yes. A **minimal orchestration schema delta is required**, even if the canonical merged transcript rows themselves stay in the current shape.

#### Minimal required schema delta

1. `case_audio.source_index integer not null`
   - explicit file order for the case

2. `transcription_jobs.source_audio_id text null`
   - binds an in-flight file transcription to one concrete `case_audio.audio_id`
   - removes the current callback race on “latest uploaded audio”

3. `transcription_jobs.source_index integer null`
   - preserves file order for callback-driven sequencing and audit logs

### Why this is the minimum I would approve

Without `case_audio.source_index`:

- file order is inferred from upload time, which is not legally reliable

Without `transcription_jobs.source_audio_id`:

- callback ingest cannot deterministically know which source audio row the response belongs to
- the current “load latest audio” behavior becomes incorrect the moment a case has more than one audio row

### What I do **not** think is required for v1

I do **not** think `transcript_words` / `transcript_utterances` require new provenance columns for v1 merge correctness, as long as:

- per-file raw request/response JSON is archived separately
- file provenance is encoded into speaker/id namespaces
- merge is deterministic and reproducible

If stronger per-word source provenance is desired later, add:

- `source_audio_id`
- `source_index`
- `source_time_offset`

to utterances/words in a later phase. I do not consider those columns mandatory for the initial merge feature.

## 0.4 Orchestration shape

### Options considered

1. One child `transcription_jobs` row per source file, then a parent merge
2. One parent case-level job that transcribes files sequentially and merges at the end

### Recommendation

Recommend **one parent case-level `transcription_jobs` row**, with sequential per-file requests and a merge step at the end.

### Why this best fits the existing model

- current schema already enforces one active job per case:
  - [supabase/migrations/20260607204500_transcription_jobs.sql](/C:/Users/james/projects/depo-pro/supabase/migrations/20260607204500_transcription_jobs.sql:22)
- Stage 3 already resolves “latest completed transcript for case”
- one parent job preserves the current case-level workflow semantics
- it avoids producing intermediate per-file `transcripts` rows that Stage 3 could mistake for the final transcript

### Where the merge should run

Recommend: **extend `transcribe-callback`**, not a separate merge function.

Shape:

1. `transcribe-start`
   - snapshots the ordered source file list
   - creates one parent `transcription_jobs` row
   - submits file 0 to Deepgram
   - archives a per-file request artifact

2. `transcribe-callback`
   - archives that file’s raw response JSON
   - normalizes that file’s response
   - appends normalized per-file data into a merge manifest artifact
   - if more files remain, submits the next file request
   - if this was the last file, merges the accumulated normalized data and persists the single canonical transcript

This keeps the existing async callback shape and the “single active case job” model intact.

### Why not child jobs first

Child jobs introduce avoidable complexity immediately:

- parent/child linkage
- Stage 3 ambiguity about which `transcript_id` is canonical
- case-level polling now sees multiple jobs with mixed statuses
- merge routing needs a separate “final transcript” identity anyway

## 0.5 Speaker namespacing + UI

### Required v1 rule

Do **not** assume `Speaker 0` in file 2 is the same person as `Speaker 0` in file 1.

### Namespacing recommendation

Namespace speakers by source file at merge time.

Example:

- file 0, Deepgram speaker 0 → `speaker_id = spk_f000_s000`
- file 0, Deepgram speaker 1 → `speaker_id = spk_f000_s001`
- file 1, Deepgram speaker 0 → `speaker_id = spk_f001_s000`

Display labels:

- `File 1 Speaker 0`
- `File 2 Speaker 0`

### Why this works with current UI

- Speaker identities are opaque strings everywhere
- [src/components/SpeakerPanel/SpeakerPanel.tsx](/C:/Users/james/projects/depo-pro/src/components/SpeakerPanel/SpeakerPanel.tsx:254) only badges `deepgram_speaker`
- the panel already edits `display_name` and `role` for each `speaker_id`
- utterance reassignment already works by `speaker_id`

### Reporter mapping flow

1. After merge, Stage 3 opens one canonical transcript
2. SpeakerPanel shows all namespaced speakers
3. Reporter edits labels/roles for each namespaced speaker
4. Reporter may reassign utterances from one namespaced speaker to another using the existing reassignment control
5. No automatic cross-file speaker reconciliation is attempted

### One UI note

The current `SPK {deepgram_speaker}` badge alone will be ambiguous once multiple files exist because several rows may all show `SPK 0`.

v1 UI implication:

- keep the badge
- prepend file context in `display_name` / `speaker_label` until the reporter remaps

## 0.6 Merge algorithm spec

### Inputs

- ordered `case_audio` rows by explicit `source_index`
- one Deepgram response per source file
- one normalized transcript object per source file

### Stored artifacts

For each source file:

- `jobid_fileNN_deepgram_request.json`
- `jobid_fileNN_deepgram_response.json`

Optional merge manifest:

- `jobid_multifile_manifest.json`

### Deterministic merge steps

1. Read the ordered source file list by `source_index`.

2. For each source file in order:
   - submit to Deepgram
   - archive raw request/response JSON separately
   - normalize response into speakers, utterances, words

3. Maintain running accumulators:
   - `timeOffsetSeconds`
   - `globalUtteranceIndex`
   - `globalWordIndex`
   - `speakerNamespaceMap`

4. For each file’s normalized speakers:
   - create namespaced `speaker_id`
   - preserve local `deepgram_speaker` / `speaker_index`
   - set initial `speaker_label` to `File N Speaker M`

5. For each file’s normalized utterances:
   - assign a new global `utterance_id`
   - set `utterance_index` / `ordinal` continuously
   - rebase `start_time` and `end_time` by `timeOffsetSeconds`
   - swap local `speaker_id` for namespaced `speaker_id`

6. For each file’s normalized words:
   - assign a new global `word_id`
   - set `word_index` / `ordinal` continuously
   - rebase `start_time` and `end_time` by `timeOffsetSeconds`
   - swap local `speaker_id` for namespaced `speaker_id`
   - point to the newly assigned global `utterance_id`

7. After finishing a file:
   - increment `timeOffsetSeconds += file.durationSeconds`
   - if `durationSeconds` is null, use a fallback decision from the risk section

8. After the final file:
   - compute merged `duration_seconds = sum(file.durationSeconds)`
   - compute merged `word_count`, `utterance_count`, `speaker_count`, `avg_confidence`
   - insert exactly one canonical `transcripts` row
   - insert the merged `transcript_speakers`
   - insert the merged `transcript_utterances`
   - insert the merged `transcript_words`
   - insert one ingest audit row for the canonical transcript

### Raw JSON rule

Do **not** concatenate raw Deepgram JSON.

Merge only at the normalized speaker/utterance/word layer. Raw request/response JSON stays archived per source file.

## 0.7 Risks / edge cases

### Missing `duration_seconds`

Risk:

- rebasing requires a stable cumulative offset

Recommendation:

- prefer Deepgram `response.metadata.duration` for the just-transcribed file
- if absent, fallback to `case_audio.duration_seconds`
- if both are absent, mark the parent job failed with a clear error rather than guessing offsets

### Failed file mid-set

Recommendation:

- fail the parent job
- preserve all per-file raw artifacts completed so far
- do not persist a partial canonical transcript row

### Mixed sample rates / media types

This design does not decode or preprocess media. Each file is sent as-is to the existing signed-URL Deepgram path. Mixed sample rates are therefore not a merge bug by themselves.

### Re-run after partial merge

Recommendation:

- parent job rerun should create a new canonical `transcript_id`
- do not mutate prior archived per-file raw artifacts
- old partial artifacts remain audit history; canonical tables should only receive the completed rerun result

### Current single-audio Stage 3 playback

This is the most important non-schema risk.

Current Stage 3 assumes exactly one audio stream:

- [src/api/types.ts](/C:/Users/james/projects/depo-pro/src/api/types.ts:38) defines one `media_url: string`
- [src/components/DepoEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/DepoEditor.tsx:68) mounts one `AudioPlayer`
- [src/components/AudioPlayer/AudioPlayer.tsx](/C:/Users/james/projects/depo-pro/src/components/AudioPlayer/AudioPlayer.tsx:25) accepts one `mediaUrl`
- [src/context/AudioContext.tsx](/C:/Users/james/projects/depo-pro/src/context/AudioContext.tsx:10) models one seek/play/pause target

Implication:

- merged transcript timing can be correct
- but Stage 3 audio sync for multi-file cases is **not** fully solved by transcription merge alone

Recommended treatment for v1:

- keep single-file behavior unchanged
- explicitly treat multi-file Stage 3 audio playback as a follow-on UI/player task unless owner approves extending the player to understand ordered source segments

## Decision gate

### Approve / reject required items

The owner needs to approve:

1. **Ordering schema**
   - add `case_audio.source_index`

2. **Job binding schema**
   - add `transcription_jobs.source_audio_id`
   - add `transcription_jobs.source_index`

3. **Orchestration choice**
   - one parent job, sequential file requests, callback-driven merge

4. **Stage 3 limitation / follow-on**
   - canonical merge approved now
   - segmented multi-file audio playback handled as a separate implementation task unless explicitly pulled into scope

## Implementation GO-list for approval

If approved, implement in this order:

1. UI: attach and reorder multiple audio/video files on a case; persist explicit `source_index`; show per-file list and order.
2. Schema: add `case_audio.source_index`, `transcription_jobs.source_audio_id`, and `transcription_jobs.source_index`.
3. Start orchestration: snapshot ordered source files in `transcribe-start`, create one parent job, submit file 0.
4. Callback sequencing: archive per-file raw request/response JSON, normalize each file, continue sequentially until all sources complete.
5. Merge step: rebase timings and ordinals, namespace speakers, create one canonical transcript row set.
6. SpeakerPanel polish: surface namespaced per-file speakers with clear file context for human mapping.
7. Tests: rebasing math, ordinal continuity, namespaced speaker ids, failed-mid-set behavior, and unchanged single-file regression.
8. Optional follow-on if approved: Stage 3 segmented audio player / source-aware playback for merged cases.

## Recommendation

Approve the feature only with the explicit schema delta above and with the understanding that:

- canonical merged transcript persistence can reuse the current transcript tables
- file order cannot safely come from `uploaded_at`
- callback/source-file binding needs durable schema support
- multi-file audio playback in Stage 3 is a separate user-facing scope decision
