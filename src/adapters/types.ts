import type { EditorDocument, Exhibit, ReviewPayload, Speaker, Utterance, Word } from "../api/types";
import type { CaseExhibit, CaseRecord } from "../types/case";

export type { CaseExhibit, CaseRecord, EditorDocument, Exhibit, ReviewPayload, Speaker, Utterance, Word };

export interface WorkingTranscriptFile {
  version?: string;
  case_id: string;
  created_at?: string;
  updated_at?: string;
  deepgram_request_id?: string;
  job_id: string;
  media_url: string | null;
  duration: number | null;
  speakers: Speaker[];
  utterances: Utterance[];
  words: Word[];
  based_on?: string;
  last_saved_at?: string | null;
  dirty?: boolean;
  [key: string]: unknown;
}

export interface ReviewStateFile {
  version?: string;
  case_id: string;
  updated_at?: string | null;
  reviewed_word_ids: string[];
  unreviewed_word_ids: string[];
  review_complete?: boolean;
  review_pct?: number;
  [key: string]: unknown;
}

export interface AuditLogFileEntry {
  change_id: string;
  timestamp: string;
  utterance_id: string;
  word_id: string | null;
  old_text: string;
  new_text: string;
  source: "editor" | "suggestion-accept" | "suggestion-edit";
  suggestion_id: string | null;
}

export interface AuditLogFile {
  version?: string;
  case_id: string;
  entries: AuditLogFileEntry[];
  [key: string]: unknown;
}
