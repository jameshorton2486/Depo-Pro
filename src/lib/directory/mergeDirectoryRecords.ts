import type { Contact, ContactDetails, ContactInsert, ContactType } from "../../types/contact";
import { normalizeContactInsert } from "../../types/contact";
import type { Firm, FirmInsert } from "../../types/firm";
import { normalizeFirmInsert } from "../../types/firm";

export interface DirectoryMergeConflict {
  field: string;
  existingValue: string;
  incomingValue: string;
}

export interface ContactUpsertDecision {
  contact?: Contact;
  payload?: ContactInsert;
  conflicts: DirectoryMergeConflict[];
  created: boolean;
}

export interface FirmUpsertDecision {
  firm?: Firm;
  payload?: FirmInsert;
  conflicts: DirectoryMergeConflict[];
  created: boolean;
}

function normalizeLookupName(value: string): string {
  return value
    .trim()
    .replace(/\./g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function asComparableString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return value.join("|");
  }
  return "";
}

function pushConflict(
  conflicts: DirectoryMergeConflict[],
  field: string,
  existingValue: unknown,
  incomingValue: unknown,
) {
  const existing = asComparableString(existingValue);
  const incoming = asComparableString(incomingValue);
  if (!existing || !incoming || existing === incoming) {
    return;
  }
  conflicts.push({ field, existingValue: existing, incomingValue: incoming });
}

function buildMergedDetails(type: ContactType, existing: ContactDetails, incoming: ContactDetails) {
  const conflicts: DirectoryMergeConflict[] = [];
  const existingRecord = existing as unknown as Record<string, unknown>;
  const incomingRecord = incoming as unknown as Record<string, unknown>;
  const merged = { ...existingRecord };

  const keys = Object.keys(incomingRecord).filter((key) => key !== "kind");
  for (const key of keys) {
    const existingValue = existingRecord[key];
    const incomingValue = incomingRecord[key];
    pushConflict(conflicts, `details.${key}`, existingValue, incomingValue);
    if (conflicts.some((entry) => entry.field === `details.${key}`)) {
      continue;
    }
    const existingComparable = asComparableString(existingValue);
    const incomingComparable = asComparableString(incomingValue);
    if (!existingComparable && incomingComparable) {
      merged[key] = incomingValue;
    }
  }

  return { merged: (type === "firm" ? existingRecord : merged) as unknown as ContactDetails, conflicts };
}

export function decideDirectoryContactUpsert(existingContacts: Contact[], candidate: ContactInsert): ContactUpsertDecision {
  const normalized = normalizeContactInsert(candidate);
  const existing = existingContacts.find(
    (contact) => contact.type === normalized.type && normalizeLookupName(contact.name) === normalizeLookupName(normalized.name),
  );

  if (!existing) {
    return {
      payload: normalized,
      conflicts: [],
      created: true,
    };
  }

  const conflicts: DirectoryMergeConflict[] = [];
  const mergedDetails = buildMergedDetails(normalized.type, existing.details, normalized.details);
  conflicts.push(...mergedDetails.conflicts);

  pushConflict(conflicts, "organization", existing.organization, normalized.organization);
  pushConflict(conflicts, "phone", existing.phone, normalized.phone);
  pushConflict(conflicts, "email", existing.email, normalized.email);
  pushConflict(conflicts, "address", existing.address, normalized.address);
  pushConflict(conflicts, "notes", existing.notes, normalized.notes);
  pushConflict(conflicts, "firm_id", existing.firm_id, normalized.firm_id);

  if (conflicts.length > 0) {
    return {
      contact: existing,
      conflicts,
      created: false,
    };
  }

  return {
    contact: {
      ...existing,
      organization: existing.organization || normalized.organization,
      phone: existing.phone || normalized.phone,
      email: existing.email || normalized.email,
      address: existing.address || normalized.address,
      notes: existing.notes || normalized.notes,
      firm_id: existing.firm_id ?? normalized.firm_id,
      details: mergedDetails.merged,
    },
    conflicts: [],
    created: false,
  };
}

export function decideFirmUpsert(existingFirms: Firm[], candidate: FirmInsert): FirmUpsertDecision {
  const normalized = normalizeFirmInsert(candidate);
  const existing = existingFirms.find((firm) => normalizeLookupName(firm.name) === normalizeLookupName(normalized.name));

  if (!existing) {
    return {
      payload: normalized,
      conflicts: [],
      created: true,
    };
  }

  const conflicts: DirectoryMergeConflict[] = [];
  pushConflict(conflicts, "address", existing.address, normalized.address);
  pushConflict(conflicts, "city", existing.city, normalized.city);
  pushConflict(conflicts, "state", existing.state, normalized.state);
  pushConflict(conflicts, "zip", existing.zip, normalized.zip);
  pushConflict(conflicts, "main_phone", existing.main_phone, normalized.main_phone);
  pushConflict(conflicts, "fax", existing.fax, normalized.fax);

  if (conflicts.length > 0) {
    return {
      firm: existing,
      conflicts,
      created: false,
    };
  }

  return {
    firm: {
      ...existing,
      address: existing.address || normalized.address,
      city: existing.city || normalized.city,
      state: existing.state || normalized.state,
      zip: existing.zip || normalized.zip,
      main_phone: existing.main_phone || normalized.main_phone,
      fax: existing.fax || normalized.fax,
    },
    conflicts: [],
    created: false,
  };
}
