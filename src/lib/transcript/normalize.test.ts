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

function joinedUtteranceWords(
  normalized: ReturnType<typeof normalizeTranscriptResponse>,
  utteranceId: string,
): string {
  return normalized.words
    .filter((word) => word.utterance_id === utteranceId)
    .map((word) => word.raw_text)
    .join(" ");
}

describe("normalizeTranscriptResponse", () => {
  it("preserves speaker-homogeneous utterances when provided", () => {
    const normalized = normalizeTranscriptResponse(createOfflineDeepgramFixture("case_a"));
    expect(normalized.utterances).toHaveLength(2);
    expect(normalized.words[0]?.raw_text).toBe("Good");
    expect(normalized.words[2]?.is_filler).toBe(true);
  });

  it("splits provided utterances when the speaker changes inside a Deepgram utterance", () => {
    const response = createOfflineDeepgramFixture("case_mixed");
    const sourceWords = response.results.channels[0].alternatives[0].words;
    response.results.utterances = [
      {
        speaker: 0,
        start: 0,
        end: 5.58,
        transcript: "Good morning. Um, please state your name for the record. My name is Maria Lopez.",
        confidence: 0.95,
        words: sourceWords,
      },
    ];

    const normalized = normalizeTranscriptResponse(response);

    expect(normalized.utterances).toHaveLength(2);
    expect(normalized.utterances[0]).toEqual(expect.objectContaining({
      speaker_index: 0,
      text: "Good morning. Um, please state your name for the record.",
    }));
    expect(normalized.utterances[1]).toEqual(expect.objectContaining({
      speaker_index: 1,
      text: "My name is Maria Lopez.",
    }));
    expect(new Set(
      normalized.words
        .filter((word) => word.utterance_id === normalized.utterances[0]?.utterance_id)
        .map((word) => word.speaker_index),
    )).toEqual(new Set([0]));
    expect(new Set(
      normalized.words
        .filter((word) => word.utterance_id === normalized.utterances[1]?.utterance_id)
        .map((word) => word.speaker_index),
    )).toEqual(new Set([1]));
    expect(normalized.words).toHaveLength(sourceWords.length);
    expect(normalized.words.map((word) => word.word_id)).toEqual(
      sourceWords.map((_, index) => `w_${String(index).padStart(8, "0")}`),
    );
    expect(normalized.words.map((word) => word.start_time)).toEqual(sourceWords.map((word) => word.start));
    expect(normalized.words.map((word) => word.end_time)).toEqual(sourceWords.map((word) => word.end));
    expect(normalized.words.map((word) => word.confidence)).toEqual(
      sourceWords.map((word) => Number(word.confidence.toFixed(4))),
    );
    expect(normalized.words.map((word) => word.speaker_index)).toEqual(
      sourceWords.map((word) => word.speaker ?? 0),
    );
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
    if (response.results.utterances?.[0]?.words[0]) {
      response.results.utterances[0].words[0].punctuated_word = undefined;
    }

    const normalized = normalizeTranscriptResponse(response);
    expect(normalized.words[0]?.raw_text).toBe("good");
  });

  it("uses word-level speaker indices and rounds confidence to four decimals", () => {
    const response = createOfflineDeepgramFixture("case_d");
    if (response.results.utterances?.[0]) {
      response.results.utterances[0].speaker = 99;
    }
    if (response.results.utterances?.[0]?.words[0]) {
      response.results.utterances[0].words[0].speaker = 3;
      response.results.utterances[0].words[0].confidence = 0.987654321;
    }
    response.results.channels[0].alternatives[0].words[0].speaker = 3;
    response.results.channels[0].alternatives[0].words[0].confidence = 0.987654321;

    const normalized = normalizeTranscriptResponse(response);
    expect(normalized.words[0]?.speaker_index).toBe(3);
    expect(normalized.words[0]?.confidence).toBe(0.9877);
  });

  it("persists utterance text from canonical words when the transcript string is oversized", () => {
    const response = createOfflineDeepgramFixture("case_mixed");
    const sourceWords = response.results.channels[0].alternatives[0].words;
    response.results.utterances = [
      {
        speaker: 0,
        start: 0,
        end: 5.58,
        transcript: "Good morning. Um, please state your name for the record. My name is Maria Lopez. Extra duplicate text.",
        confidence: 0.95,
        words: sourceWords,
      },
    ];

    const normalized = normalizeTranscriptResponse(response);

    expect(normalized.utterances[0]?.text).toBe("Good morning. Um, please state your name for the record.");
    expect(normalized.utterances[0]?.text).toBe(
      joinedUtteranceWords(normalized, normalized.utterances[0]?.utterance_id ?? ""),
    );
    expect(normalized.utterances[0]?.text).not.toContain("Extra duplicate text.");
  });

  it("does not let a longer Deepgram utterance string override a short opening word span", () => {
    const response = createOfflineDeepgramFixture("case_opening");
    response.results.utterances = [
      {
        speaker: 0,
        start: 0,
        end: 0.96,
        transcript: "Good afternoon. We are on the record. Today's date is April 24, 2026.",
        confidence: 0.95,
        words: [
          {
            word: "Good",
            punctuated_word: "Good",
            start: 0,
            end: 0.32,
            confidence: 0.99,
            speaker: 0,
          },
          {
            word: "afternoon",
            punctuated_word: "afternoon.",
            start: 0.32,
            end: 0.96,
            confidence: 0.99,
            speaker: 0,
          },
        ],
      },
    ];
    response.results.channels[0].alternatives[0].words = [...response.results.utterances[0].words];

    const normalized = normalizeTranscriptResponse(response);

    expect(normalized.utterances[0]?.text).toBe("Good afternoon.");
    expect(normalized.utterances[0]?.text).toBe(
      joinedUtteranceWords(normalized, normalized.utterances[0]?.utterance_id ?? ""),
    );
  });

  it("keeps every normalized utterance text equal to its ordered canonical raw_text tokens", () => {
    const response = createOfflineDeepgramFixture("case_integrity_text");
    response.results.utterances = [
      {
        speaker: 0,
        start: 0,
        end: 0.96,
        transcript: "Good afternoon. We are on the record.",
        confidence: 0.95,
        words: [
          {
            word: "Good",
            punctuated_word: "Good",
            start: 0,
            end: 0.32,
            confidence: 0.99,
            speaker: 0,
          },
          {
            word: "afternoon",
            punctuated_word: "afternoon.",
            start: 0.32,
            end: 0.96,
            confidence: 0.99,
            speaker: 0,
          },
        ],
      },
      {
        speaker: 1,
        start: 1.2,
        end: 2.4,
        transcript: "Yes. This is cause number C572224.",
        confidence: 0.95,
        words: [
          {
            word: "Yes",
            punctuated_word: "Yes.",
            start: 1.2,
            end: 1.5,
            confidence: 0.99,
            speaker: 1,
          },
          {
            word: "This",
            punctuated_word: "This",
            start: 1.5,
            end: 1.7,
            confidence: 0.99,
            speaker: 1,
          },
          {
            word: "is",
            punctuated_word: "is",
            start: 1.7,
            end: 1.85,
            confidence: 0.99,
            speaker: 1,
          },
          {
            word: "cause",
            punctuated_word: "cause",
            start: 1.85,
            end: 2,
            confidence: 0.99,
            speaker: 1,
          },
          {
            word: "number",
            punctuated_word: "number",
            start: 2,
            end: 2.15,
            confidence: 0.99,
            speaker: 1,
          },
          {
            word: "C572224",
            punctuated_word: "C572224.",
            start: 2.15,
            end: 2.4,
            confidence: 0.99,
            speaker: 1,
          },
        ],
      },
    ];
    response.results.channels[0].alternatives[0].words = response.results.utterances.flatMap(
      (utterance) => utterance.words,
    );

    const normalized = normalizeTranscriptResponse(response);

    for (const utterance of normalized.utterances) {
      expect(utterance.text).toBe(joinedUtteranceWords(normalized, utterance.utterance_id));
    }
  });
});
