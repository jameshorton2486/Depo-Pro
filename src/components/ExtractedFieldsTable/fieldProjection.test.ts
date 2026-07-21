import { describe, expect, it } from "vitest";

import { emptyCaseRecord, type ExtractedField, type LawFirm } from "../../types/case";
import { projectFieldRows } from "./fieldProjection";

describe("projectFieldRows", () => {
  it("projects zero confirmed fields for a brand-new case", () => {
    const record = emptyCaseRecord("case_20260605_clean", "2026-06-05T18:00:00Z");

    const rows = projectFieldRows(record);

    expect(rows.filter((row) => row.status === "Confirmed")).toHaveLength(0);
  });

  it("does not keep a cleared field in Confirmed status", () => {
    const record = emptyCaseRecord("case_20260605_clear", "2026-06-05T18:00:00Z");
    record.reporter.firm_registration_number = {
      value: null,
      source: "manual",
      confirmed: true,
      conflict: false,
      confidence_score: null,
    };

    const row = projectFieldRows(record).find(
      (candidate) => candidate.id === "reporter.firm_registration_number",
    );

    expect(row?.status).not.toBe("Confirmed");
  });

  it("does not throw when witnesses is a malformed object", () => {
    const record = {
      ...emptyCaseRecord("case_20260606_malformed", "2026-06-06T12:00:00Z"),
      witnesses: {},
    } as unknown as Parameters<typeof projectFieldRows>[0];

    expect(() => projectFieldRows(record)).not.toThrow();
  });

  it("uses the corrected Case Style / Cause Number display labels without changing field paths", () => {
    const rows = projectFieldRows(emptyCaseRecord("case_20260608_labels", "2026-06-08T12:00:00Z"));
    const caseStyleRow = rows.find((row) => row.id === "caption.case_style");
    const causeNumberRow = rows.find((row) => row.id === "caption.case_number");

    expect(caseStyleRow).toMatchObject({
      id: "caption.case_style",
      path: "caption.case_style",
      label: "Case Style",
    });
    expect(causeNumberRow).toMatchObject({
      id: "caption.case_number",
      path: "caption.case_number",
      label: "Cause Number",
    });
  });
  it("formats extracted text for display without changing identifier values", () => {
    const record = emptyCaseRecord("case_20260608_display", "2026-06-08T12:00:00Z");
    record.caption.case_style.value = "DELIA GARZA V. HOME DEPOT U.S.A., INC. A/K/A THE HOME DEPOT";
    record.caption.case_number.value = "25-cv-00598-OLG";
    record.caption.state.value = "Tx";
    record.service.service_emails.value = ["SERVICE-ALVARADO@BROTHERS-LAW.COM"];
    record.witnesses = [{
      name: { value: "STEVEN a. NUNEZ", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
      role: { value: "WITNESS", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
      title: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
      employer: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
      party_affiliation: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
      read_and_sign: { value: "read_and_sign", source: "extracted", confirmed: false, conflict: false, confidence_score: null },
      requires_interpreter: { value: false, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
      requires_videographer: { value: false, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
    }] as Parameters<typeof projectFieldRows>[0]["witnesses"];

    const extracted = <T,>(value: T): ExtractedField<T> => ({
      value,
      source: "extracted",
      confirmed: false,
      conflict: false,
      confidence_score: 1,
    });
    record.law_firms = [{
      law_firm_id: "firm_phone_format",
      name: extracted("Example Firm"),
      address: extracted(null),
      city: extracted(null),
      state: extracted(null),
      zip: extracted(null),
      phone: extracted("713.337.0750"),
      fax: extracted("713-337-0760"),
      email: extracted(null),
      represented_party: extracted(null),
    } satisfies LawFirm];
    const rows = projectFieldRows(record);

    expect(rows.find((row) => row.id === "caption.case_style")?.value)
      .toBe("Delia Garza v. Home Depot U.S.A., Inc. A/K/A the Home Depot");
    expect(rows.find((row) => row.id === "caption.case_number")?.value).toBe("25-CV-00598-OLG");
    expect(rows.find((row) => row.id === "witnesses[0].name")?.value).toBe("Steven A. Nunez");
    expect(rows.find((row) => row.id === "caption.state")?.value).toBe("TX");
    expect(rows.find((row) => row.id === "witnesses[0].read_and_sign")?.value).toBe("Read and Sign");
    expect(rows.find((row) => row.id === "service.service_emails")?.value).toBe("service-alvarado@brothers-law.com");
    expect(rows.find((row) => row.id === "law_firms[0].phone")?.value).toBe("(713) 337-0750");
    expect(rows.find((row) => row.id === "law_firms[0].fax")?.value).toBe("(713) 337-0760");
    expect(record.caption.state.value).toBe("Tx");
  });
});
