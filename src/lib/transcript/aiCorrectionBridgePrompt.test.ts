import { describe, expect, it } from "vitest";
import { BRIDGE_PROMPT_VERSION, BRIDGE_SYSTEM_PROMPT } from "./aiCorrectionBridge";

// DOC-0327 — bridge prompt content guard. BRIDGE_SYSTEM_PROMPT is now the single
// governed prompt source (the .md in the retiring transcript_formatter/ is historical
// evidence only). @v2 reconciled the runtime prompt against that design doc and
// recovered four requirements lost in the @v1 condensation. These assertions fail if a
// future edit silently drops a load-bearing guardrail — so the prompt can't quietly
// regress into a whole-transcript rewriter, a fabricator, or an out-of-scope emitter.

describe("BRIDGE_SYSTEM_PROMPT invariants", () => {
  const p = BRIDGE_SYSTEM_PROMPT.toLowerCase();

  it("is versioned @v3 (speaker-evidence + paragraphing + punctuation)", () => {
    expect(BRIDGE_PROMPT_VERSION).toBe("bridge/full_review@v3");
  });

  // @v3 puts the verbatim/word-immutability guardrail FIRST, before the tasks.
  it("leads with the word-immutability guardrail", () => {
    expect(p).toContain("never add, delete, reorder, or reword spoken words");
    expect(p).toContain("the words are evidence");
    expect(p).toContain("word tokens must be identical");
  });

  // @v3 speaker identification uses the four-tier evidence hierarchy.
  it("states the four-tier speaker-evidence hierarchy", () => {
    for (const t of ["tier 1", "tier 2", "tier 3", "tier 4"]) expect(p).toContain(t);
    expect(p).toContain("four-tier evidence hierarchy");
    expect(p).toContain("split speaker");
    expect(p).toContain("merged speaker");
  });

  it("keeps the editor-not-formatter / no-rewrite contract", () => {
    expect(p).toContain("editor, not a formatter");
    expect(p).toContain("never return a rewritten transcript");
    expect(p).toContain("corrections against the immutable canonical baseline");
  });

  // Recovered requirement 1: explicit out-of-scope exclusion (the schema HAS these
  // types; "only four kinds" alone left them emittable).
  it("explicitly excludes the out-of-scope specialties", () => {
    expect(p).toContain("out of scope");
    for (const term of ["objection", "examination-section", "off-record", "inconsistency"]) {
      expect(p).toContain(term);
    }
  });

  // Recovered requirement 2: precision over recall.
  it("states precision over recall", () => {
    expect(p).toContain("precision over recall");
  });

  // Recovered requirement 3: confidence-band calibration.
  it("keeps the low-confidence band calibration", () => {
    expect(p).toContain("below 0.5");
    expect(p).toContain("low-confidence");
  });

  // Recovered requirement 4: medical ambiguity handling.
  it("keeps medical-ambiguity handling", () => {
    expect(p).toContain("genuinely ambiguous");
  });

  it("keeps the anti-fabrication guardrails", () => {
    expect(p).toContain("never invent a name");
    expect(p).toContain("role only"); // "propose the ROLE only" / "role-only when unsure"
    expect(p).toContain("never give a generic reason");
  });

  it("keeps the verbatim-protected token floor and number rule", () => {
    for (const token of ["uh-huh", "mm-hmm", "y'all"]) {
      expect(p).toContain(token);
    }
    expect(p).toContain("leave dollar amounts, dates, and numbers alone");
  });

  it("scopes to the six in-scope correction kinds (adds paragraphing + punctuation)", () => {
    for (const kind of [
      "speaker_reassignment",
      "qa_split",
      "paragraph_split",
      "punctuation_edit",
      "proper_name_correction",
      "medical_term_correction",
    ]) {
      expect(BRIDGE_SYSTEM_PROMPT).toContain(kind);
    }
  });
});
