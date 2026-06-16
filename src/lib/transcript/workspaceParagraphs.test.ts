import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { buildWorkspaceParagraphs } from "./workspaceParagraphs";

function makeDocument(): EditorDocument {
  return {
    job_id: "tr-1",
    media_url: "",
    duration: 120,
    speakers: [
      { speaker_id: "spk-reporter", display_name: "Speaker 0", deepgram_speaker: 0, role: "REPORTER" },
      { speaker_id: "spk-attorney", display_name: "MR. NUNEZ", deepgram_speaker: 1, role: "ATTORNEY" },
      { speaker_id: "spk-witness", display_name: "HEATH THOMAS", deepgram_speaker: 2, role: "WITNESS" },
    ],
    utterances: [
      { utterance_id: "utt-1", speaker_id: "spk-reporter", start_time: 0, end_time: 1, word_ids: ["w-1", "w-2"] },
      { utterance_id: "utt-2", speaker_id: "spk-attorney", start_time: 1, end_time: 2, word_ids: ["w-3", "w-4"] },
      { utterance_id: "utt-3", speaker_id: "spk-attorney", start_time: 2, end_time: 3, word_ids: ["w-5", "w-6", "w-7", "w-8", "w-9", "w-10"] },
      { utterance_id: "utt-4", speaker_id: "spk-witness", start_time: 3, end_time: 4, word_ids: ["w-11", "w-12"] },
    ],
    words: [
      { word_id: "w-1", text: "Good", raw_text: "Good", speaker_id: "spk-reporter", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-2", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-reporter", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-3", text: "Of", raw_text: "Of", speaker_id: "spk-attorney", utterance_id: "utt-2", start_time: 1, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-4", text: "course.", raw_text: "course.", speaker_id: "spk-attorney", utterance_id: "utt-2", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-5", text: "Please", raw_text: "Please", speaker_id: "spk-attorney", utterance_id: "utt-3", start_time: 2, end_time: 2.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-6", text: "state", raw_text: "state", speaker_id: "spk-attorney", utterance_id: "utt-3", start_time: 2.1, end_time: 2.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-7", text: "your", raw_text: "your", speaker_id: "spk-attorney", utterance_id: "utt-3", start_time: 2.2, end_time: 2.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-8", text: "name", raw_text: "name", speaker_id: "spk-attorney", utterance_id: "utt-3", start_time: 2.3, end_time: 2.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-9", text: "for", raw_text: "for", speaker_id: "spk-attorney", utterance_id: "utt-3", start_time: 2.4, end_time: 2.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-10", text: "the record.", raw_text: "the record.", speaker_id: "spk-attorney", utterance_id: "utt-3", start_time: 2.5, end_time: 2.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-11", text: "Heath", raw_text: "Heath", speaker_id: "spk-witness", utterance_id: "utt-4", start_time: 3, end_time: 3.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w-12", text: "Thomas.", raw_text: "Thomas.", speaker_id: "spk-witness", utterance_id: "utt-4", start_time: 3.1, end_time: 3.2, confidence: 1, reviewed: false, edited: false },
    ],
  };
}

describe("buildWorkspaceParagraphs", () => {
  it("keeps pre-examination attorney colloquy labeled inline and opens examination on the first question", () => {
    const record = emptyCaseRecord("case_workspace", "2026-06-16T12:00:00.000Z");
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

    const descriptors = buildWorkspaceParagraphs(makeDocument(), [], record);

    expect(descriptors.get("utt-1")).toMatchObject({
      mode: "COLLOQUY",
      label: "THE REPORTER",
    });
    expect(descriptors.get("utt-2")).toMatchObject({
      mode: "COLLOQUY",
      label: "MR. NUNEZ",
    });
    expect(descriptors.get("utt-3")).toMatchObject({
      mode: "Q",
      examinationHeader: true,
      byLine: "BY MR. NUNEZ:",
    });
    expect(descriptors.get("utt-4")).toMatchObject({
      mode: "A",
      label: "MR. THOMAS",
    });
  });
});
