/**
 * Transcription Type Definitions for Depo-Pro v1.3
 *
 * These interfaces match the JSONB column structures in the database schema.
 * They represent the structured data stored in transcriptions, words, segments, etc.
 */

import type {
  FlaggedWordStatus,
  TranscriptionStatus,
  ChunkStatus
} from './schema-enums';

/**
 * TranscriptionWord - Individual word from Deepgram
 * Stored in transcriptions.words JSONB array
 *
 * NOTE: is_flagged field is included in JSONB for display purposes.
 * The authoritative flagging state is in the flagged_words table.
 */
export interface TranscriptionWord {
  word: string;
  punctuated_word: string;
  start: number; // seconds
  end: number; // seconds
  confidence: number; // 0.0 to 1.0
  speaker: string; // e.g., "SPEAKER_01"
  speaker_channel: number;
  is_flagged: boolean;
}

/**
 * TranscriptionSegment - Utterance/paragraph from Deepgram
 * Stored in transcriptions.segments JSONB array
 */
export interface TranscriptionSegment {
  text: string;
  speaker: string;
  start: number; // seconds
  end: number; // seconds
  channel: number;
  original_text: string; // Immutable original
}

/**
 * SpeakerInfo - Speaker metadata
 * Stored in transcriptions.speakers JSONB array
 */
export interface SpeakerInfo {
  id: string;
  label: string; // e.g., "SPEAKER_01" or "Attorney Smith"
  channel: number;
  original_label: string;
}

/**
 * ChunkingConfig - Audio chunking parameters
 * Stored in transcriptions.chunking_config JSONB
 */
export interface ChunkingConfig {
  chunkDurationSeconds: number; // default 1800 (30 minutes)
  overlapSeconds: number; // default 5
  outputFormat: 'mp3';
  outputBitrate: '128k';
}

/**
 * DeepgramConfig - Deepgram API parameters used
 * Stored in transcriptions.deepgram_config JSONB
 */
export interface DeepgramConfig {
  model: string; // e.g., "nova-3"
  language: string; // e.g., "en"
  punctuate: boolean;
  diarize: boolean;
  smart_format?: boolean;
  paragraphs?: boolean;
  utterances?: boolean;
  keywords?: string[];
}

/**
 * PipelineProgress - Real-time pipeline status
 * Used for UI progress indicators
 */
export interface PipelineProgress {
  jobId: string;
  status: TranscriptionStatus;
  progress: number; // 0-100
  currentChunk: number | null;
  totalChunks: number | null;
  error: string | null;
}

/**
 * FlaggedWordRow - Complete flagged word record from database
 * Represents a low-confidence word requiring review
 */
export interface FlaggedWordRow {
  id: string;
  transcription_id: string;
  word_index: number;
  segment_index: number | null;
  original_word: string;
  confidence: number; // 0.0 to 1.0
  start_time: number; // seconds
  end_time: number; // seconds
  speaker: string | null;
  context_before: string;
  context_after: string;
  alternatives: AlternativeWord[] | null;
  corrected_word: string | null;
  status: FlaggedWordStatus;
  reviewed_by: string | null;
  reviewed_at: string | null; // ISO timestamp
  review_notes: string | null;
  sort_order: number;
  created_at: string; // ISO timestamp
}

/**
 * AlternativeWord - Alternative transcription suggestion
 * Stored in flagged_words.alternatives JSONB
 */
export interface AlternativeWord {
  word: string;
  confidence: number;
}

/**
 * AudioChunk - Chunk metadata for processing
 * Used during pipeline execution
 */
export interface AudioChunk {
  index: number;
  filePath: string;
  startSeconds: number;
  endSeconds: number;
  overlapSeconds: number;
  durationSeconds: number;
}

/**
 * ProcessedChunk - Chunk with transcription result
 * Used during reassembly
 */
export interface ProcessedChunk {
  index: number;
  result: DeepgramChunkResult;
  audioStartSeconds: number;
  overlapSeconds: number;
}

/**
 * DeepgramChunkResult - Transcription result for a single chunk
 */
export interface DeepgramChunkResult {
  words: TranscriptionWord[];
  segments: TranscriptionSegment[];
  speakers: SpeakerInfo[];
  fullTranscript: string;
  rawJson: any; // Raw Deepgram response
  confidence: number; // Average confidence
}

/**
 * ReassembledResult - Final merged transcription
 */
export interface ReassembledResult {
  words: TranscriptionWord[];
  segments: TranscriptionSegment[];
  speakers: SpeakerInfo[];
  fullTranscript: string;
}

/**
 * AudioValidation - Result of audio file validation
 */
export interface AudioValidation {
  valid: boolean;
  duration: number; // seconds
  format: string; // e.g., "mp3", "wav"
  channels: number;
  sampleRate: number; // Hz
  fileSize: number; // bytes
  error?: string;
  warning?: string;
}

/**
 * TranscriptionChunkRow - Database record for chunk tracking
 */
export interface TranscriptionChunkRow {
  id: string;
  transcription_id: string;
  chunk_index: number;
  audio_start_seconds: number;
  audio_end_seconds: number;
  overlap_seconds: number;
  deepgram_response: any | null; // JSONB
  word_count: number | null;
  duration_seconds: number | null;
  status: ChunkStatus;
  error_message: string | null;
  processing_time_ms: number | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

/**
 * FlaggedWordStats - Summary statistics for review progress
 */
export interface FlaggedWordStats {
  total: number;
  pending: number;
  corrected: number;
  confirmed: number;
  skipped: number;
}

/**
 * IntegrityChainVerification - Result of chain verification
 */
export interface IntegrityChainVerification {
  is_valid: boolean;
  total_versions: number;
  broken_at_version: number | null;
  details: string;
}

// === Additional Pipeline Types ===

/**
 * DeepgramOptions - Options for Deepgram API transcription
 */
export interface DeepgramOptions {
  model: string;
  smart_format: boolean;
  punctuate: boolean;
  diarize: boolean;
  utterances: boolean;
  keywords?: string[];
  language: string;
}

/**
 * DeepgramResult - Alias for DeepgramChunkResult for compatibility
 */
export type DeepgramResult = DeepgramChunkResult;

/**
 * ReassembledTranscription - Alias for ReassembledResult for compatibility
 */
export type ReassembledTranscription = ReassembledResult;

/**
 * TranscriptionPipelineStatus - Pipeline execution stages
 */
export type TranscriptionPipelineStatus =
  | 'AWAITING_AUDIO'
  | 'VALIDATING'
  | 'CHUNKING'
  | 'TRANSCRIBING'
  | 'REASSEMBLING'
  | 'EXTRACTING_FLAGS'
  | 'COMPLETE'
  | 'PIPELINE_FAILED';

/**
 * FlaggedWordContext - Context information for a flagged word
 */
export interface FlaggedWordContext {
  original_word: string;
  confidence: number;
  start_time: number;
  end_time: number;
  speaker: string | null;
  context_before: string;     // ~5 words before
  context_after: string;      // ~5 words after
  alternatives: Array<{ word: string; confidence: number }>;
  corrected_word: string | null;
  status: FlaggedWordStatus;
}
