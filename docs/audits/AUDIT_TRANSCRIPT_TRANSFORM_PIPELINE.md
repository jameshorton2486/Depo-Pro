# Audit — Transcript Transformation Pipeline

Date: 2026-06-19
Mode: Read-only audit
Audited checkout: `main`

## Gate status

Two acceptance-gate conditions were already unsatisfied before this audit started:

- Requested branch was `feature/stage3-workspace-core`, but the current checkout is `main`.
- `git status --short` was already dirty before the audit:
  - `docs/audits/DECISION_RECORD_corrections_layer_deferral.md`
  - `docs/prompts/speaker-resolution/PROMPT_SPEAKER_RESOLUTION_STEP4_REASSIGNMENT.md`
  - `docs/prompts/speaker-resolution/PROMPT_SPEAKER_RESOLUTION_STEP5_READERS.md`
  - `docs/prompts/speaker-resolution/PROMPT_SPEAKER_RESOLUTION_STEP6_HARDENING.md`

Because of that pre-existing state, acceptance gate 8 cannot be truthfully satisfied from this session without altering user changes.

## Executive summary

- Raw Deepgram callback JSON is persisted in a recoverable form. It is uploaded to Supabase Storage by `supabase/functions/transcribe-callback/index.ts`, tracked first in `transcription_jobs.response_path`, and then copied into `transcripts.raw_storage_path` per segment in `src/lib/transcript/segmentFinalization.ts`.
- The repo does have persisted utterance and word IDs, but they are generated from ordinal position (`utt_000123`, `w_00004567`) inside `src/lib/transcript/normalize.ts`. They are persistent after storage, but they are not source-native stable IDs. If canonical rows are re-derived with different splitting/reordering, IDs can change. This is a **CRITICAL** blocker for a durable Layer-2 `source_utterances` contract across rebuilds.
- The live Workspace does not render paragraph objects. It renders TipTap `JSONContent` built by `src/lib/buildEditorContent.ts` from an `EditorDocument`. Export and clipboard already have a paragraph model with provenance (`TranscriptParagraph.sourceUtteranceIds` / `sourceWordIds`), but the live Workspace does not consume that model.
- Layer separation is only partial. Speaker overlay and paragraph classification are structuring/display-layer logic, but post-ingest editing still mutates canonical rows:
  - word edits update `transcript_words` and `transcript_utterances`
  - speaker reassignment still rewrites `transcript_utterances` / `transcript_words`
  - transcript reassembly deletes and rebuilds canonical speaker/utterance/word rows from preserved raw Deepgram JSON
- A committed real-job raw Deepgram fixture exists at `docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json`. Its `results.utterances` contain 8 distinct Deepgram speaker indices: `0..7`.

## 1. Ingestion entry point and raw persistence

### Entry point

Deepgram results enter through `supabase/functions/transcribe-callback/index.ts`.

Current flow:

1. Callback handler receives the Deepgram payload.
2. `uploadJsonArtifact(...)` writes the full JSON payload to Supabase Storage.
3. The callback stores that storage path in `transcription_jobs.response_path`.
4. Finalization loads each stored raw response back from storage, normalizes it, and writes canonical transcript rows.
5. `buildSegmentTranscriptBundle(...)` copies the raw JSON storage path into `transcripts.raw_storage_path` and the checksum into `transcripts.raw_checksum`.

### Definitive raw-persistence answer

Yes. The full raw Deepgram JSON response is persisted in recoverable form.

Persistence locations:

- Storage object in bucket `case-files`, written by `uploadJsonArtifact(...)` in `supabase/functions/transcribe-callback/index.ts`
- `transcription_jobs.response_path` in `supabase/migrations/20260607204500_transcription_jobs.sql`
- `transcripts.raw_storage_path` and `transcripts.raw_checksum` in `supabase/migrations/20260605222208_transcript_persistence_v2.sql`

Recoverability proof:

