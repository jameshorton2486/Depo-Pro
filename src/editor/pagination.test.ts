import { describe, expect, it } from "vitest";

import { buildPages, getBlockRole } from "./pagination";

describe("pagination", () => {
  it("prefers contract-owned line type over speaker-role inference", () => {
    expect(getBlockRole("WITNESS", "Q")).toBe("Q");
    expect(getBlockRole("ATTORNEY", "A")).toBe("A");
  });

  it("uses contract-owned line type for page layout estimation", () => {
    const speakerRoles = new Map<string, "ATTORNEY" | "WITNESS" | "OTHER" | undefined>([
      ["spk-1", "WITNESS"],
      ["spk-2", "ATTORNEY"],
    ]);

    const pages = buildPages(
      [
        { utterance_id: "utt-1", speaker_id: "spk-1", wordCount: 8, lineType: "Q" },
        { utterance_id: "utt-2", speaker_id: "spk-2", wordCount: 8, lineType: "A" },
      ],
      speakerRoles,
      {
        linesPerPage: 25,
        charsPerLine: 58,
        averageCharsPerWord: 6.5,
        formatBoxWidthInches: 6.5,
        leftMarginInches: 1.25,
        rightMarginInches: 0.75,
        lineSpacingPoints: 28,
        tabs: {
          qaLabelInches: 0.5,
          qaTextInches: 1.0,
          speakerInches: 1.5,
          parentheticalInches: 2.0,
          centerInches: 3.25,
          continuationInches: 1.0,
        },
      },
    );

    expect(pages.get("utt-1")).toEqual({ pageNumber: 1, lineInPage: 1 });
    expect(pages.get("utt-2")).toEqual({ pageNumber: 1, lineInPage: 3 });
  });
});
