import { describe, expect, it } from "vitest";

import { emptyCaseRecord, normalizeCaseRecord } from "./case";

describe("canonical name hydration", () => {
  it("canonicalizes governed values while preserving field metadata and uncertain spelling", () => {
    const record = emptyCaseRecord("case_name_hydration", "2026-08-03T12:00:00.000Z");
    record.caption.court_name = {
      value: "UNITED STATES DISTRICT COURT FOR THE WESTERN DISTRICT OF TEXAS",
      source: "imported", confirmed: true, conflict: false, confidence_score: 0.94,
    };
    record.reporter.name = {
      value: "AVERY QUILL", source: "manual", confirmed: true, conflict: false, confidence_score: null,
    };
    record.reporter.firm.value = "NORTHSTAR REPORTING LLC";
    record.participants = [{
      participant_id: "participant_1",
      name: { value: "Anne-Marie O'Neal", source: "manual", confirmed: false, conflict: false, confidence_score: null },
      role: "OTHER", organization: "eBay Legal", email: null, phone: null,
      role_in_this_proceeding: null, notes: null,
    }];

    const hydrated = normalizeCaseRecord(JSON.parse(JSON.stringify(record)) as unknown);

    expect(hydrated.caption.court_name).toMatchObject({
      value: "United States District Court for the Western District of Texas",
      source: "imported", confirmed: true, confidence_score: 0.94,
    });
    expect(hydrated.reporter.name.value).toBe("Avery Quill");
    expect(hydrated.reporter.firm.value).toBe("Northstar Reporting LLC");
    expect(hydrated.participants[0]?.name.value).toBe("Anne-Marie O'Neal");
    expect(hydrated.participants[0]?.organization).toBe("eBay Legal");
  });

  it("preserves stored raw provenance on hydration without re-deriving it (RAW-C)", () => {
    const record = emptyCaseRecord("case_provenance_hydration", "2026-08-03T12:00:00.000Z");
    // Stored wrapper: canonical value + the ORIGINAL raw from write time.
    record.reporter.name = {
      value: "Delia Garza",
      source: "manual",
      confirmed: false,
      conflict: false,
      confidence_score: null,
      provenance: { rawInput: "DELIA GARZA", policyId: "intake.person_name", policyVersion: "1.0.0" },
    };

    const hydrated = normalizeCaseRecord(JSON.parse(JSON.stringify(record)) as unknown);

    // Value stays canonical; raw provenance is preserved verbatim — NOT recomputed
    // from the already-canonical stored value (that would record "Delia Garza" as raw).
    expect(hydrated.reporter.name.value).toBe("Delia Garza");
    expect(hydrated.reporter.name.provenance).toEqual({
      rawInput: "DELIA GARZA",
      policyId: "intake.person_name",
      policyVersion: "1.0.0",
    });
  });
});
