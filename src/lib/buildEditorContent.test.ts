import { describe, expect, it } from "vitest";
import { buildEditorContent } from "./buildEditorContent";
import type { EditorDocument } from "../api/types";

function makeDoc(overrides?: Partial<EditorDocument>): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "http://example.test/audio.wav",
    duration: 120,
    speakers: [
      {
        speaker_id: "spk-1",
        display_name: "THE WITNESS",
        deepgram_speaker: 0,
        role: "WITNESS",
      },
    ],
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: 1,
        word_ids: ["word-1"],
      },
    ],
    words: [
      {
        word_id: "word-1",
        text: "Hello",
        raw_text: "Hello",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0,
        end_time: 1,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
    ],
    ...overrides,
  };
}

describe("buildEditorContent", () => {
  it("skips empty-text words and leaves a valid placeholder when an utterance has no renderable words", () => {
    const doc = makeDoc({
      utterances: [
        {
          utterance_id: "utt-1",
          speaker_id: "spk-1",
          start_time: 0,
          end_time: 1,
          word_ids: ["word-1", "missing-word"],
        },
        {
          utterance_id: "utt-2",
          speaker_id: "spk-1",
          start_time: 2,
          end_time: 3,
          word_ids: ["word-2"],
        },
      ],
      words: [
        {
          word_id: "word-1",
          text: "",
          raw_text: "",
          speaker_id: "spk-1",
          utterance_id: "utt-1",
          start_time: 0,
          end_time: 1,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
        {
          word_id: "word-2",
          text: "",
          raw_text: "",
          speaker_id: "spk-1",
          utterance_id: "utt-2",
          start_time: 2,
          end_time: 3,
          confidence: 1,
          reviewed: false,
          edited: false,
        },
      ],
    });

    const content = buildEditorContent(doc);
    const utterances = content.content?.filter((node) => node.type === "utterance");

    expect(utterances).toHaveLength(2);
    expect(utterances?.[0].content).toEqual([{ type: "text", text: " " }]);
    expect(utterances?.[1].content).toEqual([{ type: "text", text: " " }]);
  });
});
