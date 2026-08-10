import { describe, expect, it } from "vitest";
import { deriveStructuralProposal, MODE_TO_LINE_TYPE } from "./structuralProposal";

describe("MODE_TO_LINE_TYPE", () => {
  it("maps every dialogue mode to its persisted short code", () => {
    expect(MODE_TO_LINE_TYPE).toEqual({ COLLOQUY: "SP", Q: "Q", A: "A", PARENTHETICAL: "PN" });
  });
});

describe("deriveStructuralProposal", () => {
  it("gives role-backed Q/A the strongest confidence", () => {
    expect(deriveStructuralProposal({ mode: "Q", role: "q" })).toMatchObject({
      line_type: "Q",
      confidence: 0.95,
    });
    expect(deriveStructuralProposal({ mode: "A", role: "a" })).toMatchObject({
      line_type: "A",
      confidence: 0.95,
    });
  });

  it("gives Q/A without a role tag a lower (but solid) confidence", () => {
    const p = deriveStructuralProposal({ mode: "Q", role: null });
    expect(p.line_type).toBe("Q");
    expect(p.confidence).toBe(0.8);
    expect(p.reason).toContain("without role tag");
  });

  it("rates PARENTHETICAL highly", () => {
    expect(deriveStructuralProposal({ mode: "PARENTHETICAL" })).toMatchObject({
      line_type: "PN",
      confidence: 0.9,
    });
  });

  it("rates the COLLOQUY catch-all as the weakest / most review-worthy", () => {
    const p = deriveStructuralProposal({ mode: "COLLOQUY" });
    expect(p.line_type).toBe("SP");
    expect(p.confidence).toBe(0.5);
    expect(p.reason).toContain("colloquy fallback");
  });

  it("dampens speaker-dependent kinds on uncertain-speaker + low-confidence aids", () => {
    const base = deriveStructuralProposal({ mode: "A", role: "a" }).confidence;
    const damped = deriveStructuralProposal({
      mode: "A",
      role: "a",
      uncertainSpeaker: true,
      lowConfidence: true,
    });
    expect(damped.confidence).toBeLessThan(base);
    expect(damped.reason).toContain("uncertain speaker");
    expect(damped.reason).toContain("low acoustic confidence");
  });

  it("does NOT dampen PARENTHETICAL (not speaker-dependent) on the migration aids", () => {
    const base = deriveStructuralProposal({ mode: "PARENTHETICAL" }).confidence;
    const withAids = deriveStructuralProposal({
      mode: "PARENTHETICAL",
      uncertainSpeaker: true,
      lowConfidence: true,
    }).confidence;
    expect(withAids).toBe(base);
  });
});
