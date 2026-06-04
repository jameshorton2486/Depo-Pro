import { describe, expect, it } from "vitest";
import { buildWordTimings, findWordAtTime, type WordTiming } from "./wordTimings";

describe("findWordAtTime", () => {
  it("returns the containing word in a non-overlapping region", () => {
    const timings: WordTiming[] = [
      { word_id: "w_1", start: 0.0, end: 0.4 },
      { word_id: "w_2", start: 0.5, end: 0.9 },
      { word_id: "w_3", start: 1.0, end: 1.4 },
    ];

    expect(findWordAtTime(timings, 0.62)).toBe("w_2");
  });

  it("snaps forward within a short gap", () => {
    const timings: WordTiming[] = [
      { word_id: "w_1", start: 0.0, end: 0.4 },
      { word_id: "w_2", start: 0.55, end: 0.9 },
    ];

    expect(findWordAtTime(timings, 0.45)).toBe("w_2");
  });

  it("returns the correct containing word at an overlap boundary", () => {
    const timings: WordTiming[] = [
      { word_id: "w_00000068", start: 35.67, end: 36.0 },
      { word_id: "w_00001003", start: 36.03, end: 36.3 },
    ];

    expect(findWordAtTime(timings, 36.0)).toBe("w_00000068");
  });

  it("uses a deterministic rule in overlapping interpreter regions", () => {
    const timings: WordTiming[] = [
      { word_id: "w_00000075", start: 41.84, end: 42.37 },
      { word_id: "w_00001009", start: 42.0, end: 42.25 },
    ];

    expect(findWordAtTime(timings, 42.05)).toBe("w_00000075");
  });

  it("handles exact start and end boundaries inclusively", () => {
    const timings: WordTiming[] = [
      { word_id: "w_1", start: 10.0, end: 10.5 },
      { word_id: "w_2", start: 10.6, end: 11.0 },
    ];

    expect(findWordAtTime(timings, 10.0)).toBe("w_1");
    expect(findWordAtTime(timings, 10.5)).toBe("w_1");
  });
});

describe("buildWordTimings", () => {
  it("sorts timings by start time", () => {
    const timings = buildWordTimings({
      job_id: "demo",
      media_url: "/mock-audio",
      duration: 1,
      speakers: [],
      utterances: [],
      words: [
        {
          word_id: "w_2",
          text: "second",
          raw_text: "second",
          speaker_id: "spk_1",
          utterance_id: "utt_1",
          start_time: 1,
          end_time: 1.2,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
        {
          word_id: "w_1",
          text: "first",
          raw_text: "first",
          speaker_id: "spk_1",
          utterance_id: "utt_1",
          start_time: 0.2,
          end_time: 0.4,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
      ],
    });

    expect(timings.map((w) => w.word_id)).toEqual(["w_1", "w_2"]);
  });
});
