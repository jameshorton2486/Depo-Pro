import { describe, expect, it } from "vitest";

import { STAGE_S_RC_FIXTURES } from "./fixtures";
import { editorialFindings, runStageSValidation, runStageSValidationSuite } from "./validationEngine";

function fixture(name: string) {
  const found = STAGE_S_RC_FIXTURES.find((f) => f.name === name);
  if (!found) {
    throw new Error(`missing fixture: ${name}`);
  }
  return found;
}

describe("runStageSValidation", () => {
  it("passes a well-formed examination with zero critical repairs", () => {
    const result = runStageSValidation(fixture("clean-examination"), { now: "2026-07-21T00:00:00.000Z" });
    expect(result.pass).toBe(true);
    expect(result.burden.bySeverity.CRITICAL).toBe(0);
    expect(result.upstream.renderParityErrors).toEqual([]);
    expect(result.upstream.exportContractValid).toBe(true);
    expect(result.completeness).toBe(1);
    // Repaired presentation output is exposed, not discarded.
    expect(typeof result.repairedText).toBe("string");
    expect(result.repairedText.length).toBeGreaterThan(0);
  });

  it("counts each residual editorial correction as a repair (no under-reporting)", () => {
    const findings = editorialFindings({
      punctuationCorrections: 100,
      capitalizationCorrections: 3,
      objectionFormattingCorrections: 0,
      numberFormattingCorrections: 0,
    });
    expect(findings).toHaveLength(2);
    const punctuation = findings.find((f) => f.message.includes("punctuation"));
    expect(punctuation?.count).toBe(100);
    const totalRepairs = findings.reduce((sum, f) => sum + f.count, 0);
    expect(totalRepairs).toBe(103);
  });

  it("fails when an answer precedes any question (critical Q/A break)", () => {
    const result = runStageSValidation(fixture("answer-before-question"), { now: "2026-07-21T00:00:00.000Z" });
    expect(result.pass).toBe(false);
    expect(result.findings.some((f) => f.category === "QA_CONTINUITY" && f.severity === "CRITICAL")).toBe(true);
  });

  it("reports a major examination-boundary repair when the header is missing", () => {
    const result = runStageSValidation(fixture("missing-examination-header"), { now: "2026-07-21T00:00:00.000Z" });
    expect(result.findings.some((f) => f.category === "EXAMINATION_BOUNDARY")).toBe(true);
  });

  it("is deterministic across runs", () => {
    const a = runStageSValidation(fixture("clean-examination"), { now: "2026-07-21T00:00:00.000Z" });
    const b = runStageSValidation(fixture("clean-examination"), { now: "2026-07-21T00:00:00.000Z" });
    expect(a).toEqual(b);
  });
});

describe("runStageSValidationSuite", () => {
  it("summarizes fixtures and derives release-candidate readiness", () => {
    const suite = runStageSValidationSuite(STAGE_S_RC_FIXTURES, { now: "2026-07-21T00:00:00.000Z" });
    expect(suite.results).toHaveLength(STAGE_S_RC_FIXTURES.length);
    expect(suite.aggregate.fixtures).toBe(STAGE_S_RC_FIXTURES.length);
    expect(suite.aggregate.passing + suite.aggregate.failing).toBe(STAGE_S_RC_FIXTURES.length);
    // The suite intentionally includes a failing fixture, so it must not be RC-ready.
    expect(suite.aggregate.releaseCandidateReady).toBe(false);
  });
});
