import { getSupabaseClient } from "../lib/supabase";
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
  return value.replace(/\D/g, "");
}

export interface DirectoryContactUpsertResult {
  contact: Contact;
  conflicts: DirectoryMergeConflict[];
  created: boolean;
}

export async function listContacts(type?: ContactType): Promise<Contact[]> {
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
  const client = await getSupabaseClient("createContact");
  const normalized = normalizeContactInsert(payload);
  const { data, error } = await client
    .from("contacts")
    .insert({ ...normalized, phone: normalizePhone(normalized.phone), times_used: 0 })
    .select()
    .single();

  if (error) throw error;
  return normalizeContactRow(data as Contact);
}

export async function updateContact(id: string, patch: ContactUpdate): Promise<Contact> {
  const client = await getSupabaseClient("updateContact");
  const current = await getContact(id);
  if (!current) {
    throw new Error(`Contact ${id} not found.`);
  }
  const normalized = normalizeContactUpdate(current.type, patch);
  const { data, error } = await client
    .from("contacts")
    .update({
      ...normalized,
      phone: normalized.phone ? normalizePhone(normalized.phone) : normalized.phone,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return normalizeContactRow(data as Contact);
}

export async function incrementUsage(id: string): Promise<void> {
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
