import type { EditorDocument } from "../../api/types";

export type PersistedLineType = "Q" | "A" | "SP" | "PN" | "HEADER";

/**
 * Human review state for a persisted structural decision (DOC-0325 / D1).
 * - UNREVIEWED: a proposal exists (or none yet); the reporter has not acted.
 * - CONFIRMED: the reporter accepted the proposed line_type.
 * - OVERRIDDEN: the reporter changed the line_type to a different value.
 * CONFIRMED and OVERRIDDEN are "review-locked": no proposal/fallback classifier may overwrite them.
 */
export type LineTypeReviewStatus = "UNREVIEWED" | "CONFIRMED" | "OVERRIDDEN";

const REVIEW_STATUSES = new Set<LineTypeReviewStatus>(["UNREVIEWED", "CONFIRMED", "OVERRIDDEN"]);

/**
 * A structural proposal emitted by a classifier (DOC-0325 / D2). This is the canonical
 * proposal contract: a proposed line_type plus explicit confidence and a short evidence
 * reason, so Workspace can show the reporter *why* something needs attention. It is a
 * proposal only — it never silently becomes the persisted authority.
 */
export interface StructuralProposal {
  line_type: PersistedLineType;
  /** Confidence in [0, 1]. */
  confidence: number;
  /** Short human-readable evidence, e.g. "role=WITNESS -> A", "regex parenthetical". */
  reason: string;
}

export type StructuredUtterance = EditorDocument["utterances"][number] & {
  line_type?: string | null;
  ai_suggested_line_type?: string | null;
  line_type_confidence?: number | null;
  line_type_reason?: string | null;
  line_type_review_status?: string | null;
  speaker_label?: string | null;
  speaker_role?: string | null;
};

const LINE_TYPES = new Set<PersistedLineType>(["Q", "A", "SP", "PN", "HEADER"]);

export function normalizePersistedLineType(value: string | null | undefined): PersistedLineType | null {
  return value && LINE_TYPES.has(value as PersistedLineType) ? (value as PersistedLineType) : null;
}

/**
 * Normalize a raw review-status value. Anything unrecognized (including null/UNKNOWN legacy
 * rows) collapses to UNREVIEWED — the safe default that surfaces the item for review rather
 * than treating it as a settled human decision.
 */
export function normalizeReviewStatus(value: string | null | undefined): LineTypeReviewStatus {
  return value && REVIEW_STATUSES.has(value as LineTypeReviewStatus)
    ? (value as LineTypeReviewStatus)
    : "UNREVIEWED";
}

/**
 * True when a reporter's decision is locked in (CONFIRMED or OVERRIDDEN). The migration-safety
 * invariant (DOC-0325): a proposal or fallback classifier must NEVER overwrite a review-locked
 * structural decision.
 */
export function isReviewLocked(value: string | null | undefined): boolean {
  const status = normalizeReviewStatus(value);
  return status === "CONFIRMED" || status === "OVERRIDDEN";
}

export function asStructuredUtterance(
  utterance: EditorDocument["utterances"][number],
): StructuredUtterance {
  return utterance as StructuredUtterance;
}

export function hasStructuredLineTypes(document: EditorDocument | null | undefined): boolean {
  if (!document) {
    return false;
  }

  return document.utterances.some((utterance) => normalizePersistedLineType(asStructuredUtterance(utterance).line_type) != null);
}
