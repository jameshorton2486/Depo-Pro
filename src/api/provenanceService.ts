import { getSupabaseClient } from "../lib/supabase";
import type { Database } from "../types/database";
import type {
  FieldProvenanceRow,
  ProvenanceEntry,
  ProvenanceEventType,
} from "../components/conflict/types";
import type { DisplaySource } from "../components/ExtractedFieldsTable/fieldProjection";

type FieldProvenanceTableRow = Database["public"]["Tables"]["field_provenance"]["Row"];

function mapProvenanceRow(row: FieldProvenanceTableRow): ProvenanceEntry {
  return {
    id: row.id,
    case_id: row.case_id,
    field_path: row.field_path,
    field_label: row.field_label,
    event_type: row.event_type as ProvenanceEventType,
    value: row.value,
    source: row.source as DisplaySource,
    winning_value: row.winning_value,
    rejected_value: row.rejected_value,
    rejected_source: row.rejected_source as DisplaySource | null,
    confidence_score: row.confidence_score,
    resolution_user: row.resolution_user,
    resolved_at: row.resolved_at,
  };
}

export async function listFieldProvenance(caseId: string): Promise<FieldProvenanceRow[]> {
  const client = await getSupabaseClient("listFieldProvenance");
  const { data, error } = await client
    .from("field_provenance")
    .select("*")
    .eq("case_id", caseId)
    .order("resolved_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapProvenanceRow);
}
