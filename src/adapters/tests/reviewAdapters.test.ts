import { describe, expect, it } from "vitest";
import type { ReviewPayload } from "../../api/types";
import { mergeReviewPayloadIntoReviewState, reviewStateFileToReviewPayload } from "../reviewAdapters";
import type { ReviewStateFile } from "../types";

describe("reviewStateFileToReviewPayload", () => {
  it("returns empty arrays for missing review state", () => {
    expect(reviewStateFileToReviewPayload()).toEqual({
      reviewed_word_ids: [],
      unreviewed_word_ids: [],
    });
  });
});

describe("mergeReviewPayloadIntoReviewState", () => {
  it("round-trips reviewed and unreviewed ids without loss", () => {
    const existing: ReviewStateFile = {
      case_id: "case_20240602_001",
      reviewed_word_ids: [],
      unreviewed_word_ids: [],
      review_complete: false,
      review_pct: 0,
    };
    const payload: ReviewPayload = {
      reviewed_word_ids: ["w_1", "w_2"],
      unreviewed_word_ids: ["w_3"],
    };

    const next = mergeReviewPayloadIntoReviewState(payload, existing, {
      updatedAt: "2026-06-02T12:30:00Z",
      totalWords: 4,
    });
    const roundTrip = reviewStateFileToReviewPayload(next);

    expect(roundTrip.reviewed_word_ids).toEqual(["w_1", "w_2"]);
    expect(roundTrip.unreviewed_word_ids).toEqual(["w_3"]);
    expect(next.review_pct).toBe(50);
    expect(next.updated_at).toBe("2026-06-02T12:30:00Z");
  });

  it("removes ids from unreviewed when they are also marked reviewed", () => {
    const existing: ReviewStateFile = {
      case_id: "case_20240602_001",
      reviewed_word_ids: [],
      unreviewed_word_ids: [],
    };

    const next = mergeReviewPayloadIntoReviewState(
      {
        reviewed_word_ids: ["w_1"],
        unreviewed_word_ids: ["w_1", "w_2"],
      },
      existing
    );

    expect(next.reviewed_word_ids).toEqual(["w_1"]);
    expect(next.unreviewed_word_ids).toEqual(["w_2"]);
  });
});
