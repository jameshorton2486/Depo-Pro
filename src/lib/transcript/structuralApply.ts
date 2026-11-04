import type { EditorDocument, Speaker, Utterance, Word } from "../../api/types";
import type { CorrectionObject } from "./correctionObject";
import type { PersistedLineType, StructuredUtterance } from "./structuredTranscript";
import { PERSISTED_LINE_TYPE_ENABLED } from "./lineTypeMigration";

// DOC-0325 Wave 4 / Decision B — the derived speaker an extracted objection is
// attributed to when the objector is NOT established. It carries no name/role, so
// resolveSpeakerDisplayName renders it as "UNIDENTIFIED SPEAKER" (F9) — the
// non-fabricating representation, matching qaFixer's prior behavior. It lives ONLY
// in the derived Working Transcript (added to the derived document's speakers), never
// in the immutable raw evidence. Attribution stays a SEPARATE, human-resolvable concern.
export const UNIDENTIFIED_OBJECTOR_SPEAKER_ID = "spk_unidentified_objector";

const UNIDENTIFIED_OBJECTOR_SPEAKER: Speaker = {
  speaker_id: UNIDENTIFIED_OBJECTOR_SPEAKER_ID,
  display_name: "",
  deepgram_speaker: null,
};

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

/** An objection_split correction, resolved to the span + optional attribution (or null if malformed). */
function objectionSplitSpec(correction: CorrectionObject): { startWordId: string; endWordId: string; objectorSpeakerId: string | null } | null {
  if (correction.change.type !== "objection_split") return null;
  const sc = correction.change.structural_change ?? {};
  const startWordId = str(sc.objection_start_word_id);
  const endWordId = str(sc.objection_end_word_id);
  if (!startWordId || !endWordId) return null;
  return { startWordId, endWordId, objectorSpeakerId: str(sc.objector_speaker_id) };
}

// One resulting structural unit of a split. `lineType` undefined = inherit the
// source utterance's line_type verbatim (pre/post of an objection extraction —
// the correction establishes only the objection boundary, nothing more).
interface SplitSegment {
  idSuffix: string;
  speakerId: string;
  wordIds: string[];
  lineType?: PersistedLineType;
}

interface UtterancePlan {
  correctionId: string;
  segments: SplitSegment[];
  // Derived speakers the plan introduces into the Working Transcript (unresolved objector).
  extraSpeakers: Speaker[];
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

  const speakerIds = new Set(document.speakers.map((s) => s.speaker_id));

  // Resolve each correction to a per-utterance segment plan. One operation per utterance per pass
  // (a second op would target ids that no longer own the same word set); extra ops are a follow-up.
  const planByUtterance = new Map<string, UtterancePlan>();

