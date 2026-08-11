// DOC-0325 Wave 4 / G1 — objection producer tests + the complete objection loop:
// evidence → detect → objection_split proposal → ACCEPT → structural apply →
// derived objection unit. Rejected/pending never change structure.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Word } from "../../api/types";
import { collectCorrectionErrors } from "./correctionObject";
import { detectObjectionSplitProposals } from "./objectionDetector";
import { applyStructuralCorrections, UNIDENTIFIED_OBJECTOR_SPEAKER_ID } from "./structuralApply";
import { asStructuredUtterance } from "./structuredTranscript";

function word(id: string, text: string, uttId: string, t: number): Word {
  return {
    word_id: id, text, raw_text: text, speaker_id: "spk-atty", utterance_id: uttId,
    start_time: t, end_time: t + 0.4, confidence: 1, reviewed: false, edited: false,
  };
}

// Build a single-utterance doc from a token list (attorney turn).
function docFromTokens(tokens: string[]): EditorDocument {
  return {
    job_id: "job-obj", media_url: null, duration: tokens.length,
    speakers: [{ speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" }],
    utterances: [{ utterance_id: "u1", speaker_id: "spk-atty", start_time: 0, end_time: tokens.length, word_ids: tokens.map((_, i) => `w${i + 1}`) }],
    words: tokens.map((t, i) => word(`w${i + 1}`, t, "u1", i)),
  } as unknown as EditorDocument;
}

const GEN = { generatedAt: "2026-08-11T00:00:00.000Z" };

describe("detectObjectionSplitProposals — producer", () => {
  it("detects an embedded 'Objection.' and emits a valid, schema-clean proposal", () => {
    const proposals = detectObjectionSplitProposals(docFromTokens(["You", "understand?", "Objection.", "Go", "ahead."]), GEN);
    expect(proposals).toHaveLength(1);
    const p = proposals[0];
    expect(collectCorrectionErrors(p)).toEqual([]); // valid CorrectionObject
    expect(p.change.type).toBe("objection_split");
    expect(p.review.state).toBe("pending");
    expect(p.change.structural_change).toMatchObject({ objection_start_word_id: "w3", objection_end_word_id: "w3" });
    // No fabricated speaker.
    expect(p.change.structural_change?.objector_speaker_id).toBeUndefined();
  });

  it("extends the span across 'Objection. Form.'", () => {
    const p = detectObjectionSplitProposals(docFromTokens(["Question?", "Objection.", "Form.", "Continue."]), GEN)[0];
    expect(p.change.structural_change).toMatchObject({ objection_start_word_id: "w2", objection_end_word_id: "w3" });
  });

  it("extends the span across 'Objection. Foundation.'", () => {
    const p = detectObjectionSplitProposals(docFromTokens(["Question?", "Objection.", "Foundation.", "Continue."]), GEN)[0];
    expect(p.change.structural_change).toMatchObject({ objection_start_word_id: "w2", objection_end_word_id: "w3" });
  });

  it("proposes when there is content BEFORE the objection", () => {
    expect(detectObjectionSplitProposals(docFromTokens(["Lots", "of", "context", "here.", "Objection."]), GEN)).toHaveLength(1);
  });

  it("proposes when there is content AFTER the objection", () => {
    expect(detectObjectionSplitProposals(docFromTokens(["Objection.", "Please", "continue."]), GEN)).toHaveLength(1);
  });

  it("emits NOTHING when there is no objection", () => {
    expect(detectObjectionSplitProposals(docFromTokens(["Did", "you", "arrive?"]), GEN)).toEqual([]);
  });

  it("does NOT match the common noun 'objection' (precision — no period)", () => {
    // "I have no objection to that." — 'objection' has no trailing period.
    expect(detectObjectionSplitProposals(docFromTokens(["I", "have", "no", "objection", "to", "that."]), GEN)).toEqual([]);
  });

  it("does not propose when the objection (with qualifier) IS the whole turn", () => {
    // ["Objection.", "Form."]: start=w1, end=w2 -> endIndex is last, i>0 false -> hasOther false.
    expect(detectObjectionSplitProposals(docFromTokens(["Objection.", "Form."]), GEN)).toEqual([]);
  });

  it("detects MULTIPLE explicit objections in one turn deterministically", () => {
    const proposals = detectObjectionSplitProposals(docFromTokens(["Q?", "Objection.", "More", "Q?", "Objection.", "Foundation.", "End."]), GEN);
    expect(proposals).toHaveLength(2);
    // Deterministic identity: same input → same ids.
    const again = detectObjectionSplitProposals(docFromTokens(["Q?", "Objection.", "More", "Q?", "Objection.", "Foundation.", "End."]), GEN);
    expect(again.map((p) => p.id)).toEqual(proposals.map((p) => p.id));
  });

  it("is deterministic (same span → same proposal id)", () => {
    const a = detectObjectionSplitProposals(docFromTokens(["Q?", "Objection.", "A."]), GEN)[0];
    const b = detectObjectionSplitProposals(docFromTokens(["Q?", "Objection.", "A."]), GEN)[0];
    expect(a.id).toBe(b.id);
    expect(/^corr_[0-9A-Z]{26}$/.test(a.id)).toBe(true);
  });

  it("never mutates the source document", () => {
    const doc = docFromTokens(["Q?", "Objection.", "A."]);
    const snap = JSON.parse(JSON.stringify(doc));
    detectObjectionSplitProposals(doc, GEN);
    expect(doc).toEqual(snap);
  });
});

describe("complete objection loop — detect → accept → apply", () => {
  it("ACCEPT: a detected proposal applied yields the derived objection unit (unresolved objector)", () => {
    const doc = docFromTokens(["You", "understand?", "Objection.", "Go", "ahead."]);
    const [proposal] = detectObjectionSplitProposals(doc, GEN);
    const accepted = { ...proposal, review: { ...proposal.review, state: "accepted" as const } };
    const { document, applied } = applyStructuralCorrections(doc, [accepted]);
    expect(applied).toBe(1);
    expect(document.utterances.map((u) => u.utterance_id)).toEqual(["u1::pre", "u1::obj", "u1::post"]);
    const obj = asStructuredUtterance(document.utterances[1]);
    expect(obj.line_type).toBe("SP");
    expect(obj.speaker_id).toBe(UNIDENTIFIED_OBJECTOR_SPEAKER_ID);
    expect(obj.word_ids).toEqual(["w3"]);
  });

  it("PENDING: a raw (pending) proposal changes nothing", () => {
    const doc = docFromTokens(["You", "understand?", "Objection.", "Go", "ahead."]);
    const [proposal] = detectObjectionSplitProposals(doc, GEN);
    const { applied, document } = applyStructuralCorrections(doc, [proposal]);
    expect(applied).toBe(0);
    expect(document.utterances.map((u) => u.utterance_id)).toEqual(["u1"]);
  });

  it("REJECT: a rejected proposal changes nothing", () => {
    const doc = docFromTokens(["You", "understand?", "Objection.", "Go", "ahead."]);
    const [proposal] = detectObjectionSplitProposals(doc, GEN);
    const rejected = { ...proposal, review: { ...proposal.review, state: "rejected" as const } };
    const { applied } = applyStructuralCorrections(doc, [rejected]);
    expect(applied).toBe(0);
  });
});
