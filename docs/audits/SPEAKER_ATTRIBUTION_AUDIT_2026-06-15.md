# SPEAKER_ATTRIBUTION_AUDIT

## AUDIT GATE

Passed.

Selected transcript:

- Transcript ID: `tr_1781456706021_4bdiwu`
- Case ID: `case_20260614_esoh81`
- Source audio: `audio1728584021 (4).m4a`
- Completed transcription job: `9f334fe3-933e-44c5-91a4-26386cdf5769`
- Raw Deepgram response path:
  `76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260614_esoh81/transcription/9f334fe3-933e-44c5-91a4-26386cdf5769_deepgram_response.json`
- Committed audit fixture:
  `docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json`

Gate evidence:

- `transcripts.status = 'completed'`
- `transcripts.transcription_source = 'deepgram'`
- `storage.objects` contains the raw response object at the path above
- raw response was retrieved successfully with:
  `supabase --experimental storage cp ss:///case-files/.../.json docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json`

## Provenance Contamination Check

The selected transcript is partially provenance-contaminated at the stored speaker-label level, but the original raw Deepgram source remains available, so the audit can continue.

Observed live state:

- `speaker_resolution_current`: `0` rows
- `speaker_resolution_history`: `0` rows
- `transcript_audit_log`: only `ingest/system` and `bulk_save/editor` entries
- `transcript_speakers` already contains post-ingest labels/roles for some raw speakers:
  - `spk_000 -> THE REPORTER: / reporter`
  - `spk_001 -> MR. THOMAS`
  - `spk_002 -> MR. NUNEZ / attorney`

Interpretation:

- Raw speaker provenance in `transcript_speakers.assigned_name` / `speaker_role` is contaminated.
- The contamination did **not** come from the current Step 3 overlay path, because overlay tables are empty.
- The most likely modification path is the legacy pre-Step-3 raw speaker write path previously implemented in:
  - `src/api/workspaceService.ts: persistSpeakers`
  - `supabase/functions/editor-api/index.ts: handlePutSpeakers`

Confidence:

- Proven: raw speaker rows are already labeled while overlay rows are absent.
- Inference: those labels were written by the legacy raw speaker-mapping path rather than by the current overlay path.

## Goal

Determine exactly where speaker attribution is lost, merged, or degraded in the current pipeline.

## Scope

Read-only audit.

No code changes, schema changes, config changes, or implementation work.

Trace:

`Deepgram JSON -> normalization/ingestion -> transcript tables -> workspace load -> workspace rendering`

## Required Answers

### 1. How many distinct speakers Deepgram identified in the source JSON?

`8`

Evidence:

- Raw Deepgram `results.channels[0].alternatives[0].words[*].speaker` contains `{0,1,2,3,4,5,6,7}`
- Raw Deepgram `results.utterances[*].speaker` contains `{0,1,2,3,4,5,6,7}`

### 2. Do diarization speaker IDs / indices survive normalization and ingestion unchanged?

Mostly yes, with transformation but not immediate loss.

What survives:

- Raw Deepgram numeric `speaker` survives as:
  - normalized `speaker_index` in `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`
  - synthetic `speaker_id = spk_NNN` in the same symbol
  - persisted `transcript_speakers.speaker_index`
  - persisted `transcript_utterances.speaker_index`
  - persisted `transcript_words.speaker_index`

What changes:

- Numeric speakers are transformed into synthetic IDs via `speakerIdForIndex` in `src/lib/transcript/normalize.ts`
- Speaker labels are synthesized as `Speaker N` in `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`

Conclusion:

- Speaker identity is transformed, not dropped, at normalization time.
- Attribution fidelity degrades later because a **single utterance speaker** becomes authoritative even when the same utterance contains multiple word-level speakers.

### 3. Are utterances merged, split, or reassigned during assembly or persistence?

Yes. The system preserves Deepgram utterance boundaries, but assigns **one canonical speaker per utterance** even when a Deepgram utterance contains words from multiple speakers.

Key evidence:

- Raw Deepgram utterances: `1968`
- Raw Deepgram words: `13954`
- Mixed-speaker Deepgram utterances: `114`
- Persisted mixed-speaker utterances in DB words grouped by `utterance_id`: `114`

Examples from the real transcript:

- `utt_000001`
  - stored utterance speaker: `spk_000`
  - word speaker set: `{spk_000, spk_001}`
  - text: `Good afternoon. How are you? I'm good. How are you? Doing well. Good.`
- `utt_000007`
  - stored utterance speaker: `spk_000`
  - word speaker set: `{spk_000, spk_002}`