  for (const correction of corrections) {
    if (!APPLICABLE_STATES.has(correction.review.state)) {
      skipped.push({ id: correction.id, reason: `review.state '${correction.review.state}' not applicable` });
      continue;
    }

    const qa = qaSplitSpec(correction);
    const obj = objectionSplitSpec(correction);
    if (!qa && !obj) {
      skipped.push({ id: correction.id, reason: "not a supported structural split (qa_split / objection_split)" });
      continue;
    }

    // --- qa_split: 2-way split at a single boundary word ---
    if (qa) {
      const targetWord = wordsById.get(qa.splitAfterWordId);
      if (!targetWord) {
        skipped.push({ id: correction.id, reason: `split_after_word_id '${qa.splitAfterWordId}' not found` });
        continue;
      }
      const uttId = targetWord.utterance_id;
      if (uttId.includes("::")) {
        // Already a derived unit from a prior apply — re-application is a no-op
        // (idempotency). Corrections reference the immutable original's ids.
        skipped.push({ id: correction.id, reason: `utterance '${uttId}' is already a derived unit (pass the original document)` });
        continue;
      }
      if (planByUtterance.has(uttId)) {
        skipped.push({ id: correction.id, reason: `utterance '${uttId}' already split in this pass` });
        continue;
      }
      const ordered = wordsByUtterance.get(uttId) ?? [];
      const idx = ordered.findIndex((w) => w.word_id === qa.splitAfterWordId);
      if (idx < 0 || idx === ordered.length - 1) {
        skipped.push({ id: correction.id, reason: "split point is at/after the last word (nothing to split)" });
        continue;
      }
      const source = document.utterances.find((u) => u.utterance_id === uttId)!;
      planByUtterance.set(uttId, {
        correctionId: correction.id,
        extraSpeakers: [],
        segments: [
          { idSuffix: "q", speakerId: qa.qSpeaker ?? source.speaker_id, wordIds: ordered.slice(0, idx + 1).map((w) => w.word_id), lineType: "Q" },
          { idSuffix: "a", speakerId: qa.aSpeaker ?? source.speaker_id, wordIds: ordered.slice(idx + 1).map((w) => w.word_id), lineType: "A" },
        ],
      });
      continue;
    }

    // --- objection_split: extract [start..end] into its own SP unit (pre / obj / post) ---
    const startWord = wordsById.get(obj!.startWordId);
    const endWord = wordsById.get(obj!.endWordId);
    if (!startWord || !endWord) {
      skipped.push({ id: correction.id, reason: "objection span word id(s) not found" });
      continue;
    }
    if (startWord.utterance_id !== endWord.utterance_id) {
      skipped.push({ id: correction.id, reason: "objection span crosses utterance boundaries" });
      continue;
    }
    const uttId = startWord.utterance_id;
    if (uttId.includes("::")) {
      skipped.push({ id: correction.id, reason: `utterance '${uttId}' is already a derived unit (pass the original document)` });
      continue;
    }
    if (planByUtterance.has(uttId)) {
      skipped.push({ id: correction.id, reason: `utterance '${uttId}' already split in this pass` });
      continue;
    }
    const ordered = wordsByUtterance.get(uttId) ?? [];
    const startIdx = ordered.findIndex((w) => w.word_id === obj!.startWordId);
    const endIdx = ordered.findIndex((w) => w.word_id === obj!.endWordId);
    if (startIdx < 0 || endIdx < 0 || endIdx < startIdx) {
      skipped.push({ id: correction.id, reason: "objection span is empty or reversed" });
      continue;
    }
    // Attribution (SEPARATE from the split): a provided objector must reference a REAL speaker —
    // never fabricated. A dangling id fails safely; an absent id → the unidentified derived speaker.
    let objectorSpeaker: string;
    const extraSpeakers: Speaker[] = [];
    if (obj!.objectorSpeakerId) {
      if (!speakerIds.has(obj!.objectorSpeakerId)) {
        skipped.push({ id: correction.id, reason: `objector_speaker_id '${obj!.objectorSpeakerId}' is not a known speaker` });
        continue;
      }
      objectorSpeaker = obj!.objectorSpeakerId;
    } else {
      objectorSpeaker = UNIDENTIFIED_OBJECTOR_SPEAKER_ID;
      extraSpeakers.push(UNIDENTIFIED_OBJECTOR_SPEAKER);
    }
    const source = document.utterances.find((u) => u.utterance_id === uttId)!;
    const segments: SplitSegment[] = [];
    if (startIdx > 0) {
      // pre: inherit the source speaker + source line_type verbatim — the correction establishes
      // nothing about this remainder. (undefined lineType => makeUtt leaves the source's in place.)
      segments.push({ idSuffix: "pre", speakerId: source.speaker_id, wordIds: ordered.slice(0, startIdx).map((w) => w.word_id) });
    }
    segments.push({ idSuffix: "obj", speakerId: objectorSpeaker, wordIds: ordered.slice(startIdx, endIdx + 1).map((w) => w.word_id), lineType: "SP" });
    if (endIdx < ordered.length - 1) {
      segments.push({ idSuffix: "post", speakerId: source.speaker_id, wordIds: ordered.slice(endIdx + 1).map((w) => w.word_id) });
    }
    planByUtterance.set(uttId, { correctionId: correction.id, segments, extraSpeakers });
  }

  let applied = 0;
  const newUtterances: Utterance[] = [];
  const rewrittenWords = new Map<string, Word>(); // word_id -> reassigned copy
  const addedSpeakers = new Map<string, Speaker>();

  for (const utterance of document.utterances) {
    const plan = planByUtterance.get(utterance.utterance_id);
    if (!plan) {
      newUtterances.push(utterance);
      continue;
    }
    for (const speaker of plan.extraSpeakers) {
      if (!speakerIds.has(speaker.speaker_id)) addedSpeakers.set(speaker.speaker_id, speaker);
    }

    const makeUtt = (segment: SplitSegment, words: Word[], bounds: { start: number; end: number }): StructuredUtterance => {
      const base: StructuredUtterance = {
        ...(utterance as StructuredUtterance),
        utterance_id: `${utterance.utterance_id}::${segment.idSuffix}`,
        speaker_id: segment.speakerId,
        start_time: bounds.start,
        end_time: bounds.end,
        word_ids: words.map((w) => w.word_id),
      };
      // A reviewed structural code (Q/A/SP) is a CONFIRMED decision. An inherited (undefined)
      // line_type leaves the source utterance's structure untouched — no fabricated structure.
      if (segment.lineType) {
        base.line_type = segment.lineType;
        base.line_type_review_status = "CONFIRMED";
      }
      return base;
    };

    for (const segment of plan.segments) {
      const words = segment.wordIds.map((id) => wordsById.get(id)!).filter(Boolean);
      const newId = `${utterance.utterance_id}::${segment.idSuffix}`;
      newUtterances.push(makeUtt(segment, words, boundsOf(words, utterance)));
      // Reassign words to the new unit (+ speaker); text/timestamps/confidence untouched (raw evidence).
      for (const w of words) rewrittenWords.set(w.word_id, { ...w, utterance_id: newId, speaker_id: segment.speakerId });
    }
    applied += 1;
  }

  const newWords = document.words.map((w) => rewrittenWords.get(w.word_id) ?? w);
  const newSpeakers = addedSpeakers.size > 0
    ? [...document.speakers, ...addedSpeakers.values()]
    : document.speakers;

  return {
    document: { ...document, speakers: newSpeakers, utterances: newUtterances, words: newWords },
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
