import type { FieldProvenanceRow } from "../../components/conflict/types";
import type { CaseRecord, ExtractedField } from "../../types/case";
import type { Contact, ContactType } from "../../types/contact";
import type { Firm } from "../../types/firm";
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

interface UfmAppearance {
  category: string;
  name: string | null;
  firm?: string | null;
  role?: string | null;
  representing?: string | null;
  bar_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  function?: string | string[] | null;
  time_used?: string | null;
  appearance_label?: string | null;
  certified?: boolean | null;
  cert_number?: string | null;
  certification_authority?: string | null;
  certification_expiration?: string | null;
  agency?: string | null;
  agency_contact?: string | null;
  language_from?: string | null;
  language_to?: string | null;
  oath_administered?: boolean | null;
  role_title?: string | null;
  role_in_this_proceeding?: string | null;
  organization?: string | null;
}

interface UfmLawFirm {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  represented_party: string | null;
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

function normalizeIdentity(value: string | null | undefined): string | null {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }
  return normalized.replace(/\./g, "").toLowerCase();
}

function normalizeAttorneyFunctionValue(value: string | string[] | null | undefined): string | string[] | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? [...value] : null;
  }

  return normalizeValue(value);
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

function hasCustodialAttorneyFunction(field: string | string[] | null | undefined): boolean {
  if (Array.isArray(field)) {
    return field.includes("CUSTODIAL_ATTORNEY");
  }
  return field === "CUSTODIAL_ATTORNEY";
}

