// CONTRACT TYPES — never rename or reshape these fields.
// All changes must be logged in CONTRACT_NOTES.md.

export type WordId = string;      // "w_00001234"
export type SpeakerId = string;   // "spk_002"
export type UtteranceId = string; // "utt_0001"

export interface Word {
  word_id: WordId;
  text: string;              // current display text (working override or raw)
  raw_text: string;          // IMMUTABLE verbatim ASR token — never write to this
  speaker_id: SpeakerId;
  utterance_id: UtteranceId;
  start_time: number;        // seconds
  end_time: number;          // seconds
  confidence: number;        // 0.0–1.0
  reviewed: boolean;
  edited: boolean;           // text !== raw_text
}

export interface Utterance {
  utterance_id: UtteranceId;
  speaker_id: SpeakerId;
  start_time: number;
  end_time: number;
  word_ids: WordId[];        // ordering authority within the utterance
}

export interface Speaker {
  speaker_id: SpeakerId;
  display_name: string;      // "THE WITNESS"
  deepgram_speaker: number | null;  // original diarization index
  role?: "REPORTER" | "WITNESS" | "ATTORNEY" | "INTERPRETER" | "OTHER";
}

export interface EditorDocument {
  job_id: string;
  media_url: string;         // audio stream endpoint
  duration: number;          // seconds
  speakers: Speaker[];
  utterances: Utterance[];   // ordered
  words: Word[];             // flat, ordered by global word_index
}

export interface AiSuggestion {
  suggestion_id: string;
  word_id: WordId;
  utterance_id: UtteranceId;
  original_text: string;
  suggested_text: string;
  reason: string;
  confidence: number;
  status: "pending" | "accepted" | "rejected";
}

export interface Exhibit {
  exhibit_id: string;
  label: string;
  description: string;
  file_url: string;
}

export interface CertifyChecklist {
  review_complete: boolean;
  speaker_mapping_complete: boolean;
  confidence_review_complete: boolean;
}

// ─── Request/response shapes ─────────────────────────────────────────────────

export interface WorkingChange {
  utterance_id: UtteranceId;
  working_text: string;
}

export interface SaveWorkingPayload {
  changes: WorkingChange[];
  source: "editor";
}

export interface SaveWorkingResponse {
  saved: number;
}

export interface ReviewPayload {
  reviewed_word_ids: string[];
  unreviewed_word_ids: string[];
}

export interface SpeakersPayload {
  speakers: Pick<Speaker, "speaker_id" | "display_name" | "role">[];
  utterance_speaker_map?: Array<{
    utterance_id: UtteranceId;
    speaker_id: SpeakerId;
  }>;
}
