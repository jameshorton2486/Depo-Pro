import type { FieldProvenanceRow } from "../../components/conflict/types";
import type { CaseRecord, ExtractedField } from "../../types/case";

type UfmFieldKey =
  | "cause_number"
  | "caption"
  | "court"
  | "county"
  | "state"
  | "deponent"
  | "deposition_date"
  | "start_time"
  | "end_time"
  | "address"
  | "csr_name"
  | "csr_license"
  | "firm_registration"
  | "csr_cert_expiration"
  | "custodial_attorney"
  | "requesting_party"
  | "appearances"
  | "volume"
  | "proceedings_month"
  | "proceedings_day"
  | "proceedings_year";

type FieldMapKey =
  | "ufmCause"
  | "ufmCaption"
  | "ufmCourt"
  | "ufmCounty"
  | "ufmState"
  | "ufmDeponent"
  | "ufmDepositionDate"
  | "ufmStartTime"
  | "ufmEndTime"
  | "ufmAddress"
  | "ufmCsrName"
  | "ufmCsrLicense"
  | "ufmFirmRegistration"
  | "ufmCsrCertExpiration"
  | "ufmCustodialAttorney"
  | "ufmRequestingParty";

type FieldSourceValue = "nod_parser" | "job_sheet" | "manual" | "profile" | "computed";

export interface UfmMetadataEnvelope {
  case_id: string;
  computed_at: string;
  ufm_metadata: Record<UfmFieldKey, unknown>;
  field_sources: Partial<Record<FieldMapKey, FieldSourceValue>>;
  field_confirmations: Partial<Record<FieldMapKey, boolean>>;
  missing_required_fields: string[];
}

const REQUIRED_FIELDS: Array<{ key: UfmFieldKey; label: string }> = [
  { key: "cause_number", label: "Cause Number" },
  { key: "court", label: "Court" },
  { key: "county", label: "County" },
  { key: "state", label: "State" },
  { key: "deposition_date", label: "Deposition Date" },
  { key: "csr_name", label: "Reporter Name" },
  { key: "csr_license", label: "CSR License Number" },
  { key: "custodial_attorney", label: "Custodial Attorney Name" },
];

const FIELD_PATHS: Partial<Record<FieldMapKey, string>> = {
  ufmCause: "caption.case_number",
  ufmCaption: "caption.case_style",
  ufmCourt: "caption.court_name",
  ufmCounty: "caption.county",
  ufmState: "session.location_state",
  ufmDepositionDate: "session.deposition_date",
  ufmStartTime: "session.start_time",
  ufmEndTime: "session.end_time",
  ufmAddress: "session.location_address",
  ufmCsrName: "reporter.name",
  ufmCsrLicense: "reporter.cert_number",
  ufmFirmRegistration: "reporter.firm_registration_number",
  ufmCsrCertExpiration: "reporter.license_expiration",
};

function sourceForPath(provenance: FieldProvenanceRow[], path: string): FieldSourceValue {
  const row = provenance.find((entry) => entry.field_path === path);
  if (!row) {
    return "manual";
  }
  if (row.source === "Notice") {
    return "nod_parser";
  }
  if (row.source === "Job Sheet") {
    return "job_sheet";
  }
  if (row.source === "Reporter Profile") {
    return "profile";
  }
  return "manual";
}

function normalizeValue(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  return normalized || null;
}

function mapFieldSource(field: ExtractedField<unknown>, fallback: FieldSourceValue): FieldSourceValue {
  if (field.source === "imported") {
    return "profile";
  }
  if (field.source === "manual") {
    return fallback === "manual" ? "manual" : fallback;
  }
  return fallback;
}

