// Conflict resolution and provenance types.
// These are UI-layer types — they map 1:1 to the field_provenance Supabase table.

import type { DisplaySource } from "../ExtractedFieldsTable/fieldProjection";

// ─── Event types ──────────────────────────────────────────────────────────────

export type ProvenanceEventType =
  | "extracted"          // initial value pulled from a document
  | "conflict_detected"  // a second source disagreed with an existing value
  | "conflict_resolved"  // operator explicitly selected the winning value
  | "confirmed"          // operator confirmed without conflict
  | "manual_edit";       // operator typed a value directly

// ─── Single history entry ─────────────────────────────────────────────────────

export interface ProvenanceEntry {
  id: string;                        // temp client id in-memory, uuid when loaded from Supabase
  case_id: string;
  field_path: string;                // e.g. "witnesses[0].name"
  field_label: string;               // e.g. "Witness 1 — Name"
  event_type: ProvenanceEventType;
  value: string;                     // value at time of event
  source: DisplaySource;
  winning_value: string | null;      // conflict_resolved only
  rejected_value: string | null;     // conflict_resolved only
  rejected_source: DisplaySource | null;
  confidence_score: number | null;
  resolution_user: string;           // "reporter" for MVP single-user
  resolved_at: string;               // ISO datetime
}

// ─── Active conflict record ───────────────────────────────────────────────────
// Represents a field currently in unresolved conflict state.

export interface ActiveConflict {
  field_path: string;
  field_label: string;
  case_id: string;
  option_a: ConflictOption;
  option_b: ConflictOption;
  detected_at: string; // ISO datetime
  provenance_row_ids: string[];
}

export interface ConflictOption {
  value: string;
  source: DisplaySource;
  confidence_score: number | null;
}

export type FieldProvenanceRow = ProvenanceEntry;
export type OpenConflict = ActiveConflict;

// ─── Store state ──────────────────────────────────────────────────────────────

export interface ConflictState {
  // Map of field_path → full provenance history (newest first)
  history: Record<string, ProvenanceEntry[]>;
  // Currently active (unresolved) conflicts keyed by field_path
  active: Record<string, ActiveConflict>;
  // field_path currently open in the resolution modal (null = modal closed)
  modalFieldPath: string | null;
  // Whether a Supabase write is in flight
  persisting: boolean;
}

// ─── Store actions ────────────────────────────────────────────────────────────

export type ConflictAction =
  | { type: "RECORD_EXTRACTION"; payload: ProvenanceEntry }
  | { type: "DETECT_CONFLICT";   payload: { conflict: ActiveConflict; entry: ProvenanceEntry } }
  | { type: "RESOLVE_CONFLICT";  payload: { resolution: ProvenanceEntry } }
  | { type: "RECORD_CONFIRM";    payload: ProvenanceEntry }
  | { type: "OPEN_MODAL";        payload: { field_path: string } }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_PERSISTING";    payload: { persisting: boolean } }
  | { type: "LOAD_HISTORY";      payload: { field_path: string; entries: ProvenanceEntry[] } };
