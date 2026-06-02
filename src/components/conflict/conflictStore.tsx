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
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";
import type {
  ConflictState,
  ConflictAction,
  ProvenanceEntry,
  ActiveConflict,
  ConflictOption,
} from "./types";
import type { DisplaySource } from "../ExtractedFieldsTable/fieldProjection";

// ─── Reducer ──────────────────────────────────────────────────────────────────

function conflictReducer(state: ConflictState, action: ConflictAction): ConflictState {
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
      const { [resolution.field_path]: _removed, ...remainingActive } = state.active;
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

// ─── Initial state ────────────────────────────────────────────────────────────

function initialState(): ConflictState {
  return {
    history: {},
    active: {},
    modalFieldPath: null,
    persisting: false,
  };
}

// ─── Supabase persistence helpers ─────────────────────────────────────────────

async function persistEntry(entry: ProvenanceEntry): Promise<void> {
  await supabase.from("field_provenance").insert({
    id:               entry.id,
    case_id:          entry.case_id,
    field_path:       entry.field_path,
    field_label:      entry.field_label,
    event_type:       entry.event_type,
    value:            entry.value,
    source:           entry.source,
    winning_value:    entry.winning_value,
    rejected_value:   entry.rejected_value,
    rejected_source:  entry.rejected_source,
    confidence_score: entry.confidence_score,
    resolution_user:  entry.resolution_user,
    resolved_at:      entry.resolved_at,
  });
}

async function fetchHistory(caseId: string, fieldPath: string): Promise<ProvenanceEntry[]> {
  const { data, error } = await supabase
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
  ) => void;

  detectConflict: (
    caseId: string,
    fieldPath: string,
    fieldLabel: string,
    optionA: ConflictOption,
    optionB: ConflictOption,
  ) => void;

  resolveConflict: (
    fieldPath: string,
    winning: ConflictOption,
    rejected: ConflictOption,
    caseId: string,
    fieldLabel: string,
  ) => void;

  recordConfirm: (
    caseId: string,
    fieldPath: string,
    fieldLabel: string,
    value: string,
    source: DisplaySource,
  ) => void;

  openModal: (fieldPath: string) => void;
  closeModal: () => void;

  loadHistory: (caseId: string, fieldPath: string) => Promise<void>;
}

const ConflictContext = createContext<ConflictContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConflictProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conflictReducer, undefined, initialState);

  const makeId = () =>
    `prov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const recordExtraction = useCallback(
    (
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
      persistEntry(entry);
    },
    [],
  );

  const detectConflict = useCallback(
    (
      caseId: string,
      fieldPath: string,
      fieldLabel: string,
      optionA: ConflictOption,
      optionB: ConflictOption,
    ) => {
      const conflict: ActiveConflict = {
        field_path: fieldPath,
        field_label: fieldLabel,
        case_id: caseId,
        option_a: optionA,
        option_b: optionB,
        detected_at: new Date().toISOString(),
      };
      const entry: ProvenanceEntry = {
        id: makeId(),
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
      dispatch({ type: "DETECT_CONFLICT", payload: { conflict, entry } });
      persistEntry(entry);
    },
    [],
  );

  const resolveConflict = useCallback(
    (
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
      dispatch({ type: "RESOLVE_CONFLICT", payload: { resolution: entry } });
      persistEntry(entry);
    },
    [],
  );

  const recordConfirm = useCallback(
    (
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
      persistEntry(entry);
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
    const entries = await fetchHistory(caseId, fieldPath);
    dispatch({ type: "LOAD_HISTORY", payload: { field_path: fieldPath, entries } });
  }, []);

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
