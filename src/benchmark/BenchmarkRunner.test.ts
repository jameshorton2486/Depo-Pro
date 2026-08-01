import { describe, expect, it } from "vitest";
import configuration from "../../benchmark.json";
import { expandParameterSweep } from "./BenchmarkRunner";
import { compareTranscripts } from "./TranscriptComparator";
import { buildBenchmarkReport } from "./BenchmarkReport";
import type { BenchmarkConfiguration, BenchmarkResult } from "./BenchmarkMetrics";

describe("benchmark parameter sweep", () => {
  it("expands the configured utt_split values without changing production configuration", () => {
    const candidates = expandParameterSweep(configuration as BenchmarkConfiguration);
    expect(candidates.map((candidate) => candidate.parameters.utt_split)).toEqual([0.6, 0.8, 1, 1.2, 1.5]);
  });
});

describe("transcript comparator", () => {
  it("calculates deterministic word edits", () => {
    const comparison = compareTranscripts("Q: Where do you work?\nA: At Home Depot.", {
      text: "Q: Where do you work? A: At Depot.",
      providerVersion: "synthetic-1",
      utterances: [
        { id: "1", speaker: "Q", text: "Where do you work?", start: 0, end: 1, words: ["Where", "do", "you", "work?"] },
        { id: "2", speaker: "A", text: "At Depot.", start: 1, end: 2, words: ["At", "Depot."] },
      ],
    });
    expect(comparison.words.deletions).toBe(1);
    expect(comparison.words.insertions).toBe(0);
    expect(comparison.words.substitutions).toBe(0);
    expect(comparison.speaker.accuracy).toBe(100);
  });
});

describe("benchmark report", () => {
  it("uses stable setting ids to break score ties", () => {
    const base = {
      transcript: { text: "", providerVersion: "synthetic-1", utterances: [] },
      metrics: {
        setting: "",
        parameters: {},
        utteranceCount: 0,
        averageUtteranceLength: 0,
        averageDuration: 0,
        speakerChanges: 0,
        speakerPurity: 0,
        mergedSpeakerEvents: 0,
        splitQuestionCount: 0,
        splitAnswerCount: 0,
        mergedQuestionAnswerCount: 0,
        questionRecovery: 0,
        answerAccuracy: 0,
        objectionRecovery: 0,
        colloquyRecovery: 0,
        paragraphAccuracy: 0,
        reconstructionRepairs: 0,
        manualCorrectionEstimate: { clicks: 0, corrections: 0, minutes: 0, repairs: 0 },
        wordErrorRate: 0,
        characterErrorRate: 0,
        insertions: 0,
        deletions: 0,
        substitutions: 0,
        alignmentScore: 100,
        speaker: { correct: 0, incorrect: 0, missed: 0, accuracy: 0, precision: 0, recall: 0 },
        stageS: { paragraphSplits: 0, paragraphMerges: 0, speakerRepairs: 0, speakerReassignments: 0, mergedUtterances: 0, splitUtterances: 0, structuralRepairs: 0, formattingRepairs: 0, editorialCorrections: 0, punctuationRepairs: 0, interruptionRepairs: 0, objectionNormalizations: 0, colloquyReconstructions: 0, deterministicCorrections: 0, totalRepairs: 0 },
        overallScore: 50,
      },
    };
    const results: BenchmarkResult[] = ["utt_split=1.0", "utt_split=0.8"].map((id) => ({
      ...base,
      candidate: { id, parameters: {} },
      effectiveConfiguration: { provider: "deepgram", parameters: { model: "nova-3" }, keyterms: [] },
      metrics: { ...base.metrics, setting: id },
    }));
    const report = buildBenchmarkReport({
      generatedAt: "2026-01-01T00:00:00.000Z",
      provider: "deepgram",
      audioName: "synthetic.wav",
      certifiedTranscriptName: "synthetic.txt",
      model: "nova-3",
      configuration: configuration as BenchmarkConfiguration,
      results,
    });
    expect(report.results.map((result) => result.candidate.id)).toEqual(["utt_split=0.8", "utt_split=1.0"]);
  });
});
