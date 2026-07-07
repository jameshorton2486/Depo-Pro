# Duplicate Opening Audit — 2026-07-06

Scope: read-only audit of transcript job `d712e806-b75d-45e6-b697-f984882d4235` / transcript `tr_1783355404197_y71d97`.

Branch context: `feature/stage3-workspace-core` with `BETA_FREEZE` active.

Result: the originally suspected root cause for this specific job is **not confirmed**. The evidence does **not** show a virtual-chunk overlap duplicate persisting in `transcript_words`. Instead, it shows a canonical-layer inconsistency where `transcript_utterances.text` contains a duplicated opening span that is not present in the canonical word rows for the same utterance/timespan.

## A. Confirmed Root Cause

### Conclusion

For `tr_1783355404197_y71d97`, the duplicate opening is persisted in `public.transcript_utterances.text`, not in the canonical timed word layer. The local overlap-dedup logic in `src/lib/transcript/multifileMerge.ts` was not the active code path for this transcript because this job finalized as a **single-source** transcript, not a virtual-chunk multifile merge.

### Evidence

#### 1. Source shape for the target job

Live `transcription_jobs` row:

```sql
select id, transcript_id, case_id, status, source_index, source_audio_id, request_path, response_path, created_at
from transcription_jobs
where id = 'd712e806-b75d-45e6-b697-f984882d4235';
```

Returned:

- `status = complete`
- `source_index = 0`
- `request_path = .../d712e806-b75d-45e6-b697-f984882d4235_deepgram_request.json`
- `response_path = .../d712e806-b75d-45e6-b697-f984882d4235_deepgram_response.json`

Live `transcripts` row:

```sql
select transcript_id, job_id, source_filename, based_on, media_url, raw_storage_path, duration_seconds, word_count, utterance_count
from transcripts
where transcript_id = 'tr_1783355404197_y71d97';
```

Returned:

- `raw_storage_path = .../d712e806-b75d-45e6-b697-f984882d4235_deepgram_response.json`
- `duration_seconds = 4993.968`
- `word_count = 12275`
- `utterance_count = 1179`

The decisive point is the artifact naming:

- Single-source jobs use `*_deepgram_request.json` / `*_deepgram_response.json`
- Multifile jobs use `*_file_###_deepgram_request.json` per chunk and finalize to `*_multifile_manifest.json`

That naming comes from [transcriptionJobs.ts](/C:/Users/james/projects/depo-pro/src/lib/transcriptionJobs.ts:58) and the finalize branch in [transcribe-callback/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-callback/index.ts:188).

This target job finalized to a single raw response artifact, not a multifile manifest.

#### 2. The duplicate is in canonical `transcript_utterances.text`

Opening utterances:

```sql
select utterance_index, utterance_id, speaker_id, speaker_label, start_time, end_time, char_length(text) as text_len, text
from transcript_utterances
where transcript_id = 'tr_1783355404197_y71d97' and start_time < 17
order by utterance_index;
```

Key rows:

- `utt_000000`, `0.00 - 0.96`, text:
  `Good afternoon. We are on the record. Today's date is April 24, 2026, and the time is now 1:27 p.m. This is the beginning of the deposition of Dr. Mohammad Etminan, M.D. Will the court reporter please swear in the witness?`
- `utt_000001`, `1.20 - 5.84`, text:
  `We are on the record. Today's date is 04/24/2026,`
- `utt_000002`, `5.84 - 8.40`, text:
  `and the time is now 01:27PM.`
- `utt_000003`, `8.80 - 12.40`, text:
  `This is the beginning of the deposition of doctor Mohammad`
- `utt_000004`, `12.40 - 13.44`, text:
  `Etminan,`
- `utt_000005`, `13.44 - 16.41`, text:
  `M. D. Will the court reporter be swearing the witness?`

This is the duplicated opening span the screenshot described, with the wording drift:

- earlier copy: `please swear in the witness`
- later copy: `be swearing the witness`

