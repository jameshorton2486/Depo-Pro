// types/transcript.ts
// Type definitions for transcription system

import type { SpeakerType } from '@/lib/transcription/config';

// Word with timestamp and confidence from Deepgram
export interface TranscriptWord {
  word: string;
  start: number;  // seconds
  end: number;    // seconds
  confidence: number;  // 0-1
  speaker?: number;  // speaker ID from diarization
  punctuated_word?: string;  // word with punctuation
}

// Utterance (speaker turn) from Deepgram
export interface TranscriptUtterance {
  id: string;
  start: number;
  end: number;
  speaker: number;
  transcript: string;
  words: TranscriptWord[];
  confidence: number;
}

// Flagged word for low-confidence review
export interface FlaggedWord {
  id: string;
  wordIndex: number;
  word: string;
  confidence: number;
  startTime: number;
  endTime: number;
  speaker?: number;
  contextBefore: string[];  // words before
  contextAfter: string[];   // words after
  alternatives?: string[];  // alternative transcriptions
  correctedWord?: string;   // scopist correction
  isReviewed: boolean;
}

// Speaker assignment
export interface SpeakerAssignment {
  speakerId: number;        // Deepgram speaker ID (0, 1, 2, ...)
  speakerName: string;      // "John Smith"
  speakerType: SpeakerType; // "Attorney", "Witness", etc.
  excludeFromTranscript: boolean;  // For witnesses speaking through interpreter
}

// Speaker metadata for analysis
export interface SpeakerMetadata {
  id: number;
  wordCount: number;
  firstTimestamp: number;
  lastTimestamp: number;
  averageConfidence: number;
  sampleText: string;
}

// Full Deepgram response structure (simplified)
export interface DeepgramResponse {
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
  };
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: TranscriptWord[];
        paragraphs?: {
          paragraphs: Array<{
            sentences: Array<{
              text: string;
              start: number;
              end: number;
            }>;
            speaker: number;
            start: number;
            end: number;
          }>;
        };
      }>;
    }>;
    utterances?: TranscriptUtterance[];
  };
}

// Processed transcript for storage
export interface ProcessedTranscript {
  fullText: string;
  words: TranscriptWord[];
  utterances: TranscriptUtterance[];
  flaggedWords: FlaggedWord[];
  speakerAssignments: SpeakerAssignment[];
  duration: number;
  wordCount: number;
  flaggedWordCount: number;
  averageConfidence: number;
}

// Export options
export interface ExportOptions {
  format: 'docx' | 'pdf' | 'txt';
  includeTimestamps: boolean;
  includeSpeakerLabels: boolean;
  lineNumbering: boolean;
  useQAFormat: boolean;  // Q: and A: labels
  includeConfidenceHighlights?: boolean;
  linesPerPage?: number;
  pageSize?: 'letter' | 'legal';
}

// Export metadata
export interface ExportMetadata {
  caseName: string;
  caseNumber?: string;
  depositionDate: Date;
  deponentName: string;
  courtReporterName?: string;
  reporterName?: string;
  firmName?: string;
  location?: string;
  speakerNames?: Record<number, string>; // { 0: "Attorney Smith", 1: "Witness Jones" }
}

// Model selection for job
export interface TranscriptionSettings {
  modelType: 'STANDARD' | 'MEDICAL' | 'BILINGUAL';
  speakerAssignments: SpeakerAssignment[];
}

// Word update payload for review
export interface WordUpdatePayload {
  wordId: string;
  correctedWord: string;
  originalWord: string;
  timestamp: number;
}

// Review progress tracking
export interface ReviewProgress {
  total: number;
  reviewed: number;
  percentage: number;
}

// Default export options
export const defaultExportOptions: ExportOptions = {
  format: 'docx',
  includeTimestamps: false,
  includeSpeakerLabels: true,
  lineNumbering: true,
  useQAFormat: false,
  includeConfidenceHighlights: false,
  linesPerPage: 25,
  pageSize: 'letter',
};
