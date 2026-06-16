import { describe, expect, it } from "vitest";

import {
  LINE_A,
  LINE_BY,
  LINE_COLLOQUY,
  LINE_EXAMINATION,
  LINE_FLAGGED,
  LINE_PARENTHETICAL,
  LINE_Q,
  ON_RECORD,
  TAB_COLLOQUY,
  TAB_PARENTHETICAL,
  TAB_QA_DESIGNATION,
  TAB_QA_TEXT,
  type RenderLine,
} from "../../editor/stageS/models";
import { buildParagraphSpecsFromStageSLines } from "./stageSToDocx";

function makeLine(overrides: Partial<RenderLine>): RenderLine {
  return {
    lineId: overrides.lineId ?? "s-0001",
    lineType: overrides.lineType ?? LINE_Q,
    text: overrides.text ?? "Example text.",
    speakerLabel: overrides.speakerLabel ?? "MR. NUNEZ:",
    sourceUtteranceIds: overrides.sourceUtteranceIds ?? ["utt-1"],
    tabLevel: overrides.tabLevel ?? TAB_QA_TEXT,
    procedural: overrides.procedural ?? false,
    renderState: overrides.renderState ?? ON_RECORD,
    auditNote: overrides.auditNote ?? "",
  };
}

describe("stageSToDocx", () => {
  it("maps representative Stage S lines onto the existing paragraph kinds", () => {
    const paragraphs = buildParagraphSpecsFromStageSLines([
      makeLine({ lineType: LINE_EXAMINATION, text: "EXAMINATION" }),
      makeLine({ lineId: "s-0002", lineType: LINE_BY, text: "BY MR. NUNEZ:", speakerLabel: "BY MR. NUNEZ:", tabLevel: TAB_QA_DESIGNATION }),
      makeLine({ lineId: "s-0003", lineType: LINE_Q, text: "Please state your name.", speakerLabel: "Q.", tabLevel: TAB_QA_TEXT }),
      makeLine({ lineId: "s-0004", lineType: LINE_A, text: "Heath Thomas.", speakerLabel: "A.", tabLevel: TAB_QA_TEXT }),
      makeLine({ lineId: "s-0005", lineType: LINE_COLLOQUY, text: "MR. MADRID:  Objection, form.", speakerLabel: "MR. MADRID:", tabLevel: TAB_COLLOQUY }),
      makeLine({ lineId: "s-0006", lineType: LINE_FLAGGED, text: "Unknown testimony.", speakerLabel: "Speaker 8", tabLevel: TAB_COLLOQUY }),
      makeLine({ lineId: "s-0007", lineType: LINE_PARENTHETICAL, text: "(Recess taken at 10:42 a.m.)", speakerLabel: "", tabLevel: TAB_PARENTHETICAL }),
    ]);

    expect(paragraphs.map((paragraph) => paragraph.kind)).toEqual([
      "BY_LINE",
      "BY_LINE",
      "Q",
      "A",
      "COLLOQUY",
      "COLLOQUY",
      "PARENTHETICAL",
    ]);
    expect(paragraphs[0]?.runs).toEqual([
      { kind: "text", text: "EXAMINATION" },
    ]);
    expect(paragraphs[1]?.runs).toEqual([
      { kind: "text", text: "BY MR. NUNEZ:" },
    ]);
    expect(paragraphs[2]?.runs).toEqual([
      { kind: "text", text: "Q." },
      { kind: "tab" },
      { kind: "text", text: "Please state your name." },
    ]);
    expect(paragraphs[3]?.runs).toEqual([
      { kind: "text", text: "A." },
      { kind: "tab" },
      { kind: "text", text: "Heath Thomas." },
    ]);
    expect(paragraphs[4]?.runs).toEqual([
      { kind: "text", text: "MR. MADRID:  Objection, form." },
    ]);
    expect(paragraphs[5]?.runs).toEqual([
      { kind: "text", text: "Speaker 8:  Unknown testimony." },
    ]);
    expect(paragraphs[6]?.runs).toEqual([
      { kind: "text", text: "(Recess taken at 10:42 a.m.)" },
    ]);
  });
});