function joinLocation(record: CaseRecord): string | null {
  const parts = [
    normalizeValue(record.session.location_address.value),
    normalizeValue(record.session.location_city.value),
    normalizeValue(record.session.location_state.value),
    normalizeValue(record.session.location_zip.value),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function deponentName(record: CaseRecord): string | null {
  if (record.witnesses.length > 0) {
    return record.witnesses.map((witness) => normalizeValue(witness.name.value)).filter(Boolean).join("; ") || null;
  }
  return normalizeValue(record.caption.case_name.value) ?? normalizeValue(record.caption.case_style.value);
}

function buildAppearances(record: CaseRecord) {
  return record.attorneys.map((attorney) => ({
    name: normalizeValue(attorney.name.value),
    firm: normalizeValue(attorney.firm.value),
    role: normalizeValue(attorney.role.value),
    representing: normalizeValue(attorney.representing.value),
    phone: normalizeValue(attorney.phone),
    email: normalizeValue(attorney.email),
  }));
}

function computeDateParts(dateValue: string | null) {
  if (!dateValue) {
    return {
      proceedings_month: null,
      proceedings_day: null,
      proceedings_year: null,
    };
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return {
      proceedings_month: null,
      proceedings_day: null,
      proceedings_year: null,
    };
  }

  return {
    proceedings_month: parsed.toLocaleString("en-US", { month: "long" }),
    proceedings_day: String(parsed.getUTCDate()),
    proceedings_year: String(parsed.getUTCFullYear()),
  };
}

export function summarizeUfmEnvelope(envelope: UfmMetadataEnvelope) {
  const populated = Object.values(envelope.ufm_metadata).filter((value) => {
    if (value == null) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== "";
  }).length;

  const awaitingConfirmation = Object.values(envelope.field_confirmations).filter((confirmed) => confirmed === false).length;

  return {
    populatedCount: populated,
    missingRequiredCount: envelope.missing_required_fields.length,
    awaitingConfirmationCount: awaitingConfirmation,
    summaryLine:
      envelope.missing_required_fields.length > 0
        ? `DRAFT - ${envelope.missing_required_fields.length} required fields missing`
        : `READY - ${awaitingConfirmation} awaiting confirmation`,
  };
}

export function buildUfmMetadata(args: {
  record: CaseRecord;
  provenance: FieldProvenanceRow[];
  computedAt?: string;
}): UfmMetadataEnvelope {
  const { record, provenance } = args;
  const computedAt = args.computedAt ?? new Date().toISOString();
  const address = joinLocation(record);
  const caption = normalizeValue(record.caption.case_style.value) ?? normalizeValue(record.caption.case_name.value);
  const deponent = deponentName(record);
  const depositionDate = normalizeValue(record.session.deposition_date.value);
  const dateParts = computeDateParts(depositionDate);

  const ufm_metadata: UfmMetadataEnvelope["ufm_metadata"] = {
    cause_number: normalizeValue(record.caption.case_number.value),
    caption,
    court: normalizeValue(record.caption.court_name.value),
    county: normalizeValue(record.caption.county.value),
    state: normalizeValue(record.session.location_state.value) ?? "Texas",
    deponent,
    deposition_date: depositionDate,
    start_time: normalizeValue(record.session.start_time.value),
    end_time: normalizeValue(record.session.end_time.value),
    address,
    csr_name: normalizeValue(record.reporter.name.value),
    csr_license: normalizeValue(record.reporter.cert_number.value),
    firm_registration: normalizeValue(record.reporter.firm_registration_number.value),
    csr_cert_expiration: normalizeValue(record.reporter.license_expiration.value),
    custodial_attorney: normalizeValue(record.proceeding.ordering_contact),
    requesting_party: null,
    appearances: buildAppearances(record),
    volume: "1",
    proceedings_month: dateParts.proceedings_month,
    proceedings_day: dateParts.proceedings_day,
    proceedings_year: dateParts.proceedings_year,
  };

  const field_sources: UfmMetadataEnvelope["field_sources"] = {
    ufmCause: mapFieldSource(record.caption.case_number, sourceForPath(provenance, "caption.case_number")),
    ufmCaption: mapFieldSource(record.caption.case_style, sourceForPath(provenance, "caption.case_style")),
    ufmCourt: mapFieldSource(record.caption.court_name, sourceForPath(provenance, "caption.court_name")),
    ufmCounty: mapFieldSource(record.caption.county, sourceForPath(provenance, "caption.county")),
    ufmState: mapFieldSource(record.session.location_state, sourceForPath(provenance, "session.location_state")),
    ufmDepositionDate: mapFieldSource(record.session.deposition_date, sourceForPath(provenance, "session.deposition_date")),
    ufmStartTime: mapFieldSource(record.session.start_time, sourceForPath(provenance, "session.start_time")),
    ufmEndTime: mapFieldSource(record.session.end_time, sourceForPath(provenance, "session.end_time")),
    ufmAddress: mapFieldSource(record.session.location_address, sourceForPath(provenance, "session.location_address")),
    ufmCsrName: mapFieldSource(record.reporter.name, "manual"),
    ufmCsrLicense: mapFieldSource(record.reporter.cert_number, "profile"),
    ufmFirmRegistration: mapFieldSource(record.reporter.firm_registration_number, "profile"),
    ufmCsrCertExpiration: mapFieldSource(record.reporter.license_expiration, "profile"),
    ufmCustodialAttorney: "manual",
    ufmRequestingParty: "manual",
  };

  const field_confirmations: UfmMetadataEnvelope["field_confirmations"] = {
    ufmCause: record.caption.case_number.confirmed,
    ufmCaption: record.caption.case_style.confirmed,
    ufmCourt: record.caption.court_name.confirmed,
    ufmCounty: record.caption.county.confirmed,
    ufmState: record.session.location_state.confirmed,
    ufmDepositionDate: record.session.deposition_date.confirmed,
    ufmStartTime: record.session.start_time.confirmed,
    ufmEndTime: record.session.end_time.confirmed,
    ufmAddress: record.session.location_address.confirmed,
    ufmCsrName: record.reporter.name.confirmed,
    ufmCsrLicense: record.reporter.cert_number.confirmed,
    ufmFirmRegistration: record.reporter.firm_registration_number.confirmed,
    ufmCsrCertExpiration: record.reporter.license_expiration.confirmed,
    ufmCustodialAttorney: false,
    ufmRequestingParty: false,
  };

  const missing_required_fields = REQUIRED_FIELDS
    .filter((field) => {
      const value = ufm_metadata[field.key];
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return value == null || value === "";
    })
    .map((field) => field.label);

  void FIELD_PATHS;

  return {
    case_id: record.case_id,
    computed_at: computedAt,
    ufm_metadata,
    field_sources,
    field_confirmations,
    missing_required_fields,
  };
}