#### 3. The duplicate is **not** in canonical `transcript_words`

Opening words:

```sql
select word_index, word_id, utterance_id, start_time, end_time, raw_text
from transcript_words
where transcript_id = 'tr_1783355404197_y71d97' and start_time < 17
order by start_time, word_index;
```

The first 39 words are:

- `w_00000000` `utt_000000` `0.00-0.32` `Good`
- `w_00000001` `utt_000000` `0.32-0.96` `afternoon.`
- then at `1.20s` the opening begins once:
  - `We`
  - `are`
  - `on`
  - `the`
  - `record.`
  - `Today's`
  - `date`
  - `is`
  - `04/24/2026,`
  - `and the time is now 01:27PM.`
  - `This is the beginning of the deposition of doctor Mohammad Etminan, M. D.`
  - `Will the court reporter be swearing the witness?`

There is no earlier canonical word copy of `We are on the record ...` at `0.00-0.96s`.

#### 4. Direct row-level inconsistency inside the canonical layer

```sql
with per_utt as (
  select
    u.utterance_id,
    u.start_time,
    u.end_time,
    u.text as utterance_text,
    string_agg(w.raw_text, ' ' order by w.word_index) as word_text,
    min(w.start_time) as word_start,
    max(w.end_time) as word_end,
    count(w.*) as word_count
  from transcript_utterances u
  left join transcript_words w
    on w.transcript_id = u.transcript_id
   and w.utterance_id = u.utterance_id
  where u.transcript_id = 'tr_1783355404197_y71d97'
  group by u.utterance_id, u.start_time, u.end_time, u.text
)
select *
from per_utt
where utterance_text <> coalesce(word_text, '')
order by start_time asc;
```

Returned:

- `utt_000000`
  - `utterance_text = Good afternoon. We are on the record. ... please swear in the witness?`
  - `word_text = Good afternoon.`
  - `word_start = 0`
  - `word_end = 0.96`
  - `word_count = 2`

That is the canonical inconsistency.

### Interpretation

This transcript contains a mismatch between:

- the canonical utterance text row
- the canonical word rows and timings for the same utterance

The duplicate opening is therefore **not** established as a surviving overlap merge in timed word rows. It is established as bad canonical utterance text.

## B. Which Layer Is Affected

Affected layer for the duplicate itself:

- `public.transcript_utterances.text` is affected

Not affected for this duplicate:

- `public.transcript_words.raw_text`
- `public.transcript_words.start_time/end_time`

Why that matters:

- Stage 3 workspace rebuilds its visible document from `transcript_words`, not from `transcript_utterances.text`, via [workspaceService.ts](/C:/Users/james/projects/depo-pro/src/api/workspaceService.ts:82) and [cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:133).
- `buildTranscriptParagraphs()` operates on the word-backed `EditorDocument` and does not itself invent this duplicate; see [workspacePresentation.ts](/C:/Users/james/projects/depo-pro/src/lib/transcript/workspacePresentation.ts:651).
- The mismatch is still serious because other downstream logic and audits do consume `utterance.text`, and because canonical rows are supposed to be internally coherent.

## C. Why the Originally Suspected Dedup Miss Is Not the Root Cause Here

The overlap-dedup logic in [multifileMerge.ts](/C:/Users/james/projects/depo-pro/src/lib/transcript/multifileMerge.ts:195) is:

```ts
existing.raw_text.toLowerCase() === candidate.raw_text.toLowerCase()
&& Math.abs(existing.start_time - candidate.start_time) <= matchToleranceSeconds
&& Math.abs(existing.end_time - candidate.end_time) <= matchToleranceSeconds
```

and `matchToleranceSeconds = 0.35`.

That exact-match rule is genuinely too strict for wording drift across chunk overlaps. If two chunk copies say:

- `please swear in the witness`
- `be swearing the witness`

then a word-level exact-text dedup would miss them.

However, for this target job that logic was not active because:

