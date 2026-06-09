import { describe, expect, it } from "vitest";

import type { FieldProvenanceRow } from "../../components/conflict/types";
import type { Contact } from "../../types/contact";
import { emptyCaseRecord } from "../../types/case";
import type { Firm } from "../../types/firm";
import type { ReporterProfile } from "../../types/reporterProfile";
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

function buildReporterProfile(): ReporterProfile {
  return {
    owner_user_id: "user_123",
    display_name: "Miah Bardot",
    csr_number: "12129",
    csr_cert_expiration: "2027-12-31",
    firm_registration_number: "FR-9001",
    initials: "MB",
    realtime_capable: true,
    remote_swear_authority: true,
    notary_commission_expiration: "2027-12-31",
    preferred_signature_block: "Miah Bardot, CSR 12129",
    created_at: "2026-06-05T20:00:00.000Z",
    updated_at: "2026-06-05T20:00:00.000Z",
  };
}

function buildDirectoryAttorneyContact(): Contact {
  return {
    id: "contact_attorney_1",
    type: "attorney",
    name: "Karen M. Alvarado",
    organization: "Brothers, Alvarado, Piazza & Cozort, P.C.",
    phone: "2105551212",
    email: "kalvarado@example.com",
    address: "",
    notes: "",
    firm_id: "firm_1",
    details: {
      kind: "attorney",
      bar_number: "24012345",
      direct_phone: "2105551212",
      extension: "112",
      fax: "2105551313",
      assistant_name: "Dana",
      assistant_email: "dana@example.com",
      preferred_appearance_label: "MS. ALVARADO",
    },
    times_used: 3,
    created_at: "2026-06-05T20:00:00.000Z",
    updated_at: "2026-06-05T20:00:00.000Z",
  };
}

function buildDirectoryInterpreterContact(): Contact {
  return {
    id: "contact_interpreter_1",
    type: "interpreter",
    name: "Rosa Pena",
    organization: "Lingua Bridge",
    phone: "2105551414",
    email: "rosa@example.com",
    address: "",
    notes: "",
    firm_id: null,
    details: {
      kind: "interpreter",
      certified: true,
      cert_number: "INT-7788",
      certification_authority: "Texas JBCC",
      certification_expiration: "2028-01-01",
      remote_capable: true,
      agency: "Lingua Bridge",
      agency_contact: "Marta",
      default_languages: ["es", "en"],
    },
    times_used: 1,
    created_at: "2026-06-05T20:00:00.000Z",
    updated_at: "2026-06-05T20:00:00.000Z",
  };
}