- `utt_000031`
  - stored utterance speaker: `spk_002`
  - word speaker set: `{spk_000, spk_002}`

File:symbol responsible:

- `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`

Why:

- `sourceUtterances` is taken from `response.results.utterances` when present
- each normalized utterance gets exactly one `speaker_id` from `utterance.speaker`
- words inside that utterance keep their own `word.speaker`, but are still grouped under the same `utterance_id`

Conclusion:

- Utterances are not re-split by word-level speaker changes.
- This is the first proven fidelity break.

### 4. Does workspace loading or rendering alter, collapse, or mask attribution?

Yes.

Workspace load:

- `src/api/workspaceService.ts: buildEditorDocumentFromSnapshot`
  - loads one `speaker_id` per utterance from `transcript_utterances`
  - preserves word-level `speaker_id` on words

Workspace rendering:

- `src/lib/buildEditorContent.ts: buildEditorContent`
  - uses `doc.utterances[*].speaker_id` to set the block-level `utterance` node attrs
  - uses `doc.speakers` for `speaker_label` and `role`
  - embeds word-level `speaker_id` only inside `wordMark` marks

Effect:

- Per-word attribution still exists in marks
- Block ownership, pagination role, and visible speaker labeling are driven by utterance-level speaker identity
- Therefore mixed-speaker utterances render as single-speaker blocks

### 5. Is existing participant / case metadata sufficient to reconstruct better attribution after ingest?

Partially yes.

Available live case metadata from `cases.payload`:

- Witness names: `["Heath Thomas"]`
- Attorney names: `["Jacob D. Cukjati", "Curtis L. Cukjati", "Steven A. Nunez", "Karen M. Alvarado"]`
- Attorney functions: `["EXAMINING", "EXAMINING", "EXAMINING", "OPPOSING"]`
- Reporter name: `["Miah Bardot"]`

Interpretation:

- Metadata is sufficient to identify likely witness, reporter, and at least one examining attorney
- Metadata alone is **not** sufficient to recover exact per-utterance attribution without combining:
  - transcript ceremonies
  - examination geometry
  - role transitions
  - word/utterance timing

Conclusion:

- Existing metadata is sufficient to support a future reconstruction layer
- It is not sufficient by itself to repair the current fidelity break

### 6. What minimum architecture change would produce the largest attribution improvement with the smallest blast radius?

`Assembly`

Rationale:

- The first proven fidelity break occurs in `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`
- The system currently treats `results.utterances` as canonical and does not split mixed-speaker utterances
- Raw word-level speaker attribution survives and is already in the database
- Therefore the smallest highest-yield change is to fix utterance assembly, not to redesign ingestion, rendering, or Deepgram configuration first

### 7. Is the original Deepgram response preserved intact and retrievable?

Yes.

- Raw response location: Supabase Storage bucket `case-files`
- Storage path:
  `76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260614_esoh81/transcription/9f334fe3-933e-44c5-91a4-26386cdf5769_deepgram_response.json`
- Retrieval path:
  - metadata presence via `storage.objects`
  - object download via Supabase Storage CLI/API
- Preserved intact: yes
- Can attribution be re-derived from raw source today: yes, because the raw object still contains:
  - `results.utterances`
  - `results.channels[0].alternatives[0].words`
  - `word.start`
  - `word.end`
  - `word.speaker`
  - `word.speaker_confidence`

### 8. Does the system treat `results.utterances` or `results.words` as canonical?

`results.utterances`

Exact file:symbol:

- `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`

Decision point:

```ts
const sourceUtterances = response.results.utterances?.length
  ? response.results.utterances
  : buildFallbackUtterances(sourceWords);
```

Impact:

- When Deepgram supplies `results.utterances`, the system uses them as canonical utterance segmentation
- Word-level speaker changes inside those utterances do **not** trigger utterance splitting
- The rest of the pipeline then treats those utterances as authoritative units

## Stage Trace

### 1. Deepgram JSON

- Speaker count: `8`
- Attribution fidelity: `PARTIAL`
- Relevant fields:
  - `results.utterances[*].speaker`
  - `results.utterances[*].start`
  - `results.utterances[*].end`
  - `results.utterances[*].words[*].speaker`
  - `results.utterances[*].words[*].speaker_confidence`
  - `results.channels[0].alternatives[0].words[*]`
- Preserved / transformed / dropped:
  - per-word attribution preserved
  - utterance-level attribution already mixed on `114` utterances
- Evidence:
  - raw object downloaded successfully
  - `114` mixed-speaker utterances in the raw Deepgram response

### 2. Normalization / Ingestion

