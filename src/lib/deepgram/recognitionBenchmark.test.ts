import { describe, expect, it } from "vitest";

import { scoreRecognitionBenchmark } from "./recognitionBenchmark";

describe("scoreRecognitionBenchmark", () => {
  it("scores transcript, keyterm, speaker, and correction quality", () => {
    const result = scoreRecognitionBenchmark({
      referenceWords: ["Please", "state", "your", "name", "Maria", "Lopez"],
      hypothesisWords: ["Please", "state", "your", "name", "Marie", "Lopez"],
      keyterms: ["Maria Lopez", "state your name"],
      referenceSpeakers: [0, 0, 0, 0, 1, 1],
      hypothesisSpeakers: [0, 0, 0, 0, 0, 1],
      manualCorrectionCount: 1,
    });

    expect(result.wordErrorRate).toBeCloseTo(1 / 6);
    expect(result.keytermRecall).toBe(0.5);
    expect(result.speakerConfusionRate).toBeCloseTo(1 / 6);
    expect(result.manualCorrectionsPerThousandWords).toBeCloseTo(1000 / 6);
  });
});
