import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import { buildDisplayDocument, buildWorkspaceTranscriptText } from "./workspacePresentation";

function makeRecord(): CaseRecord {
  return {
    reporter: { name: { value: "Nellie Bardel" } },
    witnesses: [{ name: { value: "Mohammad Etminan" }, prefix_suffix: "Dr." }],
    attorneys: [
      { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" } },
      { attorney_id: "a2", name: { value: "Ramon Krishnan" }, role: { value: "OPPOSING" } },
    ],
  } as unknown as CaseRecord;
}

function makeDocument(): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "https://example.test/audio.wav",
    duration: 30,
    speakers: [
      { speaker_id: "spk-0", display_name: "Speaker 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-1", display_name: "Speaker 1", deepgram_speaker: 1, role: "OTHER" },
      { speaker_id: "spk-2", display_name: "Speaker 2", deepgram_speaker: 2, role: "OTHER" },
      { speaker_id: "spk-3", display_name: "Speaker 3", deepgram_speaker: 3, role: "OTHER" },
    ],
    utterances: [
      { utterance_id: "utt-1", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1", "w2", "w3", "w4"] },
      { utterance_id: "utt-2", speaker_id: "spk-1", start_time: 1, end_time: 2, word_ids: ["w5", "w6", "w7"] },
      { utterance_id: "utt-3", speaker_id: "spk-2", start_time: 2, end_time: 3, word_ids: ["w8", "w9", "w10", "w11", "w12"] },
      { utterance_id: "utt-4", speaker_id: "spk-3", start_time: 3, end_time: 4, word_ids: ["w13", "w14"] },
    ],
    words: [
      { word_id: "w1", text: "Good", raw_text: "Good", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "We", raw_text: "We", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.2, end_time: 0.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "are on the record.", raw_text: "are on the record.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.3, end_time: 0.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w5", text: "This", raw_text: "This", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.4, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "is cause number", raw_text: "is cause number", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.5, end_time: 0.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w7", text: "123.", raw_text: "123.", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.6, end_time: 0.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w8", text: "Good", raw_text: "Good", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.7, end_time: 0.8, confidence: 1, reviewed: false, edited: false },
      { word_id: "w9", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.8, end_time: 0.9, confidence: 1, reviewed: false, edited: false },
      { word_id: "w10", text: "Dennis", raw_text: "Dennis", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.9, end_time: 1.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w11", text: "Bentley", raw_text: "Bentley", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 1.0, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w12", text: "for the plaintiff.", raw_text: "for the plaintiff.", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w13", text: "I", raw_text: "I", speaker_id: "spk-3", utterance_id: "utt-4", start_time: 1.2, end_time: 1.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w14", text: "do.", raw_text: "do.", speaker_id: "spk-3", utterance_id: "utt-4", start_time: 1.3, end_time: 1.4, confidence: 1, reviewed: false, edited: false },
    ],
  };
}

describe("workspacePresentation", () => {
  it("infers more useful speaker labels and roles for workspace display", () => {
    const displayDocument = buildDisplayDocument(makeDocument(), makeRecord());
    const speakerMap = new Map(displayDocument.speakers.map((speaker) => [speaker.speaker_id, speaker]));

    expect(speakerMap.get("spk-0")?.display_name).toBe("THE VIDEOGRAPHER");
    expect(speakerMap.get("spk-1")?.display_name).toBe("THE REPORTER");
    expect(speakerMap.get("spk-2")?.display_name).toBe("DENNIS BENTLEY");
    expect(speakerMap.get("spk-2")?.role).toBe("ATTORNEY");
    expect(speakerMap.get("spk-3")?.display_name).toBe("THE WITNESS");
    expect(speakerMap.get("spk-3")?.role).toBe("WITNESS");
  });

  it("renders proceedings and examination structure for transcript text", () => {
    const text = buildWorkspaceTranscriptText(makeDocument(), makeRecord());

    expect(text).toContain("PROCEEDINGS");
    expect(text).toContain("THE VIDEOGRAPHER:  Good afternoon.");
    expect(text).toContain("THE REPORTER:  This is cause number 123.");
    expect(text).toContain("EXAMINATION");
    expect(text).toContain("BY DENNIS BENTLEY:");
    expect(text).toContain("Q. Good afternoon.  Dennis Bentley for the plaintiff.");
    expect(text).toContain("A. I do.");
  });
});


