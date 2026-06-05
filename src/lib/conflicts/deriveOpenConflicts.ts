import type {
  FieldProvenanceRow,
  OpenConflict,
  ProvenanceEventType,
} from "../../components/conflict/types";

const CONFLICT_DETECTED: ProvenanceEventType = "conflict_detected";

const CLOSING_EVENTS = new Set<ProvenanceEventType>([
  "conflict_resolved",
  "confirmed",
  "manual_edit",
]);

function makeOpenConflict(row: FieldProvenanceRow): OpenConflict {
  return {
    field_path: row.field_path,
    field_label: row.field_label,
    case_id: row.case_id,
    option_a: {
      value: row.value,
      source: row.source,
      confidence_score: row.confidence_score,
    },
    option_b: {
      value: row.rejected_value ?? "",
      source: row.rejected_source ?? "Manual",
      confidence_score: null,
    },
    detected_at: row.resolved_at,
    provenance_row_ids: [row.id],
  };
}

export function deriveOpenConflicts(rows: FieldProvenanceRow[]): OpenConflict[] {
  const open = new Map<string, OpenConflict>();

  for (const row of rows) {
    if (row.event_type === CONFLICT_DETECTED) {
      open.set(row.field_path, makeOpenConflict(row));
      continue;
    }

    if (CLOSING_EVENTS.has(row.event_type)) {
      open.delete(row.field_path);
    }
  }

  return Array.from(open.values());
}