function buildDirectoryFirm(): Firm {
  return {
    id: "firm_1",
    name: "Brothers, Alvarado, Piazza & Cozort, P.C.",
    address: "123 Main St",
    city: "San Antonio",
    state: "TX",
    zip: "78205",
    main_phone: "2105559999",
    fax: "2105558888",
    created_at: "2026-06-05T20:00:00.000Z",
    updated_at: "2026-06-05T20:00:00.000Z",
  };
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

  it("derives requesting party from extracted scheduling data without auto-confirming it", () => {
    const record = buildRecord();
    record.scheduling.noticing_party.value = "Plaintiff";
    record.scheduling.noticing_party.source = "extracted";
    record.scheduling.noticing_party.confirmed = false;

    const envelope = buildUfmMetadata({
      record,
      provenance: [
        ...buildProvenance(),
        {
          id: "prov_requesting_party",
          case_id: "case_ufm",
          field_path: "scheduling.noticing_party",
          field_label: "Noticing Party",
          event_type: "extracted",
          value: "Plaintiff",
          source: "Notice",
          winning_value: null,
          rejected_value: null,
          rejected_source: null,
          confidence_score: 0.88,
          resolution_user: "reporter",
          resolved_at: "2026-06-05T20:00:00.000Z",
        },
      ],
    });

    expect(envelope.ufm_metadata.requesting_party).toBe("Plaintiff");
    expect(envelope.field_sources.ufmRequestingParty).toBe("nod_parser");
    expect(envelope.field_confirmations.ufmRequestingParty).toBe(false);
  });

  it("leaves derived UFM fields blank when their extracted source fields are absent", () => {
    const envelope = buildUfmMetadata({
      record: buildRecord(),
      provenance: buildProvenance(),
    });

    expect(envelope.ufm_metadata.requesting_party).toBeNull();
    expect(envelope.ufm_metadata.custodial_attorney).toBeNull();
  });

  it("flips the UFM confirmation when the underlying extracted field is confirmed", () => {
    const record = buildRecord();
    record.scheduling.ordered_by.value = "Tiffany Netcher";
    record.scheduling.ordered_by.source = "extracted";
    record.scheduling.ordered_by.confirmed = true;

    const envelope = buildUfmMetadata({
      record,
      provenance: [
        ...buildProvenance(),
        {
          id: "prov_custodial_attorney",
          case_id: "case_ufm",
          field_path: "scheduling.ordered_by",
          field_label: "Ordered By",
          event_type: "extracted",
          value: "Tiffany Netcher",
          source: "Notice",
          winning_value: null,
          rejected_value: null,
          rejected_source: null,
          confidence_score: 0.9,
          resolution_user: "reporter",
          resolved_at: "2026-06-05T20:00:00.000Z",
        },
      ],
    });

    expect(envelope.ufm_metadata.custodial_attorney).toBe("Tiffany Netcher");
    expect(envelope.field_sources.ufmCustodialAttorney).toBe("nod_parser");
    expect(envelope.field_confirmations.ufmCustodialAttorney).toBe(true);
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

  it("uses the reporter profile when present and marks those fields as confirmed profile data", () => {
    const record = buildRecord();
    record.reporter.name.value = "";
    record.reporter.cert_number.value = "";
    record.reporter.firm_registration_number.value = "";
    record.reporter.license_expiration.value = "";

    const envelope = buildUfmMetadata({
      record,
      provenance: buildProvenance(),
      reporterProfile: buildReporterProfile(),
    });

    expect(envelope.ufm_metadata.csr_name).toBe("Miah Bardot");
    expect(envelope.ufm_metadata.csr_license).toBe("12129");
    expect(envelope.ufm_metadata.firm_registration).toBe("FR-9001");
    expect(envelope.ufm_metadata.csr_cert_expiration).toBe("2027-12-31");
    expect(envelope.field_sources.ufmCsrName).toBe("profile");
    expect(envelope.field_confirmations.ufmCsrName).toBe(true);
    expect(envelope.field_confirmations.ufmCsrLicense).toBe(true);
    expect(envelope.field_confirmations.ufmFirmRegistration).toBe(true);
    expect(envelope.field_confirmations.ufmCsrCertExpiration).toBe(true);
  });

  it("keeps the existing reporter-field behavior when no reporter profile is present", () => {
    const envelope = buildUfmMetadata({
      record: buildRecord(),
      provenance: buildProvenance(),
      reporterProfile: null,
    });

    expect(envelope.ufm_metadata.csr_name).toBe("Miah Bardot");
    expect(envelope.field_sources.ufmCsrName).toBe("manual");
    expect(envelope.field_confirmations.ufmCsrName).toBe(false);
  });

  it("remains a pure synchronous builder even when reporter profile data is provided", () => {
    const result = buildUfmMetadata({
      record: buildRecord(),
      provenance: buildProvenance(),
      reporterProfile: buildReporterProfile(),
    });

    expect(result).not.toBeInstanceOf(Promise);
    expect(result.case_id).toBe("case_ufm");
  });

  it("enriches appearance and law firm metadata from participant directory records", () => {
    const record = buildRecord();
    record.attorneys.push({
      attorney_id: "attorney_1",
      name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: "Brothers, Alvarado, Piazza & Cozort, P.C.", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: "Defendant", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: "01:15",
      email: null,
      phone: null,
    });
    record.interpreters.push({
      interpreter_id: "interp_1",
      name: { value: "Rosa Pena", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      language_from: "es",
      language_to: "en",
      oath_administered: true,
      certified: false,
      cert_number: null,
      agency: null,
      email: null,
      phone: null,
    });

    const envelope = buildUfmMetadata({
      record,
      provenance: buildProvenance(),
      directoryContacts: [buildDirectoryAttorneyContact(), buildDirectoryInterpreterContact()],
      directoryFirms: [buildDirectoryFirm()],
    });

    expect(envelope.ufm_metadata.appearances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "attorney",
          name: "Karen M. Alvarado",
          bar_number: "24012345",
          appearance_label: "MS. ALVARADO",
          firm: "Brothers, Alvarado, Piazza & Cozort, P.C.",
          function: "EXAMINING",
          representing: "Defendant",
        }),
        expect.objectContaining({
          category: "interpreter",
          name: "Rosa Pena",
          cert_number: "INT-7788",
          certification_authority: "Texas JBCC",
          agency_contact: "Marta",
          language_from: "es",
          language_to: "en",
          oath_administered: true,
        }),
      ]),
    );
    expect(envelope.ufm_metadata.law_firms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Brothers, Alvarado, Piazza & Cozort, P.C.",
          address: "123 Main St",
          city: "San Antonio",
          state: "TX",
          zip: "78205",
          phone: "2105559999",
          fax: "2105558888",
          represented_party: "Defendant",
        }),
      ]),
    );
  });

  it("carries a directory attorney preferred appearance label into appearances", () => {
    const record = buildRecord();
    record.attorneys.push({
      attorney_id: "attorney_appearance_label",
      name: { value: "Karen M. Alvarado", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: "Brothers, Alvarado, Piazza & Cozort, P.C.", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "CO_COUNSEL", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: "Plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    });

    const envelope = buildUfmMetadata({
      record,
      provenance: buildProvenance(),
      directoryContacts: [buildDirectoryAttorneyContact()],
    });

    expect(envelope.ufm_metadata.appearances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Karen M. Alvarado",
          appearance_label: "MS. ALVARADO",
        }),
      ]),
    );
  });

  it("emits attorney multi-select functions as an array while leaving representation independent", () => {
    const record = buildRecord();
    record.attorneys.push({
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
    });

    const envelope = buildUfmMetadata({
      record,
      provenance: buildProvenance(),
    });

    expect(envelope.ufm_metadata.appearances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Curtis L. Cukjati",
          function: ["EXAMINING_ATTORNEY", "CUSTODIAL_ATTORNEY"],
          representing: "FOR THE DEFENDANT",
        }),
      ]),
    );
  });

  it("uses the case-selected reporter instead of the signed-in profile when a different reporter is chosen", () => {
    const record = buildRecord();
    record.reporter.name.value = "Alternate Reporter";
    record.reporter.name.source = "manual";
    record.reporter.name.confirmed = true;
    record.reporter.cert_number.value = "99887";
    record.reporter.cert_number.confirmed = true;
    record.reporter.firm_registration_number.value = "ALT-1";
    record.reporter.license_expiration.value = "2029-01-01";

    const envelope = buildUfmMetadata({
      record,
      provenance: buildProvenance(),
      reporterProfile: buildReporterProfile(),
    });

    expect(envelope.ufm_metadata.csr_name).toBe("Alternate Reporter");
    expect(envelope.ufm_metadata.csr_license).toBe("99887");
    expect(envelope.field_sources.ufmCsrName).toBe("manual");
    expect(envelope.field_confirmations.ufmCsrName).toBe(true);
  });
});
