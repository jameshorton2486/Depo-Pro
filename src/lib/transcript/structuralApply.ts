import type { EditorDocument, Utterance, Word } from "../../api/types";
import type { CorrectionObject } from "./correctionObject";
import type { StructuredUtterance } from "./structuredTranscript";
import { PERSISTED_LINE_TYPE_ENABLED } from "./lineTypeMigration";

// DOC-0325 — structural-apply engine (the qaFixer-split replacement owner).
//
// Applies REVIEWED structural corrections (qa_split) to the Working Transcript by splitting the
// target utterance so each resulting utterance is ONE structural unit carrying a persisted,
// review-locked line_type. This is the upstream owner of the paragraph-splitting that qaFixer
// does at render time (DOC-0325 §11): once the Working Transcript is split here, the paragraph
// builders + applyReviewedStructure produce identical structure for Workspace and export, and
// qaFixer's split has a surviving owner.
//
// Purity / evidence: returns a NEW document; the input is never mutated. Words are only
// REASSIGNED (utterance_id / speaker_id) — text, raw_text, timestamps, confidence are untouched,
// so raw Deepgram evidence is preserved. Only accepted/edited corrections apply; pending/rejected
// and unresolvable targets are skipped with a reason. INERT: no live caller yet (activation gated).

export interface StructuralApplyResult {
  document: EditorDocument;
  applied: number;
  skipped: Array<{ id: string; reason: string }>;
}

const APPLICABLE_STATES = new Set(["accepted", "edited"]);

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** A qa_split correction, resolved to the fields this engine needs (or null if malformed). */
function qaSplitSpec(correction: CorrectionObject): { splitAfterWordId: string; qSpeaker: string | null; aSpeaker: string | null } | null {
  if (correction.change.type !== "qa_split") return null;
  const sc = correction.change.structural_change ?? {};
  const splitAfterWordId = str(sc.split_after_word_id);
  if (!splitAfterWordId) return null;
  return {
    splitAfterWordId,
    qSpeaker: str(sc.new_q_paragraph_speaker_id),
    aSpeaker: str(sc.new_a_paragraph_speaker_id),
  };
}

function boundsOf(words: Word[], fallback: Utterance): { start: number; end: number } {
  if (words.length === 0) return { start: fallback.start_time, end: fallback.end_time };
  return {
    start: Math.min(...words.map((w) => w.start_time)),
    end: Math.max(...words.map((w) => w.end_time)),
  };
}

/**
 * Apply reviewed qa_split corrections to a Working Transcript, splitting utterances at the
 * reviewed boundary. Each split half is a new utterance with a persisted line_type (Q then A)
 * and review_status CONFIRMED (it is a reviewed decision).
 */
