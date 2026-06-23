// ConflictStore — React context + reducer for conflict resolution and provenance.
//
// Architecture:
//   - Pure reducer handles all state transitions (testable without React)
//   - Context provides dispatch + derived selectors to the component tree
//   - Supabase writes are fire-and-forget background effects (no blocking UI)

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type Dispatch,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "../../lib/supabase";
import type {
  ConflictState,
  ConflictAction,
  ProvenanceEntry,
  ActiveConflict,
  ConflictOption,
  FieldProvenanceRow,
} from "./types";
import type { DisplaySource } from "../ExtractedFieldsTable/fieldProjection";
import { deriveOpenConflicts } from "../../lib/conflicts/deriveOpenConflicts";

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function conflictReducer(state: ConflictState, action: ConflictAction): ConflictState {
  switch (action.type) {

    case "RECORD_EXTRACTION": {
      const e = action.payload;
      return {
        ...state,
        history: {
          ...state.history,
          [e.field_path]: [e, ...(state.history[e.field_path] ?? [])],
        },
      };
    }

    case "DETECT_CONFLICT": {
      const { conflict, entry } = action.payload;
      return {
        ...state,
        active: { ...state.active, [conflict.field_path]: conflict },
        history: {
          ...state.history,
          [entry.field_path]: [entry, ...(state.history[entry.field_path] ?? [])],
        },
      };
    }

    case "RESOLVE_CONFLICT": {
      const { resolution } = action.payload;
      const remainingActive = Object.fromEntries(
        Object.entries(state.active).filter(([fieldPath]) => fieldPath !== resolution.field_path),
      );
      return {
        ...state,
        active: remainingActive,
        modalFieldPath:
          state.modalFieldPath === resolution.field_path ? null : state.modalFieldPath,
        history: {
          ...state.history,
          [resolution.field_path]: [
            resolution,
            ...(state.history[resolution.field_path] ?? []),
          ],
        },
      };
    }

    case "RESTORE_CONFLICT": {
      const { conflict, failedResolutionId } = action.payload;
      const nextHistory = (state.history[conflict.field_path] ?? []).filter(
        (entry) => entry.id !== failedResolutionId,
      );

      return {
        ...state,
        active: { ...state.active, [conflict.field_path]: conflict },
        modalFieldPath: conflict.field_path,
        history: {
          ...state.history,
          [conflict.field_path]: nextHistory,
        },
      };
    }

    case "RECORD_CONFIRM": {
      const e = action.payload;
      return {
        ...state,
        history: {
          ...state.history,
          [e.field_path]: [e, ...(state.history[e.field_path] ?? [])],
        },
      };
    }

    case "OPEN_MODAL":
      return { ...state, modalFieldPath: action.payload.field_path };

    case "CLOSE_MODAL":
      return { ...state, modalFieldPath: null };

    case "SET_PERSISTING":
      return { ...state, persisting: action.payload.persisting };

    case "LOAD_HISTORY": {
      const { field_path, entries } = action.payload;
      return {
        ...state,
        history: { ...state.history, [field_path]: entries },
      };
    }

    default:
      return state;
  }
}

function buildStateFromProvenance(rows: FieldProvenanceRow[]): ConflictState {
  const history: ConflictState["history"] = {};

  for (const row of rows) {
    history[row.field_path] = [row, ...(history[row.field_path] ?? [])];
  }

  const active = Object.fromEntries(
    deriveOpenConflicts(rows).map((conflict) => [conflict.field_path, conflict]),
  );

  return {
    history,
    active,
    modalFieldPath: null,
    persisting: false,
  };
}

function conflictsMatch(existing: ActiveConflict | undefined, next: ActiveConflict): boolean {
  if (!existing) {
    return false;
  }

  return (
    existing.field_path === next.field_path
    && existing.option_a.value === next.option_a.value
    && existing.option_a.source === next.option_a.source
    && existing.option_b.value === next.option_b.value
    && existing.option_b.source === next.option_b.source
  );
}

function toDatabaseEntry(entry: ProvenanceEntry): Omit<ProvenanceEntry, "id"> {
  const { id, ...databaseEntry } = entry;
  void id;
  return databaseEntry;
}

