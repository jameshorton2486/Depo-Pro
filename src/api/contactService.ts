import { supabase } from "../lib/supabase";
import type { Contact, ContactInsert, ContactUpdate, ContactType } from "../types/contact";

export async function listContacts(type?: ContactType): Promise<Contact[]> {
  let query = supabase
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
  let query = supabase
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
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Contact | null;
}

export async function createContact(payload: ContactInsert): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...payload, times_used: 0 })
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function updateContact(id: string, patch: ContactUpdate): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function incrementUsage(id: string): Promise<void> {
  const { error } = await supabase.rpc("increment_contact_usage", { contact_id: id });
  if (error) {
    // Fallback: fetch current count and update manually if RPC not available
    const contact = await getContact(id);
    if (contact) {
      await supabase
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
