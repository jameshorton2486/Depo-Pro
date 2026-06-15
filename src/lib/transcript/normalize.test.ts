import { describe, expect, it } from "vitest";

import { createOfflineDeepgramFixture } from "./offlineFixture";
import { normalizeTranscriptResponse } from "./normalize";
import type { DeepgramResponse } from "./types";

function makeResponse(overrides: Partial<DeepgramResponse>): DeepgramResponse {
  return {
    ...createOfflineDeepgramFixture("case_normalize"),
    ...overrides,
  };
}

function createMixedSpeakerUtteranceResponse(): DeepgramResponse {
  const response = createOfflineDeepgramFixture("case_mixed_speakers");
  const mixedWords = [
    { word: "Good", punctuated_word: "Good", start: 0, end: 0.2, confidence: 0.99, speaker: 0, speaker_confidence: 0.97 },
    { word: "afternoon", punctuated_word: "afternoon.", start: 0.2, end: 0.6, confidence: 0.98, speaker: 0, speaker_confidence: 0.97 },
    { word: "How", punctuated_word: "How", start: 0.6, end: 0.8, confidence: 0.96, speaker: 1, speaker_confidence: 0.94 },
    { word: "are", punctuated_word: "are", start: 0.8, end: 0.95, confidence: 0.95, speaker: 1, speaker_confidence: 0.94 },
    { word: "you", punctuated_word: "you?", start: 0.95, end: 1.1, confidence: 0.94, speaker: 0, speaker_confidence: 0.93 },
  ];

  response.results.channels[0].alternatives[0] = {
    transcript: "Good afternoon. How are you?",
    confidence: 0.964,
    words: mixedWords,
  };
  response.results.utterances = [
    {
      speaker: 0,
      start: 0,
      end: 1.1,
      transcript: "Good afternoon. How are you?",
      confidence: 0.964,
      words: mixedWords.map(({ speaker_confidence, ...word }) => word),
    },
  ];

  return response;
}

describe("normalizeTranscriptResponse", () => {
  it("preserves utterances one-to-one when provided", () => {
    const normalized = normalizeTranscriptResponse(createOfflineDeepgramFixture("case_a"));
    expect(normalized.utterances).toHaveLength(2);
    expect(normalized.words[0]?.raw_text).toBe("Good");
    expect(normalized.words[2]?.is_filler).toBe(true);
  });

  it("falls back to flat words when utterances are missing", () => {
    const response = makeResponse({
      results: {
        channels: createOfflineDeepgramFixture("case_b").results.channels,
        utterances: undefined,
      },
    });

    const normalized = normalizeTranscriptResponse(response);
    expect(normalized.utterances.length).toBeGreaterThan(0);
    expect(normalized.words).toHaveLength(
      response.results.channels[0]?.alternatives[0]?.words.length ?? 0,
    );
  });

  it("falls back to bare word when punctuated_word is missing", () => {
    const response = createOfflineDeepgramFixture("case_c");
    response.results.channels[0].alternatives[0].words[0].punctuated_word = undefined;
    response.results.utterances?.[0]?.words[0] && (response.results.utterances[0].words[0].punctuated_word = undefined);

    const normalized = normalizeTranscriptResponse(response);
    expect(normalized.words[0]?.raw_text).toBe("good");
  });

  it("uses word-level speaker indices and rounds confidence to four decimals", () => {
    const response = createOfflineDeepgramFixture("case_d");
    response.results.utterances?.[0] && (response.results.utterances[0].speaker = 99);
    response.results.utterances?.[0]?.words[0] && (response.results.utterances[0].words[0].speaker = 3);
    response.results.utterances?.[0]?.words[0] && (response.results.utterances[0].words[0].confidence = 0.987654321);
    response.results.channels[0].alternatives[0].words[0].speaker = 3;
    response.results.channels[0].alternatives[0].words[0].confidence = 0.987654321;

    const normalized = normalizeTranscriptResponse(response);
    expect(normalized.words[0]?.speaker_index).toBe(3);
    expect(normalized.words[0]?.confidence).toBe(0.9877);
  });

  it("currently preserves a mixed-speaker Deepgram utterance as one canonical utterance", () => {
    const response = createMixedSpeakerUtteranceResponse();

    const normalized = normalizeTranscriptResponse(response);

    expect(normalized.utterances).toHaveLength(3);
    expect(normalized.utterances.map((utterance) => utterance.utterance_id)).toEqual([
      "utt_000000",
      "utt_000000_s001",
      "utt_000000_s002",
    ]);
    expect(normalized.words.map((word) => word.utterance_id)).toEqual([
      "utt_000000",
      "utt_000000",
      "utt_000000_s001",
      "utt_000000_s001",
      "utt_000000_s002",
    ]);
    expect(normalized.utterances.map((utterance) => utterance.speaker_index)).toEqual([0, 1, 0]);
  });

  it("produces only speaker-pure canonical utterances after normalization", () => {
    const response = createMixedSpeakerUtteranceResponse();

    const normalized = normalizeTranscriptResponse(response);
    const wordSpeakerSets = normalized.utterances.map((utterance) => new Set(
      normalized.words
        .filter((word) => word.utterance_id === utterance.utterance_id)
        .map((word) => word.speaker_index),
    ));

    expect(wordSpeakerSets).toEqual([
      new Set([0]),
      new Set([1]),
      new Set([0]),
    ]);
    expect(normalized.utterances.map((utterance) => utterance.text)).toEqual([
      "Good afternoon.",
      "How are",
      "you?",
    ]);
  });

  it("preserves word stream, ordering, and counts when splitting mixed-speaker utterances", () => {
    const response = createMixedSpeakerUtteranceResponse();

    const normalized = normalizeTranscriptResponse(response);
    const sourceWords = response.results.utterances?.[0]?.words ?? [];

    expect(normalized.words).toHaveLength(sourceWords.length);
    expect(normalized.words.map((word) => word.raw_text)).toEqual(
      sourceWords.map((word) => word.punctuated_word ?? word.word),
    );
    expect(normalized.words.map((word) => word.word_index)).toEqual([0, 1, 2, 3, 4]);
    expect(normalized.speakers.map((speaker) => speaker.speaker_index)).toEqual([0, 1]);
    expect(normalized.words.map((word) => [word.start_time, word.end_time, word.confidence])).toEqual(
      sourceWords.map((word) => [
        word.start,
        word.end,
        Number(word.confidence.toFixed(4)),
      ]),
    );
  });
});
