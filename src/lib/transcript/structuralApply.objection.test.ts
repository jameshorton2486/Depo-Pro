// DOC-0325 Wave 4 / Decision B — embedded objection structural apply.
//
// The structural-apply engine EXTRACTS an embedded objection into its own unit
// (pre / obj / post) from a reviewed `objection_split` correction. It owns ONLY
// the split boundary; attribution is separate — a resolved objector uses a real
// speaker, an unresolved one uses the derived UNIDENTIFIED objector speaker
// (renders "UNIDENTIFIED SPEAKER"), never fabricated. Raw evidence is immutable.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Word } from "../../api/types";
import type { CorrectionObject } from "./correctionObject";
import { asStructuredUtterance } from "./structuredTranscript";
import {
  applyStructuralCorrections,
  deriveWorkingTranscript,
  UNIDENTIFIED_OBJECTOR_SPEAKER_ID,
} from "./structuralApply";
import { resolveSpeakerDisplayName, UNIDENTIFIED_SPEAKER } from "./resolveSpeakerDisplayName";

function word(id: string, text: string, uttId: string, t: number, speaker = "spk-atty"): Word {
  return {
    word_id: id, text, raw_text: text, speaker_id: speaker, utterance_id: uttId,
    start_time: t, end_time: t + 0.4, confidence: 1, reviewed: false, edited: false,
  };
}

// "You understand? Objection. Form. Go ahead." mis-merged under one attorney turn.
// Objection span = w3..w4 ("Objection." "Form.").
function doc(): EditorDocument {
  return {
    job_id: "t", media_url: null, duration: 10,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-def", display_name: "MS. JONES", deepgram_speaker: 1, role: "ATTORNEY" },
    ],
    utterances: [
      { utterance_id: "u1", speaker_id: "spk-atty", start_time: 0, end_time: 6, word_ids: ["w1", "w2", "w3", "w4", "w5", "w6"] },
    ],
    words: [
      word("w1", "You", "u1", 0), word("w2", "understand?", "u1", 1),
      word("w3", "Objection.", "u1", 2), word("w4", "Form.", "u1", 3),
      word("w5", "Go", "u1", 4), word("w6", "ahead.", "u1", 5),
    ],
  } as unknown as EditorDocument;
}

function objectionSplit(overrides: Partial<{ state: string; start: string; end: string; objector: string | undefined; id: string }> = {}): CorrectionObject {
  const structural_change: Record<string, unknown> = {
    objection_start_word_id: overrides.start ?? "w3",
    objection_end_word_id: overrides.end ?? "w4",
  };
  if ("objector" in overrides) {
    if (overrides.objector !== undefined) structural_change.objector_speaker_id = overrides.objector;
  }
  return {
    id: overrides.id ?? "corr_01HXA92NVXZM3K4T7B2R9WQPD5",
    transcript_id: "t", case_id: "c", specialty: "objection_attribution", prompt_version: "v1",
    location: { paragraph_id: "u1", start_word_id: overrides.start ?? "w3", end_word_id: overrides.end ?? "w4" },
    change: { type: "objection_split", structural_change },
    reason: "Objection embedded in the attorney question turn.",
    reason_kind: "structural_boundary", confidence: 0.9,
    provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-10T00:00:00Z" },
    review: { state: overrides.state ?? "accepted" },
    downstream: { applied_to_working_transcript: false },
  } as CorrectionObject;
}

