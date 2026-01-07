/**
 * Deepgram Types for Depo-Pro
 * Updated to match real @deepgram/sdk responses
 */

import type { SyncPrerecordedResponse } from '@deepgram/sdk';

// ============================================
// Transcription Job Types
// ============================================

export interface TranscriptionJobData {
  jobId: string;
  firmId?: string;
  audioFileUrl: string;
  audioFileName: string;
  requestedBy?: string;
  userId?: string; // Alias for requestedBy
  metadata?: Record<string, unknown>;
  noticeFileUrl?: string;
  customDictionary?: string[];
  modelType?: string; // DeepgramModelType or string
  audioFileId?: string; // Optional file ID
}

// ============================================
// Transcription Result Types
// ============================================

export interface TranscriptionResult {
  /** Full transcript text */
  transcript: string;

  /** Overall confidence score (0-1) */
  confidence: number;

  /** Word-level data with timestamps and confidence */
  words: TranscriptWord[];

  /** Speaker-segmented utterances */
  utterances: Utterance[];

  /** Low-confidence segments flagged for review */
  flaggedSegments: FlaggedSegment[];

  /** Quality analysis metrics */
  qualityReport: QualityReport;

  /** Transcription metadata */
  metadata: TranscriptionMetadata;

  /** Raw Deepgram response (for debugging/storage) */
  rawResponse: SyncPrerecordedResponse;
}

export interface TranscriptionMetadata {
  /** Audio duration in seconds */
  duration: number;

  /** Number of audio channels */
  channels: number;

  /** Model info from Deepgram */
  modelInfo?: {
    name?: string;
    version?: string;
    arch?: string;
  };

  /** Deepgram request ID */
  requestId?: string;
}

// ============================================
// Word-Level Types
// ============================================

export interface TranscriptWord {
  /** The transcribed word */
  word: string;

  /** Start time in seconds */
  start: number;

  /** End time in seconds */
  end: number;

  /** Confidence score (0-1) */
  confidence: number;

  /** Speaker ID (from diarization) */
  speaker?: number;

  /** Word with punctuation applied */
  punctuated_word?: string;
}

// ============================================
// Utterance Types (Speaker Segments)
// ============================================

export interface Utterance {
  /** Speaker ID (0, 1, 2, etc.) */
  speaker: number;

  /** Start time in seconds */
  start: number;

  /** End time in seconds */
  end: number;

  /** Full text of this utterance */
  transcript: string;

  /** Confidence score for this utterance */
  confidence: number;

  /** Words in this utterance */
  words: TranscriptWord[];
}

// ============================================
// Flagged Segment Types (For Scopist Review)
// ============================================

export interface FlaggedSegment {
  /** Start time in seconds */
  start: number;

  /** End time in seconds */
  end: number;

  /** Text with context (surrounding words) */
  text: string;

  /** Lowest confidence in this segment */
  confidence: number;

  /** Why this was flagged */
  reason: 'low_confidence' | 'inaudible' | 'unclear';

  /** Words in this flagged segment */
  words: TranscriptWord[];

  /** Index of first flagged word in full transcript */
  wordIndex: number;

  /** Speaker ID if available */
  speaker?: number;

  /** User correction (set by scopist) */
  correction?: string;

  /** Has been reviewed */
  reviewed?: boolean;

  /** Reviewed by user ID */
  reviewedBy?: string;

  /** Review timestamp */
  reviewedAt?: Date;
}

// ============================================
// Quality Report Types
// ============================================

export interface QualityReport {
  /** Average confidence across all words (0-1) */
  overallConfidence: number;

  /** Count of words with confidence < threshold but >= 0.5 */
  lowConfidenceCount: number;

  /** Count of words with confidence < 0.5 */
  inaudibleCount: number;

  /** Quality percentage (0-100) */
  qualityScore: number;

  /** Whether scopist review is needed */
  needsReview: boolean;

  /** All flagged segments */
  flaggedSegments: FlaggedSegment[];
}

// ============================================
// Deepgram Config Types
// ============================================

export interface DeepgramConfig {
  /** Transcription model */
  model: 'nova-3' | 'nova-2' | 'nova-2-general' | 'nova-2-medical' | 'whisper';

  /** Enable speaker diarization */
  diarize: boolean;

  /** Segment by speaker utterances */
  utterances: boolean;

  /** Add punctuation */
  punctuate: boolean;

  /** Smart formatting */
  smart_format: boolean;

  /** Include filler words (um, uh) */
  filler_words: boolean;

  /** Filter profanity (false for legal) */
  profanity_filter: boolean;

  /** Number of alternatives for uncertain words */
  alternatives?: number;

  /** Keywords to boost recognition */
  keywords?: string[];

  /** Language code */
  language?: string;

  /** Enable paragraphs */
  paragraphs?: boolean;
}

// ============================================
// Transcription Edit Types (Scopist Changes)
// ============================================

export interface TranscriptionEdit {
  id: string;
  transcriptionId: string;

  /** Original word/segment */
  originalText: string;

  /** Corrected text */
  correctedText: string;

  /** Start time of edited segment */
  startTime: number;

  /** End time of edited segment */
  endTime: number;

  /** Word index in transcript */
  wordIndex: number;

  /** Edit type */
  editType: 'correction' | 'insertion' | 'deletion' | 'speaker_change';

  /** User who made the edit */
  editedBy: string;

  /** Timestamp of edit */
  editedAt: Date;

  /** Optional note about the edit */
  note?: string;
}

// ============================================
// Speaker Mapping Types
// ============================================

export interface SpeakerMapping {
  /** Deepgram speaker ID (0, 1, 2...) */
  speakerId: number;

  /** Display label (Q, A, WITNESS, etc.) */
  label: string;

  /** Full name if known */
  name?: string;

  /** Role in deposition */
  role?: 'attorney' | 'witness' | 'court_reporter' | 'videographer' | 'other';
}

// ============================================
// Export Types
// ============================================

export interface TranscriptExportOptions {
  /** Export format */
  format: 'docx' | 'pdf' | 'txt' | 'rtf';

  /** Include timestamps */
  includeTimestamps: boolean;

  /** Include speaker labels */
  includeSpeakerLabels: boolean;

  /** Include line numbers */
  includeLineNumbers: boolean;

  /** Lines per page (legal standard is 25) */
  linesPerPage: number;

  /** Include page headers */
  includeHeaders: boolean;

  /** Include certification page */
  includeCertification: boolean;

  /** Include word index */
  includeWordIndex: boolean;
}

// ============================================
// Audio Metadata Types
// ============================================

export interface AudioMetadata {
  /** Duration in seconds */
  duration: number;

  /** Sample rate in Hz */
  sampleRate: number;

  /** Number of channels */
  channels: number;

  /** Audio format/codec */
  format: string;

  /** File size in bytes */
  fileSize?: number;

  /** Bit rate */
  bitRate?: number;
}

// ============================================
// Audio Preprocessing Types
// ============================================

export interface PreprocessingResult {
  enhancedFileUrl: string;
  metadata: AudioMetadata;
  improvements: string[];
  originalSize: number;
  enhancedSize: number;
}

export default {};
