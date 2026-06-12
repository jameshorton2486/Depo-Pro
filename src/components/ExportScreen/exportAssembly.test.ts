import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import {
  buildExportTranscriptText,
  countExportWords,
  formatEditorDocumentText,
  type ExportSegmentDocument,
} from "./exportAssembly";

function buildDocument(prefix: string): EditorDocument {
  return {
    job_id: `tr_${prefix}`,
    media_url: "",
    duration: 10,
    speakers: [{
      speaker_id: `spk_${prefix}`,
      display_name: `Speaker ${prefix}`,
      deepgram_speaker: 0,
    }],
    utterances: [{
      utterance_id: `utt_${prefix}`,
      speaker_id: `spk_${prefix}`,
      start_time: 0,
      end_time: 1,
      word_ids: [`w_${prefix}_0`, `w_${prefix}_1`],
    }],
    words: [
      {
        word_id: `w_${prefix}_0`,
        text: prefix,
        raw_text: prefix,
        speaker_id: `spk_${prefix}`,
        utterance_id: `utt_${prefix}`,
        start_time: 0,
        end_time: 0.5,
        confidence: 0.9,
        reviewed: true,
        edited: false,
      },
      {
        word_id: `w_${prefix}_1`,
        text: "segment",
        raw_text: "segment",
        speaker_id: `spk_${prefix}`,
        utterance_id: `utt_${prefix}`,
        start_time: 0.5,
        end_time: 1,
        confidence: 0.91,
        reviewed: true,
        edited: false,
      },
    ],
  };
}

function buildSegment(sequenceIndex: number, prefix: string): ExportSegmentDocument {
  return {
    transcriptId: `tr_${prefix}`,
    sequenceIndex,
    sourceFilename: `${prefix}.mp3`,
    document: buildDocument(prefix),
  };
}

describe("buildExportTranscriptText", () => {
  it("exports all segments in sequence_index order", () => {
    const exported = buildExportTranscriptText([
      buildSegment(0, "alpha"),
      buildSegment(1, "beta"),
      buildSegment(2, "gamma"),
    ]);

    expect(exported).toContain("=== Segment 1: alpha.mp3 ===");
    expect(exported).toContain("=== Segment 2: beta.mp3 ===");
    expect(exported).toContain("=== Segment 3: gamma.mp3 ===");
    expect(exported.indexOf("alpha segment")).toBeLessThan(exported.indexOf("beta segment"));
    expect(exported.indexOf("beta segment")).toBeLessThan(exported.indexOf("gamma segment"));
    expect(countExportWords([
      buildSegment(0, "alpha"),
      buildSegment(1, "beta"),
      buildSegment(2, "gamma"),
    ])).toBe(6);
  });

  it("matches single-document export behavior when only one segment exists", () => {
    const single = buildSegment(0, "solo");

    expect(buildExportTranscriptText([single])).toBe(formatEditorDocumentText(single.document));
  });

  it("follows sequence_index instead of input order", () => {
    const exported = buildExportTranscriptText([
      buildSegment(2, "third"),
      buildSegment(0, "first"),
      buildSegment(1, "second"),
    ]);

    expect(exported.indexOf("first segment")).toBeLessThan(exported.indexOf("second segment"));
    expect(exported.indexOf("second segment")).toBeLessThan(exported.indexOf("third segment"));
  });
});
