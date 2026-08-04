import type { FieldProvenanceMap } from "../lib/canonical/FieldResult";

export type ContactType =
  | "attorney"
  | "interpreter"
  | "videographer"
  | "participant"
  | "firm"
  | "reporter"
  | "scheduler"
  | "paralegal"
  | "legal_assistant"
  | "records_custodian"
  | "corporate_representative";

export interface AttorneyContactDetails {
  kind: "attorney";
  bar_number: string | null;
  direct_phone: string | null;
  extension: string | null;
  fax: string | null;
  assistant_name: string | null;
  assistant_email: string | null;
  preferred_appearance_label: string | null;
}

export interface ReporterContactDetails {
  kind: "reporter";
  csr_number: string | null;
  csr_cert_expiration: string | null;
  firm_registration_number: string | null;
}

export interface InterpreterContactDetails {
  kind: "interpreter";
  certified: boolean;
  cert_number: string | null;
  certification_authority: string | null;
  certification_expiration: string | null;
  remote_capable: boolean;
  agency: string | null;
  agency_contact: string | null;
  default_languages: string[];
}

export interface VideographerContactDetails {
  kind: "videographer";
  cert_number: string | null;
  role_title: string | null;
}

export interface GenericParticipantContactDetails {
  kind:
    | "participant"
    | "firm"
    | "scheduler"
    | "paralegal"
    | "legal_assistant"
    | "records_custodian"
    | "corporate_representative";
}

export type ContactDetails =
  | AttorneyContactDetails
  | ReporterContactDetails
  | InterpreterContactDetails
  | VideographerContactDetails
  | GenericParticipantContactDetails;

export interface Contact {
  id: string;
  type: ContactType;
  name: string;
  organization: string;
  phone: string;
  email: string;
  address: string;
  times_used: number;
  notes: string;
  firm_id: string | null;
  details: ContactDetails;
  // CANON-RAW-001 (RAW-D): governed-field provenance (name/organization/phone).
  provenance?: FieldProvenanceMap;
  created_at: string;
  updated_at: string;
}

export type ContactInsert =
  Omit<Contact, "id" | "times_used" | "created_at" | "updated_at" | "details" | "firm_id">
  & {
    details?: unknown;
    firm_id?: string | null;
  };

export type ContactUpdate =
  Partial<Omit<Contact, "id" | "created_at" | "updated_at" | "times_used" | "details">>
  & {
    details?: unknown;
  };

