export interface FlaggedWord {
  id: string;
  word: string;
  confidence: number;
  startTime: number;
  endTime: number;
  context: {
    before: string;
    after: string;
  };
  isReviewed: boolean;
  correctedWord?: string;
  alternatives?: string[];
}

export interface TranscriptWord {
  id: string;
  word: string;
  confidence: number;
  startTime: number;
  endTime: number;
  speaker?: string;
}
