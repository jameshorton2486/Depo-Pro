import { describe, expect, it } from "vitest";

import type { GeometryLayoutRole } from "../transcript/geometryEngine";
import type { TranscriptParagraphKind } from "../transcript/transcriptParagraphTypes";
import type { UnifiedRenderLine, UnifiedRenderModel } from "../transcript/unifiedRendering";

import {
  estimateCharsPerLine,
  estimatePageCount,
  validateColloquyTransitions,
  validateExaminationBoundary,
  validateGeometry,
  validateObjectionPlacement,
  validateParagraphContinuity,
  validateParentheticalPlacement,
  validateQaContinuity,
  validateSectionTransitions,
  validateSpeakerLabelContinuity,
} from "./validators";

const ROLE_BY_KIND: Record<string, GeometryLayoutRole> = {
  Q: "qa",
  A: "qa",
  PARENTHETICAL: "parenthetical",
  SECTION_HEADER: "centered",
  DOCUMENT_BLOCK: "centered",
  COLLOQUY: "speaker",
  BY_LINE: "speaker",
};

function line(
  kind: TranscriptParagraphKind,
  content: string,
  index: number,
  roleOverride?: GeometryLayoutRole,
): UnifiedRenderLine {
  return {
    paragraphId: `p:${index}`,
    kind,
    content,
    sourceUtteranceIds: [`utt_${index}`],
    sourceWordIds: [],
    geometry: {
      paragraph_index: index,
      paragraph_id: `p:${index}`,
      role: roleOverride ?? ROLE_BY_KIND[kind] ?? "speaker",
      first_line_tab_inches: 0.5,
      text_tab_inches: 1,
      continuation_indent_inches: 0,
    },
  };
}

function model(lines: UnifiedRenderLine[]): UnifiedRenderModel {
  return {
    transcriptId: "unit-model",
    geometry: {
      format_box_width_inches: 6.5,
      left_margin_inches: 1.25,
      right_margin_inches: 0.75,
      line_spacing_points: 28,
      lines_per_page: 25,
    },
    lines,
    entityRegistryEntryCount: 0,
  };
}

