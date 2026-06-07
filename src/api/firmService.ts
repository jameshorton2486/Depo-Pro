import { getSupabaseClient } from "../lib/supabase";
import { decideFirmUpsert, type DirectoryMergeConflict } from "../lib/directory/mergeDirectoryRecords";
import { normalizeFirmInsert, normalizeFirmRow, normalizeFirmUpdate, type Firm, type FirmInsert, type FirmUpdate } from "../types/firm";

export interface FirmUpsertResult {
  firm: Firm;
  conflicts: DirectoryMergeConflict[];
  created: boolean;
}

export async function listFirms(): Promise<Firm[]> {
  const client = await getSupabaseClient("listFirms");
  const { data, error } = await client
    .from("firms")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeFirmRow(row as Firm));
}

export async function searchFirms(term: string): Promise<Firm[]> {
  const client = await getSupabaseClient("searchFirms");
  const { data, error } = await client
    .from("firms")
    .select("*")
    .ilike("name", `%${term}%`)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeFirmRow(row as Firm));
}

export async function createFirm(payload: FirmInsert): Promise<Firm> {
  const client = await getSupabaseClient("createFirm");
  const normalized = normalizeFirmInsert(payload);
  const { data, error } = await client
    .from("firms")
    .insert(normalized)
    .select()
    .single();

  if (error) throw error;
  return normalizeFirmRow(data as Firm);
}

export async function updateFirm(id: string, patch: FirmUpdate): Promise<Firm> {
  const client = await getSupabaseClient("updateFirm");
  const normalized = normalizeFirmUpdate(patch);
  const { data, error } = await client
    .from("firms")
    .update(normalized)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return normalizeFirmRow(data as Firm);
}

export async function upsertFirm(payload: FirmInsert): Promise<FirmUpsertResult> {
  const firms = await listFirms();
  const decision = decideFirmUpsert(firms, payload);

  if (decision.created && decision.payload) {
    return {
      firm: await createFirm(decision.payload),
      conflicts: [],
      created: true,
    };
  }

  if (decision.conflicts.length > 0 && decision.firm) {
    return {
      firm: decision.firm,
      conflicts: decision.conflicts,
      created: false,
    };
  }

  if (!decision.firm) {
    throw new Error("Firm upsert could not determine a firm result.");
  }

  const updated = await updateFirm(decision.firm.id, {
    address: decision.firm.address,
    city: decision.firm.city,
    state: decision.firm.state,
    zip: decision.firm.zip,
    main_phone: decision.firm.main_phone,
    fax: decision.firm.fax,
  });

  return {
    firm: updated,
    conflicts: [],
    created: false,
  };
}
