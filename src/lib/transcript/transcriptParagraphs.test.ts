import { describe, expect, it } from "vitest";

import type { FormattedLine } from "../format/types";
import { buildResumptionByLine, buildTranscriptParagraphs, type ParagraphProductionLine } from "./transcriptParagraphs";

function makeLine(overrides: Partial<ParagraphProductionLine> = {}): ParagraphProductionLine {
  const line = {
    utterance_id: "u1",
    speaker_id: "speaker-1",
    speaker_label: "MR. BENTLEY",
    role: "q",
    source_word_ids: ["w1"],
    words: [],
  } as unknown as FormattedLine;
  return {
    line,
    text: "What happened next?",
    region: "TESTIMONY",
    persistedLineType: "Q",
    speakerLabel: "MR. BENTLEY",
    ...overrides,
  };
}

describe("transcriptParagraphs", () => {
  it("starts examination with a header and by-line", () => {
    const paragraphs = buildTranscriptParagraphs([makeLine()]);

    expect(paragraphs).toMatchObject([
      { kind: "SECTION_HEADER", text: "EXAMINATION" },
      { kind: "BY_LINE", text: "BY MR. BENTLEY:" },
      { kind: "Q", label: "Q.", text: "What happened next?" },
    ]);
  });

  it("transitions to cross-examination when the questioning attorney changes", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine(),
      makeLine({ line: { ...makeLine().line, utterance_id: "u2", speaker_id: "speaker-2", speaker_label: "MS. HART" }, speakerLabel: "MS. HART" }),
    ]);

    expect(paragraphs).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SECTION_HEADER", text: "CROSS-EXAMINATION" }),
      expect.objectContaining({ kind: "BY_LINE", text: "BY MS. HART:" }),
    ]));
  });

  it("preserves explicit redirect and recross headers", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine({ text: "REDIRECT EXAMINATION", persistedLineType: "HEADER", line: { ...makeLine().line, role: "section_header" } }),
      makeLine({ text: "RECROSS-EXAMINATION", persistedLineType: "HEADER", line: { ...makeLine().line, utterance_id: "u2", role: "section_header" } }),
    ]);

    expect(paragraphs.map((paragraph) => paragraph.text)).toEqual(["REDIRECT", "RECROSS"]);
  });

  it("starts a new examiner after an explicit redirect heading", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine(),
      makeLine({ text: "REDIRECT EXAMINATION", persistedLineType: "HEADER", line: { ...makeLine().line, utterance_id: "u2", role: "section_header" } }),
      makeLine({ line: { ...makeLine().line, utterance_id: "u3", speaker_id: "speaker-2", speaker_label: "MS. HART" }, speakerLabel: "MS. HART" }),
    ]);

    expect(paragraphs).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SECTION_HEADER", text: "REDIRECT" }),
      expect.objectContaining({ kind: "BY_LINE", text: "BY MS. HART:" }),
    ]));
    expect(paragraphs.filter((paragraph) => paragraph.text === "CROSS-EXAMINATION")).toHaveLength(0);
  });
  it("uses an inline resumption by-line after colloquy", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine(),
      makeLine({ persistedLineType: "SP", text: "Objection. Form.", line: { ...makeLine().line, utterance_id: "u2", role: "speaker_label" } }),
      makeLine({ line: { ...makeLine().line, utterance_id: "u3" } }),
    ]);

    expect(paragraphs[paragraphs.length - 1]).toMatchObject({ kind: "Q", text: "(BY MR. BENTLEY) What happened next?" });
  });

  it("does not produce paragraphs for proceedings or certification", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine({ region: "PROCEEDINGS" }),
      makeLine({ region: "CERTIFICATION" }),
    ]);

    expect(paragraphs).toEqual([]);
  });

  it("keeps generated headers and by-lines free of question word identities", () => {
    const source = makeLine({
      line: {
        ...makeLine().line,
        words: [{ word_id: "w1", utterance_id: "u1", speaker_id: "speaker-1", text: "What", raw_text: "What", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false, inline_flag: null, trailing_space: "" }],
      },
    });
    const paragraphs = buildTranscriptParagraphs([source]);

    for (const paragraph of paragraphs.filter((paragraph) => paragraph.kind === "SECTION_HEADER" || paragraph.kind === "BY_LINE")) {
      expect(paragraph.words).toEqual([]);
      expect(paragraph.sourceWordIds).toEqual([]);
      expect(paragraph.speakerId).toBeNull();
    }
  });

  it("uses a standalone by-line after colloquy when no examiner exists", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine({ persistedLineType: "SP", text: "Please proceed.", line: { ...makeLine().line, role: "speaker_label" } }),
      makeLine({ line: { ...makeLine().line, utterance_id: "u2" } }),
    ]);

    expect(paragraphs).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "BY_LINE", text: "BY MR. BENTLEY:" }),
    ]));
    expect(paragraphs.some((paragraph) => paragraph.text.startsWith("(BY "))).toBe(false);
  });

  it("uses a standalone by-line when a new examiner follows colloquy", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine(),
      makeLine({ persistedLineType: "SP", text: "Objection. Form.", line: { ...makeLine().line, utterance_id: "u2", role: "speaker_label" } }),
      makeLine({ line: { ...makeLine().line, utterance_id: "u3", speaker_id: "speaker-2", speaker_label: "MS. HART" }, speakerLabel: "MS. HART" }),
    ]);

    expect(paragraphs).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SECTION_HEADER", text: "CROSS-EXAMINATION" }),
      expect.objectContaining({ kind: "BY_LINE", text: "BY MS. HART:" }),
    ]));
  });

  it("advances examiner returns through cross, redirect, and recross", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine(),
      makeLine({ line: { ...makeLine().line, utterance_id: "u2", speaker_id: "speaker-2", speaker_label: "MS. HART" }, speakerLabel: "MS. HART" }),
      makeLine({ line: { ...makeLine().line, utterance_id: "u3" } }),
      makeLine({ line: { ...makeLine().line, utterance_id: "u4", speaker_id: "speaker-2", speaker_label: "MS. HART" }, speakerLabel: "MS. HART" }),
    ]);

    expect(paragraphs.filter((paragraph) => paragraph.kind === "SECTION_HEADER").map((paragraph) => paragraph.text)).toEqual([
      "EXAMINATION",
      "CROSS-EXAMINATION",
      "REDIRECT",
      "RECROSS",
    ]);
  });

  it("distinguishes examiners with matching display labels by speaker ID", () => {
    const paragraphs = buildTranscriptParagraphs([
      makeLine({ speakerLabel: "MR. SMITH", line: { ...makeLine().line, speaker_label: "MR. SMITH" } }),
      makeLine({ speakerLabel: "MR. SMITH", line: { ...makeLine().line, utterance_id: "u2", speaker_id: "speaker-2", speaker_label: "MR. SMITH" } }),
    ]);

    expect(paragraphs).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SECTION_HEADER", text: "CROSS-EXAMINATION" }),
      expect.objectContaining({ kind: "BY_LINE", text: "BY MR. SMITH:" }),
    ]));
  });

  it("returns no paragraphs for missing input", () => {
    expect(buildTranscriptParagraphs(null)).toEqual([]);
    expect(buildTranscriptParagraphs(undefined)).toEqual([]);
  });
  it("formats a resumption by-line without a colon after BY", () => {
    expect(buildResumptionByLine("MR. BENTLEY")).toBe("(BY MR. BENTLEY)");
  });
});
