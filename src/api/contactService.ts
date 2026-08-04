import { getSupabaseClient } from "../lib/supabase";
import { canonicalizePhoneNumber } from "../lib/canonical/PhoneNumberPolicy";
import { ORGANIZATION_POLICY_ID, PERSON_NAME_POLICY_ID, canonicalizeGovernedName } from "../lib/canonical/NamePolicies";
import { canonicalValue, provenanceMap } from "../lib/canonical/FieldResult";
import { isMockMode } from "../lib/runtime/mode";
import {
  createMockContact,
  getMockContact,
  incrementMockContactUsage,
  listMockContacts,
  searchMockContacts,
  updateMockContact,
  upsertMockDirectoryContact,
} from "../mocks/directoryStore";
import { decideDirectoryContactUpsert, type DirectoryMergeConflict } from "../lib/directory/mergeDirectoryRecords";
import {
  normalizeContactInsert,
  normalizeContactRow,
  normalizeContactUpdate,
  type Contact,
  type ContactInsert,
  type ContactType,
  type ContactUpdate,
} from "../types/contact";

function normalizePhone(value: string): string {
  return value.trim() ? canonicalValue(canonicalizePhoneNumber(value))! : value;
}

function normalizeContactDetailsForWrite(details: Contact["details"]): Contact["details"] {
  if (details.kind !== "attorney") {
    return details;
  }

  return {
    ...details,
    direct_phone: details.direct_phone ? normalizePhone(details.direct_phone) : details.direct_phone,
    fax: details.fax ? normalizePhone(details.fax) : details.fax,
  };
}

export function canonicalizeContactInsertForWrite(payload: ContactInsert): ContactInsert {
  const normalized = normalizeContactInsert(payload);
  // Capture the canonical fields (RAW-D) so raw + policy stamp persist alongside
  // the normalized values, instead of being discarded via canonicalValue().
  const nameCf = canonicalizeGovernedName(PERSON_NAME_POLICY_ID, normalized.name);
  const orgCf = canonicalizeGovernedName(ORGANIZATION_POLICY_ID, normalized.organization);
  const phoneCf = normalized.phone.trim() ? canonicalizePhoneNumber(normalized.phone) : null;
  return {
    ...normalized,
    name: canonicalValue(nameCf)!,
    organization: canonicalValue(orgCf) ?? "",
    phone: phoneCf ? canonicalValue(phoneCf)! : normalized.phone,
    details: normalizeContactDetailsForWrite(normalized.details),
    provenance: provenanceMap({ name: nameCf, organization: orgCf, phone: phoneCf }),
  };
}

export interface DirectoryContactUpsertResult {
  contact: Contact;
  conflicts: DirectoryMergeConflict[];
  created: boolean;
}

export async function listContacts(type?: ContactType): Promise<Contact[]> {
  if (isMockMode()) {
    return listMockContacts(type);
  }
  const client = await getSupabaseClient("listContacts");
  let query = client
    .from("contacts")
    .select("*")
    .order("times_used", { ascending: false })
    .order("name", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeContactRow(row as Contact));
}

export async function searchContacts(term: string, type?: ContactType): Promise<Contact[]> {
  if (isMockMode()) {
    return searchMockContacts(term, type);
  }
  const client = await getSupabaseClient("searchContacts");
  let query = client
    .from("contacts")
    .select("*")
    .ilike("name", `%${term}%`)
    .order("times_used", { ascending: false })
    .order("name", { ascending: true });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeContactRow(row as Contact));
}

export async function getContact(id: string): Promise<Contact | null> {
  if (isMockMode()) {
    return getMockContact(id);
  }
  const client = await getSupabaseClient("getContact");
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeContactRow(data as Contact) : null;
}

export async function createContact(payload: ContactInsert): Promise<Contact> {
  const canonicalPayload = canonicalizeContactInsertForWrite(payload);
  if (isMockMode()) {
    return createMockContact(canonicalPayload);
  }
  const client = await getSupabaseClient("createContact");
  const { data, error } = await client
    .from("contacts")
    .insert({ ...canonicalPayload, times_used: 0 })
    .select()
    .single();

  if (error) throw error;
  return normalizeContactRow(data as Contact);
}

