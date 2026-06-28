import { describe, expect, it, vi } from "vitest";

import {
  AUTO_APPLY_THRESHOLD,
  buildUserMessage,
  generateAISuggestions,
  normalizeAndScore,
  PROMPT_VERSION,
} from "./aiSuggestionEngine";

function input() {
  return {
    transcriptId: "tr_1",
    utterances: [],
    correctionReport: {
      ambiguousFlags: [{
        word_id: "w_1",
        utterance_id: "utt_1",
        raw_text: "raiding",
        context_before: "pain was",
        context_after: "down my leg",
        flag_type: "LOW_CONFIDENCE",
      }],
      speakerIssues: [],
      unstructuredBlocks: [],
    },
    caseRecord: {
      causeNumber: "2025-CI-23267",
      caseStyle: "Etminan v. Example",
      witnessName: "Mohammad Etminan",
      examiningAttorney: "Dennis Bentley",
      opposingCounsel: "Opposing Counsel",
      reporterName: "Miah Bardot, CSR No. 12129",
      caseType: "medical_malpractice",
      jurisdiction: "Bexar County",
    },
  };
}

describe("aiSuggestionEngine", () => {
  it("builds user message with flagged token context", () => {
    const message = buildUserMessage(input());
    expect(message).toContain("[raiding]");
    expect(message).toContain("Dennis Bentley");
  });

  it("normalizes and scores AI suggestions", () => {
    const result = normalizeAndScore({
      wordSuggestions: [{
        word_id: "w_1",
        utterance_id: "utt_1",
        suggestion: "radiating",
        reason: "Medical context",
        confidence: 0.93,
      }],
      speakerSuggestions: [],
      structureSuggestions: [],
    });

    expect(result.wordSuggestions[0]?.auto_apply).toBe(true);
    expect(result.wordSuggestions[0]?.confidence).toBeGreaterThanOrEqual(AUTO_APPLY_THRESHOLD);
    expect(result.promptVersion).toBe(PROMPT_VERSION);
  });

  it("uses the transport and returns normalized suggestions", async () => {
    const transport = {
      createMessage: vi.fn().mockResolvedValue(JSON.stringify({
        wordSuggestions: [{
          word_id: "w_1",
          utterance_id: "utt_1",
          suggestion: "radiating",
          reason: "Medical context",
          confidence: 0.93,
        }],
        speakerSuggestions: [],
        structureSuggestions: [],
      })),
    };

    const result = await generateAISuggestions(input(), "test-key", transport);
    expect(transport.createMessage).toHaveBeenCalled();
    expect(result.wordSuggestions[0]?.suggestion).toBe("radiating");
    expect(result.wordSuggestions[0]?.auto_apply).toBe(true);
  });
});
