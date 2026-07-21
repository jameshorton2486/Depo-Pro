import { describe, expect, it } from "vitest";

import { buildResidualReviewQueue, validateCorrections } from "./correctionValidator";
import type { CorrectionLogEntry } from "./correctionEngines";

function block(overrides: Partial<Parameters<typeof validateCorrections>[0][number]> = {}) {
  return {
    utterance_index: 1,
    utterance_id: "utt_1",
    block_type: "Q" as const,
    speaker_id: "spk_1",
    display_name: "MR. BENTLEY",
    role: "ATTORNEY" as const,
    text: "Question text",
    ...overrides,
  };
}

function correction(overrides: Partial<CorrectionLogEntry> = {}): CorrectionLogEntry {
  return {
    word_id: "w_1",
    original: "raiding",
    corrected: "radiating",
    confidence: 0.93,
    authority: "AI_CONTEXTUAL",
    rule_id: "RULE_1",
    reason: "Context made it clear.",
    evidence: "Medical context",
    ...overrides,
  };
}

describe("correctionValidator", () => {
  it("flags removal of verbatim protected tokens as an error", () => {
    const result = validateCorrections([block()], [
      correction({ original: "uh", corrected: "" }),
    ]);
    expect(result.validation_passed).toBe(false);
    expect(result.verbatim_violations[0]?.severity).toBe("ERROR");
  });

  it("auto-resolves same-word conflicts by authority hierarchy", () => {
    const result = validateCorrections([block()], [
      correction({ original: "Caram", corrected: "Karam", authority: "CONFIRMED_SPELLING" }),
      correction({ word_id: "w_2", original: "Caram", corrected: "Chrisman", authority: "AI_CONTEXTUAL" }),
    ]);
    expect(result.validation_passed).toBe(true);
    expect(result.consistency_errors).toHaveLength(0);
    expect(result.correction_summary.total_corrections_approved).toBe(1);
  });

  it("halts on unresolvable consistency conflicts", () => {
    const result = validateCorrections([block()], [
      correction({ original: "Bentley", corrected: "Peterson", authority: "DETERMINISTIC_REGISTRY" }),
      correction({ word_id: "w_2", original: "Bentley", corrected: "Ramos", authority: "DETERMINISTIC_REGISTRY" }),
    ]);
    expect(result.validation_passed).toBe(false);
    expect(result.consistency_errors[0]?.severity).toBe("ERROR");
  });

  it("warns when evidence fields are missing", () => {
    const result = validateCorrections([block()], [
      correction({ authority: "" as never }),
    ]);
    expect(result.unresolved_flags[0]?.severity).toBe("WARNING");
    expect(result.validation_passed).toBe(true);
  });

  it("errors when a reporter block is classified as Q", () => {
    const result = validateCorrections([block({ role: "REPORTER", block_type: "Q" })], [correction()]);
    expect(result.validation_passed).toBe(false);
  });

  it("errors when a witness block is classified as Q", () => {
    const result = validateCorrections([block({ role: "WITNESS", block_type: "Q" })], [correction()]);
    expect(result.validation_passed).toBe(false);
  });

  it("warns when an attorney block is classified as A", () => {
    const result = validateCorrections([block({ role: "ATTORNEY", block_type: "A" })], [correction()]);
    expect(result.validation_passed).toBe(true);
    expect(result.metrics.warnings_found).toBeGreaterThan(0);
  });

  it("builds a residual review queue from validation issues", () => {
    const queue = buildResidualReviewQueue([
      { type: "ERROR_CASE", severity: "ERROR", word_id: "w_1", message: "Hard failure" },
      { type: "WARN_CASE", severity: "WARNING", utterance_index: 1, message: "Needs review" },
    ]);

    expect(queue[0]).toEqual({
      kind: "validation_error",
      severity: "high",
      word_id: "w_1",
      utterance_index: undefined,
      message: "Hard failure",
    });
    expect(queue[1]?.kind).toBe("validation_warning");
  });
});