export function applyStructuralCorrections(
  document: EditorDocument,
  corrections: CorrectionObject[],
): StructuralApplyResult {
  const skipped: StructuralApplyResult["skipped"] = [];

  // Index words by id and by owning utterance so we can find + reassign them.
  const wordsById = new Map<string, Word>(document.words.map((w) => [w.word_id, w]));
  const wordsByUtterance = new Map<string, Word[]>();
  for (const w of document.words) {
    const list = wordsByUtterance.get(w.utterance_id);
    if (list) list.push(w); else wordsByUtterance.set(w.utterance_id, [w]);
  }

  // Resolve each correction to a target utterance + split index. Group by utterance so we can
  // apply in one pass and preserve order.
  const splitByUtterance = new Map<string, { splitIndex: number; qSpeaker: string | null; aSpeaker: string | null; id: string }>();
  for (const correction of corrections) {
    if (!APPLICABLE_STATES.has(correction.review.state)) {
      skipped.push({ id: correction.id, reason: `review.state '${correction.review.state}' not applicable` });
      continue;
    }
    const spec = qaSplitSpec(correction);
    if (!spec) {
      skipped.push({ id: correction.id, reason: "not a qa_split with split_after_word_id" });
      continue;
    }
    const targetWord = wordsById.get(spec.splitAfterWordId);
    if (!targetWord) {
      skipped.push({ id: correction.id, reason: `split_after_word_id '${spec.splitAfterWordId}' not found` });
      continue;
    }
    const uttId = targetWord.utterance_id;
    if (splitByUtterance.has(uttId)) {
      // One split per utterance in a single pass (a second split would target an id that no
      // longer owns the same word set). Additional splits are a follow-up apply.
      skipped.push({ id: correction.id, reason: `utterance '${uttId}' already split in this pass` });
      continue;
    }
    const ordered = wordsByUtterance.get(uttId) ?? [];
    const idx = ordered.findIndex((w) => w.word_id === spec.splitAfterWordId);
    if (idx < 0 || idx === ordered.length - 1) {
      skipped.push({ id: correction.id, reason: "split point is at/after the last word (nothing to split)" });
      continue;
    }
    splitByUtterance.set(uttId, { splitIndex: idx, qSpeaker: spec.qSpeaker, aSpeaker: spec.aSpeaker, id: correction.id });
  }

  let applied = 0;
  const newUtterances: Utterance[] = [];
  const rewrittenWords = new Map<string, Word>(); // word_id -> reassigned copy

  for (const utterance of document.utterances) {
    const split = splitByUtterance.get(utterance.utterance_id);
    if (!split) {
      newUtterances.push(utterance);
      continue;
    }
    const ordered = wordsByUtterance.get(utterance.utterance_id) ?? [];
    const qWords = ordered.slice(0, split.splitIndex + 1);
    const aWords = ordered.slice(split.splitIndex + 1);
    const qId = `${utterance.utterance_id}::q`;
    const aId = `${utterance.utterance_id}::a`;
    const qSpeaker = split.qSpeaker ?? utterance.speaker_id;
    const aSpeaker = split.aSpeaker ?? utterance.speaker_id;
    const qBounds = boundsOf(qWords, utterance);
    const aBounds = boundsOf(aWords, utterance);

    const makeUtt = (id: string, speaker: string, words: Word[], bounds: { start: number; end: number }, lineType: "Q" | "A"): StructuredUtterance => ({
      ...utterance,
      utterance_id: id,
      speaker_id: speaker,
      start_time: bounds.start,
      end_time: bounds.end,
      word_ids: words.map((w) => w.word_id),
      line_type: lineType,
      line_type_review_status: "CONFIRMED",
    } as StructuredUtterance);

    newUtterances.push(makeUtt(qId, qSpeaker, qWords, qBounds, "Q"));
    newUtterances.push(makeUtt(aId, aSpeaker, aWords, aBounds, "A"));

    // Reassign the words to their new utterance (+ speaker); text/timestamps/confidence untouched.
    for (const w of qWords) rewrittenWords.set(w.word_id, { ...w, utterance_id: qId, speaker_id: qSpeaker });
    for (const w of aWords) rewrittenWords.set(w.word_id, { ...w, utterance_id: aId, speaker_id: aSpeaker });
    applied += 1;
  }

  const newWords = document.words.map((w) => rewrittenWords.get(w.word_id) ?? w);

  return {
    document: { ...document, utterances: newUtterances, words: newWords },
    applied,
    skipped,
  };
}

/**
 * Load-time Working Transcript projection (DOC-0325 Step 1). Derives the Working Transcript that
 * BOTH Workspace and export consume, from the immutable original document + the reviewed
 * structural corrections. This is the single apply seam — because it is one deterministic pure
 * function of (original document, corrections), Workspace and export cannot diverge, and reopen
 * re-derives the identical structure (idempotent). No DB mutation; raw evidence untouched.
 *
 * Decision-state semantics (mirrors the editor-api decide path): a qa_split is stored ACCEPTED
 * but deferred (downstream.applied_to_working_transcript=false, pending_reason
 * "structural_apply_engine_v2"); THIS is that engine. Only accepted/edited corrections shape the
 * transcript; pending/rejected/superseded never do (applyStructuralCorrections enforces this).
 *
 * INERT: gated by PERSISTED_LINE_TYPE_ENABLED (default false → returns the document unchanged).
 * Callers MUST pass the ORIGINAL (DB) document so the projection stays idempotent across reopen.
 */
export function deriveWorkingTranscript(
  document: EditorDocument,
  corrections: CorrectionObject[] | null | undefined,
  enabled: boolean = PERSISTED_LINE_TYPE_ENABLED,
): EditorDocument {
  if (!enabled || !corrections || corrections.length === 0) {
    return document;
  }
  return applyStructuralCorrections(document, corrections).document;
}
