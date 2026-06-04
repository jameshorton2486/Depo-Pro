import type { EditorDocument } from "../api/types";
import type { WorkingTranscriptFile } from "./types";

export interface WorkingTranscriptTransformOptions {
  lastSavedAt?: string | null;
  dirty?: boolean;
}

export function editorDocumentToWorkingTranscript(
  document: EditorDocument,
  existing?: WorkingTranscriptFile | null,
  options: WorkingTranscriptTransformOptions = {}
): WorkingTranscriptFile {
  // `document.job_id` is the runtime case identity in Bolt.
  // If the persisted transcript already carries its own transcript provenance
  // job id, preserve that value instead of overwriting it on every save.
  const persistedTranscriptJobId = existing?.job_id ?? document.job_id;

  return {
    ...(existing ?? {}),
    version: existing?.version ?? "1.0",
    case_id: document.job_id,
    job_id: persistedTranscriptJobId,
    media_url: document.media_url,
    duration: document.duration,
    speakers: document.speakers.map((speaker) => ({ ...speaker })),
    utterances: document.utterances.map((utterance) => ({ ...utterance })),
    words: document.words.map((word) => ({ ...word })),
    based_on: existing?.based_on ?? "raw_transcript.json",
    last_saved_at:
      options.lastSavedAt !== undefined ? options.lastSavedAt : existing?.last_saved_at ?? null,
    dirty: options.dirty !== undefined ? options.dirty : existing?.dirty ?? false,
  };
}
