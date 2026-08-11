import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import type { StructuredUtterance } from "./structuredTranscript";
import {
  LINE_TYPE_TO_KIND,
  PERSISTED_LINE_TYPE_ENABLED,
  resolveStructuralKind,
  selectReviewCandidates,
  shouldProposeStructure,
} from "./lineTypeMigration";

function utt(overrides: Partial<StructuredUtterance> & { utterance_id: string }): StructuredUtterance {
  return {
    speaker_id: "spk_0",
    start_time: 0,
    end_time: 1,
    word_ids: [],
    ...overrides,
  } as StructuredUtterance;
}

function doc(utterances: StructuredUtterance[]): EditorDocument {
  return {
    job_id: "tr_test",
    media_url: null,
    duration: 0,
    speakers: [],
    utterances,
    words: [],
  } as unknown as EditorDocument;
}

describe("PERSISTED_LINE_TYPE_ENABLED", () => {
  it("is default-off (in-freeze safety; activation is a Human Gate)", () => {
    expect(PERSISTED_LINE_TYPE_ENABLED).toBe(false);
  });
});

describe("shouldProposeStructure (proposals never overwrite reviewed decisions)", () => {
  it("allows proposals on unreviewed / legacy / null status", () => {
    expect(shouldProposeStructure(utt({ utterance_id: "u1", line_type_review_status: "UNREVIEWED" }))).toBe(true);
    expect(shouldProposeStructure(utt({ utterance_id: "u2", line_type_review_status: null }))).toBe(true);
    expect(shouldProposeStructure(utt({ utterance_id: "u3" }))).toBe(true);
    expect(shouldProposeStructure(utt({ utterance_id: "u4", line_type_review_status: "UNKNOWN" }))).toBe(true);
  });

  it("blocks proposals on CONFIRMED and OVERRIDDEN (review-locked)", () => {
    expect(shouldProposeStructure(utt({ utterance_id: "u5", line_type_review_status: "CONFIRMED" }))).toBe(false);
    expect(shouldProposeStructure(utt({ utterance_id: "u6", line_type_review_status: "OVERRIDDEN" }))).toBe(false);
  });
});

describe("selectReviewCandidates", () => {
  it("excludes review-locked utterances and orders least-confident first", () => {
    const d = doc([
      utt({ utterance_id: "locked", line_type_review_status: "CONFIRMED", line_type_confidence: 0.1 }),
      utt({ utterance_id: "high", line_type_review_status: "UNREVIEWED", line_type_confidence: 0.9 }),
      utt({ utterance_id: "low", line_type_review_status: "UNREVIEWED", line_type_confidence: 0.3 }),
      utt({ utterance_id: "none", line_type_review_status: "UNREVIEWED" }),
    ]);
    const ids = selectReviewCandidates(d).map((u) => u.utterance_id);
    expect(ids).not.toContain("locked");
    expect(ids).toEqual(["low", "high", "none"]);
  });

  it("returns [] for null/empty documents", () => {
    expect(selectReviewCandidates(null)).toEqual([]);
    expect(selectReviewCandidates(doc([]))).toEqual([]);
  });
});

describe("LINE_TYPE_TO_KIND", () => {
  it("maps each persisted short code to its paragraph kind", () => {
    expect(LINE_TYPE_TO_KIND).toEqual({
      Q: "Q",
      A: "A",
      SP: "COLLOQUY",
      PN: "PARENTHETICAL",
      HEADER: "SECTION_HEADER",
    });
  });
});

describe("resolveStructuralKind (inert until flag on)", () => {
  it("with flag OFF returns the inferred kind verbatim (live path unchanged)", () => {
    const u = utt({ utterance_id: "u1", line_type: "A" });
    // default (flag off) and explicit off both ignore the persisted value
    expect(resolveStructuralKind(u, "COLLOQUY")).toBe("COLLOQUY");
    expect(resolveStructuralKind(u, "COLLOQUY", false)).toBe("COLLOQUY");
  });

  it("with flag ON, a persisted reviewed line_type wins over inference", () => {
    const u = utt({ utterance_id: "u2", line_type: "A", line_type_review_status: "CONFIRMED" });
    expect(resolveStructuralKind(u, "COLLOQUY", true)).toBe("A");
  });

  it("with flag ON, UNKNOWN/absent line_type falls back to inference (compat)", () => {
    expect(resolveStructuralKind(utt({ utterance_id: "u3", line_type: "UNKNOWN" }), "Q", true)).toBe("Q");
    expect(resolveStructuralKind(utt({ utterance_id: "u4", line_type: null }), "Q", true)).toBe("Q");
    expect(resolveStructuralKind(utt({ utterance_id: "u5" }), "PARENTHETICAL", true)).toBe("PARENTHETICAL");
  });

  it("maps every persisted code to the right kind when flag on", () => {
    const cases: Array<[string, string]> = [
      ["Q", "Q"], ["A", "A"], ["SP", "COLLOQUY"], ["PN", "PARENTHETICAL"], ["HEADER", "SECTION_HEADER"],
    ];
    for (const [code, kind] of cases) {
      expect(resolveStructuralKind(utt({ utterance_id: `c_${code}`, line_type: code }), "COLLOQUY", true)).toBe(kind);
    }
  });

  it("the shipped default flag is off, so production behavior is inference", () => {
    expect(PERSISTED_LINE_TYPE_ENABLED).toBe(false);
  });
});
