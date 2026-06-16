import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import type { ExportSegmentDocument } from "./exportAssembly";
import {
  buildAttributionParagraphSpec,
  buildBodyTabStops,
  buildColloquyParagraphSpec,
  buildExaminationParagraphSpec,
  buildParentheticalParagraphSpec,
  buildQaParagraphSpec,
  buildTranscriptDocxParagraphSpecs,
  BYLINE_LEFT_TWIPS,
  CENTER_TAB_TWIPS,
  COLLOQUY_TAB_TWIPS,
  QA_HANGING_INDENT_TWIPS,
  QA_LABEL_TAB_TWIPS,
  QA_TEXT_TAB_TWIPS,
} from "./docxFormatter";
import { getBlockRole } from "../../editor/pagination";

function buildSegment(): ExportSegmentDocument {
  const document: EditorDocument = {
    job_id: "tr_docx",
    media_url: "",
    duration: 10,
    speakers: [
      { speaker_id: "spk_q", display_name: "MR. NUNEZ", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk_a", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
      { speaker_id: "spk_c", display_name: "MS. ZAHN", deepgram_speaker: 2, role: "OTHER" },
    ],
    utterances: [
      {
        utterance_id: "utt_q",
        speaker_id: "spk_q",
        start_time: 0,
        end_time: 1,
        word_ids: ["w_q_0", "w_q_1", "w_q_2", "w_q_3"],
      },
      {
        utterance_id: "utt_a",
        speaker_id: "spk_a",
        start_time: 1,
        end_time: 2,
        word_ids: ["w_a_0", "w_a_1"],
      },
      {
        utterance_id: "utt_c",
        speaker_id: "spk_c",
        start_time: 2,
        end_time: 3,
        word_ids: ["w_c_0", "w_c_1"],
      },
    ],
    words: [
      { word_id: "w_q_0", text: "Where", raw_text: "Where", speaker_id: "spk_q", utterance_id: "utt_q", start_time: 0, end_time: 0.2, confidence: 1, reviewed: true, edited: false },
      { word_id: "w_q_1", text: "were", raw_text: "were", speaker_id: "spk_q", utterance_id: "utt_q", start_time: 0.2, end_time: 0.4, confidence: 1, reviewed: true, edited: false },
      { word_id: "w_q_2", text: "you", raw_text: "you", speaker_id: "spk_q", utterance_id: "utt_q", start_time: 0.4, end_time: 0.6, confidence: 1, reviewed: true, edited: false },
      { word_id: "w_q_3", text: "treated?", raw_text: "treated?", speaker_id: "spk_q", utterance_id: "utt_q", start_time: 0.6, end_time: 1, confidence: 1, reviewed: true, edited: false },
      { word_id: "w_a_0", text: "Parkland.", raw_text: "Parkland.", speaker_id: "spk_a", utterance_id: "utt_a", start_time: 1, end_time: 1.5, confidence: 1, reviewed: true, edited: false },
      { word_id: "w_a_1", text: "Hospital.", raw_text: "Hospital.", speaker_id: "spk_a", utterance_id: "utt_a", start_time: 1.5, end_time: 2, confidence: 1, reviewed: true, edited: false },
      { word_id: "w_c_0", text: "(BY", raw_text: "(BY", speaker_id: "spk_c", utterance_id: "utt_c", start_time: 2, end_time: 2.5, confidence: 1, reviewed: true, edited: false },
      { word_id: "w_c_1", text: "MR. NUNEZ)", raw_text: "MR. NUNEZ)", speaker_id: "spk_c", utterance_id: "utt_c", start_time: 2.5, end_time: 3, confidence: 1, reviewed: true, edited: false },
    ],
  };

  return {
    transcriptId: "tr_docx",
    sequenceIndex: 0,
    sourceFilename: "segment.mp3",
    document,
  };
}

describe("docxFormatter", () => {
  it("builds body tab stops at 0.5, 1.0, 1.5, and center-of-page", () => {
    expect(buildBodyTabStops()).toEqual([
      { type: "left", position: QA_LABEL_TAB_TWIPS },
      { type: "left", position: QA_TEXT_TAB_TWIPS },
      { type: "left", position: COLLOQUY_TAB_TWIPS },
      { type: "center", position: CENTER_TAB_TWIPS },
    ]);
  });

  it("formats Q and A lines as label-tab-text with a hanging indent", () => {
    const qParagraph = buildQaParagraphSpec("Q.", "Where were you treated?");
    const aParagraph = buildQaParagraphSpec("A.", "Parkland Hospital.");

    expect(qParagraph.indent).toEqual({ left: QA_TEXT_TAB_TWIPS, hanging: QA_HANGING_INDENT_TWIPS });
    expect(aParagraph.indent).toEqual({ left: QA_TEXT_TAB_TWIPS, hanging: QA_HANGING_INDENT_TWIPS });
    expect(qParagraph.runs).toEqual([
      { kind: "text", text: "Q." },
      { kind: "tab" },
      { kind: "text", text: "Where were you treated?" },
    ]);
    expect(aParagraph.runs).toEqual([
      { kind: "text", text: "A." },
      { kind: "tab" },
      { kind: "text", text: "Parkland Hospital." },
    ]);
  });

  it("renders standalone by-lines at the left margin", () => {
    const paragraph = buildAttributionParagraphSpec("BY MR.  NUNEZ:");

    expect(paragraph.indent).toEqual({ left: BYLINE_LEFT_TWIPS });
    expect(paragraph.runs).toEqual([
      { kind: "text", text: "BY MR. NUNEZ:" },
    ]);
  });

  it("keeps inline by-attribution text at the testimony tab when formatting legacy attribution lines", () => {
    const paragraph = buildAttributionParagraphSpec("(BY MR.  NUNEZ)");

    expect(paragraph.indent).toEqual({ left: QA_TEXT_TAB_TWIPS });
    expect(paragraph.runs).toEqual([
      { kind: "text", text: "(BY MR. NUNEZ)" },
    ]);
  });

  it("indents colloquy, examination, and parentheticals to the 1.5 inch geometry stop", () => {
    expect(buildColloquyParagraphSpec("MR.  NUNEZ", "Good afternoon.")).toEqual(
      expect.objectContaining({
        indent: { left: COLLOQUY_TAB_TWIPS },
        runs: [{ kind: "text", text: "MR. NUNEZ:  Good afternoon." }],
      }),
    );
    expect(buildExaminationParagraphSpec("EXAMINATION")).toEqual(
      expect.objectContaining({
        indent: { left: COLLOQUY_TAB_TWIPS },
        runs: [{ kind: "text", text: "EXAMINATION" }],
      }),
    );
    expect(buildParentheticalParagraphSpec("(Recess taken.)")).toEqual(
      expect.objectContaining({
        indent: { left: COLLOQUY_TAB_TWIPS },
        runs: [{ kind: "text", text: "(Recess taken.)" }],
      }),
    );
  });

  it("derives Q/A paragraphs from the exported transcript document without two-space prefixes", () => {
    const paragraphs = buildTranscriptDocxParagraphSpecs([buildSegment()]);

    expect(getBlockRole("ATTORNEY")).toBe("Q");
    expect(getBlockRole("WITNESS")).toBe("A");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].runs).toEqual([
      { kind: "text", text: "Q." },
      { kind: "tab" },
      { kind: "text", text: "Where were you treated?" },
    ]);
    expect(paragraphs[1].runs).toEqual([
      { kind: "text", text: "A." },
      { kind: "tab" },
      { kind: "text", text: "Parkland. Hospital." },
    ]);
    expect(paragraphs[2].runs).toEqual([
      { kind: "text", text: "(BY MR. NUNEZ)" },
    ]);
    expect(paragraphs[0].runs.some((run) => run.kind === "text" && run.text.includes("Q.  "))).toBe(false);
  });
});
