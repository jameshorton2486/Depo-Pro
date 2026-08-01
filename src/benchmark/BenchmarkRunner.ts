import { DEFAULT_GEOMETRY_PROFILE } from "../lib/format/geometryProfile";
import { runStageSValidation } from "../lib/stageS";
import type { UnifiedRenderModel } from "../lib/transcript/unifiedRendering";
import type {
  BenchmarkCandidate,
  BenchmarkConfiguration,
  BenchmarkMetrics,
  BenchmarkParameterValue,
  BenchmarkProgress,
  BenchmarkResult,
  BenchmarkTranscript,
  StageSBenchmarkMetrics,
} from "./BenchmarkMetrics";
import type { BenchmarkProvider } from "./DeepgramBenchmark";
import { compareTranscripts } from "./TranscriptComparator";

export type { BenchmarkProvider } from "./DeepgramBenchmark";

function stableValue(value: BenchmarkParameterValue): string {
  return JSON.stringify(value);
}

export function expandParameterSweep(configuration: BenchmarkConfiguration): BenchmarkCandidate[] {
  const entries = Object.entries(configuration.parameterSweep).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return [{ id: "baseline", parameters: {} }];
  let candidates: Array<Record<string, BenchmarkParameterValue>> = [{}];
  for (const [parameter, values] of entries) {
    candidates = candidates.flatMap((candidate) =>
      values.map((value) => ({ ...candidate, [parameter]: value })),
    );
  }
  return candidates.map((parameters) => ({
    id: Object.entries(parameters).map(([key, value]) => `${key}=${stableValue(value)}`).join(","),
    parameters,
  }));
}

function classify(text: string, index: number): "Q" | "A" | "COLLOQUY" | "SECTION_HEADER" {
  if (/\b(EXAMINATION|CROSS EXAMINATION|REDIRECT|RECROSS)\b/i.test(text)) return "SECTION_HEADER";
  if (/\?$/.test(text)) return "Q";
  if (index > 0) return "A";
  return "COLLOQUY";
}

function toStageSModel(candidate: BenchmarkCandidate, transcript: BenchmarkTranscript): UnifiedRenderModel {
  const profile = DEFAULT_GEOMETRY_PROFILE;
  return {
    transcriptId: `benchmark-${candidate.id}`,
    geometry: {
      format_box_width_inches: profile.formatBoxWidthInches,
      left_margin_inches: profile.leftMarginInches,
      right_margin_inches: profile.rightMarginInches,
      line_spacing_points: profile.lineSpacingPoints,
      lines_per_page: profile.linesPerPage,
    },
    lines: transcript.utterances.map((utterance, index) => {
      const kind = classify(utterance.text, index);
      return {
        paragraphId: `benchmark-paragraph-${index}`,
        kind,
        content: kind === "Q" ? `Q. ${utterance.text}` : kind === "A" ? `A. ${utterance.text}` : `${utterance.speaker}:  ${utterance.text}`,
        sourceUtteranceIds: [utterance.id],
        sourceWordIds: utterance.words.map((_word, wordIndex) => `${utterance.id}-word-${wordIndex}`),
        geometry: {
          paragraph_index: index,
          paragraph_id: `benchmark-paragraph-${index}`,
          role: kind === "Q" || kind === "A" ? "qa" : kind === "SECTION_HEADER" ? "centered" : "speaker",
          first_line_tab_inches: kind === "Q" || kind === "A" ? profile.tabs.qaLabelInches : profile.tabs.speakerInches,
          text_tab_inches: kind === "Q" || kind === "A" ? profile.tabs.qaTextInches : null,
          continuation_indent_inches: profile.tabs.continuationInches,
        },
      };
    }),
    entityRegistryEntryCount: new Set(transcript.utterances.map((utterance) => utterance.speaker)).size,
  };
}

