// DOC-0328 — errata model tests. Proves witness change requests resolve to certified
// (page, line) via the canonical PaginationMap, sort in reading order, prefer the
// utterance location, and that an unresolvable location is segregated rather than given
// a fabricated page.
import { describe, expect, it } from "vitest";
import type { PaginatedLine, PaginationMap } from "./paginationContract";
import { buildErrataRows, type ErrataChangeRequest } from "./errataModel";

function pline(over: Partial<PaginatedLine>): PaginatedLine {
  return {
    ref: { page: 1, line: 1 },
    paragraph_id: "p0",
    utterance_id: "u0",
    isContinuation: false,
    ...over,
  };
}

function map(lines: PaginatedLine[]): PaginationMap {
  return { linesPerPage: 25, firstNumberedPage: 1, lines, sections: [], exhibits: [] };
}

const M = map([
  pline({ ref: { page: 12, line: 4 }, paragraph_id: "p10", utterance_id: "u10" }),
  pline({ ref: { page: 3, line: 20 }, paragraph_id: "p2", utterance_id: "u2" }),
  pline({ ref: { page: 40, line: 1 }, paragraph_id: "p30", utterance_id: "u30" }),
]);

describe("buildErrataRows", () => {
  it("resolves each change to its certified page/line and sorts in reading order", () => {
    const changes: ErrataChangeRequest[] = [
      { utteranceId: "u10", from: "there", to: "their", reason: "transcription error" },
      { utteranceId: "u2", from: "affect", to: "effect", reason: "misheard word" },
    ];
    const result = buildErrataRows(changes, M);
    expect(result.unresolved).toEqual([]);
    expect(result.rows).toEqual([
      { page: 3, line: 20, from: "affect", to: "effect", reason: "misheard word" },
      { page: 12, line: 4, from: "there", to: "their", reason: "transcription error" },
    ]);
  });

  it("prefers the utterance location, falling back to the paragraph id", () => {
    const result = buildErrataRows(
      [{ paragraphId: "p30", from: "Smith", to: "Smyth", reason: "name spelling" }],
      M,
    );
    expect(result.rows).toEqual([
      { page: 40, line: 1, from: "Smith", to: "Smyth", reason: "name spelling" },
    ]);
  });

  it("segregates an unresolvable location instead of fabricating a page", () => {
    const change: ErrataChangeRequest = { utteranceId: "u-nope", from: "x", to: "y", reason: "not in transcript" };
    const result = buildErrataRows([change], M);
    expect(result.rows).toEqual([]);
    expect(result.unresolved).toEqual([change]);
  });

  it("returns empty for no changes", () => {
    expect(buildErrataRows([], M)).toEqual({ rows: [], unresolved: [] });
    expect(buildErrataRows(null, M)).toEqual({ rows: [], unresolved: [] });
  });
});