describe("stageS validators", () => {
  it("flags empty content as a critical paragraph-continuity break", () => {
    const findings = validateParagraphContinuity(model([line("Q", "   ", 0)]));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ category: "PARAGRAPH_CONTINUITY", severity: "CRITICAL" });
  });

  it("flags an answer that precedes any question as critical", () => {
    const findings = validateQaContinuity(model([
      line("A", "A. Yes.", 0),
      line("Q", "Q. Are you sure?", 1),
    ]));
    expect(findings.some((f) => f.severity === "CRITICAL" && f.category === "QA_CONTINUITY")).toBe(true);
  });

  it("flags a missing Q label", () => {
    const findings = validateQaContinuity(model([line("Q", "Please state your name.", 0)]));
    expect(findings.some((f) => f.message.includes('missing its "Q." label'))).toBe(true);
  });

  it("resets Q/A continuity for each examination", () => {
    const findings = validateQaContinuity(model([
      line("SECTION_HEADER", "EXAMINATION", 0),
      line("Q", "Q. Ready?", 1),
      line("A", "A. Yes.", 2),
      line("SECTION_HEADER", "CROSS-EXAMINATION", 3),
      line("A", "A. No.", 4),
    ]));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "QA_CONTINUITY",
      severity: "CRITICAL",
      paragraphId: "p:4",
    });

    const afterProceedings = validateQaContinuity(model([
      line("SECTION_HEADER", "EXAMINATION", 0),
      line("Q", "Q. Ready?", 1),
      line("A", "A. Yes.", 2),
      line("SECTION_HEADER", "PROCEEDINGS", 3),
      line("A", "A. No.", 4),
    ]));
    expect(afterProceedings).toHaveLength(1);
    expect(afterProceedings[0]).toMatchObject({ category: "QA_CONTINUITY", severity: "CRITICAL" });
  });

  it("requires an EXAMINATION header before Q/A", () => {
    const withoutHeader = validateExaminationBoundary(model([line("Q", "Q. Ready?", 0)]));
    expect(withoutHeader).toHaveLength(1);
    expect(withoutHeader[0].category).toBe("EXAMINATION_BOUNDARY");

    const withHeader = validateExaminationBoundary(model([
      line("SECTION_HEADER", "EXAMINATION", 0),
      line("Q", "Q. Ready?", 1),
    ]));
    expect(withHeader).toHaveLength(0);

    const misleadingHeader = validateExaminationBoundary(model([
      line("SECTION_HEADER", "NON-EXAMINATION", 0),
      line("Q", "Q. Ready?", 1),
    ]));
    expect(misleadingHeader).toHaveLength(1);
  });

  it("flags colloquy without a speaker label and lowercase labels", () => {
    const transitions = validateColloquyTransitions(model([line("COLLOQUY", "no label here", 0)]));
    expect(transitions).toHaveLength(1);

    const labels = validateSpeakerLabelContinuity(model([line("COLLOQUY", "Mr. Sample:  Hello.", 0)]));
    expect(labels.some((f) => f.category === "SPEAKER_LABEL")).toBe(true);
  });

  it("detects objections by canonical structure, not mere word presence", () => {
    // Spoken objection misplaced in a Q line -> MAJOR.
    const misplaced = validateObjectionPlacement(model([line("Q", "Q. Objection to that.", 0)]));
    expect(misplaced.some((f) => f.severity === "MAJOR")).toBe(true);

    // Canonical colloquy objection -> no finding.
    const canonical = validateObjectionPlacement(model([line("COLLOQUY", "MR. SAMPLE:  Objection.  Form.", 0)]));
    expect(canonical).toHaveLength(0);

    // "objection" as an ordinary word in testimony must NOT be flagged.
    const falsePositive = validateObjectionPlacement(model([
      line("A", "A. I have no objection to that document.", 0),
      line("Q", "Q. Did you raise an objection at the time?", 1),
    ]));
    expect(falsePositive).toHaveLength(0);
  });

  it("validates every examination transition, not only the first", () => {
    const valid = validateExaminationBoundary(model([
      line("SECTION_HEADER", "EXAMINATION", 0),
      line("Q", "Q. A?", 1),
      line("A", "A. Yes.", 2),
      line("SECTION_HEADER", "CROSS-EXAMINATION", 3),
      line("Q", "Q. B?", 4),
      line("A", "A. No.", 5),
    ]));
    expect(valid).toHaveLength(0);

    const secondRunUnheadered = validateExaminationBoundary(model([
      line("SECTION_HEADER", "EXAMINATION", 0),
      line("Q", "Q. A?", 1),
      line("A", "A. Yes.", 2),
      line("SECTION_HEADER", "PROCEEDINGS", 3),
      line("Q", "Q. B?", 4),
      line("A", "A. No.", 5),
    ]));
    expect(secondRunUnheadered).toHaveLength(1);
    expect(secondRunUnheadered[0].category).toBe("EXAMINATION_BOUNDARY");
  });

  it("flags only unbreakable tokens as overflow, not long paragraphs", () => {
    const longToken = "x".repeat(70);
    const overflow = validateGeometry(model([line("COLLOQUY", `THE COURT:  ${longToken}`, 0)]));
    expect(overflow.some((f) => f.category === "LINE_OVERFLOW")).toBe(true);

    const longWrappableAnswer = validateGeometry(model([line("A", `A. ${"word ".repeat(80).trim()}`, 0)]));
    expect(longWrappableAnswer.some((f) => f.category === "LINE_OVERFLOW")).toBe(false);
  });

  it("flags parentheticals without parentheses and lowercase section headers", () => {
    const parenthetical = validateParentheticalPlacement(model([line("PARENTHETICAL", "Whereupon a recess", 0)]));
    expect(parenthetical).toHaveLength(1);

    const header = validateSectionTransitions(model([line("SECTION_HEADER", "Examination", 0)]));
    expect(header).toHaveLength(1);
  });

  it("flags a geometry tab-role mismatch", () => {
    const findings = validateGeometry(model([line("Q", "Q. Ready?", 0, "speaker")]));
    expect(findings.some((f) => f.owner === "GEOMETRY" && f.category === "INDENT")).toBe(true);
  });

  it("estimates line width and pagination deterministically", () => {
    expect(estimateCharsPerLine(6.5)).toBe(65);
    expect(estimateCharsPerLine(0)).toBe(0);
    expect(estimatePageCount(model([line("Q", "Q. Ready?", 0)]))).toBe(1);
  });
});
