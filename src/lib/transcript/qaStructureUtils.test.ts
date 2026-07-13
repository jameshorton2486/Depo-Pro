import { describe, expect, it } from "vitest";
import type { TranscriptParagraph } from "./transcriptParagraphTypes";
import { applyQaFixer } from "./qaStructureUtils";

function makeParagraph(overrides: Partial<TranscriptParagraph> = {}): TranscriptParagraph {
  return {
    kind: "Q",
    region: "TESTIMONY",
    label: "Q.",
    speakerLabel: "MR. RAMON",
    text: "Do you understand that?  Yes.",
    speakerId: "spk-1",
    leadingText: "",
    mode: "display",
    words: [],
    sourceLines: [],
    sourceUtteranceIds: ["utt-1"],
    sourceWordIds: ["w1", "w2"],
    ...overrides,
  };
}

describe("qaStructureUtils", () => {
  it("splits embedded short answers out of Q paragraphs", () => {
    const result = applyQaFixer([makeParagraph()]);

    expect(result).toEqual([
      expect.objectContaining({ kind: "Q", text: "Do you understand that?" }),
      expect.objectContaining({ kind: "A", text: "Yes." }),
    ]);
  });

  it("splits short answers and trailing question text into Q/A/Q", () => {
    const result = applyQaFixer([
      makeParagraph({ text: "Correct?  Yes.  What did you do?" }),
    ]);

    expect(result).toEqual([
      expect.objectContaining({ kind: "Q", text: "Correct?" }),
      expect.objectContaining({ kind: "A", text: "Yes." }),
      expect.objectContaining({ kind: "Q", text: "What did you do?" }),
    ]);
  });

  it("splits embedded objections into standalone colloquy paragraphs", () => {
    const result = applyQaFixer([
      makeParagraph({ text: "And you reviewed it in this case?  Objection.  Form." }),
    ]);

    expect(result).toEqual([
      expect.objectContaining({ kind: "Q", text: "And you reviewed it in this case?" }),
      expect.objectContaining({ kind: "COLLOQUY", text: "Objection.  Form.", label: "MR. RAMON" }),
    ]);
  });

  it("normalizes standalone K. artifacts to Okay.", () => {
    const result = applyQaFixer([
      makeParagraph({ kind: "COLLOQUY", label: "MR. RAMON", text: " K. And in this case" }),
    ]);

    expect(result[0]?.text).toBe("Okay.  And in this case");
  });

  it("preserves source ids on split children", () => {
    const sourceWordIds = ["w1", "w2", "w3"];
    const sourceUtteranceIds = ["utt-1"];
    const result = applyQaFixer([
      makeParagraph({
        text: "Do you understand that?  Yes.",
        sourceWordIds,
        sourceUtteranceIds,
      }),
    ]);

    expect(result).toHaveLength(2);
    for (const paragraph of result) {
      expect(paragraph.sourceWordIds).toEqual(sourceWordIds);
      expect(paragraph.sourceUtteranceIds).toEqual(sourceUtteranceIds);
    }
  });
});