- Speaker count: `8`
- Attribution fidelity: `PARTIAL`
- Relevant fields:
  - `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`
  - `src/lib/transcript/segmentFinalization.ts: buildSegmentTranscriptBundle`
  - `src/api/transcriptRepository.ts: insertNormalizedTranscript`
- Preserved / transformed / dropped:
  - word-level speaker attribution preserved into normalized words
  - utterance-level speaker attribution transformed into one canonical speaker per utterance
  - speaker labels synthesized as `Speaker N`
- Evidence:
  - raw `8 / 1968 / 13954` counts match stored transcript row exactly
  - `normalizeTranscriptResponse` binds utterance speaker from `utterance.speaker`

### 3. Transcript Tables

- Speaker count: `8`
- Attribution fidelity: `PARTIAL`
- Relevant fields:
  - `transcript_speakers`
  - `transcript_utterances`
  - `transcript_words`
- Preserved / transformed / dropped:
  - per-word speaker survives
  - per-utterance single-speaker ownership survives
  - mixed-speaker utterances remain mixed at the word layer
  - stored speaker labels are partially provenance-contaminated
- Evidence:
  - `transcript_speakers = 8`
  - `distinct utterance speakers = 8`
  - `distinct word speakers = 8`
  - `114` persisted utterances have multiple word-level speakers

### 4. Workspace Load

- Speaker count: `8`
- Attribution fidelity: `PARTIAL`
- Relevant fields:
  - `src/api/transcriptRepository.ts: loadTranscriptSnapshot`
  - `src/api/workspaceService.ts: buildEditorDocumentFromSnapshot`
  - `src/api/workspaceService.ts: loadWorkspaceDocument`
- Preserved / transformed / dropped:
  - words retain `speaker_id`
  - utterances load with one `speaker_id`
  - speaker panel gets `resolvedSpeakers`, but with zero overlay rows this is just raw-equivalent
- Evidence:
  - selected transcript has zero overlay rows
  - Step 3 resolved view is additive, not authoritative for this transcript

### 5. Workspace Rendering

- Speaker count: `8`
- Attribution fidelity: `FAILED`
- Relevant fields:
  - `src/lib/buildEditorContent.ts: buildEditorContent`
  - `src/editor/pagination.ts: getBlockRole`
  - `src/components/SpeakerPanel/SpeakerPanel.tsx: SpeakerPanel`
- Preserved / transformed / dropped:
  - visible block speaker attribution uses utterance-level `speaker_id`
  - per-word attribution is masked inside marks, not used to split or relabel blocks
  - rendering does not create the degradation, but it is the first layer where the degraded ownership becomes user-visible and operational
- Evidence:
  - `buildEditorContent` uses `utt.speaker_id` for block attrs
  - mixed-speaker utterances therefore render as single-speaker blocks

### 6. Raw Deepgram Preservation

- Raw response location: Supabase Storage `case-files`
- Storage path:
  `76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260614_esoh81/transcription/9f334fe3-933e-44c5-91a4-26386cdf5769_deepgram_response.json`
- Retrieval path:
  - `storage.objects`
  - Supabase Storage CLI/API
- Preserved intact: `YES`
- Can attribution be re-derived from the raw source today: `YES`
- Evidence:
  - object exists in storage metadata
  - object downloaded successfully
  - downloaded object contains full word-level attribution and timings

## Speaker Reconciliation Table

Deepgram JSON:

- speaker count = `8`

Normalization:

- speaker count = `8`

Database:

- speaker count = `8`

Workspace:

- speaker count = `8`

Rendered UI:

- speaker count = `8`

Count-change finding:

- Speaker counts remain equal across all stages.
- This does **not** imply attribution fidelity.

## Speaker Reconciliation Rule

Equal speaker counts do **not** imply attribution fidelity.

This transcript is a **RECONCILIATION FAILURE** even though counts remain `8 -> 8 -> 8 -> 8 -> 8`.

Why:

- `114` utterances contain multiple word-level speakers
- the system still assigns one canonical utterance speaker
- block rendering follows that utterance speaker

Exact file:symbol responsible:

- `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`

Classification:

- speaker count: preserved
- speaker identity index: preserved
- utterance ownership: transformed
- some stored labels/roles: historically reassigned
- visible block attribution: inferred from utterance ownership and therefore degraded

## Utterance Authority Question

- Canonical source of truth: `results.utterances`
- Exact file:symbol where that decision occurs:
  - `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`
- How that decision affects attribution fidelity:
  - mixed-speaker Deepgram utterances become single-speaker canonical utterances
  - downstream workspace rendering and pagination operate on those canonical utterances
  - word-level speaker fidelity survives, but no longer controls visible block attribution
