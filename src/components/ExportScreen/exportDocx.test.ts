import { describe, expect, it, vi } from "vitest";

import type { EditorDocument } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { buildExportDocxBlob, buildStageSDocxParagraphSpecs, type ExportTranscriptSegment } from "./exportDocx";

function buildSegment(): ExportTranscriptSegment {
  const document: EditorDocument = {
    job_id: "tr_export",
    media_url: "",
    duration: 10,
    speakers: [
      { speaker_id: "spk_q", display_name: "MR. NUNEZ", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk_a", display_name: "DR. THOMAS", deepgram_speaker: 1, role: "WITNESS" },
    ],
    utterances: [
      { utterance_id: "utt_q", speaker_id: "spk_q", start_time: 0, end_time: 1, word_ids: ["w_q_0"] },
      { utterance_id: "utt_a", speaker_id: "spk_a", start_time: 1, end_time: 2, word_ids: ["w_a_0"] },
    ],
    words: [
      { word_id: "w_q_0", text: "Question?", raw_text: "Question?", speaker_id: "spk_q", utterance_id: "utt_q", start_time: 0, end_time: 1, confidence: 1, reviewed: true, edited: false },
      { word_id: "w_a_0", text: "Answer.", raw_text: "Answer.", speaker_id: "spk_a", utterance_id: "utt_a", start_time: 1, end_time: 2, confidence: 1, reviewed: true, edited: false },
    ],
  };

  return {
    transcriptId: "tr_export",
    sequenceIndex: 0,
    sourceFilename: "segment.mp3",
    document,
  };
}

describe("buildExportDocxBlob", () => {
  it("uses the legacy formatter path when the Stage S flag is off", async () => {
    const legacyBlob = new Blob(["legacy"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const buildLegacyBlob = vi.fn(async () => legacyBlob);
    const buildStageSBlob = vi.fn(async () => new Blob(["stage-s"]));
    const record = emptyCaseRecord("case_export", "2026-06-13T00:00:00.000Z");

    const blob = await buildExportDocxBlob(
      [buildSegment()],
      record,
      {
        useStageSExport: false,
        buildLegacyBlob,
        buildStageSBlob,
      },
    );

    expect(blob).toBe(legacyBlob);
    expect(buildLegacyBlob).toHaveBeenCalledOnce();
    expect(buildStageSBlob).not.toHaveBeenCalled();
  });

  it("uses the shared workspace paragraph model for Stage S exports", () => {
    const record = emptyCaseRecord("case_export", "2026-06-13T00:00:00.000Z");
    record.reporter.name.value = "Mia Bardot";
    record.witnesses = [{
      witness_id: "wit_001",
      name: { value: "Heath Thomas", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "WITNESS", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      title: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      employer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      prefix_suffix: "Mr",
      party_affiliation: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_interpreter: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_videographer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      spelling_corrections: [],
      email: null,
      phone: null,
    }];

    const paragraphs = buildStageSDocxParagraphSpecs([{
      ...buildSegment(),
      snapshot: {
        job: {
          transcript_id: "tr_export",
          case_id: "case_export",
        },
        speakers: [
          {
            speaker_id: "spk_q",
            display_name: "Speaker 1",
            deepgram_speaker: 1,
            role: "examining_attorney",
            job_id: "job_export",
            speaker_index: 1,
            speaker_label: "SPEAKER 1",
            assigned_name: "MR. NUNEZ",
            speaker_role: "examining_attorney",
            word_count: 1,
          },
          {
            speaker_id: "spk_a",
            display_name: "Speaker 2",
            deepgram_speaker: 2,
            role: "witness",
            job_id: "job_export",
            speaker_index: 2,
            speaker_label: "SPEAKER 2",
            assigned_name: "MR. THOMAS",
            speaker_role: "witness",
            word_count: 1,
          },
        ],
        utterances: [],
        words: [],
        speakerResolutionOverlay: [],
      } as never,
    }], record);

    expect(paragraphs.map((paragraph) => paragraph.kind)).toEqual(["EXAMINATION", "BY_LINE", "Q", "A"]);
    expect(paragraphs[0]?.runs).toEqual([
      { kind: "text", text: "EXAMINATION" },
    ]);
    expect(paragraphs[1]?.runs).toEqual([
      { kind: "text", text: "BY MR. NUNEZ:" },
    ]);
    expect(paragraphs[2]?.runs).toEqual([
      { kind: "text", text: "Q." },
      { kind: "tab" },
      { kind: "text", text: "Question?" },
    ]);
    expect(paragraphs[3]?.runs).toEqual([
      { kind: "text", text: "A." },
      { kind: "tab" },
      { kind: "text", text: "Answer." },
    ]);
  });
});