export async function updateContact(id: string, patch: ContactUpdate): Promise<Contact> {
  const current = isMockMode() ? getMockContact(id) : await getContact(id);
  if (!current) {
    throw new Error(`Contact ${id} not found.`);
  }
  const normalized = normalizeContactUpdate(current.type, patch);
  const nameCf = normalized.name !== undefined ? canonicalizeGovernedName(PERSON_NAME_POLICY_ID, normalized.name) : null;
  const orgCf = normalized.organization !== undefined ? canonicalizeGovernedName(ORGANIZATION_POLICY_ID, normalized.organization) : null;
  const phoneCf = normalized.phone !== undefined && normalized.phone.trim() ? canonicalizePhoneNumber(normalized.phone) : null;
  // Merge the patched fields' provenance into the existing map so unchanged
  // fields keep their stored provenance (RAW-D).
  const mergedProvenance = { ...(current.provenance ?? {}), ...provenanceMap({ name: nameCf, organization: orgCf, phone: phoneCf }) };
  const canonicalPatch = {
    ...normalized,
    ...(normalized.name !== undefined ? { name: canonicalValue(nameCf)! } : {}),
    ...(normalized.organization !== undefined ? { organization: canonicalValue(orgCf) ?? "" } : {}),
    ...(normalized.phone !== undefined ? { phone: normalized.phone.trim() ? canonicalValue(phoneCf)! : normalized.phone } : {}),
    ...(normalized.details
      ? { details: normalizeContactDetailsForWrite(normalized.details as Contact["details"]) }
      : {}),
    ...(Object.keys(mergedProvenance).length > 0 ? { provenance: mergedProvenance } : {}),
  };
  if (isMockMode()) {
    return updateMockContact(id, canonicalPatch);
  }
  const client = await getSupabaseClient("updateContact");
  const { data, error } = await client
    .from("contacts")
    .update(canonicalPatch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return normalizeContactRow(data as Contact);
}

export async function incrementUsage(id: string): Promise<void> {
  if (isMockMode()) {
    incrementMockContactUsage(id);
    return;
  }
  const client = await getSupabaseClient("incrementUsage");
  const { error } = await client.rpc("increment_contact_usage", { contact_id: id });
  if (error) {
    // Fallback: fetch current count and update manually if RPC not available
    const contact = await getContact(id);
    if (contact) {
      await client
        .from("contacts")
        .update({ times_used: contact.times_used + 1 })
        .eq("id", id);
    }
  }
}

export async function saveContact(payload: ContactInsert & { id?: string }): Promise<Contact> {
  if (payload.id) {
    const { id, ...patch } = payload;
    return updateContact(id, patch);
  }
  return createContact(payload);
}

export async function upsertDirectoryContact(payload: ContactInsert): Promise<DirectoryContactUpsertResult> {
  if (isMockMode()) {
    return upsertMockDirectoryContact(payload);
  }
  const existing = await listContacts(payload.type);
  const decision = decideDirectoryContactUpsert(existing, payload);

  if (decision.created && decision.payload) {
    return {
      contact: await createContact(decision.payload),
      conflicts: [],
      created: true,
    };
  }

  if (decision.conflicts.length > 0 && decision.contact) {
    return {
      contact: decision.contact,
      conflicts: decision.conflicts,
      created: false,
    };
  }

  if (!decision.contact) {
    throw new Error("Directory upsert could not determine a contact result.");
  }

  const updated = await updateContact(decision.contact.id, {
    organization: decision.contact.organization,
    phone: decision.contact.phone,
    email: decision.contact.email,
    address: decision.contact.address,
    notes: decision.contact.notes,
    firm_id: decision.contact.firm_id,
    details: decision.contact.details,
  });

  return {
    contact: updated,
    conflicts: [],
    created: false,
  };
}
