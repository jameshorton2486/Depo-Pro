import { describe, expect, it } from "vitest";

import { formatCanonicalField } from "./CanonicalFormatter";
import { canonicalValue, policyStamp } from "./FieldResult";
import {
  CAUSE_NUMBER_POLICY_ID,
  CAUSE_NUMBER_POLICY_VERSION,
  createCauseNumberRegistry,
} from "./CauseNumberPolicy";
import {
  PHONE_NUMBER_POLICY_ID,
  PHONE_NUMBER_POLICY_VERSION,
  canonicalizePhoneNumber,
} from "./PhoneNumberPolicy";
import {
  NAME_POLICY_VERSION,
  ORGANIZATION_POLICY_ID,
  PERSON_NAME_POLICY_ID,
  canonicalizeGovernedName,
} from "./NamePolicies";

// RAW-A contract (CANON-RAW-001 / decision A1): canonical results retain the
// raw input and the policyId@version that produced them, and the ONLY approved
// way to drop them is the explicit canonicalValue() accessor.
describe("canonical raw retention (CANON-RAW-001)", () => {
  it("formatCanonicalField stamps the policy version on success", () => {
    const result = formatCanonicalField(
      createCauseNumberRegistry(),
      CAUSE_NUMBER_POLICY_ID,
      "25-cv-00598-olg",
    );
    expect(result).toMatchObject({
      ok: true,
      policyId: CAUSE_NUMBER_POLICY_ID,
      policyVersion: CAUSE_NUMBER_POLICY_VERSION,
      rawInput: "25-cv-00598-olg",
      value: "25-CV-00598-OLG",
    });
  });

  it("canonicalizePhoneNumber returns raw input and policy identity, not a bare string", () => {
    const field = canonicalizePhoneNumber("210-555-0101 x42");
    expect(field).toEqual({
      value: "(210) 555-0101 ext. 42",
      rawInput: "210-555-0101 x42",
      policyId: PHONE_NUMBER_POLICY_ID,
      policyVersion: PHONE_NUMBER_POLICY_VERSION,
    });
    expect(policyStamp(field!)).toBe(`${PHONE_NUMBER_POLICY_ID}@${PHONE_NUMBER_POLICY_VERSION}`);
  });

  it("canonicalizeGovernedName preserves the unnormalized raw input", () => {
    const field = canonicalizeGovernedName(PERSON_NAME_POLICY_ID, "DELIA GARZA");
    expect(field).toEqual({
      value: "Delia Garza",
      rawInput: "DELIA GARZA",
      policyId: PERSON_NAME_POLICY_ID,
      policyVersion: NAME_POLICY_VERSION,
    });
  });

  it("returns null for empty phone input and null (not throw) for null names", () => {
    expect(canonicalizePhoneNumber(null)).toBeNull();
    expect(canonicalizePhoneNumber("   ")).toBeNull();
    expect(canonicalizeGovernedName(ORGANIZATION_POLICY_ID, null)).toBeNull();
  });

  it("preserves blank governed-name input verbatim (no-op) while carrying policy identity", () => {
    const field = canonicalizeGovernedName(ORGANIZATION_POLICY_ID, "");
    expect(field).toMatchObject({ value: "", rawInput: "", policyId: ORGANIZATION_POLICY_ID });
    expect(canonicalValue(field)).toBe("");
  });

  it("canonicalValue reduces a field to its bare value and passes null through", () => {
    expect(canonicalValue(canonicalizePhoneNumber("2105550101"))).toBe("(210) 555-0101");
    expect(canonicalValue(null)).toBeNull();
  });
});
