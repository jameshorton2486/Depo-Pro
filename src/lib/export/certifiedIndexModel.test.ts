// DOC-0328 — certified index model tests. Proves the examination/exhibit index rows
// are a faithful, ordered projection of the PaginationMap anchors, with each action's
// first-occurrence page and empty actions left null.
import { describe, expect, it } from "vitest";
import type { PaginationMap } from "./paginationContract";
import { buildExaminationIndex, buildExhibitIndex } from "./certifiedIndexModel";

function mapWith(over: Partial<PaginationMap>): PaginationMap {
  return {
    linesPerPage: 25,
    firstNumberedPage: 1,
    lines: [],
    sections: [],
    exhibits: [],
    ...over,
  };
}

describe("buildExaminationIndex", () => {
  it("projects each section anchor to a row with its examiner and starting page", () => {
    const rows = buildExaminationIndex(
      mapWith({
        sections: [
          { kind: "EXAMINATION", examinerLabel: "MR. SMITH", start: { page: 4, line: 2 } },
          { kind: "CROSS-EXAMINATION", examinerLabel: "MS. JONES", start: { page: 30, line: 1 } },
          { kind: "REDIRECT", examinerLabel: null, start: { page: 45, line: 10 } },
        ],
      }),
    );
    expect(rows).toEqual([
      { kind: "EXAMINATION", examinerLabel: "MR. SMITH", page: 4 },
      { kind: "CROSS-EXAMINATION", examinerLabel: "MS. JONES", page: 30 },
      { kind: "REDIRECT", examinerLabel: null, page: 45 },
    ]);
  });

  it("returns no rows when there are no examination anchors", () => {
    expect(buildExaminationIndex(mapWith({}))).toEqual([]);
  });
});

describe("buildExhibitIndex", () => {
  it("groups actions per exhibit and records each action's page", () => {
    const rows = buildExhibitIndex(
      mapWith({
        exhibits: [
          { exhibit_number: "5", action: "MARKED", at: { page: 12, line: 3 } },
          { exhibit_number: "5", action: "OFFERED", at: { page: 40, line: 5 } },
          { exhibit_number: "5", action: "ADMITTED", at: { page: 41, line: 1 } },
        ],
      }),
    );
    expect(rows).toEqual([
      { exhibit_number: "5", marked: 12, offered: 40, admitted: 41, excluded: null },
    ]);
  });

  it("keeps distinct exhibits in first-appearance order and leaves absent actions null", () => {
    const rows = buildExhibitIndex(
      mapWith({
        exhibits: [
          { exhibit_number: "9", action: "MARKED", at: { page: 8, line: 1 } },
          { exhibit_number: "2", action: "MARKED", at: { page: 3, line: 1 } },
          { exhibit_number: "2", action: "EXCLUDED", at: { page: 50, line: 2 } },
        ],
      }),
    );
    expect(rows.map((r) => r.exhibit_number)).toEqual(["9", "2"]);
    expect(rows[0]).toEqual({ exhibit_number: "9", marked: 8, offered: null, admitted: null, excluded: null });
    expect(rows[1]).toEqual({ exhibit_number: "2", marked: 3, offered: null, admitted: null, excluded: 50 });
  });

  it("first occurrence of an action wins over later restatements", () => {
    const rows = buildExhibitIndex(
      mapWith({
        exhibits: [
          { exhibit_number: "7", action: "MARKED", at: { page: 10, line: 1 } },
          { exhibit_number: "7", action: "MARKED", at: { page: 99, line: 1 } },
        ],
      }),
    );
    expect(rows[0].marked).toBe(10);
  });

  it("returns no rows when there are no exhibit anchors", () => {
    expect(buildExhibitIndex(mapWith({}))).toEqual([]);
  });
});
