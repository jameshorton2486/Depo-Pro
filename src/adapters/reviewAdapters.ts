import type { ReviewPayload } from "../api/types";
import type { ReviewStateFile } from "./types";

function dedupe(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

export interface MergeReviewStateOptions {
  updatedAt?: string | null;
  totalWords?: number | null;
}

export function reviewStateFileToReviewPayload(
  reviewState?: ReviewStateFile | null
): ReviewPayload {
  return {
    reviewed_word_ids: dedupe(reviewState?.reviewed_word_ids ?? []),
    unreviewed_word_ids: dedupe(reviewState?.unreviewed_word_ids ?? []),
  };
}

export function mergeReviewPayloadIntoReviewState(
  payload: ReviewPayload,
  existing: ReviewStateFile,
  options: MergeReviewStateOptions = {}
): ReviewStateFile {
  const reviewed = dedupe(payload.reviewed_word_ids);
  const unreviewedSet = new Set(dedupe(payload.unreviewed_word_ids).filter((id) => !reviewed.includes(id)));
  const unreviewed = Array.from(unreviewedSet);

  const totalWords = options.totalWords ?? null;
  const reviewPct =
    typeof totalWords === "number" && totalWords > 0
      ? Math.round((reviewed.length / totalWords) * 100)
      : existing.review_pct;
  const reviewComplete =
    typeof totalWords === "number" && totalWords >= 0
      ? reviewed.length > 0 && reviewed.length >= totalWords
      : existing.review_complete;

  return {
    ...existing,
    reviewed_word_ids: reviewed,
    unreviewed_word_ids: unreviewed,
    updated_at: options.updatedAt !== undefined ? options.updatedAt : existing.updated_at ?? null,
    review_pct: reviewPct,
    review_complete: reviewComplete,
  };
}
