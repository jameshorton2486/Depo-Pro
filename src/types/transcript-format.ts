/**
 * Depo-Pro Transcript Formatting Types
 * 
 * Types for post-transcription processing: text cleanup, speaker mapping,
 * Q/A formatting, and DOCX export with legal tab stops.
 */

// ── Speaker Configuration ──────────────────────────────────────────

export interface SpeakerMapping {
  /** Deepgram speaker ID (e.g., "Speaker 0") */
  deepgramId: string;
  /** Display label for the transcript (e.g., "THE VIDEOGRAPHER", "MR. SALAZAR") */
  displayLabel: string;
  /** Role in the deposition */
  role: 'videographer' | 'court_reporter' | 'witness' | 'examining_attorney' | 'cross_examining_attorney' | 'other';
}

export interface QAMapping {
  /** Speaker label that maps to Q. */
  questionSpeaker: string;
  /** Speaker label that maps to A. */
  answerSpeaker: string;
}

export interface ExaminationSection {
  /** Line number where Q/A format begins */
  startLine: number;
  /** Line number where Q/A format ends */
  endLine: number;
  /** Which speakers map to Q. and A. in this section */
  qaMapping: QAMapping;
  /** Type of examination */
  type: 'direct' | 'cross' | 'redirect' | 'recross';
}

// ── Formatting Options ─────────────────────────────────────────────

export interface TranscriptFormatOptions {
  /** Number of spaces after sentence-ending punctuation (1 or 2) */
  sentenceSpaces: 1 | 2;
  /** Number of spaces after Q./A. label (1 or 2) */
  qaSpaces: 1 | 2;
  /** Line spacing (1.0, 1.5, 2.0) */
  lineSpacing: number;
  /** Starting line number for the transcript body */
  startLineNumber: number;
  /** Whether to include line numbers in output */
  includeLineNumbers: boolean;
  /** Font name (default: Courier New) */
  fontName: string;
  /** Font size in points (default: 12) */
  fontSize: number;
  /** Page margins in inches */
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Tab stop positions in inches from left margin */
  tabStops: {
    /** Left-aligned tab 1 (default: 0.5") */
    tab1: number;
    /** Left-aligned tab 2 (default: 1.0") */
    tab2: number;
    /** Left-aligned tab 3 (default: 1.5") */
    tab3: number;
    /** Center-aligned tab (default: 3.25" — middle of text area) */
    center: number;
  };
}

// ── Text Processing Rules ──────────────────────────────────────────

export interface TextProcessingRules {
  /** Insert em dashes for repeated words/phrases (stutters/false starts) */
  insertEmDashes: boolean;
  /** Replace "doctor" with "Dr." when used as a title before a name */
  fixDoctorTitle: boolean;
  /** Merge short diarization errors back into previous speaker */
  fixDiarization: boolean;
  /** Maximum word count for diarization merge threshold */
  diarizationMergeThreshold: number;
  /** Apply sentence spacing normalization */
  normalizeSentenceSpacing: boolean;
}

// ── Transcript Segment ─────────────────────────────────────────────

export interface TranscriptSegment {
  /** Deepgram speaker ID (e.g., "Speaker 0") */
  speakerId: string;
  /** Raw text content */
  text: string;
  /** Start timestamp in seconds (optional, from Deepgram) */
  startTime?: number;
  /** End timestamp in seconds (optional, from Deepgram) */
  endTime?: number;
}

// ── Complete Formatting Config ─────────────────────────────────────

export interface TranscriptFormatConfig {
  /** Speaker ID to display label mappings */
  speakerMappings: SpeakerMapping[];
  /** Examination sections with Q/A mappings */
  examinationSections: ExaminationSection[];
  /** Formatting options */
  formatOptions: TranscriptFormatOptions;
  /** Text processing rules */
  processingRules: TextProcessingRules;
}

// ── Defaults ───────────────────────────────────────────────────────

export const DEFAULT_FORMAT_OPTIONS: TranscriptFormatOptions = {
  sentenceSpaces: 2,
  qaSpaces: 2,
  lineSpacing: 2.0,
  startLineNumber: 21,
  includeLineNumbers: false,
  fontName: 'Courier New',
  fontSize: 12,
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  tabStops: { tab1: 0.5, tab2: 1.0, tab3: 1.5, center: 3.25 },
};

export const DEFAULT_PROCESSING_RULES: TextProcessingRules = {
  insertEmDashes: true,
  fixDoctorTitle: true,
  fixDiarization: true,
  diarizationMergeThreshold: 5,
  normalizeSentenceSpacing: true,
};
