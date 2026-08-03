import { describe, expect, it } from "vitest";

import {
  COURT_POLICY_ID,
  NAME_POLICY_VERSION,
  ORGANIZATION_POLICY_ID,
  PERSON_NAME_POLICY_ID,
  canonicalizeGovernedName,
} from "./NamePolicies";

describe("governed name policies v1.0.0", () => {
  it.each([
    ["AVERY QUILL", "Avery Quill"], ["avery quill", "Avery Quill"],
    ["AVERY J. QUILL JR.", "Avery J. Quill Jr."],
    ["Avery McCloud", "Avery McCloud"], ["O'NEAL", "O'NEAL"], ["ANNE-MARIE VALE", "ANNE-MARIE VALE"],
  ])("canonicalizes or conservatively preserves person %j", (input, expected) => {
    expect(canonicalizeGovernedName(PERSON_NAME_POLICY_ID, input)).toBe(expected);
  });

  it.each([
    ["FALCON, REED & VALE, P.C.", "Falcon, Reed & Vale, P.C."],
    ["northstar hardware llc", "Northstar Hardware LLC"],
    ["eBay Legal", "eBay Legal"],
  ])("canonicalizes organization %j", (input, expected) => {
    expect(canonicalizeGovernedName(ORGANIZATION_POLICY_ID, input)).toBe(expected);
  });

  it.each([
    ["UNITED STATES DISTRICT COURT FOR THE WESTERN DISTRICT OF TEXAS", "United States District Court for the Western District of Texas"],
    ["synthetic county court at law no. 2", "Synthetic County Court At Law No. 2"],
  ])("canonicalizes court %j without changing wording", (input, expected) => {
    expect(canonicalizeGovernedName(COURT_POLICY_ID, input)).toBe(expected);
  });

  it("locks every policy to version 1.0.0", () => {
    expect(NAME_POLICY_VERSION).toBe("1.0.0");
  });
});
