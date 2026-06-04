import { getSupabaseClient } from "../lib/supabase";
import type { CaseRecord } from "../types/case";

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

export async function saveCase(record: CaseRecord): Promise<void> {
  const client = await getSupabaseClient("saveCase");
  const { error } = await client
    .from("cases")
    .upsert(toCaseRow(record), { onConflict: "case_id" });

  if (error) throw error;
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
