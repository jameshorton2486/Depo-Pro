import { getSupabaseClient } from "../lib/supabase";
import { emptyCaseRecord, type CaseRecord } from "../types/case";

type CaseRow = {
  case_id: string;
  proceeding_type: CaseRecord["proceeding_type"];
  stage: CaseRecord["stage"];
  notes: string;
  payload: CaseRecord;
};

function toCaseRow(record: CaseRecord): CaseRow {
  return {
    case_id: record.case_id,
    proceeding_type: record.proceeding_type,
    stage: record.stage,
    notes: record.notes,
    payload: record,
  };
}

function withSaveTimestamp(record: CaseRecord, now: string): CaseRecord {
  return {
    ...record,
    updated_at: now,
  };
}

export function generateCaseId(now = new Date(), random = Math.random()): string {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.floor(random * 36 ** 6).toString(36).padStart(6, "0");
  return `case_${date}_${suffix}`;
}

export async function saveCase(record: CaseRecord): Promise<CaseRecord> {
  const client = await getSupabaseClient("saveCase");
  const now = new Date().toISOString();
  const nextRecord = withSaveTimestamp(record, now);
  const { error } = await client
    .from("cases")
    .upsert(toCaseRow(nextRecord), { onConflict: "case_id" });

  if (error) throw error;
  return nextRecord;
}

export async function loadCase(caseId: string): Promise<CaseRecord | null> {
  const client = await getSupabaseClient("loadCase");
  const { data, error } = await client
    .from("cases")
    .select("payload")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) throw error;
  return (data?.payload as CaseRecord | undefined) ?? null;
}

export async function caseExists(caseId: string): Promise<boolean> {
  const client = await getSupabaseClient("caseExists");
  const { count, error } = await client
    .from("cases")
    .select("case_id", { count: "exact", head: true })
    .eq("case_id", caseId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createCase(caseId = generateCaseId()): Promise<CaseRecord> {
  const record = emptyCaseRecord(caseId, new Date().toISOString());
  return saveCase(record);
}
