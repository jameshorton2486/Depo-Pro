import { describe, expect, it } from "vitest";
import type { TranscriptParagraph } from "./workspacePresentation";
import type { FormattedWord } from "../format/types";
import { applyQaFixer } from "./qaFixer";
import { UNIDENTIFIED_SPEAKER } from "./resolveSpeakerDisplayName";

function makeParagraph(overrides: Partial<TranscriptParagraph> = {}): TranscriptParagraph {
  return {
    kind: "Q",
    label: "Q.",
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

describe("qaFixer", () => {
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
      expect.objectContaining({ kind: "COLLOQUY", text: "Objection.  Form.", label: UNIDENTIFIED_SPEAKER }),
    ]);
  });

  it("normalizes standalone K. artifacts to Okay.", () => {
    const result = applyQaFixer([
      makeParagraph({ kind: "COLLOQUY", label: UNIDENTIFIED_SPEAKER, text: " K. And in this case" }),
    ]);

    expect(result[0]?.text).toBe("Okay.  And in this case");
  });

  it("never fabricates an objecting attorney; unknown objector stays unattributed (§14/§57)", () => {
    const result = applyQaFixer([
      makeParagraph({ text: "And you reviewed it in this case?  Objection.  Form." }),
    ]);
    const colloquy = result.find((paragraph) => paragraph.kind === "COLLOQUY");
    // Unknown objector -> canonical unidentified marker, never a fabricated person.
    expect(colloquy?.label).toBe(UNIDENTIFIED_SPEAKER);
    expect(colloquy?.label).not.toBe("MR. RAMON");
    expect(colloquy?.label).not.toMatch(/^(MR|MS|MRS)\./);
    // Objection content preserved verbatim.
    expect(colloquy?.text).toBe("Objection.  Form.");
  });

  it("preserves a legitimate 'four' — no deterministic four->form substitution", () => {
    const result = applyQaFixer([
      makeParagraph({ text: "Were there four exhibits?  Objection.  Form." }),
    ]);
    const joined = result.map((paragraph) => paragraph.text).join(" ");
    expect(joined).toContain("four");
    expect(joined).not.toContain("form exhibits");
    expect(joined).toContain("Objection.  Form.");
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

// When paragraphs carry real words, each split child must own only the words
// that fall within its own text range — its sourceWordIds map to per-word audio
// and timing on certified output. Regression coverage for the objection-split
// provenance bug where the Q line swallowed the objection's own words.
function word(id: string, text: string, trailing = " ", uttId = "utt-1"): FormattedWord {
  return {
    word_id: id,
    utterance_id: uttId,
    speaker_id: "spk-1",
    text,
    raw_text: text,
    start_time: 0,
    end_time: 0,
    confidence: 1,
    reviewed: false,
    edited: false,
    inline_flag: null,
    trailing_space: trailing,
  } as FormattedWord;
}

function wordParagraph(text: string, words: FormattedWord[]): TranscriptParagraph {
  return {
    kind: "Q",
    label: "Q.",
    text,
    speakerId: "spk-1",
    leadingText: "",
    mode: "display",
    words,
    sourceLines: [],
    sourceUtteranceIds: Array.from(new Set(words.map((w) => w.utterance_id))),
    sourceWordIds: words.map((w) => w.word_id),
  };
}

describe("qaFixer word-level provenance", () => {
  it("objection split assigns the objection's own words to the COLLOQUY line", () => {
    const words = [
      word("w1", "And"),
      word("w2", "you"),
      word("w3", "reviewed"),
      word("w4", "it"),
      word("w5", "in"),
      word("w6", "this"),
      word("w7", "case?", "  "),
      word("w8", "Objection.", "  "),
      word("w9", "Form.", ""),
    ];
    const result = applyQaFixer([
      wordParagraph("And you reviewed it in this case?  Objection.  Form.", words),
    ]);

    expect(result.map((p) => [p.kind, p.sourceWordIds])).toEqual([
      ["Q", ["w1", "w2", "w3", "w4", "w5", "w6", "w7"]],
      ["COLLOQUY", ["w8", "w9"]],
    ]);
  });

  it("short-answer split assigns Q and A their own words", () => {
    const words = [
      word("w1", "Do"),
      word("w2", "you"),
      word("w3", "understand"),
      word("w4", "that?", "  "),
      word("w5", "Yes.", ""),
    ];
    const result = applyQaFixer([wordParagraph("Do you understand that?  Yes.", words)]);

    expect(result.map((p) => [p.kind, p.sourceWordIds])).toEqual([
      ["Q", ["w1", "w2", "w3", "w4"]],
      ["A", ["w5"]],
    ]);
  });

  it("Q/A/Q trailing split assigns each segment its own words", () => {
    const words = [
      word("w1", "Correct?", "  "),
      word("w2", "Yes.", "  "),
      word("w3", "What"),
      word("w4", "did"),
      word("w5", "you"),
      word("w6", "do?", ""),
    ];
    const result = applyQaFixer([wordParagraph("Correct?  Yes.  What did you do?", words)]);

    expect(result.map((p) => [p.kind, p.sourceWordIds])).toEqual([
      ["Q", ["w1"]],
      ["A", ["w2"]],
      ["Q", ["w3", "w4", "w5", "w6"]],
    ]);
  });
});
