import {
  asStructuredUtterance,
  isReviewLocked,
  normalizePersistedLineType,
  type PersistedLineType,
  type StructuredUtterance,
} from "./structuredTranscript";
import type { EditorDocument } from "../../api/types";
import type { TranscriptParagraph, TranscriptParagraphKind } from "./transcriptParagraphTypes";

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

/** Inverse of structuralProposal.MODE_TO_LINE_TYPE: persisted short code → paragraph kind. */
export const LINE_TYPE_TO_KIND: Readonly<Record<PersistedLineType, TranscriptParagraphKind>> = {
  Q: "Q",
  A: "A",
  SP: "COLLOQUY",
  PN: "PARENTHETICAL",
  HEADER: "SECTION_HEADER",
};

/**
 * Resolve the structural kind a converged builder should use for an utterance (DOC-0325 / D7).
 * INERT until `PERSISTED_LINE_TYPE_ENABLED` is flipped — with the flag off this returns the
 * inferred kind verbatim, so the live render path is unchanged. With the flag on:
 *  - a persisted (reviewed) line_type is the authority and wins over inference — the read-side
 *    of "the reporter certifies exactly what she reviewed"; and because a CONFIRMED/OVERRIDDEN
 *    decision is what got persisted, inference can never override it here;
 *  - an UNKNOWN/absent line_type falls back to the inferred kind (migration compatibility).
 */
export function resolveStructuralKind(
  utterance: StructuredUtterance,
  inferredKind: TranscriptParagraphKind,
  enabled: boolean = PERSISTED_LINE_TYPE_ENABLED,
): TranscriptParagraphKind {
  if (!enabled) {
    return inferredKind;
  }
  const persisted = normalizePersistedLineType(utterance.line_type);
  return persisted ? LINE_TYPE_TO_KIND[persisted] : inferredKind;
}

/**
 * The converged structural overlay (DOC-0325 / D7). Given paragraphs already built by EITHER
 * live builder (`workspacePresentation` or `transcriptParagraphs`) plus the document, it
 * overrides each paragraph's inferred `kind` with the persisted reviewed line_type of its source
 * utterance where one exists. It is builder-agnostic — the single point both Workspace and export
 * will eventually consume so their structure is identical by construction — and the structural
 * replacement for `applyQaFixer` (a same-shaped TranscriptParagraph[] overlay).
 *
 * INERT: with the flag off (shipped default) it returns the input unchanged, so the live render
 * path is byte-identical. It never mutates text/words/source ids — only `kind` — so raw Deepgram
 * evidence is untouched. It adds NO new classification: a paragraph with no persisted line_type
 * keeps its inferred kind (UNKNOWN compatibility), and because only CONFIRMED/OVERRIDDEN decisions
 * get persisted, inference can never overwrite a reviewed decision.
 */
export function applyReviewedStructure(
  paragraphs: TranscriptParagraph[],
  document: EditorDocument | null | undefined,
  enabled: boolean = PERSISTED_LINE_TYPE_ENABLED,
): TranscriptParagraph[] {
  if (!enabled || !document) {
    return paragraphs;
  }
  const byId = new Map<string, StructuredUtterance>(
    document.utterances.map((u) => [u.utterance_id, asStructuredUtterance(u)]),
  );
  return paragraphs.map((paragraph) => {
    // Representative utterance = the paragraph's first source utterance that carries a persisted
    // structural code. None → keep the inferred kind (compatibility). Generated paragraphs
    // (SECTION_HEADER / BY_LINE with no source utterance) fall through unchanged.
    let persistedUtt: StructuredUtterance | null = null;
    for (const id of paragraph.sourceUtteranceIds) {
      const utt = byId.get(id);
      if (utt && normalizePersistedLineType(utt.line_type)) {
        persistedUtt = utt;
        break;
      }
    }
    if (!persistedUtt) {
      return paragraph;
    }
    const resolved = resolveStructuralKind(persistedUtt, paragraph.kind, enabled);
    return resolved === paragraph.kind ? paragraph : { ...paragraph, kind: resolved };
  });
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