- `src/api/workspaceService.ts` has `loadRawDeepgramResponse(...)`
- `supabase/functions/editor-api/index.ts` has `loadRawDeepgramResponse(...)`
- both download the raw JSON from storage and parse it back into `DeepgramResponse`

Conclusion: no CRITICAL finding here. The raw Deepgram packet is preserved well enough for rebuilds and A/B comparison.

## 2. Stable utterance/word identifiers

### Current stored timed-unit shape

Stored utterance row:

```json
{
  "utterance_id": "utt_000123",
  "speaker_id": "spk_002",
  "speaker_index": 2,
  "speaker_label": "Speaker 2",
  "start_time": 12.34,
  "end_time": 13.56,
  "text": "Current utterance text"
}
```

Stored word row:

```json
{
  "word_id": "w_00004567",
  "utterance_id": "utt_000123",
  "speaker_id": "spk_002",
  "speaker_index": 2,
  "raw_text": "uh",
  "text": "uh",
  "working_text": null,
  "start_time": 12.34,
  "end_time": 12.52,
  "confidence": 0.91
}
```

### Stability finding

This is a **CRITICAL** finding.

The repo does store persistent `utterance_id` and `word_id`, but those IDs are generated from ordinal position in `src/lib/transcript/normalize.ts`:

- `utteranceIdForIndex(index) -> utt_${index}`
- `utteranceSegmentIdForIndex(index, segmentIndex) -> utt_${index}_s${segmentIndex}`
- `wordIdForIndex(index) -> w_${index}`

That means:

- IDs survive storage, reload, and normal editing.
- IDs are deterministic for one specific normalization pass.
- IDs are not source-native stable identities.
- If the canonical layer is re-derived with different utterance splitting, ordering, or normalization behavior, the IDs can shift.

So:

- `source_utterances` back-references are constructible against one persisted canonical snapshot.
- They are not durable across re-derivation in the way the target architecture wants.

For a future AI Layer 2, this is the current lynchpin blocker.

## 3. Workspace render input contract

There are two relevant contracts:

### Upstream data contract loaded into Workspace

`EditorDocument` from `src/api/types.ts`:

```ts
type EditorDocument = {
  job_id: string;
  media_url: string;
  duration: number;
  speakers: Speaker[];
  utterances: Utterance[];
  words: Word[];
}
```

This is built by `buildEditorDocumentFromSnapshot(...)` in `src/api/workspaceService.ts`.

### Actual render contract consumed by the live editor

The live Workspace render consumes TipTap `JSONContent` produced by `buildEditorContent(...)` in `src/lib/buildEditorContent.ts`, then passed into `editor.commands.setContent(...)` in `src/components/TranscriptEditor/TranscriptEditor.tsx`.

