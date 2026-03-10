export type ConfidenceClass = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';

export interface EditorWord {
  id: string;
  transcription_id: string;
  firm_id: string;
  position_index: number;
  original_word: string;
  word: string;
  punctuated_word: string;
  display_word: string;
  corrected_word: string | null;
  start_time: number;
  end_time: number;
  confidence: number;
  confidence_class: ConfidenceClass;
  speaker_index: number;
  is_corrected: boolean;
  is_filler: boolean;
  is_deleted: boolean;
  session_id: string | null;
  global_time_offset: number | null;
}

export interface EditorParagraph {
  id: string;
  transcription_id: string;
  paragraph_index: number;
  paragraph_type: string;
  section_type: string;
  speaker_index: number | null;
  speaker_label: string | null;
  text: string;
  word_ids: string[];
  page_number: number;
  line_number_start: number;
  line_number_end: number;
}

export interface FlaggedWord {
  id: string;
  transcription_id: string;
  word_id: string;
  word_index: number;
  original_word: string;
  corrected_word: string | null;
  confidence: number;
  confidence_class: ConfidenceClass;
  start_time: number;
  context_before: string;
  context_after: string;
  alternatives: string[];
  status: 'PENDING' | 'CORRECTED' | 'CONFIRMED' | 'SKIPPED';
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface TranscriptFlag {
  id: string;
  transcription_id: string;
  word_id: string | null;
  paragraph_id: string | null;
  word_index: number | null;
  flag_type: 'VERIFY' | 'DATE_CONFLICT' | 'SPELLING_VARIANT' | 'SCOPIST_NOTE';
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  auto_generated: boolean;
}

export interface CorrectionRecord {
  word_id: string;
  original_word: string;
  corrected_word: string;
  corrected_by: string;
  correction_type: 'MANUAL_EDIT' | 'CONFIRM_ORIGINAL' | 'SKIP';
  reason?: string;
}

export interface ReviewProgress {
  total: number;
  reviewed: number;
  pending: number;
  corrected: number;
  confirmed: number;
  skipped: number;
  percentComplete: number;
  verifyTagsUnresolved: number;
  lowConfidenceUnreviewed: number;
}

export interface ConsistencyWarning {
  canonical: string;
  variants: string[];
  wordIds: string[];
  occurrences: number;
  suggestion: string;
}

export interface EditorState {
  transcriptionId: string;
  jobId: string;
  audioUrl: string | null;
  currentAudioTime: number;
  activeWordId: string | null;
  editingWordId: string | null;
  selectedFlaggedWordId: string | null;
  isLocked: boolean;
  lockOwner: string | null;
  reviewProgress: ReviewProgress;
  consistencyWarnings: ConsistencyWarning[];
  verifyTags: TranscriptFlag[];
}

export interface AudioSession {
  id: string;
  session_number: number;
  label: string | null;
  audio_url: string;
  duration_seconds: number;
  global_start_offset: number;
}
