export interface DeepgramWord {
  id?: string;
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
  speaker_confidence?: number;
}

export interface DeepgramUtterance {
  id?: string;
  speaker?: number;
  start: number;
  end: number;
  transcript?: string;
  confidence?: number;
  words: DeepgramWord[];
}

export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}

export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

export interface DeepgramMetadata {
  request_id: string;
  sha256: string;
  created: string;
  duration: number;
  channels: number;
  model_info?: Record<string, { name: string; version: string; arch: string }>;
  transcription_source?: "deepgram" | "offline-fallback";
}

export interface DeepgramResponse {
  metadata: DeepgramMetadata;
  results: {
    channels: DeepgramChannel[];
    utterances?: DeepgramUtterance[];
  };
}

export interface TranscriptCapture {
  caseId: string;
  jobId: string;
  transcriptId: string;
  response: DeepgramResponse;
  rawStoragePath: string;
  rawChecksum: string;
  transcriptionSource: "deepgram" | "offline-fixture";
}
