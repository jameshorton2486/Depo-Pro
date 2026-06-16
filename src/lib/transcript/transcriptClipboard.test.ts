import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { buildTranscriptClipboardText } from "./transcriptClipboard";

function makeDocument(): EditorDocument {
  return {
    job_id: "tr_clipboard",
    media_url: "",
    duration: 120,
    speakers: [
      { speaker_id: "spk-reporter", display_name: "Speaker 0", deepgram_speaker: 0, role: "REPORTER" },
      { speaker_id: "spk-attorney", display_name: "MR.  NUNEZ", deepgram_speaker: 1, role: "ATTORNEY" },
      { speaker_id: "spk-witness", display_name: "HEATH THOMAS", deepgram_speaker: 2, role: "WITNESS" },
    ],
    utterances: [
      { utterance_id: "utt-1", speaker_id: "spk-reporter", start_time: 0, end_time: 1, word_ids: ["w-1", "w-2", "w-3", "w-4"] },
      { utterance_id: "utt-2", speaker_id: "spk-attorney", start_time: 1, end_time: 2, word_ids: ["w-5", "w-6", "w-7", "w-8", "w-9"] },
      { utterance_id: "utt-3", speaker_id: "spk-witness", start_time: 2, end_time: 3, word_ids: ["w-10", "w-11"] },
      { utterance_id: "utt-4", speaker_id: "spk-reporter", start_time: 3, end_time: 4, word_ids: ["w-12", "w-13", "w-14", "w-15"] },
    ],
    words: [
      { word_id: "w-1", text: "Good", raw_text: "Good", speaker_id: "spk-reporter", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-2", text: "afternoon,", raw_text: "afternoon,", speaker_id: "spk-reporter", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-3", text: "mister", raw_text: "mister", speaker_id: "spk-reporter", utterance_id: "utt-1", start_time: 0.2, end_time: 0.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-4", text: "Nunez.", raw_text: "Nunez.", speaker_id: "spk-reporter", utterance_id: "utt-1", start_time: 0.3, end_time: 0.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-5", text: "Good", raw_text: "Good", speaker_id: "spk-attorney", utterance_id: "utt-2", start_time: 1, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-6", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-attorney", utterance_id: "utt-2", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-7", text: "How", raw_text: "How", speaker_id: "spk-attorney", utterance_id: "utt-2", start_time: 1.2, end_time: 1.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-8", text: "are", raw_text: "are", speaker_id: "spk-attorney", utterance_id: "utt-2", start_time: 1.3, end_time: 1.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-9", text: "you?", raw_text: "you?", speaker_id: "spk-attorney", utterance_id: "utt-2", start_time: 1.4, end_time: 1.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-10", text: "Doing", raw_text: "Doing", speaker_id: "spk-witness", utterance_id: "utt-3", start_time: 2, end_time: 2.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-11", text: "well.", raw_text: "well.", speaker_id: "spk-witness", utterance_id: "utt-3", start_time: 2.1, end_time: 2.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-12", text: "(", raw_text: "(", speaker_id: "spk-reporter", utterance_id: "utt-4", start_time: 3, end_time: 3.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-13", text: "Recess", raw_text: "Recess", speaker_id: "spk-reporter", utterance_id: "utt-4", start_time: 3.1, end_time: 3.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-14", text: "taken", raw_text: "taken", speaker_id: "spk-reporter", utterance_id: "utt-4", start_time: 3.2, end_time: 3.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-15", text: ")", raw_text: ")", speaker_id: "spk-reporter", utterance_id: "utt-4", start_time: 3.3, end_time: 3.4, confidence: 1, reviewed: false, edited: false },
    ],
  };
}

describe("buildTranscriptClipboardText", () => {
  it("serializes the canonical paragraph model into workspace-matching plain text", () => {
    const record = emptyCaseRecord("case_clipboard", "2026-06-16T12:00:00.000Z");
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

    expect(buildTranscriptClipboardText(makeDocument(), [], record)).toBe(
      [
        "\t\t\tTHE REPORTER:  Good afternoon, mister Nunez.",
        "\t\t\tEXAMINATION",
        "BY MR. NUNEZ:",
        "\tQ.\tGood afternoon. How are you?",
        "\tA.\tDoing well.",
        "\t\t\t( Recess taken )",
      ].join("\n\n"),
    );
  });
});