function stageSMetrics(candidate: BenchmarkCandidate, transcript: BenchmarkTranscript): StageSBenchmarkMetrics {
  const result = runStageSValidation(
    { name: candidate.id, description: "Analysis-only transcription benchmark", model: toStageSModel(candidate, transcript) },
    { now: "1970-01-01T00:00:00.000Z" },
  );
  const categories = result.burden.byCategory;
  return {
    paragraphSplits: categories.PARAGRAPH_CONTINUITY ?? 0,
    paragraphMerges: categories.SECTION_TRANSITION ?? 0,
    speakerRepairs: categories.SPEAKER_LABEL ?? 0,
    speakerReassignments: categories.SPEAKER_LABEL ?? 0,
    mergedUtterances: categories.PARAGRAPH_CONTINUITY ?? 0,
    splitUtterances: categories.QA_CONTINUITY ?? 0,
    structuralRepairs: (categories.QA_CONTINUITY ?? 0) + (categories.OBJECTION_PLACEMENT ?? 0),
    formattingRepairs: categories.EDITORIAL ?? 0,
    editorialCorrections: categories.EDITORIAL ?? 0,
    punctuationRepairs: result.upstream.editorial.punctuationCorrections,
    interruptionRepairs: categories.PARENTHETICAL_PLACEMENT ?? 0,
    objectionNormalizations: categories.OBJECTION_PLACEMENT ?? 0,
    colloquyReconstructions: categories.COLLOQUY_TRANSITION ?? 0,
    deterministicCorrections: result.appliedRepairs.reduce((sum, repair) => sum + repair.count, 0),
    totalRepairs: result.burden.total,
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function weightedScore(metrics: Omit<BenchmarkMetrics, "overallScore">, configuration: BenchmarkConfiguration): number {
  const weights = configuration.weights;
  const repairQuality = clamp(100 - metrics.reconstructionRepairs * 2);
  const editingEfficiency = clamp(100 - metrics.manualCorrectionEstimate.minutes * 2);
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) return 0;
  const score =
    clamp(100 - metrics.wordErrorRate * 100) * weights.wordAccuracy +
    ((metrics.questionRecovery + metrics.answerAccuracy) / 2) * weights.qaRecovery +
    metrics.speaker.accuracy * weights.speakerAccuracy +
    repairQuality * weights.reconstruction +
    metrics.paragraphAccuracy * weights.paragraphs +
    metrics.objectionRecovery * weights.objections +
    metrics.colloquyRecovery * weights.colloquy +
    editingEfficiency * weights.editing;
  return round(score / totalWeight);
}

export function calculateMetrics(
  candidate: BenchmarkCandidate,
  transcript: BenchmarkTranscript,
  certifiedTranscript: string,
  configuration: BenchmarkConfiguration,
): BenchmarkMetrics {
  const comparison = compareTranscripts(certifiedTranscript, transcript);
  const stageS = stageSMetrics(candidate, transcript);
  const totalWords = transcript.utterances.reduce((sum, utterance) => sum + utterance.words.length, 0);
  const duration = transcript.utterances.reduce((sum, utterance) => sum + Math.max(0, utterance.end - utterance.start), 0);
  const speakerChanges = transcript.utterances.slice(1).filter((utterance, index) =>
    utterance.speaker !== transcript.utterances[index].speaker,
  ).length;
  const corrections = comparison.words.distance + comparison.speaker.incorrect + comparison.speaker.missed +
    comparison.splitQuestionCount + comparison.splitAnswerCount + comparison.mergedQuestionAnswerCount + stageS.totalRepairs;
  const withoutScore: Omit<BenchmarkMetrics, "overallScore"> = {
    setting: candidate.id,
    parameters: candidate.parameters,
    utteranceCount: transcript.utterances.length,
    averageUtteranceLength: round(totalWords / Math.max(1, transcript.utterances.length)),
    averageDuration: round(duration / Math.max(1, transcript.utterances.length)),
    speakerChanges,
    speakerPurity: round(comparison.speaker.accuracy),
    mergedSpeakerEvents: comparison.mergedQuestionAnswerCount,
    splitQuestionCount: comparison.splitQuestionCount,
    splitAnswerCount: comparison.splitAnswerCount,
    mergedQuestionAnswerCount: comparison.mergedQuestionAnswerCount,
    questionRecovery: round(comparison.questionRecovery),
    answerAccuracy: round(comparison.answerAccuracy),
    objectionRecovery: round(comparison.objectionRecovery),
    colloquyRecovery: round(comparison.colloquyRecovery),
    paragraphAccuracy: round(comparison.paragraphAccuracy),
    reconstructionRepairs: stageS.totalRepairs,
    manualCorrectionEstimate: {
      clicks: corrections * 2,
      corrections,
      minutes: round(corrections * 0.25),
      repairs: stageS.totalRepairs,
    },
    wordErrorRate: round(comparison.words.rate, 4),
    characterErrorRate: round(comparison.characters.rate, 4),
    insertions: comparison.words.insertions,
    deletions: comparison.words.deletions,
    substitutions: comparison.words.substitutions,
    alignmentScore: round(clamp(100 - comparison.words.rate * 100)),
    speaker: comparison.speaker,
    stageS,
  };
  return { ...withoutScore, overallScore: weightedScore(withoutScore, configuration) };
}

export class BenchmarkRunner {
  constructor(private readonly providers: readonly BenchmarkProvider[]) {}

  async run(input: {
    audio: Blob;
    certifiedTranscript: string;
    credential: string;
    configuration: BenchmarkConfiguration;
    onProgress?: (progress: BenchmarkProgress) => void;
  }): Promise<BenchmarkResult[]> {
    const provider = this.providers.find((item) => item.name === input.configuration.provider);
    if (!provider) throw new Error(`Benchmark provider "${input.configuration.provider}" is not registered.`);
    const candidates = expandParameterSweep(input.configuration);
    const results: BenchmarkResult[] = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const transcript = await provider.transcribe(input.audio, candidate, input.configuration, input.credential);
      results.push({
        candidate,
        effectiveConfiguration: {
          provider: input.configuration.provider,
          parameters: { ...input.configuration.baseConfiguration, ...candidate.parameters },
          keyterms: [...input.configuration.keyterms],
        },
        transcript,
        metrics: calculateMetrics(candidate, transcript, input.certifiedTranscript, input.configuration),
      });
      input.onProgress?.({ completed: index + 1, total: candidates.length, candidate });
    }
    return results;
  }
}
