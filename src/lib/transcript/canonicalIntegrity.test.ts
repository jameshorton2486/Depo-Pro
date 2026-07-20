import { describe, expect, it } from "vitest";

import { auditCanonicalTranscript } from "./canonicalIntegrity";
import { normalizeTranscriptResponse } from "./normalize";
import { createOfflineDeepgramFixture } from "./offlineFixture";
import type { NormalizedTranscriptData } from "./normalize";

function buildNormalized(): NormalizedTranscriptData {
  return normalizeTranscriptResponse(createOfflineDeepgramFixture("case_integrity"));
}

describe("auditCanonicalTranscript", () => {
  it("passes a clean normalized transcript", () => {
    const normalized = buildNormalized();
    const result = auditCanonicalTranscript({
      normalized,
      segments: [{
        source_audio_id: "audio_0",
        source_index: 0,
        source_filename: "source.mp3",
        mime_type: "audio/mpeg",
        storage_path: "cases/demo/source.mp3",
        media_url: null,
        start_offset_seconds: 0,
        duration_seconds: normalized.durationSeconds,
      }],
    });

    expect(result.integrity_passed).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("fails when utterance text is oversized relative to canonical words", () => {
    const normalized = buildNormalized();
    normalized.utterances[0] = {
      ...normalized.utterances[0],
      text: `${normalized.utterances[0]?.text} We are on the record.`,
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("does not equal joined canonical words"))).toBe(true);
  });

  it("fails on orphaned canonical words", () => {
    const normalized = buildNormalized();
    normalized.words[0] = {
      ...normalized.words[0],
      utterance_id: "missing_utterance",
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("references missing utterance"))).toBe(true);
  });

  it("fails when a word references a missing speaker", () => {
    const normalized = buildNormalized();
    normalized.words[0] = {
      ...normalized.words[0],
      speaker_id: "missing_speaker",
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("references missing speaker"))).toBe(true);
  });

  it("warns when words in an utterance drift to a different speaker", () => {
    const normalized = buildNormalized();
    normalized.words[0] = {
      ...normalized.words[0],
      speaker_id: normalized.speakers[1]?.speaker_id ?? "spk_other",
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("word-level speaker changes"))).toBe(true);
  });

  it("fails on duplicate canonical speaker IDs", () => {
    const normalized = buildNormalized();
    normalized.speakers[1] = {
      ...normalized.speakers[1],
      speaker_id: normalized.speakers[0]?.speaker_id ?? "spk_000",
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Duplicate canonical speaker_id"))).toBe(true);
  });

  it("fails when an utterance ends before it starts", () => {
    const normalized = buildNormalized();
    normalized.utterances[0] = {
      ...normalized.utterances[0],
      start_time: 5,
      end_time: 4,
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("ends before it starts"))).toBe(true);
  });
  it("fails on duplicate canonical utterance IDs", () => {
    const normalized = buildNormalized();
    normalized.utterances[1] = {
      ...normalized.utterances[1],
      utterance_id: normalized.utterances[0]?.utterance_id ?? "utt_000000",
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Duplicate canonical utterance_id"))).toBe(true);
  });

  it("fails on invalid canonical timestamps", () => {
    const normalized = buildNormalized();
    normalized.words[0] = {
      ...normalized.words[0],
      start_time: Number.NaN,
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("has invalid timing"))).toBe(true);
  });

  it("warns when an utterance does not bound its canonical words", () => {
    const normalized = buildNormalized();
    normalized.utterances[0] = {
      ...normalized.utterances[0],
      end_time: (normalized.utterances[0]?.start_time ?? 0) + 0.01,
    };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("does not bound its canonical words"))).toBe(true);
  });
  it("fails on an orphaned canonical utterance", () => {
    const normalized = buildNormalized();
    normalized.words = normalized.words.filter((word) => word.utterance_id !== normalized.utterances[0]?.utterance_id);

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("has no canonical words"))).toBe(true);
  });

  it("fails on duplicate canonical word IDs", () => {
    const normalized = buildNormalized();
    normalized.words[1] = { ...normalized.words[1], word_id: normalized.words[0]?.word_id ?? "word_000" };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Duplicate canonical word_id"))).toBe(true);
  });

  it("fails when a canonical word ends before it starts", () => {
    const normalized = buildNormalized();
    normalized.words[0] = { ...normalized.words[0], start_time: 2, end_time: 1 };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("ends before it starts"))).toBe(true);
  });

  it("fails when canonical word timing regresses", () => {
    const normalized = buildNormalized();
    normalized.words[1] = { ...normalized.words[1], start_time: -0.01, end_time: 0.02 };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("invalid timing") || failure.includes("timing order regressed"))).toBe(true);
  });
  it("fails on suspicious adjacent duplicate spans with wording drift", () => {
    const normalized = buildNormalized();
    normalized.utterances = [
      {
        ...normalized.utterances[0],
        utterance_id: "utt_000000",
        utterance_index: 0,
        text: "We are on the record today's date is April 24 2026 and the time is now 1 27 PM",
      },
      {
        ...normalized.utterances[1],
        utterance_id: "utt_000001",
        utterance_index: 1,
        text: "We are on the record today's date is April 24 2026 and the time is now 01 27PM",
      },
    ];
    normalized.words = [
      { ...normalized.words[0], utterance_id: "utt_000000", word_index: 0, raw_text: "We", start_time: 0, end_time: 0.1 },
      { ...normalized.words[1], utterance_id: "utt_000000", word_index: 1, raw_text: "are", start_time: 0.1, end_time: 0.2 },
      { ...normalized.words[2], utterance_id: "utt_000001", word_index: 2, raw_text: "We", start_time: 2, end_time: 2.1 },
      { ...normalized.words[3], utterance_id: "utt_000001", word_index: 3, raw_text: "are", start_time: 2.1, end_time: 2.2 },
    ];

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Suspicious duplicate canonical span"))).toBe(true);
  });

  it("warns when a single-source transcript exceeds the auto-chunk threshold", () => {
    const normalized = buildNormalized();
    const result = auditCanonicalTranscript({
      normalized,
      segments: [{
        source_audio_id: "audio_0",
        source_index: 0,
        source_filename: "source.mp3",
        mime_type: "audio/mpeg",
        storage_path: "cases/demo/source.mp3",
        media_url: null,
        start_offset_seconds: 0,
        duration_seconds: 5000,
      }],
    });

    expect(result.warnings.some((warning) => warning.includes("Single-source finalize exceeded auto-chunk threshold"))).toBe(true);
  });
});
