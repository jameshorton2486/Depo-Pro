export type ConfidenceClass = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';

export interface TranscriptWord {
  id: string;
  transcription_id: string;
  firm_id: string;
  position_index: number;
  word: string;
  punctuated_word: string;
  display_word: string;
  original_word: string;
  start_time: number;
  end_time: number;
  confidence: number;
  confidence_class: ConfidenceClass;
  speaker_index: number;
  is_corrected: boolean;
  corrected_word: string | null;
  is_filler: boolean;
  is_deleted: boolean;
}

export interface SpeakerAssignment {
  firm_id?: string;
  transcription_id: string;
  speaker_index: number;
  role: 'examining_attorney' | 'cross_examining_attorney' | 'witness' | 'reporter' | 'videographer' | 'interpreter' | 'unknown';
  last_name?: string | null;
  full_name: string;
  colloquy_label: string;
  qa_label: 'Q' | 'A' | null;
}

export interface JurisdictionConfig {
  state_code: string;
  lines_per_page: number;
  font: string;
  font_size_pt: number;
  left_margin_inches: number;
  right_margin_inches: number;
  qa_signifier_spaces: number;
  qa_text_offset_spaces: number;
  colloquy_indent_spaces: number;
  min_chars_per_line: number;
  require_line_numbers: boolean;
  certification_language: string | null;
}

export type ParagraphType =
  | 'QUESTION'
  | 'ANSWER'
  | 'COLLOQUY'
  | 'SECTION_HEADER'
  | 'EXAMINATION_BYLINE'
  | 'PARENTHETICAL'
  | 'CLOSING_ASTERISKS'
  | 'FURTHER_SAYETH'
  | 'DEPO_CONCLUDED';

export type DepositionSection =
  | 'PREAMBLE'
  | 'DIRECT_EXAMINATION'
  | 'CROSS_EXAMINATION'
  | 'REDIRECT_EXAMINATION'
  | 'RECROSS_EXAMINATION'
  | 'COLLOQUY'
  | 'OFF_RECORD'
  | 'CLOSING';

export interface Paragraph {
  paragraph_index: number;
  paragraph_type: ParagraphType;
  section_type: DepositionSection;
  speaker_index: number | null;
  speaker_label: string | null;
  text: string;
  raw_text?: string;
  word_ids: string[];
  start_word_idx?: number;
  end_word_idx?: number;
  requires_reentry_marker?: boolean;
  has_interruption?: boolean;
  line_count: number;
}

export interface PaginatedParagraph extends Paragraph {
  page_number: number;
  line_number_start: number;
  line_number_end: number;
}

export interface QGCheck {
  code: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'ERROR' | 'WARNING';
  message: string;
  details?: Record<string, unknown>;
}

export interface QualityGateResult {
  passed: boolean;
  exportBlocked?: boolean;
  checks?: QGCheck[];
  errors: QGCheck[];
  warnings: QGCheck[];
  errorCount?: number;
  warningCount?: number;
  canExportWithAcknowledgment: boolean;
}

export interface FormatterOptions {
  jurisdiction?: string;
  dryRun?: boolean;
}

export interface FormatterResult {
  paragraphs: PaginatedParagraph[];
  pageCount: number;
  qualityGate: QualityGateResult;
}
