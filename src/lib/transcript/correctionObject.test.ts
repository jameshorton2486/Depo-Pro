import { describe, expect, it } from "vitest";
import {
  collectCorrectionErrors,
  validateCorrection,
  CorrectionValidationError,
  newCorrectionId,
} from "./correctionObject";

function validTextCorrection() {
  return {
    id: newCorrectionId(),
    transcript_id: "t1",
    case_id: "c1",
    specialty: "proper_name_novel",
    prompt_version: "v1",
    location: { paragraph_id: "p1", start_word_id: "w1", end_word_id: "w2" },
    change: { type: "proper_name_correction", before: "Bayer", after: "Baer" },
    reason: "Case registry entry 'Baer' matches; Deepgram confidence was 0.62.",
    reason_kind: "registry_match",
    confidence: 0.88,
    provenance: { source: "ai", provider: "anthropic", generated_at: "2026-07-29T00:00:00Z" },
    review: { state: "pending" },
    downstream: { applied_to_working_transcript: false },
  };
}

function validStructuralCorrection() {
  const c = validTextCorrection();
  return {
    ...c,
    specialty: "speaker_reassignment",
    change: { type: "speaker_reassignment", structural_change: { new_speaker_role: "WITNESS", display_name: "THE WITNESS" } },
    reason: "Opening colloquy identifies this speaker as the deponent under oath.",
    reason_kind: "structural_boundary",
  };
}

describe("correctionObject validator", () => {
  it("accepts a valid text correction", () => {
    expect(collectCorrectionErrors(validTextCorrection())).toEqual([]);
  });

  it("accepts a valid structural correction", () => {
    expect(collectCorrectionErrors(validStructuralCorrection())).toEqual([]);
  });

  it("rejects a text correction missing after", () => {
    const c = validTextCorrection();
    delete (c.change as Record<string, unknown>).after;
    expect(collectCorrectionErrors(c).some((e) => e.includes("requires both 'before' and 'after'"))).toBe(true);
  });

  it("accepts a punctuation_edit that only adds punctuation/casing (fillers preserved)", () => {
    const c = validTextCorrection();
    c.change = { type: "punctuation_edit", before: "no um i did not you know", after: "No, um, I did not, you know." };
    c.reason = "Sentence boundaries and capitalization restored; fillers 'um' and 'you know' preserved verbatim.";
    c.reason_kind = "rule_pattern";
    expect(collectCorrectionErrors(c)).toEqual([]);
  });

  it("REJECTS a punctuation_edit that drops a filler word (verbatim guard)", () => {
    const c = validTextCorrection();
    c.change = { type: "punctuation_edit", before: "no um i did not you know", after: "No, I did not." };
    c.reason = "This would silently strip the fillers 'um' and 'you know' from testimony.";
    c.reason_kind = "rule_pattern";
    expect(collectCorrectionErrors(c).some((e) => e.includes("altered word tokens"))).toBe(true);
  });

  it("rejects a structural correction carrying before/after", () => {
    const c = validStructuralCorrection();
    (c.change as Record<string, unknown>).before = "x";
    (c.change as Record<string, unknown>).after = "y";
    expect(collectCorrectionErrors(c).some((e) => e.includes("must not carry 'before'/'after'"))).toBe(true);
  });

  it("rejects a generic reason", () => {
    const c = validTextCorrection();
    c.reason = "improved clarity";
    expect(collectCorrectionErrors(c).some((e) => e.includes("too generic"))).toBe(true);
  });

  it("rejects out-of-range confidence", () => {
    const c = validTextCorrection();
    c.confidence = 1.4;
    expect(collectCorrectionErrors(c).some((e) => e.includes("confidence"))).toBe(true);
  });

  it("rejects ai provenance with no provider", () => {
    const c = validTextCorrection();
    c.provenance = { source: "ai", generated_at: "2026-07-29T00:00:00Z" } as never;
    expect(collectCorrectionErrors(c).some((e) => e.includes("provider is required"))).toBe(true);
  });

  it("validateCorrection throws with all errors", () => {
    try {
      validateCorrection({});
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CorrectionValidationError);
      expect((e as CorrectionValidationError).errors.length).toBeGreaterThan(3);
    }
  });

  it("newCorrectionId matches the schema pattern", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(newCorrectionId()).toMatch(/^corr_[0-9A-Z]{26}$/);
    }
  });
});
