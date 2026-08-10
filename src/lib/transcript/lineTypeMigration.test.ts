import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import type { StructuredUtterance } from "./structuredTranscript";
import {
  PERSISTED_LINE_TYPE_ENABLED,
  selectReviewCandidates,
  shouldProposeStructure,
} from "./lineTypeMigration";

function utt(overrides: Partial<StructuredUtterance> & { utterance_id: string }): StructuredUtterance {
  return {
    speaker_id: "spk_0",
    start_time: 0,
    end_time: 1,
    word_ids: [],
    ...overrides,
  } as StructuredUtterance;
}

function doc(utterances: StructuredUtterance[]): EditorDocument {
  return {
    job_id: "tr_test",
    media_url: null,
    duration: 0,
    speakers: [],
    utterances,
    words: [],
  } as unknown as EditorDocument;
}

describe("PERSISTED_LINE_TYPE_ENABLED", () => {
  it("is default-off (in-freeze safety; activation is a Human Gate)", () => {
    expect(PERSISTED_LINE_TYPE_ENABLED).toBe(false);
  });
});

describe("shouldProposeStructure (proposals never overwrite reviewed decisions)", () => {
  it("allows proposals on unreviewed / legacy / null status", () => {
    expect(shouldProposeStructure(utt({ utterance_id: "u1", line_type_review_status: "UNREVIEWED" }))).toBe(true);
    expect(shouldProposeStructure(utt({ utterance_id: "u2", line_type_review_status: null }))).toBe(true);
    expect(shouldProposeStructure(utt({ utterance_id: "u3" }))).toBe(true);
    expect(shouldProposeStructure(utt({ utterance_id: "u4", line_type_review_status: "UNKNOWN" }))).toBe(true);
  });

  it("blocks proposals on CONFIRMED and OVERRIDDEN (review-locked)", () => {
    expect(shouldProposeStructure(utt({ utterance_id: "u5", line_type_review_status: "CONFIRMED" }))).toBe(false);
    expect(shouldProposeStructure(utt({ utterance_id: "u6", line_type_review_status: "OVERRIDDEN" }))).toBe(false);
  });
});

describe("selectReviewCandidates", () => {
  it("excludes review-locked utterances and orders least-confident first", () => {
    const d = doc([
      utt({ utterance_id: "locked", line_type_review_status: "CONFIRMED", line_type_confidence: 0.1 }),
      utt({ utterance_id: "high", line_type_review_status: "UNREVIEWED", line_type_confidence: 0.9 }),
      utt({ utterance_id: "low", line_type_review_status: "UNREVIEWED", line_type_confidence: 0.3 }),
      utt({ utterance_id: "none", line_type_review_status: "UNREVIEWED" }),
    ]);
    const ids = selectReviewCandidates(d).map((u) => u.utterance_id);
    expect(ids).not.toContain("locked");
    expect(ids).toEqual(["low", "high", "none"]);
  });

  it("returns [] for null/empty documents", () => {
    expect(selectReviewCandidates(null)).toEqual([]);
    expect(selectReviewCandidates(doc([]))).toEqual([]);
  });
});
