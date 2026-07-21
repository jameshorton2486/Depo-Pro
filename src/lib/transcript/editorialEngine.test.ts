import { describe, expect, it } from "vitest";

import { applyEditorialRules, applyEditorialRulesToRenderModel } from "./editorialEngine";
import type { UnifiedRenderModel } from "./unifiedRendering";

function renderModel(contents: string[]): UnifiedRenderModel {
  return {
    transcriptId: "transcript-synthetic-18",
    geometry: { format_box_width_inches: 6.5, left_margin_inches: 1, right_margin_inches: 1, line_spacing_points: 24, lines_per_page: 25 },
    entityRegistryEntryCount: 2,
    lines: contents.map((content, index) => ({
      paragraphId: `paragraph-${index}`,
      kind: "COLLOQUY",
      content,
      sourceUtteranceIds: [`utterance-${index}`],
      sourceWordIds: [`word-${index}`],
      geometry: { paragraph_index: index, paragraph_id: `paragraph-${index}`, role: "speaker", first_line_tab_inches: 1.5, text_tab_inches: null, continuation_indent_inches: 0 },
    })),
  };
}

describe("editorialEngine", () => {
  it("uses canonical abbreviation spacing and sentence-boundary spacing", () => {
    expect(applyEditorialRules("Dr. Rivera answered. Then we stopped.").text).toBe("Dr. Rivera answered.  Then we stopped.");
    expect(applyEditorialRules("J. Rivera spoke. Next question.").text).toBe("J. Rivera spoke.  Next question.");
  });
  it("keeps context-sensitive No. as a sentence boundary", () => {
    expect(applyEditorialRules("No. No. I am sorry.").text).toBe("No.  No.  I am sorry.");
  });
  it("normalizes only punctuation mechanically adjacent to interruptions", () => {
    expect(applyEditorialRules('He said "one-year,"—no.').text).toBe('He said "one-year" -- no.');
    expect(applyEditorialRules("I was, um, -- interrupted.").text).toBe("I was, um -- interrupted.");
  });
  it("normalizes deterministic objection presentation", () => {
    const result = applyEditorialRules("MR. RAMON:  Objection, form");
    expect(result.text).toBe("MR. RAMON:  Objection.  Form.");
    expect(result.objectionFormattingCorrections).toBe(1);
  });
  it("capitalizes only known role labels and does not infer speakers", () => {
    expect(applyEditorialRules("the reporter:  We are on the record.").text).toBe("THE REPORTER:  We are on the record.");
    expect(applyEditorialRules("speaker 2:  We are on the record.").text).toBe("speaker 2:  We are on the record.");
  });
  it("preserves false starts, stutters, ellipses, and spoken-date ordinals", () => {
    const text = "I-I was -- well... on August 17th, I was there.";
    expect(applyEditorialRules(text).text).toBe(text);
  });
  it("applies only bounded numeric display rules", () => {
    const result = applyEditorialRules("The total was $350.00, or 8%, at 09:30 a.m.");
    expect(result.text).toBe("The total was $350, or 8 percent, at 9:30 a.m.");
    expect(result.numberFormattingApplied).toBe(3);
  });
  it("returns the same editorial output for the same input", () => {
    const input = renderModel(["the witness: Objection, form", "Dr. Rivera answered. Next question."]);
    expect(applyEditorialRulesToRenderModel(input)).toEqual(applyEditorialRulesToRenderModel(input));
  });
  it("changes content only while preserving render structure, geometry, and provenance", () => {
    const input = renderModel(["the witness:  Objection, form"]);
    const result = applyEditorialRulesToRenderModel(input);
    expect(result.model.lines[0]?.content).toBe("THE WITNESS:  Objection.  Form.");
    expect(result.model.transcriptId).toBe(input.transcriptId);
    expect(result.model.geometry).toEqual(input.geometry);
    expect(result.model.lines[0]?.geometry).toEqual(input.lines[0]?.geometry);
    expect(result.model.lines[0]?.sourceUtteranceIds).toEqual(input.lines[0]?.sourceUtteranceIds);
    expect(result.model.lines[0]?.sourceWordIds).toEqual(input.lines[0]?.sourceWordIds);
    expect(result.model.lines[0]?.kind).toBe(input.lines[0]?.kind);
    expect(result.model.lines[0]?.paragraphId).toBe(input.lines[0]?.paragraphId);
    expect(input.lines[0]?.content).toBe("the witness:  Objection, form");
    expect(result.metrics).toEqual({ punctuationCorrections: 0, capitalizationCorrections: 1, objectionFormattingCorrections: 1, numberFormattingCorrections: 0 });
  });
});
