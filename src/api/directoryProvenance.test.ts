import { describe, expect, it } from "vitest";

import { canonicalizeFirmFields } from "./firmService";
import { canonicalizeContactInsertForWrite } from "./contactService";
import type { FirmInsert } from "../types/firm";

// CANON-RAW-001 (RAW-D): directory writers stamp raw provenance alongside the
// canonical value, into the contacts/firms `provenance` map.
describe("directory provenance (RAW-D)", () => {
  it("stamps raw provenance on firm name and phone; omits empty fax", () => {
    const input: FirmInsert = {
      name: "northstar hardware llc",
      address: "",
      city: "",
      state: "",
      zip: "",
      main_phone: "210-555-0100",
      fax: "",
    };
    const result = canonicalizeFirmFields(input);

    expect(result.name).toBe("Northstar Hardware LLC");
    expect(result.main_phone).toBe("(210) 555-0100");
    expect(result.provenance).toEqual({
      name: { rawInput: "northstar hardware llc", policyId: "intake.organization", policyVersion: "1.0.0" },
      main_phone: { rawInput: "210-555-0100", policyId: "intake.phone_number", policyVersion: "1.0.0" },
    });
  });

  it("stamps raw provenance on contact name/organization/phone at write", () => {
    const result = canonicalizeContactInsertForWrite({
      type: "participant",
      name: "DELIA GARZA",
      organization: "northstar hardware llc",
      phone: "210-555-0101",
      email: "",
      address: "",
      notes: "",
      firm_id: null,
    });

    expect(result.name).toBe("Delia Garza");
    expect(result.organization).toBe("Northstar Hardware LLC");
    expect(result.phone).toBe("(210) 555-0101");
    expect(result.provenance).toMatchObject({
      name: { rawInput: "DELIA GARZA", policyId: "intake.person_name", policyVersion: "1.0.0" },
      organization: { rawInput: "northstar hardware llc", policyId: "intake.organization", policyVersion: "1.0.0" },
      phone: { rawInput: "210-555-0101", policyId: "intake.phone_number", policyVersion: "1.0.0" },
    });
  });
});
