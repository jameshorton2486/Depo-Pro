// DOC-0328 — MANDATORY committed coupling proof.
//
// Proves, end to end and re-runnably, the chain that must hold before the certified
// architecture may be called production-candidate quality:
//
//   persisted reviewed line_type   (an accepted qa_split correction)
//     -> Working Transcript        (deriveWorkingTranscript splits the utterance)
//     -> FinalizedTranscriptModel  (buildFinalizedTranscriptModel)
//     -> CFE                        (verbatim render inside the one paginator)
//     -> PaginationMap             (certified per-line coordinates)
//     -> Certified Pages           (formatPageLine over the resolved coordinate)
//
// The proof is a DIFFERENTIAL: with the persisted-line-type projection OFF the combined
// utterance u2 keeps its single identity; with it ON, u2 becomes the reviewed Q and A
// units (u2::q / u2::a), and that structural authority is visible all the way down at
// the certified (page, line) coordinate. One paginator only — the finalized model's
// pagination deep-equals buildCanonicalPaginationMap on the same inputs.
import { describe, expect, it } from "vitest";
import type { EditorDocument, Utterance, Word } from "../../api/types";
import type { CorrectionObject } from "../transcript/correctionObject";
import { emptyCaseRecord } from "../../types/case";
import { formatPageLine, lookupUtteranceRef } from "./paginationContract";
import { buildCanonicalPaginationMap } from "./paginationProducer";
import { buildFinalizedTranscriptModel } from "./finalizedTranscriptModel";

const RECORD = () => emptyCaseRecord("case-couple", "2026-07-22T00:00:00.000Z");

function word(id: string, text: string, uttId: string, speaker: string, t: number): Word {
  return { word_id: id, text, raw_text: text, speaker_id: speaker, utterance_id: uttId, start_time: t, end_time: t + 0.3, confidence: 1, reviewed: false, edited: false } as Word;
}