describe("applyStructuralCorrections — objection_split", () => {
  it("extracts an embedded objection into pre + obj + post units", () => {
    const { document, applied, skipped } = applyStructuralCorrections(doc(), [objectionSplit()]);
    expect(applied).toBe(1);
    expect(skipped).toEqual([]);
    expect(document.utterances.map((u) => u.utterance_id)).toEqual(["u1::pre", "u1::obj", "u1::post"]);
    const pre = asStructuredUtterance(document.utterances[0]);
    const obj = asStructuredUtterance(document.utterances[1]);
    const post = asStructuredUtterance(document.utterances[2]);
    expect(pre.word_ids).toEqual(["w1", "w2"]);
    expect(obj.word_ids).toEqual(["w3", "w4"]);
    expect(post.word_ids).toEqual(["w5", "w6"]);
    // The objection unit is a CONFIRMED colloquy (SP); pre/post inherit the source
    // structure verbatim (the correction establishes nothing about them).
    expect(obj.line_type).toBe("SP");
    expect(obj.line_type_review_status).toBe("CONFIRMED");
    expect(pre.line_type).toBeUndefined();
    expect(post.line_type).toBeUndefined();
    expect(pre.speaker_id).toBe("spk-atty");
    expect(post.speaker_id).toBe("spk-atty");
  });

  it("handles a single-token 'Objection.' (Form./Foundation. optional)", () => {
    const { document, applied } = applyStructuralCorrections(doc(), [objectionSplit({ start: "w3", end: "w3" })]);
    expect(applied).toBe(1);
    const obj = document.utterances.find((u) => u.utterance_id === "u1::obj")!;
    expect(obj.word_ids).toEqual(["w3"]);
    // post now begins at Form.
    const post = document.utterances.find((u) => u.utterance_id === "u1::post")!;
    expect(post.word_ids).toEqual(["w4", "w5", "w6"]);
  });

  it("attributes to a KNOWN objector when a real speaker id is supplied", () => {
    const { document } = applyStructuralCorrections(doc(), [objectionSplit({ objector: "spk-def" })]);
    const obj = document.utterances.find((u) => u.utterance_id === "u1::obj")!;
    expect(obj.speaker_id).toBe("spk-def");
    // No derived speaker introduced when the objector is resolved.
    expect(document.speakers.map((s) => s.speaker_id)).toEqual(["spk-atty", "spk-def"]);
  });

  it("leaves an UNRESOLVED objector unidentified — never fabricated", () => {
    const { document } = applyStructuralCorrections(doc(), [objectionSplit()]);
    const obj = document.utterances.find((u) => u.utterance_id === "u1::obj")!;
    expect(obj.speaker_id).toBe(UNIDENTIFIED_OBJECTOR_SPEAKER_ID);
    const derived = document.speakers.find((s) => s.speaker_id === UNIDENTIFIED_OBJECTOR_SPEAKER_ID)!;
    expect(derived).toBeTruthy();
    // Renders as the actionable "UNIDENTIFIED SPEAKER" flag, not a guessed name.
    expect(resolveSpeakerDisplayName(derived)).toBe(UNIDENTIFIED_SPEAKER);
  });

  it("fails safely on a dangling objector_speaker_id (never fabricates a speaker)", () => {
    const { document, applied, skipped } = applyStructuralCorrections(doc(), [objectionSplit({ objector: "spk-ghost" })]);
    expect(applied).toBe(0);
    expect(document.utterances.map((u) => u.utterance_id)).toEqual(["u1"]);
    expect(skipped[0].reason).toContain("not a known speaker");
  });

  it("does not mutate raw evidence: word text/timestamps/order untouched", () => {
    const before = doc();
    const snapshot = JSON.parse(JSON.stringify(before));
    const { document } = applyStructuralCorrections(before, [objectionSplit()]);
    // input document unchanged
    expect(before).toEqual(snapshot);
    // reassigned words keep text + timestamps
    const w3 = document.words.find((w) => w.word_id === "w3")!;
    expect(w3.text).toBe("Objection.");
    expect(w3.start_time).toBe(2);
    expect(w3.utterance_id).toBe("u1::obj");
    expect(w3.speaker_id).toBe(UNIDENTIFIED_OBJECTOR_SPEAKER_ID);
  });

  for (const state of ["pending", "rejected", "superseded"] as const) {
    it(`does not apply a ${state} objection proposal`, () => {
      const { document, applied } = applyStructuralCorrections(doc(), [objectionSplit({ state })]);
      expect(applied).toBe(0);
      expect(document.utterances.map((u) => u.utterance_id)).toEqual(["u1"]);
    });
  }

  it("is IDEMPOTENT under re-application: apply-again == same structure, not split-again", () => {
    const once = deriveWorkingTranscript(doc(), [objectionSplit()], true);
    const twice = deriveWorkingTranscript(once, [objectionSplit()], true); // re-apply to derived doc
    expect(once.utterances.map((u) => u.utterance_id)).toEqual(["u1::pre", "u1::obj", "u1::post"]);
    expect(twice).toEqual(once); // derived unit is not re-wrapped
  });

  it("reopen is DETERMINISTIC: re-deriving from the immutable original is identical", () => {
    const first = deriveWorkingTranscript(doc(), [objectionSplit()], true);
    const reopened = deriveWorkingTranscript(doc(), [objectionSplit()], true);
    expect(reopened).toEqual(first);
  });

  it("fails safely when the span crosses utterances or is missing", () => {
    const missing = applyStructuralCorrections(doc(), [objectionSplit({ start: "nope", end: "w4" })]);
    expect(missing.applied).toBe(0);
    expect(missing.skipped[0].reason).toContain("not found");

    const reversed = applyStructuralCorrections(doc(), [objectionSplit({ start: "w4", end: "w3" })]);
    expect(reversed.applied).toBe(0);
    expect(reversed.skipped[0].reason).toContain("empty or reversed");
  });

  it("applies at most one split per utterance per pass", () => {
    const a = objectionSplit({ id: "corr_01HXA92NVXZM3K4T7B2R9WQPDA", start: "w3", end: "w3" });
    const b = objectionSplit({ id: "corr_01HXA92NVXZM3K4T7B2R9WQPDB", start: "w4", end: "w4" });
    const { applied, skipped } = applyStructuralCorrections(doc(), [a, b]);
    expect(applied).toBe(1);
    expect(skipped.some((s) => s.reason.includes("already split"))).toBe(true);
  });

  it("re-labels the whole utterance (obj only) when the objection spans it entirely", () => {
    const { document, applied } = applyStructuralCorrections(doc(), [objectionSplit({ start: "w1", end: "w6" })]);
    expect(applied).toBe(1);
    expect(document.utterances.map((u) => u.utterance_id)).toEqual(["u1::obj"]);
    expect(asStructuredUtterance(document.utterances[0]).line_type).toBe("SP");
  });
});