- Evidence:
  - `114` mixed-speaker utterances in the raw JSON
  - `114` mixed-speaker utterances preserved in the DB word layer under single utterance IDs

## Field Preservation Matrix

| Field | Source | Destination | Status | Evidence |
|------|--------|-------------|--------|----------|
| `speaker_id` | Deepgram numeric `speaker` | synthetic `spk_NNN` ids | transformed | `src/lib/transcript/normalize.ts: speakerIdForIndex` |
| `speaker_index` | Deepgram `speaker` | normalized + stored `speaker_index` | preserved | `normalizeTranscriptResponse`, `insertNormalizedTranscript` |
| `speaker_label` | none in raw Deepgram | synthesized `Speaker N`, later sometimes contaminated | transformed | `normalizeTranscriptResponse`; live `transcript_speakers` rows |
| `speaker_confidence` | Deepgram word field | not persisted | dropped | present in raw JSON, absent from normalized/stored rows |
| `word.start` | Deepgram word `start` | normalized/stored word `start_time` | preserved | raw JSON and `transcript_words.start_time` |
| `word.end` | Deepgram word `end` | normalized/stored word `end_time` | preserved | raw JSON and `transcript_words.end_time` |
| `word.speaker` | Deepgram word `speaker` | normalized/stored word `speaker_id` / `speaker_index` | preserved | raw JSON and `transcript_words` |
| `utterance.speaker` | Deepgram utterance `speaker` | normalized/stored utterance `speaker_id` / `speaker_index` | preserved but made authoritative | `normalizeTranscriptResponse` |
| `utterance.start` | Deepgram utterance `start` | stored utterance `start_time` | preserved | `normalizeTranscriptResponse`, `transcript_utterances` |
| `utterance.end` | Deepgram utterance `end` | stored utterance `end_time` | preserved | `normalizeTranscriptResponse`, `transcript_utterances` |
| `utterance_id` | synthesized at normalization | stored and reused downstream | transformed | `utteranceIdForIndex` |
| Utterance boundaries | Deepgram `results.utterances` | normalized/stored utterances | preserved, not repaired | `normalizeTranscriptResponse` |
| Raw Deepgram response | Storage object | retrievable audit artifact | preserved | `storage.objects` + successful download |

## Findings

### Proven Facts

- The selected transcript is a real completed Deepgram transcript with a preserved raw response object.
- The raw response contains `8` speakers, `1968` utterances, and `13954` words.
- `114` Deepgram utterances contain mixed word-level speakers.
- The system chooses `results.utterances` as canonical in `src/lib/transcript/normalize.ts: normalizeTranscriptResponse`.
- Those mixed-speaker utterances survive persistence into the DB.
- Workspace rendering uses utterance-level speaker identity for block attribution in `src/lib/buildEditorContent.ts: buildEditorContent`.
- Current overlay tables are empty for this transcript.

### Inferences

- Historical contamination of `transcript_speakers.assigned_name` / `speaker_role` came from the legacy raw speaker-mapping path rather than the current overlay system.
- A future reconstruction layer would likely add value, but it is not the first minimum-change fix because the earliest proven fidelity break is in canonical utterance assembly.

## Minimum-Change Recommendation

The final recommendation chooses exactly one locus:

`Assembly`

### Recommendation

- Primary locus: `Assembly`
- Smallest change:
  - change `src/lib/transcript/normalize.ts: normalizeTranscriptResponse` so that when a Deepgram utterance contains multiple `word.speaker` values, the utterance is split into speaker-homogeneous sub-utterances derived from the word stream instead of preserving the mixed utterance as one canonical block
- Expected attribution gain:
  - immediate repair of the first proven fidelity break
  - direct improvement on at least `114` utterances in this real transcript
  - downstream workspace/render/export attribution improves without requiring a new schema
- Blast radius:
  - limited to normalization / canonical utterance assembly
  - `transcript_words` model already preserves the required source data
- Why this is the minimum useful change:
  - Deepgram word-level speaker data already exists
  - the DB already stores it
  - the current degradation comes from choosing mixed utterances as authoritative, not from the absence of per-word attribution
  - this is smaller and better evidenced than starting with Deepgram tuning, rendering-only changes, or a full reconstruction layer

## Bottom Line

The repository evidence does **not** show a primary ingestion-storage failure. It shows an **assembly-layer fidelity break**:

- Deepgram retains enough word-level attribution to do better
- the system preserves that word-level attribution into `transcript_words`
- but canonical utterance ownership is taken from `results.utterances`
- and `114` real utterances in the audited transcript are already mixed at that layer

That is the first exact point where attribution fidelity changes in a way that meaningfully degrades downstream behavior.
