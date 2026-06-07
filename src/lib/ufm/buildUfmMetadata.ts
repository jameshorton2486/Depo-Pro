import type { FieldProvenanceRow } from "../../components/conflict/types";
import type { CaseRecord, ExtractedField } from "../../types/case";
import type { ReporterProfile } from "../../types/reporterProfile";
import { REQUIRED_UFM_FIELDS } from "./requiredFields";

type UfmFieldKey =
  | "cause_number"
  | "caption"
  | "court"
  | "judicial_district"
  | "division"
  | "county"
  | "state"
  | "jurisdiction_type"
  | "deponent"
  | "deposition_date"
  | "start_time"
  | "end_time"
  | "address"
  | "location_type"
  | "remote_platform"
  | "noticing_party"
  | "service_type"
  | "parties"
  | "law_firms"
  | "service_date"
  | "served_parties"
  | "service_emails"
  | "reporter_requests"
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
  | "ufmJudicialDistrict"
  | "ufmDivision"
  | "ufmCounty"
  | "ufmState"
  | "ufmJurisdictionType"
  | "ufmDeponent"
  | "ufmDepositionDate"
  | "ufmStartTime"
  | "ufmEndTime"
  | "ufmAddress"
  | "ufmLocationType"
  | "ufmRemotePlatform"
  | "ufmNoticingParty"
  | "ufmServiceType"
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

