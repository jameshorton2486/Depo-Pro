import { describe, expect, it, vi } from "vitest";

import {
  AUTO_APPLY_THRESHOLD,
  buildSuggestionCaseRecord,
  buildUserMessage,
  generateAISuggestions,
  normalizeAndScore,
  PROMPT_VERSION,
} from "./aiSuggestionEngine";
import { emptyCaseRecord } from "../../types/case";

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

  // Tier 2 edge case — zero flagged words: a null / empty / malformed AI payload
  // must normalize to empty arrays, never crash the review pipeline.
  it("returns empty suggestion arrays for null, empty, or malformed payloads", () => {
    for (const raw of [null, undefined, {}, { wordSuggestions: "not-an-array" }, 42, "text"]) {
      const result = normalizeAndScore(raw);
      expect(result.wordSuggestions).toEqual([]);
      expect(result.speakerSuggestions).toEqual([]);
      expect(result.structureSuggestions).toEqual([]);
      expect(result.promptVersion).toBe(PROMPT_VERSION);
    }
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

describe("buildSuggestionCaseRecord reporter identity (§14/§57)", () => {
  it("derives reporter name and CSR from canonical case data", () => {
    const record = emptyCaseRecord("case_reporter", "2026-06-05T20:00:00.000Z");
    record.reporter.name.value = "Jane Q. Public";
    record.reporter.cert_number.value = "99999";
    expect(buildSuggestionCaseRecord(record).reporterName).toBe("Jane Q. Public, CSR No. 99999");
  });

  it("omits the CSR suffix when only a reporter name is present", () => {
    const record = emptyCaseRecord("case_name_only", "2026-06-05T20:00:00.000Z");
    record.reporter.name.value = "Chris Reporter";
    expect(buildSuggestionCaseRecord(record).reporterName).toBe("Chris Reporter");
  });

  it("represents a missing reporter as empty — never a fabricated default", () => {
    const empty = buildSuggestionCaseRecord(emptyCaseRecord("case_empty", "2026-06-05T20:00:00.000Z"));
    expect(empty.reporterName).toBe("");
    expect(buildSuggestionCaseRecord(null).reporterName).toBe("");
    expect(buildSuggestionCaseRecord(undefined).reporterName).toBe("");
    // Guard against regression to any hardcoded benchmark reporter.
    expect(empty.reporterName).not.toContain("Miah");
    expect(empty.reporterName).not.toContain("12129");
  });
});