- `segments.length === 1` for the finalized artifact shape
- the code path is `mergeSingleTranscript(segment)`, not `mergeVirtualChunkTranscriptSegments(segments)`

See [multifileMerge.ts](/C:/Users/james/projects/depo-pro/src/lib/transcript/multifileMerge.ts:282).

So:

- the hypothesis is valid as a future risk for true multifile jobs
- it is **not** the confirmed root cause for `d712e806-b75d-45e6-b697-f984882d4235`

## D. Blast Radius

### 1. This job

For this transcript, the issue is not “how many overlap spans survived dedup” because the target job did not finalize as multifile. The measurable blast radius inside this transcript is:

- `1` utterance/text mismatch in the opening span
- generic diarization labels on all speakers

### 2. Other completed jobs with the same canonical symptom

A read-only scan for completed transcripts where `transcript_utterances.text` does not equal the joined `transcript_words.raw_text` for the same `utterance_id` found at least these jobs:

- `5496fce4-6bc9-4462-9921-7cbf5e499d43` / `tr_1782583748231_9hix48`
- `b22884ec-e0b3-44b4-b505-55b89a59ab49` / `tr_1781718945317_sookpn`
- `92386e54-0a4f-4051-ad93-b43c2593e7de` / `tr_1782416371617_kdqt6v`
- `4a269d3c-0b23-4973-baa7-904605fc7015` / `tr_1782942149028_vsbixg`
- `22164f2e-9bda-4d32-8b29-7bf37eb7419b` / `tr_1782265736832_d7z4du`
- `d712e806-b75d-45e6-b697-f984882d4235` / `tr_1783355404197_y71d97`
- `57374355-e1bc-4e96-839d-3ed61e50d2ce` / `tr_1782745273651_e0w7tv`
- `475e2143-ff39-4060-8d75-db8559431a0f` / `tr_1781997360020_glu2tx`

This confirms the symptom is not isolated.

### 3. Long-audio auto-chunking inconsistency

Another live finding: many completed transcripts with `case_audio.duration_seconds > 4500` still finalized to single-response artifacts rather than multifile manifests, even though [transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:225) should auto-chunk those jobs.

Examples:

- single-response despite `4993.968s`:
  - `d712e806-b75d-45e6-b697-f984882d4235`
  - `a63f3f89-eca1-42b3-8523-8c4d7a7827c9`
  - `943e1c67-1856-4f82-bd14-24161b1c5796`
  - `57374355-e1bc-4e96-839d-3ed61e50d2ce`
  - several others
- true multifile examples at `8837.952s`:
  - `0e4a35e8-be73-4053-b626-33668b8a4f7c`
  - `420ca583-62cc-47f0-9051-88788f8faad9`
  - `9145611a-1a85-48d6-ba49-d7a1498c54a5`
  - `715522b4-7e53-4cc9-aa37-6202fcabac53`

That suggests a second, separate audit target:

- why some >4500s files still run as single-source

## E. Secondary Observations

### Audio unavailable

The audio object for this transcript exists in storage:

```sql
select bucket_id, name, owner, metadata
from storage.objects
where name = '76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260706_2xh5gv/audio/f_1783355076768_kxsq_Dr_Entiminan_Audio.mp3';
```

Returned metadata includes:

- `mimetype = audio/mpeg`
- `size = 79903488`
- `httpStatusCode = 200`

So the file is present in storage. The visible `Audio unavailable` symptom is therefore more likely in the signed-URL/load path than in missing storage content. I did not modify or further probe the runtime load path in this audit.

### Generic speaker labels

`transcript_speakers` for this transcript are all generic:

- `spk_000` / `Speaker 0`
- `spk_001` / `Speaker 1`
- `spk_002` / `Speaker 2`

No `role` or `speaker_role` values are set.

## Proposed Fix Options

These are separated into the actually evidenced defect and the originally suspected overlap risk.

### Option 1. Canonical utterance text should be regenerated from words at ingest/finalize

Idea:

