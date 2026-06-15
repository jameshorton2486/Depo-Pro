import { describe, expect, it } from "vitest";

import { createOfflineDeepgramFixture } from "./offlineFixture";
import { normalizeTranscriptResponse } from "./normalize";
import {
  buildNormalizedTranscriptMetrics,
  buildReassemblyPreviewToken,
  buildStoredTranscriptMetrics,
  countMixedDeepgramUtterances,
  evaluateReassemblyEligibility,
} from "./reassembly";
import type { DeepgramResponse } from "./types";

function createMixedSpeakerResponse(): DeepgramResponse {
  const response = createOfflineDeepgramFixture("case_reassembly");
  const words = [
    { word: "Good", punctuated_word: "Good", start: 0, end: 0.2, confidence: 0.99, speaker: 0, speaker_confidence: 0.96 },
    { word: "afternoon", punctuated_word: "afternoon.", start: 0.2, end: 0.6, confidence: 0.98, speaker: 0, speaker_confidence: 0.96 },
    { word: "How", punctuated_word: "How", start: 0.6, end: 0.8, confidence: 0.95, speaker: 1, speaker_confidence: 0.92 },
    { word: "are", punctuated_word: "are", start: 0.8, end: 0.95, confidence: 0.94, speaker: 1, speaker_confidence: 0.92 },
    { word: "you", punctuated_word: "you?", start: 0.95, end: 1.1, confidence: 0.93, speaker: 0, speaker_confidence: 0.91 },
  ];

  response.results.channels[0].alternatives[0] = {
    transcript: "Good afternoon. How are you?",
    confidence: 0.958,
    words,
  };
  response.results.utterances = [{
    speaker: 0,
    start: 0,
    end: 1.1,
    transcript: "Good afternoon. How are you?",
    confidence: 0.958,
    words: words.map(({ speaker_confidence, ...word }) => word),
  }];

  return response;
}

describe("reassembly eligibility", () => {
  it("allows preview/apply when no protected downstream state exists", () => {
    expect(evaluateReassemblyEligibility({
      reviewStateCount: 0,
      suggestionCount: 0,
      certificationCount: 0,
      exportCount: 0,
    })).toEqual({
      canPreview: true,
      canApply: true,
      blockedReasons: [],
      impacts: {
        reviewStateImpact: "none",
        suggestionsImpact: "none",
        auditImpact: "append-rebuild-event",
        certificationImpact: "none",
        exportImpact: "none",
      },
    });
  });

  it("blocks rebuild when review state, suggestions, certification, or exports exist", () => {
    const result = evaluateReassemblyEligibility({
      reviewStateCount: 1,
      suggestionCount: 2,
      certificationCount: 1,
      exportCount: 3,
    });

    expect(result.canPreview).toBe(false);
    expect(result.canApply).toBe(false);
    expect(result.impacts.reviewStateImpact).toBe("blocked-existing-review-state");
    expect(result.impacts.suggestionsImpact).toBe("blocked-existing-suggestions");
    expect(result.impacts.certificationImpact).toBe("blocked-certified-case");
    expect(result.impacts.exportImpact).toBe("blocked-export-locked-case");
    expect(result.blockedReasons).toHaveLength(4);
  });
});

describe("reassembly metrics", () => {
  it("counts mixed persisted canonical utterances from stored rows", () => {
    const metrics = buildStoredTranscriptMetrics(
      [{ speaker_id: "spk_000" }, { speaker_id: "spk_001" }],
      [{ utterance_id: "utt_000000" }, { utterance_id: "utt_000001" }],
      [
        { utterance_id: "utt_000000", speaker_id: "spk_000" },
        { utterance_id: "utt_000000", speaker_id: "spk_001" },
        { utterance_id: "utt_000001", speaker_id: "spk_001" },
      ],
    );

    expect(metrics).toEqual({
      mixedCanonicalUtterances: 1,
      utteranceCount: 2,
      speakerCount: 2,
      wordCount: 3,
    });
  });

  it("reports zero mixed canonical utterances after latest normalization splits mixed speakers", () => {
    const normalized = normalizeTranscriptResponse(createMixedSpeakerResponse());

    expect(buildNormalizedTranscriptMetrics(normalized)).toEqual({
      mixedCanonicalUtterances: 0,
      utteranceCount: 3,
      speakerCount: 2,
      wordCount: 5,
    });
  });

  it("counts mixed raw Deepgram utterances from the authoritative source", () => {
    expect(countMixedDeepgramUtterances(createMixedSpeakerResponse())).toBe(1);
  });
});

describe("reassembly preview token", () => {
  it("changes when transcript version or metrics change", () => {
    const base = buildReassemblyPreviewToken({
      transcriptId: "tr_001",
      updatedAt: "2026-06-15T00:00:00.000Z",
      rawStoragePath: "raw/path.json",
      currentMetrics: {
        mixedCanonicalUtterances: 1,
        utteranceCount: 2,
        speakerCount: 2,
        wordCount: 3,
      },
      candidateMetrics: {
        mixedCanonicalUtterances: 0,
        utteranceCount: 3,
        speakerCount: 2,
        wordCount: 3,
      },
    });

    const changed = buildReassemblyPreviewToken({
      transcriptId: "tr_001",
      updatedAt: "2026-06-15T00:00:01.000Z",
      rawStoragePath: "raw/path.json",
      currentMetrics: {
        mixedCanonicalUtterances: 1,
        utteranceCount: 2,
        speakerCount: 2,
        wordCount: 3,
      },
      candidateMetrics: {
        mixedCanonicalUtterances: 0,
        utteranceCount: 3,
        speakerCount: 2,
        wordCount: 3,
      },
    });

    expect(changed).not.toBe(base);
  });
});
