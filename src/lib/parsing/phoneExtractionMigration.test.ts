import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
import { normalizeFields } from "../../../supabase/functions/extract-nod/normalization.js";
import { applyExtraction } from "./applyExtraction";
import { applyJobSheetExtraction } from "./applyJobSheetExtraction";
import type { ParsedReporterNotes } from "./parserTypes";

function record() {
  const value = emptyCaseRecord("case_phone_extraction", "2026-08-03T12:00:00.000Z");
  value.attorneys = [];
  value.law_firms = [];
  return value;
}

describe("canonical phone extraction writers", () => {
  it("canonicalizes NOD attorney, law-firm phone, and fax values without mutating evidence", () => {
    const fields = normalizeFields({
      attorneys: [{ name: "Avery Quill", phone: "210-555-0101" }],
      law_firms: [{
        name: "Synthetic Legal Group",
        phone: "210.555.0102",
        fax: "210 555 0103",
      }],
    });
    const evidence = structuredClone(fields);

    const application = applyExtraction(fields, record());

    expect(fields).toEqual(evidence);
    expect(application.attorneyAdds[0]?.attorney.phone).toBe("(210) 555-0101");
    expect(application.lawFirmAdds[0]?.law_firm.phone.value).toBe("(210) 555-0102");
    expect(application.lawFirmAdds[0]?.law_firm.fax.value).toBe("(210) 555-0103");
  });

  it("canonicalizes ordering and copy-order phones from job-sheet extraction", () => {
    const parsed = {
      jobDetails: {},
      deepgramKeyterms: [],
      billing: {
        orderingAttorney: "Avery Quill",
        orderingFirm: "Synthetic Legal Group",
        orderingAddress: "",
        orderingPhone: "2105550104 ext 7",
        orderingEmail: "",
        copyOrders: [{
          attorneyName: "Jordan Vale",
          firmName: "Synthetic Defense Group",
          address: "",
          phone: "+1 2105550105",
          email: "",
        }],
      },
    } as unknown as ParsedReporterNotes;

    const result = applyJobSheetExtraction(parsed, record());

    expect(result.application.attorneyAdds.map(({ attorney }) => attorney.phone)).toEqual([
      "(210) 555-0104 ext. 7",
      "(210) 555-0105",
    ]);
  });

  it("fails explicitly instead of storing an invalid extracted phone", () => {
    const fields = normalizeFields({
      attorneys: [{ name: "Avery Quill", phone: "555-0101" }],
    });

    expect(() => applyExtraction(fields, record())).toThrow(
      "Phone Number canonicalization failed",
    );
  });
});
