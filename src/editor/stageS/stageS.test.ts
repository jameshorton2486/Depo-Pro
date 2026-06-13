import { describe, expect, it } from "vitest";
import { colloquyInlineText, colloquyLabel, COLON_GAP } from "./colloquy";
import { appendInterruptionDash, DASH, looksLikeObjection, prependResumptionDash } from "./objectionHandler";
import {
  byAttributionLine,
  colloquyLine,
  examinationHeaderLine,
  flaggedLine,
  parentheticalLine,
  qaLine,
  qaModeForRole,
} from "./lineBuilder";
import {
  LINE_A,
  LINE_BY,
  LINE_COLLOQUY,
  LINE_EXAMINATION,
  LINE_FLAGGED,
  LINE_PARENTHETICAL,
  LINE_Q,
  OFF_RECORD,
  ON_RECORD,
  TAB_COLLOQUY,
  TAB_MARGIN,
  TAB_PARENTHETICAL,
  TAB_QA_DESIGNATION,
  TAB_QA_TEXT,
} from "./models";

describe("stageS models", () => {
  it("exports the semantic tab levels", () => {
    expect(TAB_MARGIN).toBe(0);
    expect(TAB_QA_DESIGNATION).toBe(1);
    expect(TAB_QA_TEXT).toBe(2);
    expect(TAB_COLLOQUY).toBe(3);
    expect(TAB_PARENTHETICAL).toBe(4);
  });
});

describe("stageS colloquy helpers", () => {
  it("normalizes colloquy labels and applies the two-space colon gap", () => {
    expect(colloquyLabel("Mr. Madrid")).toBe("MR. MADRID:");
    expect(colloquyInlineText("Mr. Madrid", "Objection. Vague and ambiguous.")).toBe(
      `MR. MADRID:${COLON_GAP}Objection. Vague and ambiguous.`,
    );
  });

  it("handles missing colloquy text without dropping the label", () => {
    expect(colloquyInlineText("The Reporter", "")).toBe("THE REPORTER:");
  });
});

describe("stageS line builders", () => {
  it("builds Q and A lines with optional inline BY attribution", () => {
    expect(qaLine("s-0001", "Q", "State your name.", ["utt-1"])).toEqual({
      lineId: "s-0001",
      lineType: LINE_Q,
      text: "State your name.",
      speakerLabel: "",
      sourceUtteranceIds: ["utt-1"],
      tabLevel: TAB_QA_DESIGNATION,
      procedural: false,
      renderState: ON_RECORD,
      auditNote: "",
    });

    expect(qaLine("s-0002", "A", "Heath Thomas.", ["utt-2"], ON_RECORD, "Mr. Nunez")).toEqual({
      lineId: "s-0002",
      lineType: LINE_A,
      text: "(BY MR. NUNEZ)  Heath Thomas.",
      speakerLabel: "",
      sourceUtteranceIds: ["utt-2"],
      tabLevel: TAB_QA_DESIGNATION,
      procedural: false,
      renderState: ON_RECORD,
      auditNote: "",
    });
  });

  it("builds colloquy, parenthetical, by-line, examination, and flagged lines", () => {
    expect(colloquyLine("s-0003", "The Reporter", "Please speak up.", ["utt-3"], OFF_RECORD, "note")).toEqual({
      lineId: "s-0003",
      lineType: LINE_COLLOQUY,
      text: "THE REPORTER:  Please speak up.",
      speakerLabel: "THE REPORTER:",
      sourceUtteranceIds: ["utt-3"],
      tabLevel: TAB_COLLOQUY,
      procedural: false,
      renderState: OFF_RECORD,
      auditNote: "note",
    });

    expect(parentheticalLine("s-0004", "(Recess taken.)", OFF_RECORD, "transition")).toEqual({
      lineId: "s-0004",
      lineType: LINE_PARENTHETICAL,
      text: "(Recess taken.)",
      speakerLabel: "",
      sourceUtteranceIds: [],
      tabLevel: TAB_PARENTHETICAL,
      procedural: true,
      renderState: OFF_RECORD,
      auditNote: "transition",
    });

    expect(byAttributionLine("s-0005", "mr. nunez")).toEqual({
      lineId: "s-0005",
      lineType: LINE_BY,
      text: "BY MR. NUNEZ:",
      speakerLabel: "BY MR. NUNEZ:",
      sourceUtteranceIds: [],
      tabLevel: TAB_MARGIN,
      procedural: true,
      renderState: ON_RECORD,
      auditNote: "Examination attribution re-emitted after resumption.",
    });

    expect(examinationHeaderLine("s-0006")).toEqual({
      lineId: "s-0006",
      lineType: LINE_EXAMINATION,
      text: "EXAMINATION",
      speakerLabel: "",
      sourceUtteranceIds: [],
      tabLevel: TAB_MARGIN,
      procedural: true,
      renderState: ON_RECORD,
      auditNote: "Examination section header emitted at examination start.",
    });

    expect(flaggedLine("s-0007", "Speaker 4", "Unmapped testimony.", ["utt-7"])).toEqual({
      lineId: "s-0007",
      lineType: LINE_FLAGGED,
      text: "Unmapped testimony.",
      speakerLabel: "Speaker 4",
      sourceUtteranceIds: ["utt-7"],
      tabLevel: TAB_COLLOQUY,
      procedural: false,
      renderState: ON_RECORD,
      auditNote: "Unmapped speaker cluster -- flagged for review.",
    });
  });

  it("returns Q/A mode only for the semantic Stage S roles", () => {
    expect(qaModeForRole("examining_attorney")).toBe("Q");
    expect(qaModeForRole("witness")).toBe("A");
    expect(qaModeForRole("court_reporter")).toBe("");
    expect(qaModeForRole("interpreter")).toBe("");
    expect(qaModeForRole(null)).toBe("");
  });
});

describe("stageS objection helpers", () => {
  it("detects objection lead-ins", () => {
    expect(looksLikeObjection("Objection, form.")).toBe(true);
    expect(looksLikeObjection("Asked and answered.")).toBe(true);
    expect(looksLikeObjection("Please state your name.")).toBe(false);
  });

  it("appends and prepends interruption dashes without duplicating them", () => {
    expect(appendInterruptionDash("State your name,")).toEqual([`State your name ${DASH}`, true]);
    expect(appendInterruptionDash(`State your name ${DASH}`)).toEqual([`State your name ${DASH}`, false]);
    expect(prependResumptionDash(":Please state your name.")).toEqual([`${DASH} Please state your name.`, true]);
    expect(prependResumptionDash(`${DASH} Please state your name.`)).toEqual([`${DASH} Please state your name.`, false]);
  });
});
