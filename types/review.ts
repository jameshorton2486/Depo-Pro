// ═══════════════════════════════════════════════════════════════
// REVIEW TYPES - Shared TypeScript types for transcript review
// ═══════════════════════════════════════════════════════════════

import type { TranscriptWord } from './deepgram';

// Review workflow state (for resume and dashboard progress)
export type ReviewState = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

// Extended word type for review UI
export interface ReviewWord extends TranscriptWord {
  index: number;
  reviewed: boolean;
  correctedWord?: string;
  originalWord?: string;
}

// Flagged word with context for review panel
export interface FlaggedWordWithContext {
  wordIndex: number;
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  reviewed: boolean;
  correctedWord?: string;
  contextBefore: string;
  contextAfter: string;
  alternatives?: string[];
}

// Review session state (for auto-save and resume)
export interface ReviewSession {
  transcriptionId: string;
  jobId: string;
  reviewState: ReviewState;
  lastReviewedIndex: number;
  confidenceThreshold: number;
  corrections: WordCorrection[];
  reviewedIndices: number[];
  lastSavedAt: string;
  audioPosition: number;
}

// Single word correction (for edit history / audit trail)
export interface WordCorrection {
  wordIndex: number;
  originalWord: string;
  correctedWord: string;
  timestamp: string;
  userId: string;
}

// Edit history entry (append-only, separate from words[])
export interface EditHistoryEntry {
  wordIndex: number;
  originalWord: string;
  correctedWord: string;
  editedByUserId: string;
  editedAt: Date;
}

// API request/response types
export interface SaveReviewRequest {
  corrections: Array<{
    wordIndex: number;
    correctedWord: string;
  }>;
  reviewedIndices: number[];
  lastReviewedIndex: number;
  audioPosition: number;
  confidenceThreshold: number;
  complete?: boolean;
}

export interface SaveReviewResponse {
  success: boolean;
  savedAt: string;
  correctionCount: number;
  reviewedCount: number;
  reviewState: ReviewState;
}

// Review page props
export interface ReviewPageData {
  jobId: string;
  transcriptionId: string;
  caseName: string;
  caseNumber?: string;
  deponentName?: string;
  depositionDate?: string;
  audioUrl: string;
  words: ReviewWord[];
  reviewState: ReviewState;
  savedSession?: ReviewSession;
}

// Audio player state
export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
}

// Review progress
export interface ReviewProgress {
  totalFlagged: number;
  reviewed: number;
  corrected: number;
  remaining: number;
  percentComplete: number;
  reviewState: ReviewState;
}

// Filter options for flagged words panel
export type FilterOption = 'all' | 'pending' | 'reviewed' | 'corrected';
export type SortOption = 'timestamp' | 'confidence';

export default {};
