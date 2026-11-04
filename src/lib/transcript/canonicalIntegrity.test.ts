import { describe, expect, it } from "vitest";

import { auditCanonicalTranscript } from "./canonicalIntegrity";
import { normalizeTranscriptResponse } from "./normalize";
import { createOfflineDeepgramFixture } from "./offlineFixture";
import type { NormalizedTranscriptData } from "./normalize";

function buildNormalized(): NormalizedTranscriptData {
  return normalizeTranscriptResponse(createOfflineDeepgramFixture("case_integrity"));
}

function buildTwoUtteranceNormalized(leftText: string, rightText: string, rightStartTime: number): NormalizedTranscriptData {
  const leftTokens = leftText.split(/\s+/);
  const rightTokens = rightText.split(/\s+/);
  const speaker = {
    speaker_id: "spk_000",
    speaker_index: 0,
    speaker_label: "Speaker 0",
    assigned_name: null,
    speaker_role: null,
    word_count: leftTokens.length + rightTokens.length,
  };
  const words = [...leftTokens, ...rightTokens].map((rawText, wordIndex) => {
    const isRight = wordIndex >= leftTokens.length;
    const localIndex = isRight ? wordIndex - leftTokens.length : wordIndex;
    const start = (isRight ? rightStartTime : 0) + localIndex * 0.2;
    return {
      word_id: `w_${String(wordIndex).padStart(8, "0")}`,
      utterance_id: isRight ? "utt_000001" : "utt_000000",
      word_index: wordIndex,
      raw_text: rawText,
      working_text: null,
      speaker_id: speaker.speaker_id,
      speaker_index: 0,
      start_time: start,
      end_time: start + 0.1,
      confidence: 0.99,
      is_filler: false,
      reviewed: false,
      edited: false,
    };
  });
  const leftWords = words.filter((word) => word.utterance_id === "utt_000000");
  const rightWords = words.filter((word) => word.utterance_id === "utt_000001");
  return {
    durationSeconds: rightWords[rightWords.length - 1]?.end_time ?? 0,
    avgConfidence: 0.99,
    speakers: [speaker],
    utterances: [
      {
        utterance_id: "utt_000000",
        utterance_index: 0,
        speaker_id: speaker.speaker_id,
        speaker_index: 0,
        speaker_label: speaker.speaker_label,
        start_time: leftWords[0]?.start_time ?? 0,
        end_time: leftWords[leftWords.length - 1]?.end_time ?? 0,
        text: leftText,
        avg_confidence: 0.99,
      },
      {
        utterance_id: "utt_000001",
        utterance_index: 1,
        speaker_id: speaker.speaker_id,
        speaker_index: 0,
        speaker_label: speaker.speaker_label,
        start_time: rightWords[0]?.start_time ?? rightStartTime,
        end_time: rightWords[rightWords.length - 1]?.end_time ?? rightStartTime,
        text: rightText,
        avg_confidence: 0.99,
      },
    ],
    words,
  };
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

  it("warns on a partially overlapping canonical word span", () => {
    const normalized = buildNormalized();
    normalized.words[1] = { ...normalized.words[1], start_time: 0.05, end_time: 0.5 };

    const result = auditCanonicalTranscript({ normalized });

    expect(result.warnings.some((warning) => warning.includes("Overlapping canonical word timings"))).toBe(true);
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
  it("fails on suspicious adjacent duplicate spans only when timing also overlaps", () => {
    const normalized = buildTwoUtteranceNormalized(
      "We are on the record today's date is April 24 2026 and the time is now 1 27 PM",
      "We are on the record today's date is April 24 2026 and the time is now 01 27PM",
      0.8,
    );

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Suspicious duplicate canonical span"))).toBe(true);
  });

  it("warns instead of failing for similar but time-separated follow-up questions", () => {
    const normalized = buildTwoUtteranceNormalized(
      "So you've seen somebody get hit with a with merchandise Correct",
      "Okay So you've seen somebody get bumped with a cart with merchandise Correct",
      5,
    );

    const result = auditCanonicalTranscript({ normalized });

    expect(result.integrity_passed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes("Similar adjacent canonical span"))).toBe(true);
  });
  it("accepts a long single-source transcript when production auto-chunking is disabled", () => {
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

    expect(result.warnings.some((warning) => warning.includes("Single-source finalize exceeded auto-chunk threshold"))).toBe(false);
    expect(result.metrics.exceeded_auto_chunk_threshold).toBe(false);
  });

  it("preserves the long single-source warning for explicit auto-chunk opt-in", () => {
    const normalized = buildNormalized();
    const result = auditCanonicalTranscript({
      normalized,
      autoChunkingEnabled: true,
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
    expect(result.metrics.exceeded_auto_chunk_threshold).toBe(true);
  });

  it("fails a zero-word transcript instead of passing it as complete", () => {
    const result = auditCanonicalTranscript({
      normalized: {
        durationSeconds: 30,
        avgConfidence: null,
        speakers: [],
        utterances: [],
        words: [],
      },
    });

    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("no recognized words"))).toBe(true);
  });
});