const FIELD_PATHS: Partial<Record<FieldMapKey, string>> = {
  ufmCause: "caption.case_number",
  ufmCaption: "caption.case_style",
  ufmCourt: "caption.court_name",
  ufmJudicialDistrict: "caption.judicial_district",
  ufmDivision: "caption.division",
  ufmCounty: "caption.county",
  ufmState: "caption.state",
  ufmJurisdictionType: "caption.jurisdiction_type",
  ufmDepositionDate: "session.deposition_date",
  ufmStartTime: "session.start_time",
  ufmEndTime: "session.end_time",
  ufmAddress: "session.location_address",
  ufmLocationType: "session.location_type",
  ufmRemotePlatform: "scheduling.remote_platform",
  ufmNoticingParty: "scheduling.noticing_party",
  ufmServiceType: "scheduling.service_type",
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

function hasValue(field: ExtractedField<string | null>): boolean {
  return normalizeValue(field.value) !== null;
}

function firstPopulatedField(fields: ExtractedField<string | null>[]) {
  return fields.find(hasValue) ?? null;
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

function buildParties(record: CaseRecord) {
  return record.parties.map((party) => ({
    name: normalizeValue(party.name.value),
    role: normalizeValue(party.role.value),
    role_modifier: normalizeValue(party.role_modifier.value),
    entity_type: normalizeValue(party.entity_type.value),
    fka_or_dba: normalizeValue(party.fka_or_dba.value),
  }));
}

function buildLawFirms(record: CaseRecord) {
  return record.law_firms.map((lawFirm) => ({
    name: normalizeValue(lawFirm.name.value),
    address: normalizeValue(lawFirm.address.value),
    city: normalizeValue(lawFirm.city.value),
    state: normalizeValue(lawFirm.state.value),
    zip: normalizeValue(lawFirm.zip.value),
    phone: normalizeValue(lawFirm.phone.value),
    fax: normalizeValue(lawFirm.fax.value),
    email: normalizeValue(lawFirm.email.value),
    represented_party: normalizeValue(lawFirm.represented_party.value),
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
  reporterProfile?: ReporterProfile | null;
  computedAt?: string;
}): UfmMetadataEnvelope {
  const { record, provenance, reporterProfile = null } = args;
  const computedAt = args.computedAt ?? new Date().toISOString();
  const address = joinLocation(record);
  const caption = normalizeValue(record.caption.case_style.value) ?? normalizeValue(record.caption.case_name.value);
  const deponent = deponentName(record);
  const depositionDate = normalizeValue(record.session.deposition_date.value);
  const dateParts = computeDateParts(depositionDate);
  const requestingPartyField = hasValue(record.scheduling.noticing_party) ? record.scheduling.noticing_party : null;
  const custodialAttorneyField = firstPopulatedField([
    record.scheduling.ordered_by,
    record.scheduling.scheduler,
    record.scheduling.scheduling_contact,
  ]);

  const ufm_metadata: UfmMetadataEnvelope["ufm_metadata"] = {
    cause_number: normalizeValue(record.caption.case_number.value),
    caption,
    court: normalizeValue(record.caption.court_name.value),
    judicial_district: normalizeValue(record.caption.judicial_district.value),
    division: normalizeValue(record.caption.division.value),
    county: normalizeValue(record.caption.county.value),
    state: normalizeValue(record.caption.state.value) ?? normalizeValue(record.session.location_state.value) ?? "Texas",
    jurisdiction_type: normalizeValue(record.caption.jurisdiction_type.value),
    deponent,
    deposition_date: depositionDate,
    start_time: normalizeValue(record.session.start_time.value),
    end_time: normalizeValue(record.session.end_time.value),
    address,
    location_type: normalizeValue(record.session.location_type.value),
    remote_platform: normalizeValue(record.scheduling.remote_platform.value) ?? normalizeValue(record.session.remote_platform.value),
    noticing_party: normalizeValue(record.scheduling.noticing_party.value),
    service_type: normalizeValue(record.scheduling.service_type.value),
    parties: buildParties(record),
    law_firms: buildLawFirms(record),
    service_date: normalizeValue(record.service.service_date.value),
    served_parties: record.service.served_parties.value,
    service_emails: record.service.service_emails.value,
    reporter_requests: {
      certified_reporter_required: record.reporter_requests.certified_reporter_required.value,
      stenographic_recording: record.reporter_requests.stenographic_recording.value,
      audiovisual_recording: record.reporter_requests.audiovisual_recording.value,
      realtime_requested: record.reporter_requests.realtime_requested.value,
      expedited_delivery: record.reporter_requests.expedited_delivery.value,
      rush_delivery: record.reporter_requests.rush_delivery.value,
      daily_copy: record.reporter_requests.daily_copy.value,
      rough_draft: record.reporter_requests.rough_draft.value,
    },
    csr_name: normalizeValue(reporterProfile?.display_name) ?? normalizeValue(record.reporter.name.value),
    csr_license: normalizeValue(reporterProfile?.csr_number) ?? normalizeValue(record.reporter.cert_number.value),
    firm_registration:
      normalizeValue(reporterProfile?.firm_registration_number) ?? normalizeValue(record.reporter.firm_registration_number.value),
    csr_cert_expiration: normalizeValue(reporterProfile?.csr_cert_expiration) ?? normalizeValue(record.reporter.license_expiration.value),
    custodial_attorney: normalizeValue(custodialAttorneyField?.value),
    requesting_party: normalizeValue(requestingPartyField?.value),
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
    ufmJudicialDistrict: mapFieldSource(record.caption.judicial_district, sourceForPath(provenance, "caption.judicial_district")),
    ufmDivision: mapFieldSource(record.caption.division, sourceForPath(provenance, "caption.division")),
    ufmCounty: mapFieldSource(record.caption.county, sourceForPath(provenance, "caption.county")),
    ufmState: mapFieldSource(record.caption.state, sourceForPath(provenance, "caption.state")),
    ufmJurisdictionType: mapFieldSource(record.caption.jurisdiction_type, sourceForPath(provenance, "caption.jurisdiction_type")),
    ufmDepositionDate: mapFieldSource(record.session.deposition_date, sourceForPath(provenance, "session.deposition_date")),
    ufmStartTime: mapFieldSource(record.session.start_time, sourceForPath(provenance, "session.start_time")),
    ufmEndTime: mapFieldSource(record.session.end_time, sourceForPath(provenance, "session.end_time")),
    ufmAddress: mapFieldSource(record.session.location_address, sourceForPath(provenance, "session.location_address")),
    ufmLocationType: mapFieldSource(record.session.location_type, sourceForPath(provenance, "session.location_type")),
    ufmRemotePlatform: mapFieldSource(record.scheduling.remote_platform, sourceForPath(provenance, "scheduling.remote_platform")),
    ufmNoticingParty: mapFieldSource(record.scheduling.noticing_party, sourceForPath(provenance, "scheduling.noticing_party")),
    ufmServiceType: mapFieldSource(record.scheduling.service_type, sourceForPath(provenance, "scheduling.service_type")),
    ufmCsrName: reporterProfile ? "profile" : mapFieldSource(record.reporter.name, "manual"),
    ufmCsrLicense: reporterProfile ? "profile" : mapFieldSource(record.reporter.cert_number, "profile"),
    ufmFirmRegistration: reporterProfile ? "profile" : mapFieldSource(record.reporter.firm_registration_number, "profile"),
    ufmCsrCertExpiration: reporterProfile ? "profile" : mapFieldSource(record.reporter.license_expiration, "profile"),
    ufmCustodialAttorney: custodialAttorneyField
      ? mapFieldSource(
          custodialAttorneyField,
          sourceForPath(
            provenance,
            custodialAttorneyField === record.scheduling.ordered_by
              ? "scheduling.ordered_by"
              : custodialAttorneyField === record.scheduling.scheduler
                ? "scheduling.scheduler"
                : "scheduling.scheduling_contact",
          ),
        )
      : "manual",
    ufmRequestingParty: requestingPartyField
      ? mapFieldSource(requestingPartyField, sourceForPath(provenance, "scheduling.noticing_party"))
      : "manual",
  };

  const field_confirmations: UfmMetadataEnvelope["field_confirmations"] = {
    ufmCause: record.caption.case_number.confirmed,
    ufmCaption: record.caption.case_style.confirmed,
    ufmCourt: record.caption.court_name.confirmed,
    ufmJudicialDistrict: record.caption.judicial_district.confirmed,
    ufmDivision: record.caption.division.confirmed,
    ufmCounty: record.caption.county.confirmed,
    ufmState: record.caption.state.confirmed,
    ufmJurisdictionType: record.caption.jurisdiction_type.confirmed,
    ufmDepositionDate: record.session.deposition_date.confirmed,
    ufmStartTime: record.session.start_time.confirmed,
    ufmEndTime: record.session.end_time.confirmed,
    ufmAddress: record.session.location_address.confirmed,
    ufmLocationType: record.session.location_type.confirmed,
    ufmRemotePlatform: record.scheduling.remote_platform.confirmed,
    ufmNoticingParty: record.scheduling.noticing_party.confirmed,
    ufmServiceType: record.scheduling.service_type.confirmed,
    ufmCsrName: reporterProfile ? true : record.reporter.name.confirmed,
    ufmCsrLicense: reporterProfile ? true : record.reporter.cert_number.confirmed,
    ufmFirmRegistration: reporterProfile ? true : record.reporter.firm_registration_number.confirmed,
    ufmCsrCertExpiration: reporterProfile ? true : record.reporter.license_expiration.confirmed,
    ufmCustodialAttorney: custodialAttorneyField?.confirmed ?? false,
    ufmRequestingParty: requestingPartyField?.confirmed ?? false,
  };

  const missing_required_fields = REQUIRED_UFM_FIELDS
    .filter((field) => {
      const value = ufm_metadata[field.metadataKey];
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return value == null || value === "";
    })
    .map((field) => field.humanName);

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