// ─── Supabase persistence helpers ─────────────────────────────────────────────

export async function persistEntry(entry: ProvenanceEntry): Promise<boolean> {
  try {
    const client = await getSupabaseClient(`persistEntry:${entry.event_type}`);
    const { error } = await client.from("field_provenance").insert(toDatabaseEntry(entry));
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error("[DEPO-PRO] Supabase provenance write failed", {
      operation: `persistEntry:${entry.event_type}`,
      table: "field_provenance",
      caseId: entry.case_id,
      fieldPath: entry.field_path,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function persistWithState(
  dispatch: Dispatch<ConflictAction>,
  entry: ProvenanceEntry,
): Promise<boolean> {
  dispatch({ type: "SET_PERSISTING", payload: { persisting: true } });
  try {
    return await persistEntry(entry);
  } finally {
    dispatch({ type: "SET_PERSISTING", payload: { persisting: false } });
  }
}

async function fetchHistory(caseId: string, fieldPath: string): Promise<ProvenanceEntry[]> {
  try {
    const client = await getSupabaseClient("fetchHistory");
    const { data, error } = await client
      .from("field_provenance")
      .select("*")
      .eq("case_id", caseId)
      .eq("field_path", fieldPath)
      .order("resolved_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id:               row.id,
      case_id:          row.case_id,
      field_path:       row.field_path,
      field_label:      row.field_label,
      event_type:       row.event_type,
      value:            row.value,
      source:           row.source as DisplaySource,
      winning_value:    row.winning_value,
      rejected_value:   row.rejected_value,
      rejected_source:  row.rejected_source as DisplaySource | null,
      confidence_score: row.confidence_score,
      resolution_user:  row.resolution_user,
      resolved_at:      row.resolved_at,
    }));
  } catch (error) {
    console.error("[DEPO-PRO] Supabase provenance read failed", {
      operation: "fetchHistory",
      table: "field_provenance",
      caseId,
      fieldPath,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ConflictContextValue {
  state: ConflictState;

  recordExtraction: (
    caseId: string,
    fieldPath: string,
    fieldLabel: string,
    value: string,
    source: DisplaySource,
    confidence: number | null,
  ) => Promise<void>;

  detectConflict: (
    caseId: string,
    fieldPath: string,
    fieldLabel: string,
    optionA: ConflictOption,
    optionB: ConflictOption,
  ) => Promise<void>;

  resolveConflict: (
    fieldPath: string,
    winning: ConflictOption,
    rejected: ConflictOption,
    caseId: string,
    fieldLabel: string,
  ) => Promise<boolean>;

  recordConfirm: (
    caseId: string,
    fieldPath: string,
    fieldLabel: string,
    value: string,
    source: DisplaySource,
  ) => Promise<void>;

  openModal: (fieldPath: string) => void;
  closeModal: () => void;

  loadHistory: (caseId: string, fieldPath: string) => Promise<void>;
}

const ConflictContext = createContext<ConflictContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConflictProvider({
  children,
  initialProvenance = [],
}: {
  children: ReactNode;
  initialProvenance?: FieldProvenanceRow[];
}) {
  const [state, dispatch] = useReducer(conflictReducer, initialProvenance, buildStateFromProvenance);

  const makeId = () =>
    `prov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const recordExtraction = useCallback(
    async (
      caseId: string,
      fieldPath: string,
      fieldLabel: string,
      value: string,
      source: DisplaySource,
      confidence: number | null,
    ) => {
      const entry: ProvenanceEntry = {
        id: makeId(),
        case_id: caseId,
        field_path: fieldPath,
        field_label: fieldLabel,
        event_type: "extracted",
        value,
        source,
        winning_value: null,
        rejected_value: null,
        rejected_source: null,
        confidence_score: confidence,
        resolution_user: "reporter",
        resolved_at: new Date().toISOString(),
      };
      dispatch({ type: "RECORD_EXTRACTION", payload: entry });
      await persistWithState(dispatch, entry);
    },
    [],
  );

  const detectConflict = useCallback(
    async (
      caseId: string,
      fieldPath: string,
      fieldLabel: string,
      optionA: ConflictOption,
      optionB: ConflictOption,
    ) => {
      const provenanceId = makeId();
      const conflict: ActiveConflict = {
        field_path: fieldPath,
        field_label: fieldLabel,
        case_id: caseId,
        option_a: optionA,
        option_b: optionB,
        detected_at: new Date().toISOString(),
        provenance_row_ids: [provenanceId],
      };
      const entry: ProvenanceEntry = {
        id: provenanceId,
        case_id: caseId,
        field_path: fieldPath,
        field_label: fieldLabel,
        event_type: "conflict_detected",
        value: optionA.value,
        source: optionA.source,
        winning_value: null,
        rejected_value: optionB.value,
        rejected_source: optionB.source,
        confidence_score: optionA.confidence_score,
        resolution_user: "reporter",
        resolved_at: new Date().toISOString(),
      };
      if (conflictsMatch(state.active[fieldPath], conflict)) {
        return;
      }
      dispatch({ type: "DETECT_CONFLICT", payload: { conflict, entry } });
      await persistWithState(dispatch, entry);
    },
    [state.active],
  );

  const resolveConflict = useCallback(
    async (
      fieldPath: string,
      winning: ConflictOption,
      rejected: ConflictOption,
      caseId: string,
      fieldLabel: string,
    ) => {
      const entry: ProvenanceEntry = {
        id: makeId(),
        case_id: caseId,
        field_path: fieldPath,
        field_label: fieldLabel,
        event_type: "conflict_resolved",
        value: winning.value,
        source: winning.source,
        winning_value: winning.value,
        rejected_value: rejected.value,
        rejected_source: rejected.source,
        confidence_score: winning.confidence_score,
        resolution_user: "reporter",
        resolved_at: new Date().toISOString(),
      };
      const priorConflict = state.active[fieldPath];
      dispatch({ type: "RESOLVE_CONFLICT", payload: { resolution: entry } });
      const ok = await persistWithState(dispatch, entry);
      if (!ok && priorConflict) {
        dispatch({
          type: "RESTORE_CONFLICT",
          payload: { conflict: priorConflict, failedResolutionId: entry.id },
        });
      }
      return ok;
    },
    [state.active],
  );

  const recordConfirm = useCallback(
    async (
      caseId: string,
      fieldPath: string,
      fieldLabel: string,
      value: string,
      source: DisplaySource,
    ) => {
      const entry: ProvenanceEntry = {
        id: makeId(),
        case_id: caseId,
        field_path: fieldPath,
        field_label: fieldLabel,
        event_type: "confirmed",
        value,
        source,
        winning_value: null,
        rejected_value: null,
        rejected_source: null,
        confidence_score: null,
        resolution_user: "reporter",
        resolved_at: new Date().toISOString(),
      };
      dispatch({ type: "RECORD_CONFIRM", payload: entry });
      await persistWithState(dispatch, entry);
    },
    [],
  );

  const openModal = useCallback((field_path: string) => {
    dispatch({ type: "OPEN_MODAL", payload: { field_path } });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: "CLOSE_MODAL" });
  }, []);

  const loadHistory = useCallback(async (caseId: string, fieldPath: string) => {
    if (state.history[fieldPath]) {
      return;
    }
    const entries = await fetchHistory(caseId, fieldPath);
    dispatch({ type: "LOAD_HISTORY", payload: { field_path: fieldPath, entries } });
  }, [state.history]);

  return (
    <ConflictContext.Provider
      value={{
        state,
        recordExtraction,
        detectConflict,
        resolveConflict,
        recordConfirm,
        openModal,
        closeModal,
        loadHistory,
      }}
    >
      {children}
    </ConflictContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConflict(): ConflictContextValue {
  const ctx = useContext(ConflictContext);
  if (!ctx) throw new Error("useConflict must be used inside <ConflictProvider>");
  return ctx;
}

// ─── Selector helpers (pure functions, no hooks) ──────────────────────────────

export function selectIsResolved(state: ConflictState, fieldPath: string): boolean {
  return !state.active[fieldPath];
}

export function selectFieldHistory(
  state: ConflictState,
  fieldPath: string,
): ProvenanceEntry[] {
  return state.history[fieldPath] ?? [];
}

export function selectActiveConflicts(state: ConflictState): ActiveConflict[] {
  return Object.values(state.active);
}
