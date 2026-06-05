import { describe, expect, it } from "vitest";

import { createOfflineDeepgramFixture } from "../lib/transcript/offlineFixture";
import { normalizeDeepgramKeyterms } from "./transcriptionService";

describe("normalizeDeepgramKeyterms", () => {
  it("trims, dedupes case-insensitively, and caps at 100", () => {
    const result = normalizeDeepgramKeyterms([
      { term: "  Raul   Garza ", boost: 0.7, category: "proper_name", notes: "" },
      { term: "raul garza", boost: 0.4, category: "proper_name", notes: "" },
      ...Array.from({ length: 110 }, (_, index) => ({
        term: `Term ${index}`,
        boost: 0.5,
        category: "other" as const,
        notes: "",
      })),
    ]);

    expect(result[0]).toBe("Raul Garza");
    expect(result).not.toContain("raul garza");
    expect(result).toHaveLength(100);
  });
});

describe("createOfflineDeepgramFixture", () => {
  it("returns a deterministic deepgram-shaped fixture with utterances and filler words", () => {
    const fixture = createOfflineDeepgramFixture("case_20260605_demo");

    expect(fixture.metadata.transcription_source).toBe("offline-fallback");
    expect(fixture.results.utterances).toHaveLength(2);
    expect(fixture.results.channels[0].alternatives[0].words.some((word) => word.word === "um")).toBe(true);
    expect(fixture.results.channels[0].alternatives[0].words.some((word) => word.speaker === 1)).toBe(true);
  });
});
