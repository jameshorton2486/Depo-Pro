import type { CaseRecord } from "../../types/case";

export interface UfmRequiredField {
  metadataKey:
    | "cause_number"
    | "court"
    | "county"
    | "state"
    | "deposition_date"
    | "csr_name"
    | "csr_license"
    | "custodial_attorney";
  fieldPath: string;
  humanName: string;
  ufmSection: string;
}

export interface UfmRequiredFieldStatus extends UfmRequiredField {
  missing: boolean;
}

// TODO(prompt 5C follow-up): migrate readiness/banner required-field semantics to this module.
export const REQUIRED_UFM_FIELDS = [
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
] as const satisfies ReadonlyArray<UfmRequiredField>;

function fieldPathSegments(path: string): string[] {
  return path
    .split(".")
    .flatMap((segment) => {
      const match = segment.match(/^([^[]+)\[(\d+)\]$/);
      return match ? [match[1], match[2]] : [segment];
    });
}

function readFieldValue(record: CaseRecord, path: string): unknown {
  let current: unknown = record;
  for (const segment of fieldPathSegments(path)) {
    if (current == null || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (!current || typeof current !== "object" || !("value" in current)) {
    return current;
  }

  return (current as { value?: unknown }).value ?? null;
}

function isMissingValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

export function getRequiredUfmFieldStatuses(record: CaseRecord): UfmRequiredFieldStatus[] {
  return REQUIRED_UFM_FIELDS.map((field) => ({
    ...field,
    missing: isMissingValue(readFieldValue(record, field.fieldPath)),
  }));
}

export function getMissingRequiredUfmFields(record: CaseRecord): UfmRequiredFieldStatus[] {
  return getRequiredUfmFieldStatuses(record).filter((field) => field.missing);
}

export function isCaseUfmReady(record: CaseRecord): boolean {
  return getMissingRequiredUfmFields(record).length === 0;
}
