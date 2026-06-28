import { describe, expect, it } from "vitest";

import { createOfflineDeepgramFixture } from "./offlineFixture";
import { integrityAudit } from "./integrityAudit";
import type { DeepgramResponse } from "./types";

function cloneFixture(): DeepgramResponse {
  return structuredClone(createOfflineDeepgramFixture("case_integrity"));
}

describe("integrityAudit", () => {
  it("fails when the top-level results key is missing", () => {
    const response = cloneFixture() as unknown as Record<string, unknown>;
    delete response.results;

    const result = integrityAudit(response as unknown as DeepgramResponse);
    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Missing top-level key 'results'"))).toBe(true);
  });

  it("fails when an utterance speaker key is missing", () => {
    const response = cloneFixture();
    delete (response.results.utterances?.[0] as Record<string, unknown>).speaker;

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Utterance[0] missing key 'speaker'"))).toBe(true);
  });

  it("fails when utterances are out of order", () => {
    const response = cloneFixture();
    if (response.results.utterances?.[1]) {
      response.results.utterances[1].start = -1;
    }

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("ordering violation"))).toBe(true);
  });

  it("fails on overlap greater than 0.1 seconds", () => {
    const response = cloneFixture();
    if (response.results.utterances?.[1]) {
      response.results.utterances[1].start = 2.8;
    }

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Impossible overlap"))).toBe(true);
  });

  it("fails when utterances have no speaker IDs", () => {
    const response = cloneFixture();
    if (response.results.utterances) {
      response.results.utterances.forEach((utterance) => {
        utterance.speaker = undefined;
      });
    }

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("has no speaker ID assigned"))).toBe(true);
  });

  it("fails on duplicate word IDs", () => {
    const response = cloneFixture();
    const utterances = response.results.utterances ?? [];
    const firstWord = utterances[0]?.words[0] as Record<string, unknown> | undefined;
    const secondWord = utterances[1]?.words[0] as Record<string, unknown> | undefined;
    if (firstWord && secondWord) {
      firstWord.id = "dup_word";
      secondWord.id = "dup_word";
    }

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Duplicate word IDs found"))).toBe(true);
  });

  it("warns but passes when low confidence rate exceeds 40%", () => {
    const response = cloneFixture();
    const allWords = response.results.utterances?.flatMap((utterance) => utterance.words) ?? [];
    allWords.forEach((word, index) => {
      word.confidence = index < 7 ? 0.5 : 0.95;
    });

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("below 0.70 confidence"))).toBe(true);
  });

  it("does not record gaps below 30 seconds", () => {
    const response = cloneFixture();
    if (response.results.utterances?.[1]) {
      response.results.utterances[1].start = 28.06;
      response.results.utterances[1].end = 29.64;
      response.results.utterances[1].words.forEach((word) => {
        word.start += 24.06;
        word.end += 24.06;
      });
    }

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.gaps).toHaveLength(0);
  });

  it("records warning gaps at or above 30 seconds", () => {
    const response = cloneFixture();
    if (response.results.utterances?.[1]) {
      response.results.utterances[1].start = 38.06;
      response.results.utterances[1].end = 39.64;
      response.results.utterances[1].words.forEach((word) => {
        word.start += 34.06;
        word.end += 34.06;
      });
    }

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.gaps).toEqual([{ position: 1, duration_seconds: 35, severity: "warning" }]);
  });

  it("passes a clean transcript and reports counts", () => {
    const result = integrityAudit(cloneFixture());
    expect(result.integrity_passed).toBe(true);
    expect(result.word_count).toBe(15);
    expect(result.utterance_count).toBe(2);
    expect(result.speaker_ids_found).toEqual(["0", "1"]);
  });
});
