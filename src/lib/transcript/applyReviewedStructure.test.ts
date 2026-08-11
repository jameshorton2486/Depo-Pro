import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import type { StructuredUtterance } from "./structuredTranscript";
import type { TranscriptParagraph, TranscriptParagraphKind } from "./transcriptParagraphTypes";
import { applyReviewedStructure } from "./lineTypeMigration";

// Minimal TranscriptParagraph fixture — applyReviewedStructure only reads `kind` +
// `sourceUtteranceIds` and spreads the rest, so a cast partial is faithful.
function para(kind: TranscriptParagraphKind, sourceUtteranceIds: string[], text = "body"): TranscriptParagraph {
  return {
    kind,
    region: "TESTIMONY",
    label: "",
    speakerLabel: "",
    text,
    speakerId: null,
    leadingText: "",
    mode: "display",
    words: [],
    sourceLines: [],
    sourceUtteranceIds,
    sourceWordIds: [],
  } as unknown as TranscriptParagraph;
}

function utt(overrides: Partial<StructuredUtterance> & { utterance_id: string }): StructuredUtterance {
  return { speaker_id: "spk_0", start_time: 0, end_time: 1, word_ids: [], ...overrides } as StructuredUtterance;
}

function doc(utterances: StructuredUtterance[]): EditorDocument {
  return { job_id: "t", media_url: null, duration: 0, speakers: [], utterances, words: [] } as unknown as EditorDocument;
}

describe("applyReviewedStructure — flag OFF (shipped default)", () => {
  it("returns the input paragraphs unchanged (live path byte-identical)", () => {
    const ps = [para("COLLOQUY", ["u1"])];
    const d = doc([utt({ utterance_id: "u1", line_type: "A" })]);
    // default enabled = PERSISTED_LINE_TYPE_ENABLED (false)
    expect(applyReviewedStructure(ps, d)).toBe(ps);
    expect(applyReviewedStructure(ps, d, false)).toBe(ps);
  });
});

describe("applyReviewedStructure — flag ON, persisted line_type wins", () => {
  const cases: Array<[string, TranscriptParagraphKind]> = [
    ["Q", "Q"],
    ["A", "A"],
    ["SP", "COLLOQUY"],
    ["PN", "PARENTHETICAL"],
    ["HEADER", "SECTION_HEADER"],
  ];
  for (const [code, expectedKind] of cases) {
    it(`persisted ${code} overrides an inferred COLLOQUY -> ${expectedKind}`, () => {
      const ps = [para("COLLOQUY", ["u1"])];
      const d = doc([utt({ utterance_id: "u1", line_type: code })]);
      expect(applyReviewedStructure(ps, d, true)[0].kind).toBe(expectedKind);
    });
  }
});

describe("applyReviewedStructure — compatibility + review lock", () => {
  it("UNKNOWN / null line_type keeps the inferred kind (compat fallback)", () => {
    const ps = [para("Q", ["u1"]), para("A", ["u2"])];
    const d = doc([utt({ utterance_id: "u1", line_type: "UNKNOWN" }), utt({ utterance_id: "u2", line_type: null })]);
    const out = applyReviewedStructure(ps, d, true);
    expect(out[0].kind).toBe("Q");
    expect(out[1].kind).toBe("A");
  });

  it("a CONFIRMED reviewed decision wins over inference", () => {
    const ps = [para("Q", ["u1"])];
    const d = doc([utt({ utterance_id: "u1", line_type: "A", line_type_review_status: "CONFIRMED" })]);
    expect(applyReviewedStructure(ps, d, true)[0].kind).toBe("A");
  });

  it("an OVERRIDDEN reviewed decision wins over inference", () => {
    const ps = [para("A", ["u1"])];
    const d = doc([utt({ utterance_id: "u1", line_type: "SP", line_type_review_status: "OVERRIDDEN" })]);
    expect(applyReviewedStructure(ps, d, true)[0].kind).toBe("COLLOQUY");
  });

  it("uses the first source utterance that carries a persisted code", () => {
    const ps = [para("COLLOQUY", ["gen", "u_real"])];
    const d = doc([utt({ utterance_id: "u_real", line_type: "Q" })]); // "gen" absent from doc
    expect(applyReviewedStructure(ps, d, true)[0].kind).toBe("Q");
  });

  it("leaves generated paragraphs (no persisted source utterance) unchanged", () => {
    const ps = [para("SECTION_HEADER", [])];
    expect(applyReviewedStructure(ps, doc([]), true)[0].kind).toBe("SECTION_HEADER");
  });
});

describe("applyReviewedStructure — mixed document + invariants", () => {
  it("resolves each paragraph independently in a mixed reviewed/unreviewed document", () => {
    const ps = [
      para("COLLOQUY", ["u1"]), // -> Q (persisted)
      para("COLLOQUY", ["u2"]), // -> stays COLLOQUY (UNKNOWN)
      para("Q", ["u3"]),        // -> PARENTHETICAL (persisted overrides)
    ];
    const d = doc([
      utt({ utterance_id: "u1", line_type: "Q", line_type_review_status: "CONFIRMED" }),
      utt({ utterance_id: "u2", line_type: "UNKNOWN" }),
      utt({ utterance_id: "u3", line_type: "PN" }),
    ]);
    expect(applyReviewedStructure(ps, d, true).map((p) => p.kind)).toEqual(["Q", "COLLOQUY", "PARENTHETICAL"]);
  });

  it("touches ONLY kind — text/words/source ids preserved (raw evidence untouched)", () => {
    const original = para("COLLOQUY", ["u1"], "the witness answer");
    const d = doc([utt({ utterance_id: "u1", line_type: "A" })]);
    const out = applyReviewedStructure([original], d, true)[0];
    expect(out.kind).toBe("A");
    expect(out.text).toBe("the witness answer");
    expect(out.sourceUtteranceIds).toEqual(["u1"]);
    expect(out.words).toBe(original.words);
  });

  it("handles a large document correctly (500 paragraphs)", () => {
    const utts: StructuredUtterance[] = [];
    const ps: TranscriptParagraph[] = [];
    for (let i = 0; i < 500; i += 1) {
      const code = i % 2 === 0 ? "Q" : "A";
      utts.push(utt({ utterance_id: `u${i}`, line_type: code }));
      ps.push(para("COLLOQUY", [`u${i}`]));
    }
    const out = applyReviewedStructure(ps, doc(utts), true);
    expect(out).toHaveLength(500);
    expect(out.every((p, i) => p.kind === (i % 2 === 0 ? "Q" : "A"))).toBe(true);
  });
});
