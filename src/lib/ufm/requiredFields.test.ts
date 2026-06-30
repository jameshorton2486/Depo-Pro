import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
import { getMissingRequiredUfmFields, getRequiredUfmFieldStatuses, isCaseUfmReady } from "./requiredFields";

function buildReadyCase() {
  const record = emptyCaseRecord("case_ufm_ready", "2026-06-30T12:00:00.000Z");
  record.caption.case_number.value = "25-cv-00598-OLG";
  record.caption.court_name.value = "United States District Court";
  record.caption.county.value = "Bexar County";
  record.session.location_state.value = "TX";
  record.session.deposition_date.value = "2026-04-30";
  record.reporter.name.value = "Karen Reporter";
  record.reporter.cert_number.value = "CSR-12345";
  record.proceeding.ordering_contact = "Defense Counsel";
  return record;
}

describe("requiredFields UFM readiness helpers", () => {
  it("returns ready when every required UFM field is populated", () => {
    const record = buildReadyCase();

    expect(isCaseUfmReady(record)).toBe(true);
    expect(getMissingRequiredUfmFields(record)).toEqual([]);
  });

  it("reports missing required fields with their metadata", () => {
    const record = buildReadyCase();
    record.reporter.cert_number.value = "";
    record.proceeding.ordering_contact = "";

    const missing = getMissingRequiredUfmFields(record);

    expect(missing.map((field) => field.metadataKey)).toEqual(["csr_license", "custodial_attorney"]);
    expect(isCaseUfmReady(record)).toBe(false);
  });

  it("marks arrays and blank strings as missing in field statuses", () => {
    const record = buildReadyCase();
    record.caption.case_number.value = " ";

    const statuses = getRequiredUfmFieldStatuses(record);
    const causeNumber = statuses.find((field) => field.metadataKey === "cause_number");

    expect(causeNumber?.missing).toBe(true);
  });
});
