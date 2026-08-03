import { describe, expect, it } from "vitest";

import { formatCanonicalField } from "./CanonicalFormatter";
import {
  PHONE_NUMBER_POLICY_ID,
  PHONE_NUMBER_POLICY_VERSION,
  createPhoneNumberRegistry,
} from "./PhoneNumberPolicy";

function format(input: string) {
  return formatCanonicalField(createPhoneNumberRegistry(), PHONE_NUMBER_POLICY_ID, input);
}

describe("Phone Number policy v1.0.0", () => {
  it.each([
    ["2105550101", "(210) 555-0101"],
    ["210-555-0101", "(210) 555-0101"],
    ["(210) 555-0101", "(210) 555-0101"],
    ["210.555.0101", "(210) 555-0101"],
    ["210 555 0101", "(210) 555-0101"],
    ["12105550101", "(210) 555-0101"],
    ["+1 2105550101", "(210) 555-0101"],
    ["210-555-0101 ext 42", "(210) 555-0101 ext. 42"],
    ["210-555-0101 ext. 42", "(210) 555-0101 ext. 42"],
    ["210-555-0101 extension 42", "(210) 555-0101 ext. 42"],
    ["210-555-0101 x42", "(210) 555-0101 ext. 42"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("canonicalizes %j as %j", (input, expected) => {
    expect(format(input)).toMatchObject({
      ok: true,
      policyId: PHONE_NUMBER_POLICY_ID,
      rawInput: input,
      value: expected,
    });
  });

  it.each(["", "   ", "5550101", "210555010", "+1210555010", "+0123456789", "phone"])(
    "rejects %j without fabricating a value",
    (input) => {
      expect(format(input)).toMatchObject({
        ok: false,
        policyId: PHONE_NUMBER_POLICY_ID,
        rawInput: input,
      });
    },
  );

  it("registers the approved policy identity and version", () => {
    expect(createPhoneNumberRegistry().get(PHONE_NUMBER_POLICY_ID)).toMatchObject({
      id: PHONE_NUMBER_POLICY_ID,
      version: PHONE_NUMBER_POLICY_VERSION,
      kind: "phone_number",
    });
  });
});