Exact shape:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "pageBreak",
      "attrs": { "pageNumber": 2 }
    },
    {
      "type": "utterance",
      "attrs": {
        "utterance_id": "utt_000123",
        "speaker_id": "spk_002",
        "speaker_label": "Speaker 2",
        "line_number": 124,
        "page_line_number": 9,
        "start_time": 12.34,
        "role": "ATTORNEY",
        "language": null,
        "display_mode": "Q",
        "display_label": "MR. NUNEZ",
        "display_heading": "EXAMINATION",
        "display_by_line": "BY MR. NUNEZ:"
      },
      "content": [
        {
          "type": "text",
          "text": "Please",
          "marks": [{
            "type": "wordMark",
            "attrs": {
              "word_id": "w_00004567",
              "utterance_id": "utt_000123",
              "speaker_id": "spk_002",
              "start_time": 12.34,
              "end_time": 12.52,
              "confidence": 0.91,
              "reviewed": false
            }
          }]
        },
        { "type": "text", "text": " " }
      ]
    }
  ]
}
```

This is the current render input a future alternative producer would have to match to be a drop-in for the live Workspace.

## 4. Transform inventory

Assumption for disable-impact: "disabled" means replaced with a no-op or bypass, not deleted in a way that would cause import/runtime failure.

| Transform | File + function | Input -> output | What it changes | Layer | Disable: Workspace render? | Disable: word timestamps still map? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Raw callback persistence | `supabase/functions/transcribe-callback/index.ts` `uploadJsonArtifact` + callback handler | Deepgram callback JSON -> storage object + `response_path` | Persists full raw JSON packet; no semantic rewrite | Canonical timed | No | No | Required for all downstream state |
| Raw validation | `supabase/functions/transcribe-callback/index.ts` `parseDeepgramResponse` | unknown -> `DeepgramResponse` | Validates packet shape only | Canonical timed | No | No | Rejects malformed payloads |
| Canonical normalization | `src/lib/transcript/normalize.ts` `normalizeTranscriptResponse` | `DeepgramResponse` -> canonical speakers/utterances/words | Generates IDs, falls back when raw utterances absent, splits mixed-speaker utterances, marks fillers | Canonical timed | No | No | **CRITICAL** ID generation is index-based |
| Mixed-speaker split | `src/lib/transcript/normalize.ts` `splitUtteranceBySpeakerTransitions` | Deepgram utterance -> canonical utterance segments | Splits one raw utterance into multiple canonical utterances when speaker changes inside it | Canonical timed | Partial | Partial | Preserves times, changes utterance boundaries and IDs |
| Fallback utterance synthesis | `src/lib/transcript/normalize.ts` `buildFallbackUtterances` | flat raw word stream -> utterances | Creates utterances when Deepgram `results.utterances` is missing | Canonical timed | Partial | Partial | Not used when raw utterances exist |
| Segment finalization | `src/lib/transcript/segmentFinalization.ts` `buildSegmentTranscriptBundle` | normalized transcript -> DB row bundle | Writes transcript/speaker/utterance/word rows, copies `raw_storage_path`, copies `raw_text` into persisted `text` | Canonical timed | No | No | Persistence adapter |
| Canonical row replacement | `src/lib/transcript/segmentFinalization.ts` `replaceCaseSegmentTranscripts` | bundles -> persisted rows | Deletes old case transcript rows, inserts replacement segment rows | Canonical timed | No | No | Hard replace of persisted canonical rows |
| Snapshot load | `src/api/transcriptRepository.ts` `loadTranscriptSnapshot` | job id -> persisted rows + overlay | Loads canonical rows plus speaker overlay | Canonical timed | No | No | Source of Workspace and export snapshots |
| Workspace document adapter | `src/api/workspaceService.ts` `buildEditorDocumentFromSnapshot` | snapshot -> `EditorDocument` | Drops some persisted fields from live contract; words use `working_text ?? raw_text` as current text | Canonical timed -> render-facing | No | No | Preserves word and utterance timings |
| Speaker overlay resolver | `src/lib/transcript/speakerResolution.ts` `resolveSpeakers` | raw speaker rows + overlay -> resolved participants | Groups raw speaker IDs into participants; overlay wins, raw labels leak on fallback | Structuring/display | Yes | Yes | No timestamp changes |
| Resolved-speaker adapter | `src/lib/transcript/resolvedSpeakers.ts` `buildResolvedSpeakerViews` | resolved participants -> `ResolvedSpeakerView[]` | Adapts participant view to UI contract | Structuring/display | Yes | Yes | Used by panel, Workspace, Stage S export |
| Identity mapping | `src/lib/transcript/speakerIdentity.ts` `buildTranscriptSpeakerIdentityMap` | `EditorDocument` + resolved speakers + case record -> transcript-facing identities | Maps roles to transcript labels like `MR. NUNEZ`, `THE REPORTER`, or unresolved markers | Structuring/display | Partial | Yes | No timestamp changes; can suppress generic raw labels |
| Paragraph classification | `src/lib/transcript/workspaceParagraphs.ts` `buildWorkspaceParagraphs` | `EditorDocument` + resolved speakers + case record -> per-utterance display descriptors | Heuristically classifies utterances into `Q` / `A` / `COLLOQUY` / `PARENTHETICAL`, emits `BY ...:` and `EXAMINATION` markers | Structuring/display | Partial | Yes | No timestamp changes, but can change displayed structure |
| Workspace render adapter | `src/lib/buildEditorContent.ts` `buildEditorContent` | `EditorDocument` + resolved speakers + language map + case record -> TipTap `JSONContent` | Builds page-break and utterance nodes, injects line numbers, display attrs, and `wordMark` timing metadata | Structuring/display | No | No | This is the live render seam |
| Live editor mount | `src/components/TranscriptEditor/TranscriptEditor.tsx` `editor.commands.setContent` | TipTap `JSONContent` -> rendered editor DOM | Pushes the render contract into TipTap | Structuring/display | No | No | Final Workspace render handoff |
| Paragraph model with provenance | `src/lib/transcript/workspaceParagraphs.ts` `buildTranscriptParagraphs` | `EditorDocument` + resolved speakers + case record -> `TranscriptParagraph[]` | Merges adjacent utterances into structural paragraphs; carries `sourceUtteranceIds` and `sourceWordIds` | Structuring/display | Yes | Partial | Not used by live Workspace; used by export/clipboard |
| Display text post-processing | `src/lib/transcript/paragraphDisplayImprovements.ts` `applyParagraphDisplayImprovements` | paragraph text -> normalized display text | Rewrites honorific words, clock-time formatting, and spaced initialisms | Structuring/display | Yes | Partial | Alters display text; provenance remains only by IDs |
| Stage S DOCX path | `src/components/ExportScreen/exportDocx.ts` `buildStageSDocxParagraphSpecs` | export segments + case record -> DOCX paragraph specs | Uses resolved speakers + paragraph model for export | Structuring/display | Yes | Yes for Workspace / Partial for export | Export-only |
| Legacy DOCX path | `src/components/ExportScreen/docxFormatter.ts` `buildTranscriptDocxParagraphSpecs` | `EditorDocument` -> DOCX paragraph specs | Classifies by speaker role only, one utterance -> one DOCX paragraph | Structuring/display | Yes | Yes for Workspace / Partial for export | Export-only legacy path |

## 5. Layer classification and mutation risks

### Canonical timed layer

These operate on timed units carrying `start_time` / `end_time`:

- raw callback persistence
- `normalizeTranscriptResponse`
- `splitUtteranceBySpeakerTransitions`
- `buildFallbackUtterances`
- `buildSegmentTranscriptBundle`
- `replaceCaseSegmentTranscripts`
- `loadTranscriptSnapshot`
- `buildEditorDocumentFromSnapshot`

### Structuring/display layer

These operate on derived labels, paragraph modes, render attrs, or export formatting:

- `resolveSpeakers`
- `buildResolvedSpeakerViews`
- `buildTranscriptSpeakerIdentityMap`
- `buildWorkspaceParagraphs`
- `buildEditorContent`
- `buildTranscriptParagraphs`
- `applyParagraphDisplayImprovements`
- DOCX builders

### Explicit mutation / timestamp / provenance flags

- **Canonical mutation after ingest**
  - `src/api/workspaceService.ts` `naivePersistWorking(...)` updates `transcript_words.working_text`, `transcript_words.text`, and `transcript_utterances.text`
  - `src/api/workspaceService.ts` `persistSpeakers(...)` writes overlay rows but also rewrites `transcript_utterances.speaker_id` / `speaker_label` and `transcript_words.speaker_id` for utterance reassignment
  - `src/api/workspaceService.ts` `applyTranscriptReassembly(...)` + `replaceTranscriptDerivedRows(...)` deletes and rebuilds canonical speaker/utterance/word rows from preserved raw JSON
  - equivalent real-API mutation paths exist in `supabase/functions/editor-api/index.ts`
- **Alters or discards timestamps**
  - the live Workspace render path preserves utterance `start_time` and word-level `start_time` / `end_time`
  - `buildTranscriptParagraphs(...)` and DOCX paragraph specs do not carry timestamps directly; they rely on `sourceWordIds` / `sourceUtteranceIds` for mapping back
- **Produces display text with no direct mapping back**
  - `applyParagraphDisplayImprovements(...)` changes text rendering after paragraph merge, so display text is no longer a literal join of source tokens
  - legacy DOCX path has no paragraph provenance at all beyond utterance ordering

## 6. Speaker resolution detail

### Raw Deepgram speaker mapping today

Raw speaker indices become canonical speaker rows in `normalizeTranscriptResponse(...)`:

- `speaker_index: number`
- `speaker_id: spk_${index}`
- `speaker_label: Speaker ${index}`

Those canonical rows are persisted by `buildSegmentTranscriptBundle(...)` into:

- `transcript_speakers.speaker_id`
- `transcript_speakers.speaker_index`
- `transcript_speakers.speaker_label`
- `transcript_speakers.display_name`

Overlay mapping then works like this:

1. `speaker_resolution_current` is keyed by `transcript_id + raw_speaker_id/raw_speaker_index`
2. `resolveSpeakers(...)` swaps raw label/role for overlay `resolved_label` / `resolved_role`
3. `buildResolvedSpeakerViews(...)` exposes participant-oriented UI rows
4. `buildTranscriptSpeakerIdentityMap(...)` maps those resolved speakers into transcript-facing labels like `MR. NUNEZ`, `THE REPORTER`, or unresolved placeholders

### Raw-label leak points

Raw labels can still leak in these places:

- `buildEditorDocumentFromSnapshot(...)` populates `document.speakers[*].display_name` from `assigned_name || speaker_label || display_name`
- `buildEditorContent(...)` writes raw `speaker_label` into the TipTap utterance node attrs even when `display_label` is separately resolved
- `resolveSpeakers(...)` falls back to raw labels whenever no overlay row exists
- `SpeakerPanel` reassignment UI uses raw `document.speakers` for the active-utterance reassignment options
- legacy DOCX export (`buildTranscriptDocxParagraphSpecs`) uses `EditorDocument.speakers`, not the provenance-carrying paragraph model

### Distinct Deepgram speaker count

A readable persisted real-job raw response exists in the repo:

- `docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json`

Its `results.utterances` contain 8 distinct Deepgram speaker indices:

- `0, 1, 2, 3, 4, 5, 6, 7`

This is organizing speaker data that already exists in raw Deepgram output, not inventing speaker timing from nothing.

## 7. Verbatim handling

### Filler words

`normalizeTranscriptResponse(...)` does not remove filler words. It flags them with `is_filler` via `FILLER_TOKENS` / `isFillerWord(...)`, but still persists them into canonical words.

### Spoken-content alteration

There is one automatic text-altering transform to flag:

- `src/lib/transcript/paragraphDisplayImprovements.ts` `applyParagraphDisplayImprovements(...)`

It rewrites display text by:

- collapsing spaced initialisms
- rewriting `"doctor"` -> `"Dr."`
- rewriting `"mister"` -> `"Mr."`
- normalizing clock times like `"01:31PM"` -> `"1:31 p.m."`

That is not filler removal, but it is an automatic alteration of spoken-content display text. It currently affects the provenance-carrying paragraph model used by export/clipboard, not the live TipTap Workspace path.

## 8. Disable-impact assessment

High-level outcomes:

- Disabling raw persistence, normalization, finalization, snapshot load, or `buildEditorContent` stops Workspace rendering entirely.
- Disabling speaker resolution and paragraph classification does not destroy timestamp mapping, but it degrades labels/roles/QA structure.
- Disabling export-only paragraph/provenance transforms does not stop Workspace rendering, because the live editor still renders utterance-level TipTap blocks.

Most important cases:

- Disable `normalizeTranscriptResponse`: Workspace render = No. Timestamp mapping = No. Canonical rows are never built.
- Disable `buildEditorDocumentFromSnapshot`: Workspace render = No. Timestamp mapping = No. No `EditorDocument`.
- Disable `buildResolvedSpeakerViews` / `buildTranscriptSpeakerIdentityMap`: Workspace render = Yes. Timestamp mapping = Yes. Structure falls back toward raw or unresolved labels.
- Disable `buildWorkspaceParagraphs`: Workspace render = Partial. Timestamp mapping = Yes. Transcript still renders utterance blocks, but all display-mode heuristics collapse.
- Disable `buildEditorContent`: Workspace render = No. Timestamp mapping = No. This is the final render adapter.
- Disable `buildTranscriptParagraphs`: Workspace render = Yes. Timestamp mapping = Yes for live Workspace, Partial for export/clipboard. Export loses provenance-carrying paragraph model.
- Disable `applyParagraphDisplayImprovements`: Workspace render = Yes. Timestamp mapping = Yes for live Workspace, better textual fidelity for export/clipboard.

## 9. Recommended feature-flag seam

Recommended seam:

- File: `src/lib/buildEditorContent.ts`
- Function: `buildEditorContent(...)`

Reason:

- The live Workspace already consumes a single concrete render contract here: TipTap `JSONContent`.
- The current heuristic producer path is:
  - `EditorDocument`
  - `buildWorkspaceParagraphs(...)`
  - `buildEditorContent(...)`
  - TipTap `JSONContent`
- A future AI structuring layer could produce the same `JSONContent` shape through an alternate producer or adapter without changing `TranscriptEditor`.

Important nuance:

- The repo already has a better provenance-aware paragraph model in `buildTranscriptParagraphs(...)`.
- The live Workspace does not consume that model yet.
- So the seam is best placed at the render-contract boundary, not at the paragraph-model boundary.

Conclusion:

- Both producers can be made to share the same Workspace render output shape if they converge on `buildEditorContent(...)`'s `JSONContent` contract.
- They do not currently share a paragraph-object contract for the live Workspace.

## 10. Gold-standard comparison readiness

### What exists today

- A committed real-job raw Deepgram fixture exists:
  - `docs/audits/fixtures/tr_1781456706021_4bdiwu_deepgram_response.json`
- A fixture-backed acceptance test exists:
  - `src/lib/transcript/speakerFallbackAcceptance.test.ts`
- A current-vs-candidate recomputation path exists in audits around reassembly:
  - `docs/audits/TRANSCRIPT_REASSEMBLY_VALIDATION_2026-06-15.md`
- A same-transcript comparison script exists for workspace vs export:
  - `scripts/audit-transcript-source-of-truth.ts`

### What does not exist

- No certified Heath Thomas transcript was found in repo as a structured comparison artifact.
- No certified Etminan transcript was found in repo as a structured comparison artifact.
- No existing diff harness was found that compares:
  - current pipeline output vs future AI pipeline output
  - both against certified gold-standard transcripts

Current state: raw-fixture and internal comparison foundations exist, but certified-reference comparison assets are not present in the active repo.

## Recommendations

1. Introduce source-native stable canonical IDs before building any durable AI Layer-2 provenance contract. Current index-derived IDs are the biggest architecture blocker.
2. Stop mutating canonical speaker/text rows post-ingest if the goal is a strict two-layer model. Today that goal is violated by working-text saves, per-utterance speaker reassignment, and reassembly replacement.
3. Promote the provenance-carrying paragraph model (`buildTranscriptParagraphs`) to a first-class contract if the future AI layer is meant to emit paragraph objects with `source_utterances`.
4. Route alternate producers at `buildEditorContent(...)` so current heuristics and future AI output can be diffed against the same live render contract without deleting existing code.
5. Add certified-reference transcript assets and a structured diff harness before attempting gold-standard A/B evaluation.
