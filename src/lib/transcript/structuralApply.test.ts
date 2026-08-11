import { describe, expect, it } from "vitest";
import type { EditorDocument, Word } from "../../api/types";
import type { CorrectionObject } from "./correctionObject";
import { asStructuredUtterance } from "./structuredTranscript";
import { applyStructuralCorrections } from "./structuralApply";
import { applyReviewedStructure } from "./lineTypeMigration";
import type { TranscriptParagraph } from "./transcriptParagraphTypes";

function word(id: string, text: string, uttId: string, t: number): Word {
  return {
    word_id: id, text, raw_text: text, speaker_id: "spk-0", utterance_id: uttId,
    start_time: t, end_time: t + 0.1, confidence: 1, reviewed: false, edited: false,
  };
}

function doc(): EditorDocument {
  return {
    job_id: "t", media_url: null, duration: 10,
    speakers: [
      { speaker_id: "spk-0", display_name: "S0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-q", display_name: "Atty", deepgram_speaker: 1, role: "ATTORNEY" },
      { speaker_id: "spk-a", display_name: "Wit", deepgram_speaker: 2, role: "WITNESS" },
    ],
    utterances: [
      { utterance_id: "u0", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["x1"] },
      { utterance_id: "u1", speaker_id: "spk-0", start_time: 1, end_time: 4, word_ids: ["w1", "w2", "w3", "w4"] },
      { utterance_id: "u2", speaker_id: "spk-0", start_time: 4, end_time: 5, word_ids: ["y1"] },
    ],
    words: [
      word("x1", "Header.", "u0", 0),
      word("w1", "You", "u1", 1), word("w2", "understand?", "u1", 2),
      word("w3", "Yes,", "u1", 2.5), word("w4", "I do.", "u1", 3),
      word("y1", "Next.", "u2", 4),
    ],
  } as unknown as EditorDocument;
}

function qaSplit(overrides: Partial<{ state: string; splitAfter: string; qSpeaker: string; aSpeaker: string; id: string }> = {}): CorrectionObject {
  return {
    id: overrides.id ?? "corr_01HXA92NVXZM3K4T7B2R9WQPD5",
    transcript_id: "t", case_id: "c", specialty: "qa_split", prompt_version: "v1",
    location: { paragraph_id: "u1", start_word_id: "w1", end_word_id: "w4" },
    change: {
      type: "qa_split",
      structural_change: {
        split_after_word_id: overrides.splitAfter ?? "w2",
        new_q_paragraph_speaker_id: overrides.qSpeaker ?? "spk-q",
        new_a_paragraph_speaker_id: overrides.aSpeaker ?? "spk-a",
      },
    },
    reason: "Inline question followed by the witness answer.",
    reason_kind: "structural_boundary", confidence: 0.9,
    provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-10T00:00:00Z" },
    review: { state: overrides.state ?? "accepted" },
    downstream: { applied_to_working_transcript: false },
  } as CorrectionObject;
}

