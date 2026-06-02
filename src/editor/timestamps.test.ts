import { describe, it, expect } from "vitest";
import {
  splitWordTimestamps,
  mergeWordTimestamps,
  type WordTiming,
} from "./timestamps";

const BASE: WordTiming = {
  word_id: "w_00000001",
  text: "hello",
  start_time: 1.0,
  end_time: 2.0,
};

describe("splitWordTimestamps", () => {
  it("splits proportionally by character length", () => {
    const { left, right } = splitWordTimestamps(BASE, "hel", "lo");
    // "hel" = 3 chars, "lo" = 2 chars → ratio 3/5 = 0.6
    expect(left.start_time).toBe(1.0);
    expect(left.end_time).toBeCloseTo(1.6, 2);
    expect(right.start_time).toBeCloseTo(1.6, 2);
    expect(right.end_time).toBe(2.0);
  });

  it("assigns deterministic IDs", () => {
    const { left, right } = splitWordTimestamps(BASE, "a", "b");
    expect(left.word_id).toBe("w_00000001_L");
    expect(right.word_id).toBe("w_00000001_R");
  });

  it("preserves source text in each half", () => {
    const { left, right } = splitWordTimestamps(BASE, "hel", "lo");
    expect(left.text).toBe("hel");
    expect(right.text).toBe("lo");
  });

  it("handles right-only split (left empty string)", () => {
    const { left, right } = splitWordTimestamps(BASE, "", "hello");
    expect(left.end_time).toBe(1.0); // ratio = 0
    expect(right.start_time).toBe(1.0);
    expect(right.end_time).toBe(2.0);
  });

  it("handles left-only split (right empty string)", () => {
    const { left, right } = splitWordTimestamps(BASE, "hello", "");
    expect(left.end_time).toBe(2.0); // ratio = 1
    expect(right.start_time).toBe(2.0);
  });

  it("throws when both halves are empty", () => {
    expect(() => splitWordTimestamps(BASE, "", "")).toThrow();
  });

  it("split point rounds to 3 decimal places", () => {
    const w: WordTiming = { word_id: "w_x", text: "abc", start_time: 0, end_time: 1 };
    const { left } = splitWordTimestamps(w, "a", "bc");
    const dec = String(left.end_time).split(".")[1] ?? "";
    expect(dec.length).toBeLessThanOrEqual(3);
  });
});

describe("mergeWordTimestamps", () => {
  it("takes start of earliest and end of latest", () => {
    const words: WordTiming[] = [
      { word_id: "w_1", text: "the",    start_time: 0.0, end_time: 0.2 },
      { word_id: "w_2", text: "quick",  start_time: 0.3, end_time: 0.6 },
      { word_id: "w_3", text: "brown",  start_time: 0.7, end_time: 1.0 },
    ];
    const merged = mergeWordTimestamps(words);
    expect(merged.start_time).toBe(0.0);
    expect(merged.end_time).toBe(1.0);
  });

  it("joins text with spaces", () => {
    const words: WordTiming[] = [
      { word_id: "w_1", text: "civil",    start_time: 1.0, end_time: 1.3 },
      { word_id: "w_2", text: "engineer", start_time: 1.4, end_time: 1.9 },
    ];
    expect(mergeWordTimestamps(words).text).toBe("civil engineer");
  });

  it("joins IDs with +", () => {
    const words: WordTiming[] = [
      { word_id: "w_1", text: "a", start_time: 0, end_time: 0.1 },
      { word_id: "w_2", text: "b", start_time: 0.2, end_time: 0.3 },
    ];
    expect(mergeWordTimestamps(words).word_id).toBe("w_1+w_2");
  });

  it("handles out-of-order input", () => {
    const words: WordTiming[] = [
      { word_id: "w_2", text: "b", start_time: 0.5, end_time: 0.8 },
      { word_id: "w_1", text: "a", start_time: 0.0, end_time: 0.4 },
    ];
    const merged = mergeWordTimestamps(words);
    expect(merged.start_time).toBe(0.0);
    expect(merged.end_time).toBe(0.8);
  });

  it("works for a single word", () => {
    const merged = mergeWordTimestamps([BASE]);
    expect(merged.start_time).toBe(BASE.start_time);
    expect(merged.end_time).toBe(BASE.end_time);
    expect(merged.text).toBe(BASE.text);
  });

  it("throws for empty array", () => {
    expect(() => mergeWordTimestamps([])).toThrow();
  });
});
