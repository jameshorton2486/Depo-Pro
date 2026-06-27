import { describe, expect, it } from "vitest";

import type { EditorDocument, Speaker } from "../../api/types";
import { buildCorrectionReport } from "./correctionOrchestrator";

function makeDocument(overrides?: {
  wordText?: string;
  rawText?: string;
  confidence?: number;
  displayName?: string;
  role?: Speaker["role"];
}): EditorDocument {
  const speaker: Speaker = {
    speaker_id: "spk_001",
    display_name: overrides?.displayName ?? "MR. TEST",
    deepgram_speaker: 0,
  };
  if (Object.prototype.hasOwnProperty.call(overrides ?? {}, "role")) {
    if (overrides?.role !== undefined) {
      speaker.role = overrides.role;
    }
  } else {
    speaker.role = "ATTORNEY";
  }

  return {
    job_id: "job_001",
    media_url: "",
    duration: 10,
    speakers: [speaker],
    utterances: [{
      utterance_id: "utt_001",
      speaker_id: speaker.speaker_id,
      start_time: 0,
      end_time: 1,
      word_ids: ["w_001"],
    }],
    words: [{
      word_id: "w_001",
      text: overrides?.wordText ?? "hello",
      raw_text: overrides?.rawText ?? overrides?.wordText ?? "hello",
      speaker_id: speaker.speaker_id,
      utterance_id: "utt_001",
      start_time: 0,
      end_time: 0.5,
      confidence: overrides?.confidence ?? 0.99,
      reviewed: false,
      edited: false,
    }],
  };
}

function makePhraseDocument(words: string[]): EditorDocument {
  return {
    job_id: "job_phrase",
    media_url: "",
    duration: 10,
    speakers: [{
      speaker_id: "spk_001",
      display_name: "MR. TEST",
      deepgram_speaker: 0,
      role: "ATTORNEY",
    }],
    utterances: [{
      utterance_id: "utt_001",
      speaker_id: "spk_001",
      start_time: 0,
      end_time: 1,
      word_ids: words.map((_word, index) => `w_${index + 1}`),
    }],
    words: words.map((word, index) => ({
      word_id: `w_${index + 1}`,
      text: word,
      raw_text: word,
      speaker_id: "spk_001",
      utterance_id: "utt_001",
      start_time: index * 0.1,
      end_time: index * 0.1 + 0.05,
      confidence: 0.99,
      reviewed: false,
      edited: false,
    })),
  };
}

describe("buildCorrectionReport", () => {
  it("classifies low confidence words correctly", () => {
    const doc = makeDocument({ wordText: "trauma", rawText: "trauma", confidence: 0.45 });
    const report = buildCorrectionReport(doc);
    expect(report.summary.low_confidence_words).toBe(1);
    expect(report.low_confidence[0].raw_token).toBe("trauma");
    expect(report.low_confidence[0].layer).toBe("LOW_CONFIDENCE");
  });

  it("classifies deterministic token corrections", () => {
    const doc = makeDocument({ wordText: "scroiliac", rawText: "scroiliac", confidence: 0.9 });
    const report = buildCorrectionReport(doc);
    expect(report.summary.deterministic_corrections_applied).toBeGreaterThan(0);
    const correction = report.deterministic_corrections.find((d) => d.raw_token === "scroiliac");
    expect(correction?.corrected_token).toBe("sacroiliac");
    expect(correction?.layer).toBe("DETERMINISTIC");
  });

  it("classifies ambiguous flags with likely meaning", () => {
    const doc = makeDocument({ wordText: "accent", rawText: "accent", confidence: 0.85 });
    const report = buildCorrectionReport(doc);
    expect(report.summary.ambiguous_flags).toBe(1);
    expect(report.ambiguous_flags[0].likely_meaning).toBe("accident");
    expect(report.ambiguous_flags[0].layer).toBe("AMBIGUOUS_FLAG");
  });

  it("classifies implausible money", () => {
    const doc = makeDocument({ wordText: "$7.50", rawText: "$7.50", confidence: 0.9 });
    const report = buildCorrectionReport(doc);
    expect(report.summary.implausible_money_flags).toBe(1);
    expect(report.implausible_money[0].layer).toBe("IMPLAUSIBLE_MONEY");
  });

  it("flags speakers with no role", () => {
    const doc = makeDocument({ role: undefined });
    const report = buildCorrectionReport(doc);
    expect(report.summary.speaker_issues).toBeGreaterThan(0);
    expect(report.speaker_issues[0].description).toContain("no role assigned");
  });

  it("flags generic speaker display names", () => {
    const doc = makeDocument({ displayName: "SPEAKER 0", role: "OTHER" });
    const report = buildCorrectionReport(doc);
    const generic = report.speaker_issues.find((s) => s.description.includes("Generic speaker label"));
    expect(generic).toBeDefined();
  });

  it("produces retranscription candidates from deterministic corrections", () => {
    const doc = makeDocument({ wordText: "scroiliac", rawText: "scroiliac", confidence: 0.9 });
    const report = buildCorrectionReport(doc);
    const candidate = report.retranscription_candidates.find((c) => c.keyterm === "sacroiliac");
    expect(candidate).toBeDefined();
  });

  it("detects deterministic phrase corrections", () => {
    const doc = makePhraseDocument(["visible", "therapy"]);
    const report = buildCorrectionReport(doc);
    const phrase = report.deterministic_corrections.find((d) => d.raw_token === "visible therapy");
    expect(phrase?.corrected_token).toBe("physical therapy");
  });

  it("does not mutate the document", () => {
    const doc = makeDocument({ wordText: "accent", rawText: "accent", confidence: 0.85 });
    const originalText = doc.words[0].text;
    buildCorrectionReport(doc);
    expect(doc.words[0].text).toBe(originalText);
  });

  it("report is empty for a clean document", () => {
    const doc = makeDocument({ wordText: "hello", rawText: "hello", confidence: 0.99, displayName: "MR. TEST", role: "ATTORNEY" });
    const report = buildCorrectionReport(doc);
    expect(report.summary.ambiguous_flags).toBe(0);
    expect(report.summary.implausible_money_flags).toBe(0);
    expect(report.summary.speaker_issues).toBe(0);
  });
});
