import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { buildPreWorkspaceStructure } from "./preWorkspaceStructure";

function makeRecord() {
  const record = emptyCaseRecord("case_w22_2", "2026-07-06T00:00:00.000Z");
  record.witnesses = [{
    witness_id: "wit_1",
    name: { value: "Mohammad Etminan", source: "manual", confirmed: true, conflict: false, confidence_score: 1 },
    role: { value: "EXPERT", source: "manual", confirmed: true, conflict: false, confidence_score: 1 },
    prefix_suffix: "M.D.",
  } as unknown as typeof record.witnesses[number]];
  record.attorneys = [{
    attorney_id: "att_1",
    name: { value: "Dennis Bentley", source: "manual", confirmed: true, conflict: false, confidence_score: 1 },
    role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: 1 },
    function: { value: [], source: "manual", confirmed: true, conflict: false, confidence_score: 1 },
    firm: { value: "Bentley Trial Group", source: "manual", confirmed: true, conflict: false, confidence_score: 1 },
    representing: { value: "Plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: 1 },
    bar_number: { value: null, source: "manual", confirmed: true, conflict: false, confidence_score: 1 },
    address: null,
    city: null,
    state: null,
    zip: null,
    time_used: null,
    email: null,
    phone: null,
  } as unknown as typeof record.attorneys[number]];
  record.caption.case_style.value = "Jordan Alvarez v. Acme Logistics, Inc.";
  record.caption.case_number.value = "2026-CV-1042";
  record.caption.court_name.value = "250th Judicial District Court";
  record.caption.county.value = "Travis County";
  return record;
}

function makeDocument(): EditorDocument {
  return {
    job_id: "tr_w22_2",
    media_url: "",
    duration: 60,
    speakers: [
      { speaker_id: "spk_0", display_name: "Speaker 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk_1", display_name: "Speaker 1", deepgram_speaker: 1, role: "OTHER" },
      { speaker_id: "spk_2", display_name: "Speaker 2", deepgram_speaker: 2, role: "OTHER" },
    ],
    utterances: [
      { utterance_id: "utt_0", speaker_id: "spk_0", start_time: 0, end_time: 5, word_ids: ["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"] },
      { utterance_id: "utt_1", speaker_id: "spk_1", start_time: 5, end_time: 11, word_ids: ["w8", "w9", "w10", "w11", "w12", "w13", "w14", "w15", "w16"] },
      { utterance_id: "utt_2", speaker_id: "spk_2", start_time: 11, end_time: 13, word_ids: ["w17", "w18"] },
    ],
    words: [
      "We", "are", "on", "the", "record.", "Today's", "date", "is",
      "My", "name", "is", "Dennis", "Bentley.", "Do", "you", "understand", "that?",
      "Yes.", "Sir.",
    ].map((text, index) => ({
      word_id: `w${index}`,
      text,
      raw_text: text,
      speaker_id: index <= 7 ? "spk_0" : index <= 16 ? "spk_1" : "spk_2",
      utterance_id: index <= 7 ? "utt_0" : index <= 16 ? "utt_1" : "utt_2",
      start_time: index,
      end_time: index + 0.5,
      confidence: 0.99,
      reviewed: false,
      edited: false,
    })),
  };
}

describe("buildPreWorkspaceStructure", () => {
  it("derives speaker labels and utterance line types before workspace render", async () => {
    const result = await buildPreWorkspaceStructure(makeDocument(), makeRecord());

    expect(result.speakers.find((speaker) => speaker.speaker_id === "spk_0")?.display_name).toBe("THE VIDEOGRAPHER");
    expect(result.speakers.find((speaker) => speaker.speaker_id === "spk_1")?.display_name).toBe("MR. BENTLEY");
    expect(result.speakers.find((speaker) => speaker.speaker_id === "spk_2")?.display_name).toBe("DR. ETMINAN");
    expect(result.utterances.find((utterance) => utterance.utterance_id === "utt_1")?.line_type).toBe("Q");
    expect(result.utterances.find((utterance) => utterance.utterance_id === "utt_2")?.line_type).toBe("A");
  });

  it("builds inclusion-page metadata from the case record", async () => {
    const result = await buildPreWorkspaceStructure(makeDocument(), makeRecord());

    expect(result.inclusionPages.ufm_metadata.caption).toBe("Jordan Alvarez v. Acme Logistics, Inc.");
    expect(result.inclusionPages.ufm_metadata.cause_number).toBe("2026-CV-1042");
    expect(Array.isArray(result.inclusionPages.ufm_metadata.appearances)).toBe(true);
  });
});
