import { describe, expect, it } from "vitest";

import type { FieldProvenanceRow } from "../../components/conflict/types";
import { emptyCaseRecord } from "../../types/case";
import { buildUfmMetadata } from "./buildUfmMetadata";
import { REQUIRED_UFM_FIELDS } from "./requiredFields";

function buildRecord() {
  const record = emptyCaseRecord("case_ufm", "2026-06-05T20:00:00.000Z");
  record.caption.case_style.value = "Maria L. Lopez De Martinez and Alfredo Montes Navarro v. Rafael Robles Calderon and All American Heavy Equipment Leasing, LLC";
  record.caption.case_style.source = "extracted";
  record.caption.case_number.value = "C-1628-25-E";
  record.caption.case_number.source = "extracted";
  record.caption.case_number.confirmed = true;
  record.caption.court_name.value = "275th Judicial District";
  record.caption.court_name.source = "extracted";
  record.caption.county.value = "Hidalgo County";
  record.caption.county.source = "manual";
  record.session.deposition_date.value = "2026-05-07";
  record.session.deposition_date.source = "extracted";
  record.session.start_time.value = "10:00";
  record.session.start_time.source = "extracted";
  record.session.location_address.value = "Via Zoom / San Antonio";
  record.session.location_address.source = "extracted";
  record.session.location_city.value = "San Antonio";
  record.session.location_city.source = "extracted";
  record.session.location_state.value = "TX";
  record.session.location_state.source = "extracted";
  record.reporter.name.value = "Miah Bardot";
  record.reporter.name.confirmed = false;
  record.reporter.cert_number.value = "12129";

  return record;
}

function buildProvenance(): FieldProvenanceRow[] {
  const now = "2026-06-05T20:00:00.000Z";
  return [
    {
      id: "prov_cause",
      case_id: "case_ufm",
      field_path: "caption.case_number",
      field_label: "Case Number",
      event_type: "extracted",
      value: "C-1628-25-E",
      source: "Notice",
      winning_value: null,
      rejected_value: null,
      rejected_source: null,
      confidence_score: 0.9,
      resolution_user: "reporter",
      resolved_at: now,
    },
    {
      id: "prov_date",
      case_id: "case_ufm",
      field_path: "session.deposition_date",
      field_label: "Deposition Date",
      event_type: "extracted",
      value: "2026-05-07",
      source: "Job Sheet",
      winning_value: null,
      rejected_value: null,
      rejected_source: null,
      confidence_score: 0.9,
      resolution_user: "reporter",
      resolved_at: now,
    },
  ];
}

describe("buildUfmMetadata", () => {
  it("uses the best available value even when the field is still unconfirmed", () => {
    const envelope = buildUfmMetadata({
      record: buildRecord(),
      provenance: buildProvenance(),
      computedAt: "2026-06-05T20:10:00.000Z",
    });

    expect(envelope.ufm_metadata.deposition_date).toBe("2026-05-07");
    expect(envelope.field_confirmations.ufmDepositionDate).toBe(false);
  });

  it("keeps confirmations independent from population", () => {
    const envelope = buildUfmMetadata({
      record: buildRecord(),
      provenance: buildProvenance(),
    });

    expect(envelope.ufm_metadata.csr_name).toBe("Miah Bardot");
    expect(envelope.field_confirmations.ufmCsrName).toBe(false);
  });

  it("derives missing required fields from the required set", () => {
    const record = buildRecord();
    record.reporter.cert_number.value = "";

    const envelope = buildUfmMetadata({
      record,
      provenance: buildProvenance(),
    });

    expect(envelope.missing_required_fields).toContain("CSR License Number");
    expect(envelope.missing_required_fields).toContain("Custodial Attorney Name");
  });

  it("uses the shared required-field module as the only missing-field source", () => {
    expect(REQUIRED_UFM_FIELDS).toEqual([
      {
        metadataKey: "cause_number",
        fieldPath: "caption.case_number",
        humanName: "Cause Number",
        ufmSection: "§3.1d",
      },
      {
        metadataKey: "court",
        fieldPath: "caption.court_name",
        humanName: "Court",
        ufmSection: "§3.1a",
      },
      {
        metadataKey: "county",
        fieldPath: "caption.county",
        humanName: "County",
        ufmSection: "§3.1b",
      },
      {
        metadataKey: "state",
        fieldPath: "session.location_state",
        humanName: "State",
        ufmSection: "§3.1b",
      },
      {
        metadataKey: "deposition_date",
        fieldPath: "session.deposition_date",
        humanName: "Deposition Date",
        ufmSection: "§3.1g",
      },
      {
        metadataKey: "csr_name",
        fieldPath: "reporter.name",
        humanName: "Reporter Name",
        ufmSection: "§3.4",
      },
      {
        metadataKey: "csr_license",
        fieldPath: "reporter.cert_number",
        humanName: "CSR License Number",
        ufmSection: "§3.4",
      },
      {
        metadataKey: "custodial_attorney",
        fieldPath: "proceeding.ordering_contact",
        humanName: "Custodial Attorney Name",
        ufmSection: "§3.4",
      },
    ]);
  });

  it("assembles the Garza fixture caption string", () => {
    const envelope = buildUfmMetadata({
      record: buildRecord(),
      provenance: buildProvenance(),
    });

    expect(envelope.ufm_metadata.caption).toBe(
      "Maria L. Lopez De Martinez and Alfredo Montes Navarro v. Rafael Robles Calderon and All American Heavy Equipment Leasing, LLC",
    );
  });
});
