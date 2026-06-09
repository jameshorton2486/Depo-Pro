import { describe, expect, it } from "vitest";

import { normalizeCaseRecord } from "../lib/normalizeCaseRecord";
import { buildUfmMetadata } from "../lib/ufm/buildUfmMetadata";

describe("normalizeCaseRecord role-preservation behavior", () => {
  it("preserves same-name attorneys when their role-bearing fields differ while still collapsing exact duplicates", () => {
    const normalized = normalizeCaseRecord({
      case_id: "case_role_merge",
      created_at: "2026-06-08T00:00:00.000Z",
      updated_at: "2026-06-08T00:00:00.000Z",
      attorneys: [
        {
          attorney_id: "attorney_1",
          name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          function: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          representing: { value: "FOR THE PLAINTIFF", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: null, source: "manual", confirmed: true, conflict: false, confidence_score: null },
          address: null,
          city: null,
          state: null,
          zip: null,
          time_used: null,
          email: null,
          phone: null,
        },
        {
          attorney_id: "attorney_2",
          name: { value: "KAREN M ALVARADO", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "OTHER", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          function: { value: "OTHER", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          representing: { value: "Custodial Attorney", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: "24012345", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          address: null,
          city: null,
          state: null,
          zip: null,
          time_used: "00:15",
          email: "karen@example.com",
          phone: "2105550101",
        },
        {
          attorney_id: "attorney_3",
          name: { value: "Karen M Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "CO_COUNSEL", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          function: { value: "CO_COUNSEL", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          representing: { value: "Appearance Attorney", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: null, source: "manual", confirmed: true, conflict: false, confidence_score: null },
          address: null,
          city: null,
          state: null,
          zip: null,
          time_used: null,
          email: null,
          phone: null,
        },
        {
          attorney_id: "attorney_4",
          name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          function: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          representing: { value: "FOR THE PLAINTIFF", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: "24012345", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          address: "123 Main",
          city: "San Antonio",
          state: "TX",
          zip: "78205",
          time_used: "00:30",
          email: "duplicate@example.com",
          phone: "2105559999",
        },
      ],
    });

    // RESOLVED 2026-06-08: role-preserving dedup; see fix commit.
    expect(normalized.attorneys).toHaveLength(3);
    expect(normalized.attorneys.map((attorney) => attorney.function?.value ?? attorney.role.value)).toEqual([
      "EXAMINING",
      "OTHER",
      "CO_COUNSEL",
    ]);
    expect(normalized.attorneys.map((attorney) => attorney.representing.value)).toEqual([
      "FOR THE PLAINTIFF",
      "Custodial Attorney",
      "Appearance Attorney",
    ]);
    expect(normalized.attorneys[0]?.bar_number.value).toBe("24012345");
    expect(normalized.attorneys[0]?.email).toBe("duplicate@example.com");
    expect(normalized.attorneys[0]?.time_used).toBe("00:30");

    const envelope = buildUfmMetadata({
      record: normalized,
      provenance: [],
    });
    const attorneyFunctions = (envelope.ufm_metadata.appearances as Array<{ category: string; function?: string | string[] | null }>)
      .filter((appearance) => appearance.category === "attorney")
      .map((appearance) => appearance.function);
    expect(attorneyFunctions).toEqual(["EXAMINING", "OTHER", "CO_COUNSEL"]);
  });

  it("preserves a multi-function attorney entry through normalization and UFM emission", () => {
    const normalized = normalizeCaseRecord({
      case_id: "case_multi_function_attorney",
      created_at: "2026-06-08T00:00:00.000Z",
      updated_at: "2026-06-08T00:00:00.000Z",
      attorneys: [
        {
          attorney_id: "attorney_multi_function",
          name: { value: "Curtis L. Cukjati", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Cukjati Law Firm, PLLC", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          function: {
            value: ["EXAMINING_ATTORNEY", "CUSTODIAL_ATTORNEY"],
            source: "manual",
            confirmed: true,
            conflict: false,
            confidence_score: null,
          },
          representing: { value: "FOR THE DEFENDANT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: "24012345", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          address: null,
          city: null,
          state: null,
          zip: null,
          time_used: null,
          email: "curtis@example.com",
          phone: "2105551111",
        },
      ],
    });

    expect(normalized.attorneys).toHaveLength(1);
    expect(normalized.attorneys[0]?.function?.value).toEqual(["EXAMINING_ATTORNEY", "CUSTODIAL_ATTORNEY"]);
    expect(normalized.attorneys[0]?.role.value).toBe("EXAMINING");
    expect(normalized.attorneys[0]?.representing.value).toBe("FOR THE DEFENDANT");

    const envelope = buildUfmMetadata({
      record: normalized,
      provenance: [],
    });
    const attorneyFunctions = (envelope.ufm_metadata.appearances as Array<{ category: string; function?: string | string[] | null }>)
      .filter((appearance) => appearance.category === "attorney")
      .map((appearance) => appearance.function);
    expect(attorneyFunctions).toEqual([["EXAMINING_ATTORNEY", "CUSTODIAL_ATTORNEY"]]);
  });

  it("preserves the same name across distinct collections and within participants when role-bearing fields differ", () => {
    const normalized = normalizeCaseRecord({
      case_id: "case_cross_collection_role",
      created_at: "2026-06-08T00:00:00.000Z",
      updated_at: "2026-06-08T00:00:00.000Z",
      attorneys: [
        {
          name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          function: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          representing: { value: "FOR THE DEFENDANT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: null, source: "manual", confirmed: true, conflict: false, confidence_score: null },
          address: null,
          city: null,
          state: null,
          zip: null,
          time_used: null,
          email: null,
          phone: null,
        },
        {
          name: { value: "Karen M Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "OTHER", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          function: { value: "OTHER", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          representing: { value: "Custodial Attorney", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: null, source: "manual", confirmed: true, conflict: false, confidence_score: null },
          address: null,
          city: null,
          state: null,
          zip: null,
          time_used: null,
          email: null,
          phone: null,
        },
      ],
      participants: [
        {
          participant_id: "participant_1",
          name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: "ATTORNEY",
          organization: "Brothers Law",
          email: null,
          phone: null,
          role_in_this_proceeding: "Observer",
          notes: null,
        },
        {
          participant_id: "participant_2",
          name: { value: "Karen M Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: "ATTORNEY",
          organization: "Brothers Law",
          email: null,
          phone: null,
          role_in_this_proceeding: "Corporate representative",
          notes: null,
        },
      ],
    });

    expect(normalized.attorneys).toHaveLength(2);
    expect(normalized.participants).toHaveLength(2);
    expect(normalized.attorneys[0]?.name.value).toBe("Karen M. Alvarado");
    expect(normalized.participants[0]?.name.value).toBe("Karen M. Alvarado");
  });
});