function findCustodialAttorneyField(record: CaseRecord) {
  const attorney = record.attorneys.find((candidate) => hasCustodialAttorneyFunction(candidate.function?.value));
  return attorney?.name ?? null;
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

function findDirectoryContact(
  directoryContacts: Contact[],
  type: ContactType,
  name: string | null,
): Contact | null {
  const lookup = normalizeIdentity(name);
  if (!lookup) {
    return null;
  }

  return directoryContacts.find((contact) => contact.type === type && normalizeIdentity(contact.name) === lookup) ?? null;
}

function findDirectoryFirm(directoryFirms: Firm[], name: string | null): Firm | null {
  const lookup = normalizeIdentity(name);
  if (!lookup) {
    return null;
  }

  return directoryFirms.find((firm) => normalizeIdentity(firm.name) === lookup) ?? null;
}

function resolveReporterProfileUsage(record: CaseRecord, reporterProfile: ReporterProfile | null) {
  if (!reporterProfile) {
    return null;
  }

  if (record.reporter.name.source === "imported") {
    return reporterProfile;
  }

  const recordReporterName = normalizeValue(record.reporter.name.value);
  const profileName = normalizeValue(reporterProfile.display_name);
  if (!recordReporterName) {
    return reporterProfile;
  }

  return normalizeIdentity(recordReporterName) === normalizeIdentity(profileName) ? reporterProfile : null;
}

function buildAppearances(record: CaseRecord, directoryContacts: Contact[]): UfmAppearance[] {
  const attorneyAppearances = record.attorneys.map((attorney) => {
    const contact = findDirectoryContact(directoryContacts, "attorney", attorney.name.value);
    const details = contact?.details.kind === "attorney" ? contact.details : null;

    return {
      category: "attorney",
      name: normalizeValue(attorney.name.value),
      firm: normalizeValue(attorney.firm.value),
      role: normalizeValue(attorney.role.value),
      representing: normalizeValue(attorney.representing.value),
      bar_number: normalizeValue(attorney.bar_number.value) ?? details?.bar_number ?? null,
      phone: normalizeValue(attorney.phone) ?? normalizeValue(details?.direct_phone) ?? normalizeValue(contact?.phone),
      email: normalizeValue(attorney.email) ?? normalizeValue(contact?.email),
      address: normalizeValue(attorney.address),
      city: normalizeValue(attorney.city),
      state: normalizeValue(attorney.state),
      zip: normalizeValue(attorney.zip),
      function: normalizeAttorneyFunctionValue(attorney.function?.value ?? attorney.role.value),
      time_used: normalizeValue(attorney.time_used),
      appearance_label: normalizeValue(details?.preferred_appearance_label),
    };
  });

  const interpreterAppearances = record.interpreters.map((interpreter) => {
    const contact = findDirectoryContact(directoryContacts, "interpreter", interpreter.name.value);
    const details = contact?.details.kind === "interpreter" ? contact.details : null;

    return {
      category: "interpreter",
      name: normalizeValue(interpreter.name.value),
      role: "INTERPRETER",
      certified: interpreter.certified || details?.certified || false,
      cert_number: normalizeValue(interpreter.cert_number) ?? details?.cert_number ?? null,
      certification_authority: normalizeValue(details?.certification_authority),
      certification_expiration: normalizeValue(details?.certification_expiration),
      agency: normalizeValue(interpreter.agency) ?? normalizeValue(details?.agency) ?? normalizeValue(contact?.organization),
      agency_contact: normalizeValue(details?.agency_contact),
      language_from: normalizeValue(interpreter.language_from),
      language_to: normalizeValue(interpreter.language_to),
      oath_administered: interpreter.oath_administered,
      phone: normalizeValue(interpreter.phone) ?? normalizeValue(contact?.phone),
      email: normalizeValue(interpreter.email) ?? normalizeValue(contact?.email),
    };
  });

  const videographerAppearances = record.videographers.map((videographer) => {
    const contact = findDirectoryContact(directoryContacts, "videographer", videographer.name.value);
    const details = contact?.details.kind === "videographer" ? contact.details : null;

    return {
      category: "videographer",
      name: normalizeValue(videographer.name.value),
      firm: normalizeValue(videographer.firm.value),
      role: "VIDEOGRAPHER",
      cert_number: normalizeValue(videographer.cert_number) ?? normalizeValue(details?.cert_number),
      role_title: normalizeValue(videographer.role_title) ?? normalizeValue(details?.role_title),
      phone: normalizeValue(videographer.phone) ?? normalizeValue(contact?.phone),
      email: normalizeValue(videographer.email) ?? normalizeValue(contact?.email),
    };
  });

  const participantTypeByRole: Partial<Record<CaseRecord["participants"][number]["role"], ContactType>> = {
    PARALEGAL: "paralegal",
    OTHER: "participant",
  };

  const participantAppearances = record.participants.map((participant) => {
    const directoryType = participantTypeByRole[participant.role] ?? "participant";
    const contact = findDirectoryContact(directoryContacts, directoryType, participant.name.value);

    return {
      category: "participant",
      name: normalizeValue(participant.name.value),
      role: normalizeValue(participant.role),
      organization: normalizeValue(participant.organization) ?? normalizeValue(contact?.organization),
      email: normalizeValue(participant.email) ?? normalizeValue(contact?.email),
      phone: normalizeValue(participant.phone) ?? normalizeValue(contact?.phone),
      role_in_this_proceeding: normalizeValue(participant.role_in_this_proceeding),
    };
  });

  return [...attorneyAppearances, ...interpreterAppearances, ...videographerAppearances, ...participantAppearances];
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

function buildLawFirms(record: CaseRecord, directoryFirms: Firm[]): UfmLawFirm[] {
  const explicitLawFirms = record.law_firms.map((lawFirm) => ({
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

  const derivedAttorneyFirms: UfmLawFirm[] = [];
  for (const attorney of record.attorneys) {
    const firmName = normalizeValue(attorney.firm.value);
    if (!firmName) {
      continue;
    }

    const directoryFirm = findDirectoryFirm(directoryFirms, firmName);
    derivedAttorneyFirms.push({
      name: firmName,
      address: normalizeValue(directoryFirm?.address) ?? normalizeValue(attorney.address),
      city: normalizeValue(directoryFirm?.city) ?? normalizeValue(attorney.city),
      state: normalizeValue(directoryFirm?.state) ?? normalizeValue(attorney.state),
      zip: normalizeValue(directoryFirm?.zip) ?? normalizeValue(attorney.zip),
      phone: normalizeValue(directoryFirm?.main_phone),
      fax: normalizeValue(directoryFirm?.fax),
      email: null,
      represented_party: normalizeValue(attorney.representing.value),
    });
  }

  const derivedVideographerFirms: UfmLawFirm[] = [];
  for (const videographer of record.videographers) {
    const firmName = normalizeValue(videographer.firm.value);
    if (!firmName) {
      continue;
    }

    const directoryFirm = findDirectoryFirm(directoryFirms, firmName);
    derivedVideographerFirms.push({
      name: firmName,
      address: normalizeValue(directoryFirm?.address),
      city: normalizeValue(directoryFirm?.city),
      state: normalizeValue(directoryFirm?.state),
      zip: normalizeValue(directoryFirm?.zip),
      phone: normalizeValue(directoryFirm?.main_phone),
      fax: normalizeValue(directoryFirm?.fax),
      email: null,
      represented_party: null,
    });
  }

  const merged = new Map<string, UfmLawFirm>();
  for (const firm of [...explicitLawFirms, ...derivedAttorneyFirms, ...derivedVideographerFirms]) {
    const key = normalizeIdentity(firm.name);
    if (!key) {
      continue;
    }

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, firm);
      continue;
    }

    merged.set(key, {
      name: existing.name ?? firm.name,
      address: existing.address ?? firm.address,
      city: existing.city ?? firm.city,
      state: existing.state ?? firm.state,
      zip: existing.zip ?? firm.zip,
      phone: existing.phone ?? firm.phone,
      fax: existing.fax ?? firm.fax,
      email: existing.email ?? firm.email,
      represented_party: existing.represented_party ?? firm.represented_party,
    });
  }

  return Array.from(merged.values());
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
  directoryContacts?: Contact[];
  directoryFirms?: Firm[];
  computedAt?: string;
}): UfmMetadataEnvelope {
  const { record, provenance, reporterProfile = null, directoryContacts = [], directoryFirms = [] } = args;
  const computedAt = args.computedAt ?? new Date().toISOString();
  const effectiveReporterProfile = resolveReporterProfileUsage(record, reporterProfile);
  const address = joinLocation(record);
  const caption = normalizeValue(record.caption.case_style.value) ?? normalizeValue(record.caption.case_name.value);
  const deponent = deponentName(record);
  const depositionDate = normalizeValue(record.session.deposition_date.value);
  const dateParts = computeDateParts(depositionDate);
  const requestingPartyField = hasValue(record.scheduling.noticing_party) ? record.scheduling.noticing_party : null;
  const custodialAttorneyField = findCustodialAttorneyField(record);

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
    law_firms: buildLawFirms(record, directoryFirms),
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
    csr_name: normalizeValue(effectiveReporterProfile?.display_name) ?? normalizeValue(record.reporter.name.value),
    csr_license: normalizeValue(effectiveReporterProfile?.csr_number) ?? normalizeValue(record.reporter.cert_number.value),
    firm_registration:
      normalizeValue(effectiveReporterProfile?.firm_registration_number) ?? normalizeValue(record.reporter.firm_registration_number.value),
    csr_cert_expiration:
      normalizeValue(effectiveReporterProfile?.csr_cert_expiration) ?? normalizeValue(record.reporter.license_expiration.value),
    custodial_attorney: normalizeValue(custodialAttorneyField?.value),
    requesting_party: normalizeValue(requestingPartyField?.value),
    appearances: buildAppearances(record, directoryContacts),
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
    ufmCsrName: effectiveReporterProfile ? "profile" : mapFieldSource(record.reporter.name, "manual"),
    ufmCsrLicense: effectiveReporterProfile ? "profile" : mapFieldSource(record.reporter.cert_number, "profile"),
    ufmFirmRegistration: effectiveReporterProfile ? "profile" : mapFieldSource(record.reporter.firm_registration_number, "profile"),
    ufmCsrCertExpiration: effectiveReporterProfile ? "profile" : mapFieldSource(record.reporter.license_expiration, "profile"),
    ufmCustodialAttorney: custodialAttorneyField
      ? mapFieldSource(custodialAttorneyField, "manual")
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
    ufmCsrName: effectiveReporterProfile ? true : record.reporter.name.confirmed,
    ufmCsrLicense: effectiveReporterProfile ? true : record.reporter.cert_number.confirmed,
    ufmFirmRegistration: effectiveReporterProfile ? true : record.reporter.firm_registration_number.confirmed,
    ufmCsrCertExpiration: effectiveReporterProfile ? true : record.reporter.license_expiration.confirmed,
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
