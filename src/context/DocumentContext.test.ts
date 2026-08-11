import { describe, expect, it } from "vitest";

import type { EditorDocument } from "../api/types";
import { buildCorrectionReport } from "../lib/transcript/correctionOrchestrator";
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
      pipelineState: null,
      audioSegments: [],
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
      pipelineState: null,
      audioSegments: [],
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

  // Tier 2 edge case — browser refresh during a correction save.
  // If the save request fails (or the tab is torn down mid-flight), the edit must
  // remain dirty and unrolled-back, so a retry or the beforeunload guard still
  // has the user's change — a legal transcript must never silently lose a keystroke.
  it("keeps a failed save dirty and retryable without rolling back the edit", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:00.000Z",
      speakerMapConfirmed: false,
      pipelineState: null,
      audioSegments: [],
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
    state = documentReducer(state, { type: "SAVE_ERR", error: "network unavailable" });

    expect(state.saving).toBe(false);
    expect(state.dirty).toBe(true);
    expect(state.saveError).toBe("network unavailable");
    expect(state.workingTexts.utt_001).toBe("hello there");
  });

  // A refresh re-runs loadDocument -> LOAD_OK, rehydrating purely from the server
  // snapshot: unsaved working text is intentionally discarded (the beforeunload
  // guard is what warns the user first). This locks that boundary.
  it("discards unsaved working text on reload and rehydrates from the server snapshot", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:00.000Z",
      speakerMapConfirmed: false,
      pipelineState: null,
      audioSegments: [],
    });
    state = documentReducer(state, {
      type: "EDIT_UTTERANCE",
      utterance_id: "utt_001",
      word_id: null,
      old_text: "hello",
      new_text: "hello there",
      source: "editor",
    });
    expect(state.dirty).toBe(true);

    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:00.000Z",
      speakerMapConfirmed: false,
      pipelineState: null,
      audioSegments: [],
    });

    expect(state.dirty).toBe(false);
    expect(state.editSeq).toBe(0);
    expect(state.workingTexts).toEqual({});
  });

  it("resets structure confirmation on load and allows a transient confirm", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:00.000Z",
      speakerMapConfirmed: false,
      pipelineState: null,
      audioSegments: [],
    });

    expect(state.structureConfirmed).toBe(false);

    state = documentReducer(state, { type: "CONFIRM_STRUCTURE" });
    expect(state.structureConfirmed).toBe(true);

    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:01.000Z",
      speakerMapConfirmed: false,
      pipelineState: null,
      audioSegments: [],
    });

    expect(state.structureConfirmed).toBe(false);
  });

  it("stores a correction report when dispatched", () => {
    const report = buildCorrectionReport(buildDocument());
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "SET_CORRECTION_REPORT",
      report,
    });

    expect(state.correctionReport?.job_id).toBe("case_test_001");
  });

  // DOC-0325 Step 1 (Wave 1) — reviewed CorrectionObjects in DocumentContext.
  it("defaults persistedLineTypeEnabled to the shipped flag (off in production)", () => {
    const state = createInitialDocumentState("case_test_001");
    expect(state.persistedLineTypeEnabled).toBe(false);
    expect(state.corrections).toEqual([]);
  });

  it("honors an explicit persistedLineTypeEnabled override (test/local harness)", () => {
    const state = createInitialDocumentState("case_test_001", true);
    expect(state.persistedLineTypeEnabled).toBe(true);
  });

  it("stores reviewed corrections when dispatched", () => {
    let state = createInitialDocumentState("case_test_001", true);
    state = documentReducer(state, {
      type: "SET_CORRECTIONS",
      corrections: [{ id: "corr_x", review: { state: "accepted" } }] as never,
    });
    expect(state.corrections).toHaveLength(1);
  });

  it("clears stale corrections on reload so reopen re-derives from the DB document", () => {
    let state = createInitialDocumentState("case_test_001", true);
    state = documentReducer(state, {
      type: "SET_CORRECTIONS",
      corrections: [{ id: "corr_x", review: { state: "accepted" } }] as never,
    });
    expect(state.corrections).toHaveLength(1);

    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:02.000Z",
      speakerMapConfirmed: false,
      pipelineState: null,
      audioSegments: [],
    });
    expect(state.corrections).toEqual([]);
  });

  it("sets keepRawLabels when raw labels are explicitly kept", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, { type: "KEEP_RAW_LABELS" });

    expect(state.keepRawLabels).toBe(true);
    expect(state.structureConfirmed).toBe(true);
  });

  it("clears keepRawLabels when structure is confirmed", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, { type: "KEEP_RAW_LABELS" });
    state = documentReducer(state, { type: "CONFIRM_STRUCTURE" });

    expect(state.structureConfirmed).toBe(true);
    expect(state.keepRawLabels).toBe(false);
  });

  it("tracks pipeline state through speaker verification updates", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:00.000Z",
      speakerMapConfirmed: false,
      pipelineState: "AWAITING_SPEAKER_VERIFICATION",
      audioSegments: [],
    });

    expect(state.pipelineState).toBe("AWAITING_SPEAKER_VERIFICATION");

    state = documentReducer(state, {
      type: "SET_SPEAKER_MAP_CONFIRMED",
      confirmed: true,
      pipelineState: "SPEAKER_VERIFIED",
    });

    expect(state.speakerMapConfirmed).toBe(true);
    expect(state.pipelineState).toBe("SPEAKER_VERIFIED");
  });

  it("increments speakersVersion on UPDATE_SPEAKERS", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "LOAD_OK",
      doc: buildDocument(),
      updatedAt: "2026-06-05T00:00:00.000Z",
      speakerMapConfirmed: false,
      pipelineState: null,
      audioSegments: [],
    });

    expect(state.speakersVersion).toBe(0);

    state = documentReducer(state, {
      type: "UPDATE_SPEAKERS",
      speakers: [{
        speaker_id: "spk_001",
        display_name: "MR. BENTLEY",
        deepgram_speaker: 0,
        role: "ATTORNEY",
      }],
    });
    expect(state.speakersVersion).toBe(1);

    state = documentReducer(state, {
      type: "UPDATE_SPEAKERS",
      speakers: [{
        speaker_id: "spk_001",
        display_name: "MR. BENTLEY",
        deepgram_speaker: 0,
        role: "ATTORNEY",
      }],
    });
    expect(state.speakersVersion).toBe(2);
  });

  it("does not change speakersVersion on SAVE_OK", () => {
    let state = createInitialDocumentState("case_test_001");
    state = documentReducer(state, {
      type: "SAVE_OK",
      savedSeq: 0,
      updatedAt: "2026-06-05T00:00:01.000Z",
    });

    expect(state.speakersVersion).toBe(0);
  });
});