- stop trusting external utterance transcript strings for persisted canonical `transcript_utterances.text`
- derive `utterance.text` from the exact canonical word rows assigned to that utterance

Why:

- guarantees `transcript_utterances.text` and `transcript_words` stay coherent
- directly prevents the target defect class

Risk:

- low risk to timed layer
- no word timings or word identities need to change
- only the denormalized utterance text field changes

Tradeoff:

- if you currently rely on Deepgram’s original utterance transcript punctuation differing from token punctuation, that difference would be lost
- but the canonical contract is more defensible if utterance text is just a deterministic projection of canonical words

### Option 2. Add an integrity gate before ingest/finalize

Idea:

- before inserting canonical rows, verify for every utterance that:
  - `utterance.text`
  - joined canonical word text
  - utterance start/end window
  are mutually coherent

On mismatch:

- fail or route to manual review instead of ingesting inconsistent canonical rows

Risk:

- medium operational risk
- may increase failed/manual-review jobs until the upstream cause is fixed

Tradeoff:

- strongest protection against corrupt canonical rows
- but can block transcription throughput

### Option 3. Audit and fix long-audio auto-chunk dispatch separately

Idea:

- investigate why many `duration_seconds > 4500` jobs still produce single-response artifacts instead of chunk manifests

Risk:

- separate from the target defect
- moderate pipeline risk because it touches job submission shape

Tradeoff:

- important for very long files and for preventing true overlap risks
- but not sufficient to fix the target job’s canonical mismatch

### Option 4. For true multifile jobs, strengthen overlap dedup from exact-text to fuzzy-text

Idea:

- only in the virtual-chunk merge path, dedup candidate words/spans by:
  - overlap window
  - timing proximity
  - high text similarity, not exact equality
  - choose the higher-confidence copy

Risk:

- highest risk to timed layer of the options here
- if too aggressive, could collapse legitimately repeated words or testimony

Tradeoff:

- appropriate for real multifile overlap cleanup
- but should not be bundled with the canonical utterance-text fix because the target job does not prove this path is at fault

## Regression Tests To Add Before Any Fix

### Seed tests for the confirmed defect

1. A normalized transcript where an utterance’s `transcript` string contains more text than its assigned words.
   Expected:
   canonical `utterance.text` must equal joined canonical words, not the oversized transcript string.

2. A transcript where the first utterance row would otherwise be:
   - words: `Good afternoon.`
   - utterance text: `Good afternoon. We are on the record ...`
   Expected:
   persisted `utterance.text` becomes `Good afternoon.`

3. An integrity test that rejects or flags any finalized transcript where:
   - `transcript_utterances.text != string_agg(transcript_words.raw_text by word_index)`

### Seed tests for the originally suspected overlap risk

Use the exact divergent wording pair from this case as the fixture shape, but in a true virtual-chunk scenario:

1. Chunk A overlap phrase:
   `Will the court reporter please swear in the witness?`
2. Chunk B overlap phrase:
   `Will the court reporter be swearing the witness?`

Expected:

- current exact-match dedup does not collapse them
- proposed fuzzy dedup behavior is explicitly tested and gated

This should be a separate test suite from the canonical utterance-text consistency tests.

## Existing Finalized Data

Cleaning already-finalized transcripts is a separate decision.

Recommendation:

- do not bundle runtime prevention and historical cleanup
- decide separately whether to backfill only `transcript_utterances.text`, or to leave historical transcripts untouched and only prevent new corruption

Because the timed word layer appears intact for the target job, any historical cleanup should be narrowly scoped to rebuilding denormalized utterance text from canonical words, not rewriting word rows.

## Final Statement

For `d712e806-b75d-45e6-b697-f984882d4235`, I **refute** the hypothesis that a virtual-chunk overlap duplicate surviving `multifileMerge.ts` is the confirmed root cause. The confirmed defect is a canonical inconsistency in `transcript_utterances.text`, while the canonical timed word layer for the opening span does not contain the duplicate.

No code, schema, or data changes were made in this audit pass.
