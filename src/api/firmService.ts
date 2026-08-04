import { getSupabaseClient } from "../lib/supabase";
import { canonicalizePhoneNumber } from "../lib/canonical/PhoneNumberPolicy";
import { ORGANIZATION_POLICY_ID, canonicalizeGovernedName } from "../lib/canonical/NamePolicies";
import { canonicalValue, provenanceMap } from "../lib/canonical/FieldResult";
import { isMockMode } from "../lib/runtime/mode";
import {
  createMockFirm,
  getMockFirm,
  listMockFirms,
  searchMockFirms,
  updateMockFirm,
  upsertMockFirm,
} from "../mocks/directoryStore";
import { decideFirmUpsert, type DirectoryMergeConflict } from "../lib/directory/mergeDirectoryRecords";
import { normalizeFirmInsert, normalizeFirmRow, normalizeFirmUpdate, type Firm, type FirmInsert, type FirmUpdate } from "../types/firm";

export function canonicalizeFirmFields<T extends FirmInsert | FirmUpdate>(value: T): T {
  // Capture canonical fields (RAW-D) so raw + policy stamp persist as provenance.
  const nameCf = "name" in value && value.name !== undefined
    ? canonicalizeGovernedName(ORGANIZATION_POLICY_ID, value.name) : null;
  const mainPhoneCf = "main_phone" in value && value.main_phone !== undefined && value.main_phone.trim()
    ? canonicalizePhoneNumber(value.main_phone) : null;
  const faxCf = "fax" in value && value.fax !== undefined && value.fax.trim()
    ? canonicalizePhoneNumber(value.fax) : null;
  const provenance = provenanceMap({ name: nameCf, main_phone: mainPhoneCf, fax: faxCf });
  return {
    ...value,
    ...(nameCf ? { name: canonicalValue(nameCf)! } : {}),
    ...("main_phone" in value && value.main_phone !== undefined
      ? { main_phone: mainPhoneCf ? canonicalValue(mainPhoneCf)! : value.main_phone }
      : {}),
    ...("fax" in value && value.fax !== undefined
      ? { fax: faxCf ? canonicalValue(faxCf)! : value.fax }
      : {}),
    ...(Object.keys(provenance).length > 0 ? { provenance } : {}),
  };
}

export interface FirmUpsertResult {
  firm: Firm;
  conflicts: DirectoryMergeConflict[];
  created: boolean;
}

export async function listFirms(): Promise<Firm[]> {
  if (isMockMode()) {
    return listMockFirms();
  }
  const client = await getSupabaseClient("listFirms");
  const { data, error } = await client
    .from("firms")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeFirmRow(row as Firm));
}

export async function searchFirms(term: string): Promise<Firm[]> {
  if (isMockMode()) {
    return searchMockFirms(term);
  }
  const client = await getSupabaseClient("searchFirms");
  const { data, error } = await client
    .from("firms")
    .select("*")
    .ilike("name", `%${term}%`)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeFirmRow(row as Firm));
}

export async function getFirm(id: string): Promise<Firm | null> {
  if (isMockMode()) {
    return getMockFirm(id);
  }
  const client = await getSupabaseClient("getFirm");
  const { data, error } = await client
    .from("firms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeFirmRow(data as Firm) : null;
}

export async function createFirm(payload: FirmInsert): Promise<Firm> {
  const canonicalPayload = canonicalizeFirmFields(payload);
  if (isMockMode()) {
    return createMockFirm(canonicalPayload);
  }
  const client = await getSupabaseClient("createFirm");
  const normalized = normalizeFirmInsert(canonicalPayload);
  const { data, error } = await client
    .from("firms")
    .insert(normalized)
    .select()
    .single();

  if (error) throw error;
  return normalizeFirmRow(data as Firm);
}

export async function updateFirm(id: string, patch: FirmUpdate): Promise<Firm> {
  const canonicalPatch = canonicalizeFirmFields(patch);
  if (isMockMode()) {
    return updateMockFirm(id, canonicalPatch);
  }
  const client = await getSupabaseClient("updateFirm");
  // Merge patched-field provenance into the existing map so unchanged fields keep theirs (RAW-D).
  const payload: FirmUpdate = canonicalPatch.provenance
    ? { ...canonicalPatch, provenance: { ...((await getFirm(id))?.provenance ?? {}), ...canonicalPatch.provenance } }
    : canonicalPatch;
  const normalized = normalizeFirmUpdate(payload);
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
  if (isMockMode()) {
    return upsertMockFirm(payload);
  }
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
