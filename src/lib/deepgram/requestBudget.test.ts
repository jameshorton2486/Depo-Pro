import { describe, expect, it } from "vitest";

import { fitStoredKeytermsToRequestBudget } from "./requestBudget";

describe("fitStoredKeytermsToRequestBudget", () => {
  it("keeps selected keyterms within the soft term cap", () => {
    const result = fitStoredKeytermsToRequestBudget(
      Array.from({ length: 95 }, (_, index) => ({
        term: `Term ${index}`,
        boost: 0.5,
        category: "other" as const,
        notes: "",
      })),
    );

    expect(result.keyterms).toHaveLength(90);
    expect(result.droppedCount).toBe(5);
    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
  });

  it("drops trailing terms when the token budget would overflow", () => {
    const result = fitStoredKeytermsToRequestBudget([
      {
        term: "Extremely Specific Orthopedic Neurological Interventional Radiology Phrase",
        boost: 0.5,
        category: "technical",
        notes: "",
      },
      ...Array.from({ length: 120 }, (_, index) => ({
        term: `Witness Variant ${index}`,
        boost: 0.5,
        category: "proper_name" as const,
        notes: "",
      })),
    ]);

    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
    expect(result.keyterms.length).toBeLessThan(121);
    expect(result.droppedCount).toBeGreaterThan(0);
  });
});