// u2 is the mis-merged utterance: an attorney question and the witness answer captured
// as ONE unit. The reviewed qa_split establishes the boundary after "understand?".
function couplingDoc(): EditorDocument {
  const utterances: Utterance[] = [
    { utterance_id: "u0", speaker_id: "spk-atty", start_time: 0, end_time: 1, word_ids: ["a0", "a1", "a2"] },
    { utterance_id: "u1", speaker_id: "spk-wit", start_time: 1, end_time: 2, word_ids: ["b0", "b1", "b2"] },
    { utterance_id: "u2", speaker_id: "spk-atty", start_time: 2, end_time: 4, word_ids: ["c0", "c1", "c2", "c3", "c4"] },
    { utterance_id: "u3", speaker_id: "spk-atty", start_time: 4, end_time: 5, word_ids: ["d0", "d1"] },
  ] as unknown as Utterance[];
  const words: Word[] = [
    word("a0", "State", "u0", "spk-atty", 0), word("a1", "your", "u0", "spk-atty", 0.3), word("a2", "name.", "u0", "spk-atty", 0.6),
    word("b0", "My", "u1", "spk-wit", 1), word("b1", "name's", "u1", "spk-wit", 1.3), word("b2", "Jane.", "u1", "spk-wit", 1.6),
    // u2: "You understand? | Yes, I do." — split after c1.
    word("c0", "You", "u2", "spk-atty", 2), word("c1", "understand?", "u2", "spk-atty", 2.3),
    word("c2", "Yes,", "u2", "spk-atty", 2.6), word("c3", "I", "u2", "spk-atty", 2.9), word("c4", "do.", "u2", "spk-atty", 3.2),
    word("d0", "Thank", "u3", "spk-atty", 4), word("d1", "you.", "u3", "spk-atty", 4.3),
  ];
  return {
    job_id: "couple", media_url: null, duration: 5,
    speakers: [
      { speaker_id: "spk-atty", display_name: "MR. SMITH", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-wit", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
    ],
    utterances, words,
  } as unknown as EditorDocument;
}

function qaSplit(): CorrectionObject {
  return {
    id: "corr_01HXA92NVXZM3K4T7B2R9WQPD5",
    transcript_id: "couple", case_id: "case-couple", specialty: "qa_split", prompt_version: "v1",
    location: { paragraph_id: "u2", start_word_id: "c0", end_word_id: "c4" },
    change: {
      type: "qa_split",
      structural_change: { split_after_word_id: "c1", new_q_paragraph_speaker_id: "spk-atty", new_a_paragraph_speaker_id: "spk-wit" },
    },
    reason: "Inline attorney question immediately followed by the witness answer.",
    reason_kind: "structural_boundary", confidence: 0.95,
    provenance: { source: "ai", provider: "anthropic", generated_at: "2026-08-11T00:00:00Z" },
    review: { state: "accepted" },
    downstream: { applied_to_working_transcript: false },
  } as CorrectionObject;
}

describe("line_type -> certified coupling proof", () => {
  it("OFF: the combined utterance keeps its single identity through to certified pages", () => {
    const model = buildFinalizedTranscriptModel(couplingDoc(), RECORD(), { corrections: [qaSplit()], persistedLineTypeEnabled: false });
    expect(model.lineTypeAuthority.persistedLineTypeApplied).toBe(false);
    // u2 is present; the reviewed Q/A units do NOT exist without the projection.
    expect(lookupUtteranceRef(model.pagination, "u2")).not.toBeNull();
    expect(lookupUtteranceRef(model.pagination, "u2::q")).toBeNull();
    expect(lookupUtteranceRef(model.pagination, "u2::a")).toBeNull();
  });

  it("ON: the reviewed line_type splits u2 into Q/A units carried to certified (page, line)", () => {
    const model = buildFinalizedTranscriptModel(couplingDoc(), RECORD(), { corrections: [qaSplit()], persistedLineTypeEnabled: true });
    expect(model.lineTypeAuthority).toEqual({ persistedLineTypeApplied: true, reviewedCorrectionCount: 1 });

    // The original combined identity is gone; the reviewed Q and A units now own
    // certified coordinates — the persisted line_type reached the certified pages.
    expect(lookupUtteranceRef(model.pagination, "u2")).toBeNull();
    const qRef = lookupUtteranceRef(model.pagination, "u2::q");
    const aRef = lookupUtteranceRef(model.pagination, "u2::a");
    expect(qRef).not.toBeNull();
    expect(aRef).not.toBeNull();

    // -> Certified Pages: the coordinate renders as a certified page:line citation.
    expect(formatPageLine(qRef!)).toMatch(/^\d+:\d+$/);
    // A follows Q in reading order on the certified pages.
    expect(aRef!.page > qRef!.page || (aRef!.page === qRef!.page && aRef!.line >= qRef!.line)).toBe(true);
  });

  it("uses ONE paginator: finalized pagination deep-equals buildCanonicalPaginationMap", () => {
    const model = buildFinalizedTranscriptModel(couplingDoc(), RECORD(), { corrections: [qaSplit()], persistedLineTypeEnabled: true });
    const direct = buildCanonicalPaginationMap(couplingDoc(), RECORD(), [qaSplit()], true);
    expect(model.pagination).toEqual(direct);
  });

  it("is reproducible: identical inputs -> identical certified coordinates", () => {
    const a = buildFinalizedTranscriptModel(couplingDoc(), RECORD(), { corrections: [qaSplit()], persistedLineTypeEnabled: true });
    const b = buildFinalizedTranscriptModel(couplingDoc(), RECORD(), { corrections: [qaSplit()], persistedLineTypeEnabled: true });
    expect(b.pagination).toEqual(a.pagination);
  });

  it("certified coordinates are within-page coherent in both projection states", () => {
    for (const enabled of [false, true]) {
      const model = buildFinalizedTranscriptModel(couplingDoc(), RECORD(), { corrections: [qaSplit()], persistedLineTypeEnabled: enabled });
      const lpp = model.pagination.linesPerPage;
      for (const line of model.pagination.lines) {
        expect(line.ref.page).toBeGreaterThanOrEqual(1);
        expect(line.ref.line).toBeGreaterThanOrEqual(1);
        expect(line.ref.line).toBeLessThanOrEqual(lpp);
      }
    }
  });
});
