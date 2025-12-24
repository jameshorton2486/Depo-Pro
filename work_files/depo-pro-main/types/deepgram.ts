// Transcription job data structure
export interface TranscriptionJobData {
  jobId: string;
  firmId: string;
  audioFileUrl: string;
  audioFileName: string;
  requestedBy: string;
  metadata?: Record<string, any>;
  noticeFileUrl?: string;
  customDictionary?: string[];
}

// Deepgram configuration
export interface DeepgramConfig {
  model: 'nova-2' | 'nova-2-general' | 'nova-2-medical';
  diarize: boolean;
  utterances: boolean;
  punctuate: boolean;
  smart_format: boolean;
  filler_words: boolean;
  profanity_filter: boolean;
  alternatives: number;
  keywords?: string[];
}

// Word-level transcription data
export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  flagged?: boolean;
  alternatives?: string[];
}

// Speaker utterance
export interface Utterance {
  speaker: number;
  start: number;
  end: number;
  transcript: string;
  confidence: number;
  words: TranscriptWord[];
}

// Quality analysis result
export interface QualityReport {
  overallConfidence: number;
  lowConfidenceCount: number;
  inaudibleCount: number;
  flaggedSegments: FlaggedSegment[];
  needsReview: boolean;
  qualityScore: number;
}

export interface FlaggedSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  alternatives?: string[];
  reason: 'low_confidence' | 'inaudible' | 'unclear';
}

// Notice parsing result
export interface ParsedNotice {
  caseNumber?: string;
  caseName?: string;
  courtName?: string;
  judgeName?: string;
  depositionDate?: string;
  attorneys: Attorney[];
  witnesses: Witness[];
  extractedTerms: string[];
}

export interface Attorney {
  name: string;
  email?: string;
  role: 'plaintiff' | 'defendant' | 'other';
}

export interface Witness {
  name: string;
  title?: string;
}

// Audio metadata
export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  format: string;
}

// Audio preprocessing result
export interface PreprocessingResult {
  enhancedFileUrl: string;
  metadata: AudioMetadata;
  improvements: string[];
  originalSize: number;
  enhancedSize: number;
}

export default {};
