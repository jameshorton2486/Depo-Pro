# Two-Copy Transcript Model

Each deposition keeps **exactly two transcripts** — no per-save copies, no growing
history.

| Copy | What it is | Mutable? | Where it lives |
| --- | --- | --- | --- |
| **Original** | The structured transcript exactly as the pipeline first produces it (after diarization, speaker roles, and boundary detection — i.e. what the user first opens). | No | One immutable `*_original.json` snapshot in the `case-files` bucket, referenced by `transcripts.original_storage_path`. |
| **Working** | The editable transcript. | Yes — edited **in place** | The `transcript_words` / `transcript_utterances` / `transcript_speakers` rows. Every word also keeps `raw_text` (original) alongside `working_text` (edit). |

## Lifecycle

1. **Capture (once).** At the end of ingest, after structuring succeeds,
   `captureOriginalSnapshot` (in `supabase/functions/transcribe-callback`) serializes
   the structured rows to the immutable Original snapshot and records
   `original_storage_path` / `original_checksum` / `original_captured_at` on the
   `transcripts` row. It is non-fatal: a snapshot failure never blocks completion.

2. **Edit in place.** The workspace autosaves edits after 2s of inactivity and
   flushes once more at session end (tab hidden or workspace unmount) — see
   `DocumentContext`. Editing never creates a copy; it updates the same rows.

3. **Replace on re-transcribe.** When a new transcription completes for a case,
   `pruneSupersededTranscripts` deletes every *other* transcript for that case (rows
   + referenced storage artifacts), collapsing the deposition back to one Original +
   one Working.

## Viewing / exporting

- The workspace toolbar has an **Original** button that opens a read-only viewer
  (`OriginalTranscriptDialog`) with its own TXT / Word / JSON exports.
- The toolbar's existing TXT / Word / JSON buttons export the **Working** copy.
- Exports are on-demand browser downloads — they are **not** stored server-side.

## Configuration

| Env var | Default | Effect |
| --- | --- | --- |
| `TRANSCRIPT_PRUNE_SUPERSEDED` | *(off)* | Set to `true` to enable the destructive replace-on-retranscribe prune. While off, older transcripts are left in place and the workspace simply opens the newest. Enable once you've validated the behavior on a branch/preview. |

## Backward compatibility

The model applies to transcripts created **going forward**. Transcripts that predate
it have no Original snapshot; the Original viewer shows a "no original snapshot"
message for them, and the prune (when enabled) still collapses their case on the next
transcription.
