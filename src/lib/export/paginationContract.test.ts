import { describe, expect, it } from "vitest";
import {
  compareRefs,
  formatPageLine,
  lookupParagraphRef,
  lookupUtteranceRef,
  type PaginationMap,
} from "./paginationContract";

function map(): PaginationMap {
  return {
    linesPerPage: 25,
    firstNumberedPage: 3,
    lines: [
      { ref: { page: 3, line: 1 }, paragraph_id: "p1", utterance_id: "u1", isContinuation: false },
      { ref: { page: 3, line: 2 }, paragraph_id: "p1", utterance_id: "u1", isContinuation: true },
      { ref: { page: 3, line: 3 }, paragraph_id: "p2", utterance_id: "u2", isContinuation: false },
      { ref: { page: 4, line: 1 }, paragraph_id: "p3", utterance_id: null, isContinuation: false },
    ],
    sections: [],
    exhibits: [],
  };
}

describe("formatPageLine", () => {
  it("formats a ref as page:line", () => {
    expect(formatPageLine({ page: 42, line: 5 })).toBe("42:5");
  });
});

describe("lookupParagraphRef", () => {
  it("returns the paragraph's FIRST (non-continuation) line", () => {
    expect(lookupParagraphRef(map(), "p1")).toEqual({ page: 3, line: 1 });
    expect(lookupParagraphRef(map(), "p2")).toEqual({ page: 3, line: 3 });
  });

  it("returns null for an unknown paragraph", () => {
    expect(lookupParagraphRef(map(), "nope")).toBeNull();
  });

  it("falls back to a continuation line if no first line is present", () => {
    const m: PaginationMap = {
      ...map(),
      lines: [{ ref: { page: 9, line: 9 }, paragraph_id: "px", utterance_id: "ux", isContinuation: true }],
    };
    expect(lookupParagraphRef(m, "px")).toEqual({ page: 9, line: 9 });
  });
});

describe("lookupUtteranceRef", () => {
  it("resolves a source utterance to its first coordinate (errata location)", () => {
    expect(lookupUtteranceRef(map(), "u2")).toEqual({ page: 3, line: 3 });
  });
  it("returns null for a generated line's absent utterance", () => {
    expect(lookupUtteranceRef(map(), "missing")).toBeNull();
  });
});

describe("compareRefs", () => {
  it("orders by page then line (transcript order)", () => {
    const refs = [
      { page: 4, line: 1 },
      { page: 3, line: 3 },
      { page: 3, line: 1 },
    ];
    expect([...refs].sort(compareRefs)).toEqual([
      { page: 3, line: 1 },
      { page: 3, line: 3 },
      { page: 4, line: 1 },
    ]);
  });
});
