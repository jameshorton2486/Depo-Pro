import { describe, expect, it, vi } from "vitest";

import type { EditorDocument } from "../../api/types";
import { buildEditorContent } from "../buildEditorContent";
import {
  applyOffRecordSections,
  applyPostRecordCutoff,
  applyPreRecordCutoff,
  canEditUtterance,
  detectFormalOpening,
  generateSyntheticParentheticals,
  mapDocumentToBoundaryUtterances,
  type BoundaryAiClient,
  type BoundaryUtteranceView,
} from "./boundaryEngine";

function makeDocument(): EditorDocument {
  return {
    job_id: "job_boundary",
    media_url: "",
    duration: 20,
    speakers: [{
      speaker_id: "spk_001",
      display_name: "SPEAKER 1",
      deepgram_speaker: 0,
      role: "OTHER",
    }],
    utterances: [
      { utterance_id: "utt_001", speaker_id: "spk_001", start_time: 0, end_time: 1, word_ids: ["w_001"] },
      { utterance_id: "utt_002", speaker_id: "spk_001", start_time: 1, end_time: 2, word_ids: ["w_002"] },
      { utterance_id: "utt_003", speaker_id: "spk_001", start_time: 2, end_time: 3, word_ids: ["w_003"] },
    ],
    words: [
      { word_id: "w_001", text: "Hello", raw_text: "Hello", speaker_id: "spk_001", utterance_id: "utt_001", start_time: 0, end_time: 1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w_002", text: "On", raw_text: "On", speaker_id: "spk_001", utterance_id: "utt_002", start_time: 1, end_time: 2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w_003", text: "Record", raw_text: "Record", speaker_id: "spk_001", utterance_id: "utt_003", start_time: 2, end_time: 3, confidence: 1, reviewed: false, edited: false },
    ],
  };
}

function firstUtteranceText(content: ReturnType<typeof buildEditorContent>): string {
  const utterance = content.content?.find((node) => node.type === "utterance");
  return utterance?.content?.map((node) => node.text ?? "").join("") ?? "";
}

describe("boundaryEngine", () => {
  it("maps editor documents to boundary utterance views", () => {
    const utterances = mapDocumentToBoundaryUtterances(makeDocument());
    expect(utterances[0]).toEqual(expect.objectContaining({
      utterance_id: "utt_001",
      text: "Hello",
    }));
  });

  it("applies a pre-record cutoff from prompt 1-A", async () => {
    const utterances = mapDocumentToBoundaryUtterances(makeDocument());
    const client: BoundaryAiClient = {
      completeJson: vi.fn().mockResolvedValue({
        pre_record_cutoff_index: 2,
        confidence: 0.98,
        evidence: ["formal opening starts at utterance 2"],
        authority: "AI_BOUNDARY_1A",
      }),
    };

    const result = await detectFormalOpening(utterances, {}, client);
    const updated = applyPreRecordCutoff(utterances, result);
    expect(updated[0]?.excluded_from_output).toBe(true);
    expect(updated[1]?.excluded_from_output).toBe(true);
    expect(updated[2]?.excluded_from_output).not.toBe(true);
  });

  it("falls back to index 0 and manual review when prompt 1-A returns -1", async () => {
    const utterances = mapDocumentToBoundaryUtterances(makeDocument());
    const client: BoundaryAiClient = {
      completeJson: vi.fn().mockResolvedValue({
        pre_record_cutoff_index: -1,
        confidence: 0.42,
        evidence: ["ambiguous opening"],
        authority: "AI_BOUNDARY_1A",
      }),
    };

    const result = await detectFormalOpening(utterances, {}, client);
    expect(result.pre_record_cutoff_index).toBe(0);
    expect(result.authority).toBe("NEEDS_MANUAL_BOUNDARY_REVIEW");
  });

  it("marks off-record utterances excluded", () => {
    const utterances = mapDocumentToBoundaryUtterances(makeDocument());
    const updated = applyOffRecordSections(utterances, {
      off_record_sections: [{
        off_utterance_index: 1,
        off_time: "10:00 a.m.",
        on_utterance_index: 3,
        on_time: "10:15 a.m.",
        is_conclusion: false,
        section_type: "RECESS",
        confidence: 0.97,
        evidence: ["recess language"],
      }],
      post_record_start_index: -1,
      metrics: {},
    });

    expect(updated[1]?.excluded_from_output).toBe(true);
    expect(updated[2]?.excluded_from_output).toBe(true);
  });

  it("inserts synthetic parentheticals with boundary text templates", () => {
    const synthetic = generateSyntheticParentheticals([{
      off_utterance_index: 4,
      off_time: "10:00 a.m.",
      on_utterance_index: 6,
      on_time: "10:15 a.m.",
      is_conclusion: false,
      section_type: "RECESS",
      confidence: 0.97,
      evidence: ["recess language"],
    }]);

    expect(synthetic).toHaveLength(2);
    expect(synthetic[0]?.is_synthetic).toBe(true);
    expect(synthetic[0]?.text).toBe("(Whereupon, a recess was taken at 10:00 a.m..)");
    expect(synthetic[1]?.text).toBe("(Whereupon, the proceedings resumed at 10:15 a.m..)");
  });

  it("prevents editing synthetic utterances", () => {
    const synthetic: BoundaryUtteranceView = {
      utterance_id: "synthetic_1",
      speaker_id: "spk_synthetic_boundary",
      start_time: 0,
      end_time: 0,
      text: "(Whereupon, a recess was taken.)",
      is_synthetic: true,
    };

    expect(canEditUtterance(synthetic)).toBe(false);
  });

  it("filters excluded utterances from buildEditorContent output", () => {
    const doc = makeDocument();
    const filteredDoc = {
      ...doc,
      utterances: [
        { ...doc.utterances[0], excluded_from_output: true },
        doc.utterances[1],
      ],
    } as typeof doc & {
      utterances: Array<typeof doc.utterances[number] & { excluded_from_output?: boolean }>;
    };

    const content = buildEditorContent(filteredDoc);
    expect(firstUtteranceText(content)).toBe("On");
  });

  it("marks post-record utterances excluded", () => {
    const utterances = mapDocumentToBoundaryUtterances(makeDocument());
    const updated = applyPostRecordCutoff(utterances, {
      post_record_start_index: 2,
      on_record_spelling_indices: [],
      confidence: 0.9,
    });

    expect(updated[2]?.excluded_from_output).toBe(true);
    expect(updated[1]?.excluded_from_output).not.toBe(true);
  });
});
