import { describe, expect, it } from "vitest";

import { buildStructuredTranscriptPackage, validateStructuredTranscriptPackage } from "./structuredTranscriptPackage";
import type { DialogueBlock } from "./structureEngine";
import type { TranscriptParagraph } from "./transcriptParagraphTypes";

const paragraph: TranscriptParagraph = {
  kind: "Q",
  region: "TESTIMONY",
  label: "Q.",
  speakerLabel: "MR. SAMPLE",
  text: "Please state your name.",
  speakerId: "speaker_examiner",
  leadingText: "",
  mode: "display",
  words: [],
  sourceLines: [],
  sourceUtteranceIds: ["utterance_1"],
  sourceWordIds: ["word_1"],
};

const dialogue: DialogueBlock = {
  dialogue_block_id: "dialogue:utterance_1",
  source_utterance_ids: ["utterance_1"],
  utterance_index: 1,
  utterance_id: "utterance_1",
  block_type: "Q",
  speaker_id: "speaker_examiner",
  display_name: "MR. SAMPLE",
  confidence: 1,
  text: "Please state your name.",
};

describe("structuredTranscriptPackage", () => {
  it("assembles immutable producer output without reclassifying it", () => {
    const result = buildStructuredTranscriptPackage({
      transcriptId: "transcript_1",
      paragraphs: [paragraph],
      dialogue: [dialogue],
      createdAt: "2026-07-20T00:00:00.000Z",
    });

    expect(result.paragraphs[0]?.id).toBe("paragraph:0:utterance_1");
    expect(result.dialogue[0]?.dialogue_block_id).toBe("dialogue:utterance_1");
    paragraph.sourceUtteranceIds.push("mutated");
    expect(result.paragraphs[0]?.paragraph.sourceUtteranceIds).toEqual(["utterance_1"]);
    expect(validateStructuredTranscriptPackage(result)).toEqual([]);
  });

  it("reports invalid package identity and duplicate dialogue identities", () => {
    const result = buildStructuredTranscriptPackage({
      transcriptId: "",
      paragraphs: [paragraph],
      dialogue: [dialogue, dialogue],
      createdAt: "invalid-date",
    });

    expect(validateStructuredTranscriptPackage(result)).toEqual(expect.arrayContaining([
      "transcriptId is required",
      "createdAt must be an ISO timestamp",
      "duplicate dialogue block ID: dialogue:utterance_1",
    ]));
  });

  it("returns errors instead of throwing for malformed payloads", () => {
    expect(validateStructuredTranscriptPackage({
      schema: "invalid", version: 1, transcriptId: null, createdAt: null,
      paragraphs: null, dialogue: [{ dialogue_block_id: null, source_utterance_ids: null }],
    })).toEqual(expect.arrayContaining([
      "package schema is invalid", "transcriptId is required", "createdAt must be an ISO timestamp",
      "paragraphs must be an array", "dialogue block unknown is missing source provenance",
    ]));
  });});
