import { describe, expect, it } from "vitest";

import { checkGeometry, formatTranscriptBlocks } from "./formattingEngine";
import type { ValidationBlock } from "./correctionValidator";

function block(overrides: Partial<ValidationBlock>): ValidationBlock {
  return {
    utterance_index: 1,
    utterance_id: "utt_1",
    block_type: "Q",
    speaker_id: "spk_1",
    display_name: "MR. BENTLEY",
    role: "ATTORNEY",
    text: "Can you describe what happened?",
    ...overrides,
  };
}

describe("formattingEngine", () => {
  it("formats Q blocks with tab Q tab prefix", () => {
    const result = formatTranscriptBlocks([block({ block_type: "Q" })]);
    expect(result.docx_paragraphs[0]?.text.startsWith("\tQ.\t")).toBe(true);
  });

  it("formats A blocks with tab A tab prefix", () => {
    const result = formatTranscriptBlocks([block({ block_type: "A", role: "WITNESS", text: "Yes." })]);
    expect(result.docx_paragraphs[0]?.text.startsWith("\tA.\t")).toBe(true);
  });

  it("formats speaker labels with one space after honorific period and two after colon", () => {
    const result = formatTranscriptBlocks([block({ block_type: "SP", text: "Objection.", display_name: "MR.  BENTLEY" })]);
    expect(result.docx_paragraphs[0]?.text).toContain("MR. BENTLEY:  Objection.");
  });

  it("normalizes BY-line honorific spacing", () => {
    const result = formatTranscriptBlocks([block({ block_type: "Q", text: "(BY MR.  BENTLEY)  What happened next?" })]);
    expect(result.docx_paragraphs[0]?.text).toContain("(BY MR. BENTLEY)  What happened next?");
  });

  it("formats parentheticals with three tabs (1.5\", aligned with the speaker tab)", () => {
    const result = formatTranscriptBlocks([block({ block_type: "PN", text: "(Whereupon, a recess was taken at 1:00 p.m.)" })]);
    expect(result.docx_paragraphs[0]?.text.startsWith("\t\t\t(")).toBe(true);
    expect(result.docx_paragraphs[0]?.text.startsWith("\t\t\t\t")).toBe(false);
  });

  it("flags speaker paragraphs that are not aligned to the speaker tab", () => {
    const issues = checkGeometry([{ kind: "SP", text: "THE REPORTER:  Test" }]);
    expect(issues.some((issue) => issue.type === "SPEAKER_INDENT")).toBe(true);
  });

  it("converts Okay, to Okay.", () => {
    const result = formatTranscriptBlocks([block({ block_type: "A", role: "WITNESS", text: "Okay, I did." })]);
    expect(result.formatted_text).toContain("Okay. I did.");
  });

  it("applies two spaces after terminal punctuation before capitals", () => {
    const result = formatTranscriptBlocks([block({ block_type: "A", role: "WITNESS", text: "correction. The next sentence" })]);
    expect(result.formatted_text).toContain("correction.  The");
  });

  it("preserves one space after abbreviations", () => {
    const result = formatTranscriptBlocks([block({ block_type: "SP", text: "Mr. Smith", display_name: "THE WITNESS" })]);
    expect(result.formatted_text).toContain("Mr. Smith");
  });

  it("drops even currency cents and rewrites percent symbol", () => {
    const result = formatTranscriptBlocks([block({ block_type: "A", role: "WITNESS", text: "$350.00 equals 8%" })]);
    expect(result.formatted_text).toContain("$350");
    expect(result.formatted_text).toContain("8 percent");
  });
  it("counts capitalization and objection corrections as automatic fixes", () => {
    const result = formatTranscriptBlocks([block({ block_type: "SP", text: "the witness: Objection, form" })]);
    expect(result.metrics.geometry_violations.auto_fixed).toBe(2);
  });
});
