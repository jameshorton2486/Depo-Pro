import type { PersistedLineType, StructuralProposal } from "./structuredTranscript";
import type { WorkspaceParagraphMode } from "./transcriptParagraphTypes";

/**
 * DOC-0325 / D2 — canonical structural-proposal derivation.
 *
 * This is the proposal layer the plan calls for: it turns a classifier's decision (plus the
 * signals available at classification time) into a canonical {line_type, confidence, reason}
 * proposal. It is intentionally a *pure, additive* module: the live classifiers
 * (descriptorForLine / classifyLineDescriptor) are unchanged, so the current render path keeps
 * its exact behavior. The converged builder (Wave 4, behind a default-off switch) is what will
 * consume these proposals. Physically collapsing the two classifiers into a single emitter is
 * an activation-time (post-freeze) change because it alters the live render path.
 *
 * LOW_CONFIDENCE (acoustic) and UNCERTAIN_SPEAKER (no role) are used ONLY as confidence
 * dampeners to surface review candidates during migration — never as the final authority (D2).
 */

/** The dialogue modes a classifier emits, mapped to their persisted short codes. */
export const MODE_TO_LINE_TYPE: Readonly<Record<WorkspaceParagraphMode, PersistedLineType>> = {
  COLLOQUY: "SP",
  Q: "Q",
  A: "A",
  PARENTHETICAL: "PN",
};

export interface StructuralSignals {
  /** The classifier's descriptor mode for this line. */
  mode: WorkspaceParagraphMode;
  /** Deepgram/heuristic role tag on the line: "q" | "a" | other/null. */
  role?: string | null;
  /** Low acoustic confidence on the line (migration aid only). */
  lowConfidence?: boolean;
  /** Speaker role could not be determined (migration aid only). */
  uncertainSpeaker?: boolean;
}

function clampConfidence(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Math.round(value * 100) / 100;
}

/**
 * Derive a canonical structural proposal from a classification. The confidence reflects how
 * well-grounded the decision is:
 *  - Q/A backed by an explicit role tag: strong.
 *  - Q/A/PN inferred without a role tag (persisted hint, regex, or heading transition): good.
 *  - COLLOQUY: the catch-all "everything else" bucket — the weakest, most review-worthy call.
 * Speaker-dependent kinds (Q/A/SP) are dampened by the acoustic/role migration-aid signals.
 */
export function deriveStructuralProposal(signals: StructuralSignals): StructuralProposal {
  const { mode, role, lowConfidence, uncertainSpeaker } = signals;
  const line_type = MODE_TO_LINE_TYPE[mode];
  const roleMatches =
    (mode === "Q" && role === "q") || (mode === "A" && role === "a");

  let confidence: number;
  const reasons: string[] = [];

  if (mode === "PARENTHETICAL") {
    confidence = 0.9;
    reasons.push("parenthetical");
  } else if (roleMatches) {
    confidence = 0.95;
    reasons.push(`role=${role}`);
  } else if (mode === "Q" || mode === "A") {
    confidence = 0.8;
    reasons.push(`${mode.toLowerCase()} without role tag`);
  } else {
    // COLLOQUY — the fallback bucket; least certain, most worth surfacing for review.
    confidence = 0.5;
    reasons.push("colloquy fallback");
  }

  const speakerDependent = mode === "Q" || mode === "A" || mode === "COLLOQUY";
  if (speakerDependent && uncertainSpeaker) {
    confidence *= 0.7;
    reasons.push("uncertain speaker");
  }
  if (speakerDependent && lowConfidence) {
    confidence *= 0.7;
    reasons.push("low acoustic confidence");
  }

  return {
    line_type,
    confidence: clampConfidence(confidence),
    reason: reasons.join("; "),
  };
}
