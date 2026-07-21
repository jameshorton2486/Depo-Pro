import { describe, expect, it } from "vitest";

import { applyStageSPresentationRepairs } from "./deterministicRepairs";

describe("applyStageSPresentationRepairs", () => {
  it("collapses redundant blank lines to a single separator", () => {
    const result = applyStageSPresentationRepairs("A\n\n\n\nB");
    expect(result.text).toBe("A\n\nB\n");
    expect(result.repairs.some((r) => r.description.includes("redundant blank lines"))).toBe(true);
  });

  it("strips trailing whitespace without touching tokens", () => {
    const result = applyStageSPresentationRepairs("Q. Please state your name.   \n\nA. Alex Morgan.");
    expect(result.text).toBe("Q. Please state your name.\n\nA. Alex Morgan.\n");
    expect(result.repairs.some((r) => r.description.includes("trailing whitespace"))).toBe(true);
  });

  it("preserves canonical two-space sentence gaps and content verbatim", () => {
    const canonical = "MR. SAMPLE:  Objection.  Form.\n\nTHE COURT:  Sustained.";
    const result = applyStageSPresentationRepairs(canonical);
    expect(result.text).toBe(`${canonical}\n`);
  });

  it("is idempotent and reports no repairs on already-clean input", () => {
    const clean = "A\n\nB\n";
    const first = applyStageSPresentationRepairs(clean);
    expect(first.text).toBe(clean);
    expect(first.repairs).toHaveLength(0);
    const second = applyStageSPresentationRepairs(first.text);
    expect(second.text).toBe(first.text);
  });
});
