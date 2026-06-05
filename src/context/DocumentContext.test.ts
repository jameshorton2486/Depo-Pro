import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../api/types";
import { createInitialDocumentState, documentReducer } from "./DocumentContext";

function buildDocument(): EditorDocument {
  return {
    job_id: "case_test_001",
    media_url: "",
    duration: 0,
    speakers: [
      {
        speaker_id: "spk_001",
        display_name: "THE WITNESS",
        deepgram_speaker: 0,
      },
    ],
    utterances: [
      {
        utterance_id: "utt_001",
        speaker_id: "spk_001",
        start_time: 0,
        end_time: 1,
        word_ids: ["w_001"],
      },
    ],
    words: [
      {
        word_id: "w_001",
        text: "hello",
        raw_text: "hello",
        speaker_id: "spk_001",
        utterance_id: "utt_001",
        start_time: 0,
        end_time: 1,
        confidence: 0.9,
        reviewed: false,
        edited: false,
      },
    ],
  };
}

describe("documentReducer save sequencing", () => {
  it("clears dirty when the acknowledged save matches the latest edit sequence", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:00.000Z",
      speakerMapConfirmed: false,
    });
    state = documentReducer(state, {
      type: "EDIT_UTTERANCE",
      utterance_id: "utt_001",
      word_id: null,
      old_text: "hello",
      new_text: "hello there",
      source: "editor",
    });

    state = documentReducer(state, {
      type: "SAVE_OK",
      savedSeq: 1,
      updatedAt: "2026-06-05T00:00:01.000Z",
    });

    expect(state.dirty).toBe(false);
    expect(state.editSeq).toBe(1);
  });

  it("keeps dirty true when a later edit lands before save acknowledgement", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:00.000Z",
      speakerMapConfirmed: false,
    });
    state = documentReducer(state, {
      type: "EDIT_UTTERANCE",
      utterance_id: "utt_001",
      word_id: null,
      old_text: "hello",
      new_text: "hello there",
      source: "editor",
    });
    state = documentReducer(state, { type: "SAVE_START" });
    state = documentReducer(state, {
      type: "EDIT_UTTERANCE",
      utterance_id: "utt_001",
      word_id: null,
      old_text: "hello there",
      new_text: "hello there again",
      source: "editor",
    });

    state = documentReducer(state, {
      type: "SAVE_OK",
      savedSeq: 1,
      updatedAt: "2026-06-05T00:00:01.000Z",
    });

    expect(state.dirty).toBe(true);
    expect(state.editSeq).toBe(2);
  });
});
