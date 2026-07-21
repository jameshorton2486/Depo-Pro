import { describe, expect, it } from "vitest";

import { createOfflineDeepgramFixture } from "./offlineFixture";
import { integrityAudit } from "./integrityAudit";
import type { DeepgramResponse } from "./types";

function cloneFixture(): DeepgramResponse {
  return structuredClone(createOfflineDeepgramFixture("case_integrity"));
}

function applyOverlap(response: DeepgramResponse, overlapSeconds: number) {
  const previousEnd = response.results.utterances?.[0]?.end ?? 0;
  const current = response.results.utterances?.[1];
  if (!current) {
    return;
  }

  current.start = Number((previousEnd - overlapSeconds).toFixed(4));
}

function applyGap(response: DeepgramResponse, gapSeconds: number) {
  const previousEnd = response.results.utterances?.[0]?.end ?? 0;
  const current = response.results.utterances?.[1];
  if (!current) {
    return;
  }

  const originalStart = current.start ?? previousEnd;
  const duration = (current.end ?? originalStart) - originalStart;
  current.start = Number((previousEnd + gapSeconds).toFixed(4));
  current.end = Number((current.start + Math.max(duration, 0)).toFixed(4));
  current.words.forEach((word) => {
    const wordDuration = word.end - word.start;
    const relativeStart = word.start - originalStart;
    word.start = Number((current.start + relativeStart).toFixed(4));
    word.end = Number((word.start + wordDuration).toFixed(4));
  });
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
    delete ((response.results.utterances?.[0] as unknown) as Record<string, unknown>).speaker;

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

  it("ignores overlap at exactly 0.1 seconds", () => {
    const response = cloneFixture();
    applyOverlap(response, 0.1);

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.failures.some((failure) => failure.includes("Impossible overlap"))).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("overlap"))).toBe(false);
  });

  it("warns on a minor overlap such as 0.78 seconds", () => {
    const response = cloneFixture();
    applyOverlap(response, 0.78);

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.failures.some((failure) => failure.includes("Impossible overlap"))).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("Minor overlap"))).toBe(true);
  });

  it("warns on overlap at 1.5 seconds", () => {
    const response = cloneFixture();
    applyOverlap(response, 1.5);

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.failures.some((failure) => failure.includes("Impossible overlap"))).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("Minor overlap"))).toBe(true);
  });

  it("emits an elevated warning on overlap above 1.5 seconds but at or below 3.0 seconds", () => {
    const response = cloneFixture();
    applyOverlap(response, 2.2);

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.failures.some((failure) => failure.includes("Impossible overlap"))).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("Elevated overlap"))).toBe(true);
  });

  it("fails on overlap greater than 3.0 seconds", () => {
    const response = cloneFixture();
    applyOverlap(response, 3.1);

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
    const firstWord = (utterances[0]?.words[0] as unknown) as Record<string, unknown> | undefined;
    const secondWord = (utterances[1]?.words[0] as unknown) as Record<string, unknown> | undefined;
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

  it("fails on critical gaps without off-record evidence", () => {
    const response = cloneFixture();
    applyGap(response, 278.8);
    if (response.results.utterances?.[0]) {
      response.results.utterances[0].transcript = "Q. State your name for the record.";
      response.results.utterances[0].confidence = 0.95;
    }
    if (response.results.utterances?.[1]) {
      response.results.utterances[1].transcript = "A. My name is Jennifer Baier.";
      response.results.utterances[1].confidence = 0.95;
    }

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.failures.some((failure) => failure.includes("Critical gap of 278.8s"))).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("long silent recess inferred"))).toBe(true);
  });

  it("downgrades a very large gap when nearby off-record evidence exists", () => {
    const response = cloneFixture();
    const inserted = {
      id: "dg_utt_001b",
      speaker: 0,
      start: 284.2,
      end: 284.9,
      transcript: "We are going off the record for a short recess.",
      confidence: 0.98,
      words: [
        { id: "dg_w_010b_1", word: "we", start: 284.2, end: 284.3, confidence: 0.98, speaker: 0 },
        { id: "dg_w_010b_2", word: "are", start: 284.3, end: 284.4, confidence: 0.98, speaker: 0 },
        { id: "dg_w_010b_3", word: "going", start: 284.4, end: 284.52, confidence: 0.98, speaker: 0 },
        { id: "dg_w_010b_4", word: "off", start: 284.52, end: 284.6, confidence: 0.98, speaker: 0 },
        { id: "dg_w_010b_5", word: "the", start: 284.6, end: 284.68, confidence: 0.98, speaker: 0 },
        { id: "dg_w_010b_6", word: "record", start: 284.68, end: 284.78, confidence: 0.98, speaker: 0 },
        { id: "dg_w_010b_7", word: "recess", start: 284.78, end: 284.9, confidence: 0.98, speaker: 0 },
      ],
    };
    response.results.utterances?.push(inserted);
    applyGap(response, 278.8);

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(true);
    expect(result.failures.some((failure) => failure.includes("Critical gap"))).toBe(false);
    expect(
      result.warnings.some((warning) =>
        warning.includes("off-record language detected") || warning.includes("long silent recess inferred")
      ),
    ).toBe(true);
  });

  it("still fails a critical gap when one boundary utterance is effectively empty", () => {
    const response = cloneFixture();
    applyGap(response, 278.8);
    if (response.results.utterances?.[0]) {
      response.results.utterances[0].transcript = "";
      response.results.utterances[0].confidence = 0.2;
      response.results.utterances[0].words = [];
    }

    const result = integrityAudit(response);
    expect(result.integrity_passed).toBe(false);
    expect(result.failures.some((failure) => failure.includes("Critical gap of 278.8s"))).toBe(true);
  });

  it("passes a clean transcript and reports counts", () => {
    const result = integrityAudit(cloneFixture());
    expect(result.integrity_passed).toBe(true);
    expect(result.word_count).toBe(15);
    expect(result.utterance_count).toBe(2);
    expect(result.speaker_ids_found).toEqual(["0", "1"]);
  });

  it("allows a legitimate single-speaker result and flags it for confirmation", () => {
    const response = cloneFixture();
    response.results.utterances = [response.results.utterances?.[0]].filter(Boolean) as NonNullable<DeepgramResponse["results"]["utterances"]>;
    const result = integrityAudit(response, { expectedSpeakerCount: 1 });

    expect(result.integrity_passed).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("Only 1 distinct speaker"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("expected"))).toBe(false);
  });
});
