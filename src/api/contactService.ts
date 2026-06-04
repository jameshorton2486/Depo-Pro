import { getSupabaseClient } from "../lib/supabase";
import type { Contact, ContactInsert, ContactUpdate, ContactType } from "../types/contact";

function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeContactInsert(payload: ContactInsert): ContactInsert {
  return {
    ...payload,
    phone: normalizePhone(payload.phone),
  };
}

function normalizeContactUpdate(patch: ContactUpdate): ContactUpdate {
  if (!("phone" in patch)) {
    return patch;
  }

  return {
    ...patch,
    phone: normalizePhone(patch.phone),
  };
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
  return data as Contact[];
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
  return data as Contact[];
}

export async function getContact(id: string): Promise<Contact | null> {
  const client = await getSupabaseClient("getContact");
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Contact | null;
}

export async function createContact(payload: ContactInsert): Promise<Contact> {
  const client = await getSupabaseClient("createContact");
  const normalized = normalizeContactInsert(payload);
  const { data, error } = await client
    .from("contacts")
    .insert({ ...normalized, times_used: 0 })
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function updateContact(id: string, patch: ContactUpdate): Promise<Contact> {
  const client = await getSupabaseClient("updateContact");
  const normalized = normalizeContactUpdate(patch);
  const { data, error } = await client
    .from("contacts")
    .update(normalized)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
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