describe("applyStructuralCorrections — qa_split", () => {
  it("splits the target utterance into Q + A with persisted line_type", () => {
    const { document, applied, skipped } = applyStructuralCorrections(doc(), [qaSplit()]);
    expect(applied).toBe(1);
    expect(skipped).toEqual([]);
    const ids = document.utterances.map((u) => u.utterance_id);
    // order preserved: u0, then the split of u1, then u2
    expect(ids).toEqual(["u0", "u1::q", "u1::a", "u2"]);
    const q = asStructuredUtterance(document.utterances[1]);
    const a = asStructuredUtterance(document.utterances[2]);
    expect(q.line_type).toBe("Q");
    expect(q.line_type_review_status).toBe("CONFIRMED");
    expect(q.speaker_id).toBe("spk-q");
    expect(q.word_ids).toEqual(["w1", "w2"]);
    expect(a.line_type).toBe("A");
    expect(a.speaker_id).toBe("spk-a");
    expect(a.word_ids).toEqual(["w3", "w4"]);
  });

  it("reassigns words to the new utterances without mutating text/timestamps (raw evidence)", () => {
    const before = doc();
    const { document } = applyStructuralCorrections(before, [qaSplit()]);
    const w2 = document.words.find((w) => w.word_id === "w2")!;
    const w3 = document.words.find((w) => w.word_id === "w3")!;
    expect(w2.utterance_id).toBe("u1::q");
    expect(w2.speaker_id).toBe("spk-q");
    expect(w3.utterance_id).toBe("u1::a");
    expect(w3.speaker_id).toBe("spk-a");
    // text / timestamps untouched
    expect(w2.text).toBe("understand?");
    expect(w2.start_time).toBe(2);
    expect(w3.text).toBe("Yes,");
  });

  it("does not mutate the input document (purity)", () => {
    const input = doc();
    const snapshot = JSON.stringify(input);
    applyStructuralCorrections(input, [qaSplit()]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("derives split-utterance time bounds from their words", () => {
    const { document } = applyStructuralCorrections(doc(), [qaSplit()]);
    const q = document.utterances[1];
    const a = document.utterances[2];
    expect(q.start_time).toBe(1); // w1
    expect(q.end_time).toBeCloseTo(2.1); // w2 end
    expect(a.start_time).toBe(2.5); // w3
    expect(a.end_time).toBeCloseTo(3.1); // w4 end
  });

  it("skips non-applicable review states (pending/rejected)", () => {
    for (const state of ["pending", "rejected", "superseded"]) {
      const r = applyStructuralCorrections(doc(), [qaSplit({ state })]);
      expect(r.applied).toBe(0);
      expect(r.skipped[0].reason).toContain(state);
    }
  });

  it("skips an unresolvable split_after_word_id", () => {
    const r = applyStructuralCorrections(doc(), [qaSplit({ splitAfter: "nope" })]);
    expect(r.applied).toBe(0);
    expect(r.skipped[0].reason).toContain("not found");
  });

  it("skips a split at the last word (nothing to split)", () => {
    const r = applyStructuralCorrections(doc(), [qaSplit({ splitAfter: "w4" })]);
    expect(r.applied).toBe(0);
    expect(r.skipped[0].reason).toContain("last word");
  });

  it("skips non-qa_split corrections", () => {
    const c = qaSplit();
    (c.change as { type: string }).type = "proper_name_correction";
    const r = applyStructuralCorrections(doc(), [c]);
    expect(r.applied).toBe(0);
    expect(r.skipped[0].reason).toContain("not a qa_split");
  });

  it("applies only the first split per utterance in one pass", () => {
    const r = applyStructuralCorrections(doc(), [qaSplit({ id: "corr_A" }), qaSplit({ id: "corr_B", splitAfter: "w3" })]);
    expect(r.applied).toBe(1);
    expect(r.skipped.some((s) => s.reason.includes("already split"))).toBe(true);
  });

  it("falls back to the utterance speaker when a split speaker id is absent", () => {
    const c = qaSplit();
    delete (c.change.structural_change as Record<string, unknown>).new_q_paragraph_speaker_id;
    const { document } = applyStructuralCorrections(doc(), [c]);
    expect(document.utterances[1].speaker_id).toBe("spk-0"); // original utterance speaker
  });
});

describe("structural-apply → applyReviewedStructure (loop closes: qaFixer split has an owner)", () => {
  const para = (kind: string, uttIds: string[]): TranscriptParagraph =>
    ({ kind, sourceUtteranceIds: uttIds, region: "TESTIMONY", label: "", speakerLabel: "", text: "",
       speakerId: null, leadingText: "", mode: "display", words: [], sourceLines: [], sourceWordIds: [] } as unknown as TranscriptParagraph);

  it("split utterances feed persisted Q/A kinds to the overlay WITHOUT a render-time split", () => {
    // Before: one utterance u1 held an inline Q+A. After structural-apply it is two utterances,
    // each with a persisted reviewed line_type. Paragraphs built 1:1 over the split utterances,
    // run through applyReviewedStructure (flag on), get Q then A — the same structure qaFixer used
    // to produce by splitting at render time, now owned upstream by the reviewed correction.
    const { document } = applyStructuralCorrections(doc(), [qaSplit()]);
    const paragraphs = [para("COLLOQUY", ["u1::q"]), para("COLLOQUY", ["u1::a"])];
    const converged = applyReviewedStructure(paragraphs, document, true);
    expect(converged.map((p) => p.kind)).toEqual(["Q", "A"]);
  });
});
