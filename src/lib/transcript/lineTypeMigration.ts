import {
  asStructuredUtterance,
  isReviewLocked,
  type StructuredUtterance,
} from "./structuredTranscript";
import type { EditorDocument } from "../../api/types";

/**
 * DOC-0325 / D7 — migration switch for the render-path convergence that makes persisted reviewed
 * line_type the single structural authority shared by Workspace and every deliverable.
 *
 * DEFAULT-OFF (in-freeze safety, mirroring AUTO_CHUNKING_ENABLED). While false, every consumer
 * keeps today's exact behavior. Flipping this to true is the ACTIVATION step — a Human Gate that
 * happens only after the production migration + backfill/validation land (§17). It is a
 * compile-time constant, not an env flag, so the activation path is provably dead in shipped
 * builds until the gate is opened.
 *
 * NOTE: consuming persisted line_type as a *hint* is already wired in both builders and is left
 * exactly as-is (dormant in production, which has no persisted values). This flag governs the
 * later, behavioral convergence — collapsing the two classifiers, removing keepRawLabels as a
 * normal mode, and retiring qaFixer — none of which happens under the freeze.
 */
export const PERSISTED_LINE_TYPE_ENABLED = false;

/**
 * Migration-safety invariant (DOC-0325): a proposal/fallback classifier must NEVER overwrite a
 * reviewer's CONFIRMED or OVERRIDDEN structural decision. Proposal generation must skip any
 * utterance for which this returns false.
 */
export function shouldProposeStructure(utterance: StructuredUtterance): boolean {
  return !isReviewLocked(utterance.line_type_review_status);
}

/**
 * Select the utterances a reporter should review first: those whose structure is not yet locked
 * in, least-confident proposals ahead of the rest (D1 review-affordance ordering). Read-only and
 * side-effect free — pure selection for the future Workspace review surface (Wave 5).
 */
export function selectReviewCandidates(document: EditorDocument | null | undefined): StructuredUtterance[] {
  if (!document) {
    return [];
  }
  const candidates = document.utterances
    .map(asStructuredUtterance)
    .filter(shouldProposeStructure);

  return candidates.sort((a, b) => {
    const ca = a.line_type_confidence ?? 1;
    const cb = b.line_type_confidence ?? 1;
    return ca - cb;
  });
}
