import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../../api/types";
import { segmentUtterance } from "./grouping";

function makeDoc(): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "http://example.test/audio.wav",
    duration: 120,
    speakers: [
      { speaker_id: "spk-1", display_name: "Q", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-2", display_name: "A", deepgram_speaker: 1, role: "WITNESS" },
    ],
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: 4,
        word_ids: ["w1", "w2", "w3", "w4", "w5", "w6"],
      },
    ],
    words: [
      { word_id: "w1", text: "A", raw_text: "A", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "B", raw_text: "B", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 0.5, end_time: 1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "C", raw_text: "C", speaker_id: "spk-2", utterance_id: "utt-1", start_time: 1, end_time: 1.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "D", raw_text: "D", speaker_id: "spk-2", utterance_id: "utt-1", start_time: 1.5, end_time: 2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w5", text: "E", raw_text: "E", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 2, end_time: 2.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "F", raw_text: "F", speaker_id: "spk-1", utterance_id: "utt-1", start_time: 2.5, end_time: 3, confidence: 1, reviewed: false, edited: false },
    ],
  };
}

describe("segmentUtterance", () => {
  it("splits by speaker runs when each run meets the threshold", () => {
    const doc = makeDoc();
    const segments = segmentUtterance(doc.utterances[0], new Map(doc.words.map((word) => [word.word_id, word])));

    expect(segments).toEqual([
      { utterance_id: "utt-1", segment_index: 0, segment_count: 3, speaker_id: "spk-1", word_ids: ["w1", "w2"] },
      { utterance_id: "utt-1", segment_index: 1, segment_count: 3, speaker_id: "spk-2", word_ids: ["w3", "w4"] },
      { utterance_id: "utt-1", segment_index: 2, segment_count: 3, speaker_id: "spk-1", word_ids: ["w5", "w6"] },
    ]);
  });

  it("absorbs a leading single-word run into the following segment", () => {
    const doc = makeDoc();
    doc.words[0].speaker_id = "spk-2";

    const segments = segmentUtterance(doc.utterances[0], new Map(doc.words.map((word) => [word.word_id, word])));

    expect(segments).toEqual([
      { utterance_id: "utt-1", segment_index: 0, segment_count: 3, speaker_id: "spk-1", word_ids: ["w1", "w2"] },
      { utterance_id: "utt-1", segment_index: 1, segment_count: 3, speaker_id: "spk-2", word_ids: ["w3", "w4"] },
      { utterance_id: "utt-1", segment_index: 2, segment_count: 3, speaker_id: "spk-1", word_ids: ["w5", "w6"] },
    ]);
  });
});
