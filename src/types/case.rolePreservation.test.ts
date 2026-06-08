import { describe, expect, it } from "vitest";

import { normalizeCaseRecord } from "../lib/normalizeCaseRecord";

describe("normalizeCaseRecord role-preservation behavior", () => {
  it("currently collapses same-name attorneys inside one collection even when their role metadata differs", () => {
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
      ],
    });

    // AUDIT NOTE: same-name/different-role collapse may violate role-preservation rule — confirm before Stage 1.
    expect(normalized.attorneys).toHaveLength(1);
    expect(normalized.attorneys[0]?.role.value).toBe("EXAMINING");
    expect(normalized.attorneys[0]?.representing.value).toBe("FOR THE PLAINTIFF");
    expect(normalized.attorneys[0]?.bar_number.value).toBe("24012345");
    expect(normalized.attorneys[0]?.email).toBe("karen@example.com");
    expect(normalized.attorneys[0]?.time_used).toBe("00:15");
  });

  it("still preserves the same name across distinct collections while collapsing within attorneys", () => {
    const normalized = normalizeCaseRecord({
      case_id: "case_cross_collection_role",
      created_at: "2026-06-08T00:00:00.000Z",
      updated_at: "2026-06-08T00:00:00.000Z",
      attorneys: [
        {
          name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Brothers Law", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
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
      ],
    });

    expect(normalized.attorneys).toHaveLength(1);
    expect(normalized.participants).toHaveLength(1);
    expect(normalized.attorneys[0]?.name.value).toBe("Karen M. Alvarado");
    expect(normalized.participants[0]?.name.value).toBe("Karen M. Alvarado");
  });
});