type RawContactRow = Omit<Contact, "details" | "firm_id"> & {
  details?: unknown;
  firm_id?: unknown;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function emptyGenericDetails(kind: GenericParticipantContactDetails["kind"]): GenericParticipantContactDetails {
  return { kind };
}

export function emptyContactDetails(type: ContactType): ContactDetails {
  switch (type) {
    case "attorney":
      return {
        kind: "attorney",
        bar_number: null,
        direct_phone: null,
        extension: null,
        fax: null,
        assistant_name: null,
        assistant_email: null,
        preferred_appearance_label: null,
      };
    case "reporter":
      return {
        kind: "reporter",
        csr_number: null,
        csr_cert_expiration: null,
        firm_registration_number: null,
      };
    case "interpreter":
      return {
        kind: "interpreter",
        certified: false,
        cert_number: null,
        certification_authority: null,
        certification_expiration: null,
        remote_capable: false,
        agency: null,
        agency_contact: null,
        default_languages: [],
      };
    case "videographer":
      return {
        kind: "videographer",
        cert_number: null,
        role_title: null,
      };
    case "participant":
    case "firm":
    case "scheduler":
    case "paralegal":
    case "legal_assistant":
    case "records_custodian":
    case "corporate_representative":
      return emptyGenericDetails(type);
  }
}

export function normalizeContactDetails(type: ContactType, raw: unknown): ContactDetails {
  const details = asRecord(raw);
  const defaults = emptyContactDetails(type);

  if (!details) {
    return defaults;
  }

  switch (type) {
    case "attorney":
      return {
        kind: "attorney",
        bar_number: normalizeNullableString(details.bar_number),
        direct_phone: normalizeNullableString(details.direct_phone),
        extension: normalizeNullableString(details.extension),
        fax: normalizeNullableString(details.fax),
        assistant_name: normalizeNullableString(details.assistant_name),
        assistant_email: normalizeNullableString(details.assistant_email),
        preferred_appearance_label: normalizeNullableString(details.preferred_appearance_label),
      };
    case "reporter":
      return {
        kind: "reporter",
        csr_number: normalizeNullableString(details.csr_number),
        csr_cert_expiration: normalizeNullableString(details.csr_cert_expiration),
        firm_registration_number: normalizeNullableString(details.firm_registration_number),
      };
    case "interpreter":
      return {
        kind: "interpreter",
        certified: normalizeBoolean(details.certified),
        cert_number: normalizeNullableString(details.cert_number),
        certification_authority: normalizeNullableString(details.certification_authority),
        certification_expiration: normalizeNullableString(details.certification_expiration),
        remote_capable: normalizeBoolean(details.remote_capable),
        agency: normalizeNullableString(details.agency),
        agency_contact: normalizeNullableString(details.agency_contact),
        default_languages: normalizeStringArray(details.default_languages),
      };
    case "videographer":
      return {
        kind: "videographer",
        cert_number: normalizeNullableString(details.cert_number),
        role_title: normalizeNullableString(details.role_title),
      };
    case "participant":
    case "firm":
    case "scheduler":
    case "paralegal":
    case "legal_assistant":
    case "records_custodian":
    case "corporate_representative":
      return emptyGenericDetails(type);
  }
}

export function normalizeContactRow(row: RawContactRow): Contact {
  return {
    id: row.id,
    type: row.type,
    name: normalizeString(row.name),
    organization: normalizeString(row.organization),
    phone: normalizeString(row.phone),
    email: normalizeString(row.email),
    address: normalizeString(row.address),
    times_used: typeof row.times_used === "number" ? row.times_used : 0,
    notes: normalizeString(row.notes),
    firm_id: typeof row.firm_id === "string" && row.firm_id.trim() ? row.firm_id : null,
    details: normalizeContactDetails(row.type, row.details),
    ...(row.provenance && typeof row.provenance === "object"
      ? { provenance: row.provenance as FieldProvenanceMap }
      : {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeContactInsert(payload: ContactInsert): Omit<Contact, "id" | "times_used" | "created_at" | "updated_at"> {
  return {
    type: payload.type,
    name: normalizeString(payload.name),
    organization: normalizeString(payload.organization),
    phone: normalizeString(payload.phone),
    email: normalizeString(payload.email),
    address: normalizeString(payload.address),
    notes: normalizeString(payload.notes),
    firm_id: typeof payload.firm_id === "string" && payload.firm_id.trim() ? payload.firm_id : null,
    details: normalizeContactDetails(payload.type, payload.details),
  };
}

export function normalizeContactUpdate(
  type: ContactType,
  patch: ContactUpdate,
): Partial<Omit<Contact, "id" | "created_at" | "updated_at" | "times_used">> {
  const normalized: Partial<Omit<Contact, "id" | "created_at" | "updated_at" | "times_used">> = {};

  if ("type" in patch && patch.type) normalized.type = patch.type;
  if ("name" in patch) normalized.name = normalizeString(patch.name);
  if ("organization" in patch) normalized.organization = normalizeString(patch.organization);
  if ("phone" in patch) normalized.phone = normalizeString(patch.phone);
  if ("email" in patch) normalized.email = normalizeString(patch.email);
  if ("address" in patch) normalized.address = normalizeString(patch.address);
  if ("notes" in patch) normalized.notes = normalizeString(patch.notes);
  if ("firm_id" in patch) normalized.firm_id = typeof patch.firm_id === "string" && patch.firm_id.trim() ? patch.firm_id : null;
  if ("details" in patch) normalized.details = normalizeContactDetails(type, patch.details);

  return normalized;
}
