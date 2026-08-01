export type BenchmarkParameterValue = string | number | boolean;

export interface BenchmarkWeights {
  wordAccuracy: number;
  qaRecovery: number;
  speakerAccuracy: number;
  reconstruction: number;
  paragraphs: number;
  objections: number;
  colloquy: number;
  editing: number;
}

export interface BenchmarkConfiguration {
  provider: string;
  baseConfiguration: Record<string, BenchmarkParameterValue>;
  parameterSweep: Record<string, BenchmarkParameterValue[]>;
  keyterms: string[];
  weights: BenchmarkWeights;
}

export interface BenchmarkCandidate {
  id: string;
  parameters: Record<string, BenchmarkParameterValue>;
}

export interface SpeakerMetrics {
  correct: number;
  incorrect: number;
  missed: number;
  accuracy: number;
  precision: number;
  recall: number;
}

export interface EditDistanceMetrics {
  insertions: number;
  deletions: number;
  substitutions: number;
  distance: number;
  rate: number;
}

export interface StageSBenchmarkMetrics {
  paragraphSplits: number;
  paragraphMerges: number;
  speakerRepairs: number;
  speakerReassignments: number;
  mergedUtterances: number;
  splitUtterances: number;
  structuralRepairs: number;
  formattingRepairs: number;
  editorialCorrections: number;
  punctuationRepairs: number;
  interruptionRepairs: number;
  objectionNormalizations: number;
  colloquyReconstructions: number;
  deterministicCorrections: number;
  totalRepairs: number;
}

export interface ManualCorrectionEstimate {
  clicks: number;
  corrections: number;
  minutes: number;
  repairs: number;
}

export interface BenchmarkMetrics {
  setting: string;
  parameters: Record<string, BenchmarkParameterValue>;
  utteranceCount: number;
  averageUtteranceLength: number;
  averageDuration: number;
  speakerChanges: number;
  speakerPurity: number;
  mergedSpeakerEvents: number;
  splitQuestionCount: number;
  splitAnswerCount: number;
  mergedQuestionAnswerCount: number;
  questionRecovery: number;
  answerAccuracy: number;
  objectionRecovery: number;
  colloquyRecovery: number;
  paragraphAccuracy: number;
  reconstructionRepairs: number;
  manualCorrectionEstimate: ManualCorrectionEstimate;
  wordErrorRate: number;
  characterErrorRate: number;
  insertions: number;
  deletions: number;
  substitutions: number;
  alignmentScore: number;
  speaker: SpeakerMetrics;
  stageS: StageSBenchmarkMetrics;
  overallScore: number;
}

export interface BenchmarkTranscript {
  text: string;
  providerVersion: string;
  utterances: Array<{
    id: string;
    speaker: string;
    text: string;
    start: number;
    end: number;
    words: string[];
  }>;
}

export interface BenchmarkResult {
  candidate: BenchmarkCandidate;
  effectiveConfiguration: {
    provider: string;
    parameters: Record<string, BenchmarkParameterValue>;
    keyterms: string[];
  };
  transcript: BenchmarkTranscript;
  metrics: BenchmarkMetrics;
}

export interface BenchmarkRecommendation {
  bestOverall: string;
  bestSpeakerAccuracy: string;
  bestReconstruction: string;
  bestEditingEfficiency: string;
  bestWer: string;
  recommendedProductionSetting: string;
  explanation: string;
}

export interface BenchmarkReport {
  schemaVersion: "1.0";
  generatedAt: string;
  provider: string;
  audioName: string;
  certifiedTranscriptName: string;
  model: string;
  configuration: BenchmarkConfiguration;
  settingsTested: string[];
  results: BenchmarkResult[];
  recommendation: BenchmarkRecommendation;
}

export interface BenchmarkProgress {
  completed: number;
  total: number;
  candidate: BenchmarkCandidate;
}
