import { describe, expect, it } from "vitest";
import { commercialProposal, formatMonthlyPrice } from "./commercialConfig";

describe("commercial proposal", () => {
  it("keeps the proposed price configurable and labels unapproved usage terms", () => {
    expect(commercialProposal.monthlyPriceCents).toBe(4900);
    expect(commercialProposal.includedHours).toBe(30);
    expect(commercialProposal.status).toBe("proposal");
    expect(commercialProposal.overageTerms).toMatch(/not yet approved/i);
    expect(formatMonthlyPrice()).toBe("$49");
  });
});
