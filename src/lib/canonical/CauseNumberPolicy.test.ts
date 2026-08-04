import { describe, expect, it } from "vitest";

import { formatCanonicalField } from "./CanonicalFormatter";
import {
  CAUSE_NUMBER_POLICY_ID,
  CAUSE_NUMBER_POLICY_VERSION,
  createCauseNumberRegistry,
} from "./CauseNumberPolicy";

describe("Cause Number policy v1.0.0", () => {
  it.each([
    ["25-cv-00598-olg", "25-CV-00598-OLG"],
    ["25-CV-00598-OLG", "25-CV-00598-OLG"],
    ["  syn-2026-001  ", "SYN-2026-001"],
    ["2025CI11923", "2025CI11923"],
    ["C:1628 25-E", "C:1628 25-E"],
  ])("canonicalizes %j without changing internal separators", (input, expected) => {
    const result = formatCanonicalField(
      createCauseNumberRegistry(),
      CAUSE_NUMBER_POLICY_ID,
      input,
    );

    expect(result).toMatchObject({
      ok: true,
      policyId: CAUSE_NUMBER_POLICY_ID,
      rawInput: input,
      value: expected,
    });
  });

  it("rejects an empty value without inventing a cause number", () => {
    expect(
      formatCanonicalField(createCauseNumberRegistry(), CAUSE_NUMBER_POLICY_ID, "   "),
    ).toEqual({
      ok: false,
      policyId: CAUSE_NUMBER_POLICY_ID,
      policyVersion: CAUSE_NUMBER_POLICY_VERSION,
      rawInput: "   ",
      reason: "Cause number is empty",
    });
  });

  it("registers the approved policy identity and version", () => {
    const policy = createCauseNumberRegistry().get(CAUSE_NUMBER_POLICY_ID);

    expect(policy).toMatchObject({
      id: CAUSE_NUMBER_POLICY_ID,
      version: CAUSE_NUMBER_POLICY_VERSION,
      kind: "cause_number",
    });
  });
});
