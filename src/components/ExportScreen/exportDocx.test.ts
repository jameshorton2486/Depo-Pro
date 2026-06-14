import { describe, expect, it, vi } from "vitest";

import type { EditorDocument } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { buildExportDocxBlob, type ExportTranscriptSegment } from "./exportDocx";

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
});
