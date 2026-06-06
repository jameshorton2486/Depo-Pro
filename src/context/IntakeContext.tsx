import React, { createContext, useContext, useReducer, useCallback } from "react";

import type {
  CaseRecord,
  Attorney,
  Witness,
  Interpreter,
  Videographer,
  Participant,
  CaseExhibit,
  CaseAudio,
  FieldSource,
  ProceedingType,
  WorkflowStage,
} from "../types/case";
import { normalizeCaseRecord } from "../types/case";

import {
  intakeReducer,
  initialIntakeState,
  validateIntake,
} from "../store/intakeReducer";

import type {
  IntakeState,
  IntakeAction,
  ValidationResult,
} from "../store/intakeReducer";
import type { ExtractionApplication } from "../lib/parsing/applyExtraction";

// ─── Context shape ────────────────────────────────────────────────────────────

interface IntakeContextValue {
  state: IntakeState;
  dispatch: React.Dispatch<IntakeAction>;

  // ── Derived convenience ──────────────────────────────────────────────────────
  record: CaseRecord;
  dirty: boolean;
  editSeq: number;
  validation: ValidationResult;

  // ── Case lifecycle ───────────────────────────────────────────────────────────
  initNewCase: (case_id: string) => void;
  loadCase: (record: CaseRecord) => void;
  setProceedingType: (proceeding_type: ProceedingType) => void;
  setStage: (stage: WorkflowStage) => void;
  setStageComplete: (stage: WorkflowStage, complete: boolean) => void;
  setNotes: (notes: string) => void;
  setAudio: (audio: CaseAudio | null) => void;
  setKeyterms: (keyterms: CaseRecord["deepgram"]["keyterms"]) => void;

  // ── Field mutation ───────────────────────────────────────────────────────────
  updateField: (
    path: string,
    value: unknown,
    source?: FieldSource,
    confidence_score?: number | null,
    force?: boolean,
  ) => void;
  applyExtraction: (application: ExtractionApplication) => void;
  resolveConflict: (
    path: string,
    accepted_value: unknown,
    accepted_source: FieldSource,
  ) => void;
  confirmField: (path: string) => void;
  confirmAll: () => void;

  // ── Attorneys ────────────────────────────────────────────────────────────────
  addAttorney: (attorney: Omit<Attorney, "attorney_id">) => void;
  removeAttorney: (attorney_id: string) => void;
  updateAttorney: (attorney_id: string, patch: Partial<Omit<Attorney, "attorney_id">>) => void;

  // ── Witnesses ─────────────────────────────────────────────────────────────────
  addWitness: (witness: Omit<Witness, "witness_id">) => void;
  removeWitness: (witness_id: string) => void;
  updateWitness: (witness_id: string, patch: Partial<Omit<Witness, "witness_id">>) => void;

  // ── Interpreters ──────────────────────────────────────────────────────────────
  addInterpreter: (interpreter: Omit<Interpreter, "interpreter_id">) => void;
  removeInterpreter: (interpreter_id: string) => void;
  updateInterpreter: (interpreter_id: string, patch: Partial<Omit<Interpreter, "interpreter_id">>) => void;

  // ── Videographers ─────────────────────────────────────────────────────────────
  addVideographer: (videographer: Omit<Videographer, "videographer_id">) => void;
  removeVideographer: (videographer_id: string) => void;
  updateVideographer: (videographer_id: string, patch: Partial<Omit<Videographer, "videographer_id">>) => void;

  // ── Participants ──────────────────────────────────────────────────────────────
  addParticipant: (participant: Omit<Participant, "participant_id">) => void;
  removeParticipant: (participant_id: string) => void;
  updateParticipant: (participant_id: string, patch: Partial<Omit<Participant, "participant_id">>) => void;

  // ── Exhibits ──────────────────────────────────────────────────────────────────
  addExhibit: (exhibit: Omit<CaseExhibit, "exhibit_id">) => void;
  removeExhibit: (exhibit_id: string) => void;
  updateExhibit: (exhibit_id: string, patch: Partial<Omit<CaseExhibit, "exhibit_id">>) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const IntakeContext = createContext<IntakeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

function buildInitialState(record?: CaseRecord): IntakeState {
  if (!record) {
    return initialIntakeState();
  }

  const normalized = normalizeCaseRecord(record);
  return {
    record: normalized,
    dirty: false,
    last_saved_at: normalized.updated_at,
    editSeq: 0,
  };
}

export function IntakeProvider({
  initialRecord,
  children,
}: {
  initialRecord?: CaseRecord | null;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(intakeReducer, initialRecord ?? undefined, buildInitialState);

  const record = state.record;
  const dirty = state.dirty;
  const editSeq = state.editSeq;
  const validation = validateIntake(record);

  // ── Case lifecycle ─────────────────────────────────────────────────────────

  const initNewCase = useCallback((case_id: string) => {
    dispatch({ type: "INIT_NEW_CASE", payload: { case_id, now: new Date().toISOString() } });
  }, []);

  const loadCase = useCallback((rec: CaseRecord) => {
    dispatch({ type: "LOAD_CASE", payload: { record: normalizeCaseRecord(rec) } });
  }, []);

  const setProceedingType = useCallback((proceeding_type: ProceedingType) => {
    dispatch({ type: "SET_PROCEEDING_TYPE", payload: { proceeding_type } });
  }, []);

  const setStage = useCallback((stage: WorkflowStage) => {
    dispatch({ type: "SET_STAGE", payload: { stage } });
  }, []);

  const setStageComplete = useCallback((stage: WorkflowStage, complete: boolean) => {
    dispatch({ type: "SET_STAGE_COMPLETE", payload: { stage, complete } });
  }, []);

  const setNotes = useCallback((notes: string) => {
    dispatch({ type: "SET_NOTES", payload: { notes } });
  }, []);

  const setAudio = useCallback((audio: CaseAudio | null) => {
    dispatch({ type: "SET_AUDIO", payload: { audio } });
  }, []);

  const setKeyterms = useCallback((keyterms: CaseRecord["deepgram"]["keyterms"]) => {
    dispatch({ type: "SET_KEYTERMS", payload: { keyterms } });
  }, []);

  // ── Field mutation ─────────────────────────────────────────────────────────

  const updateField = useCallback(
    (
      path: string,
      value: unknown,
      source: FieldSource = "manual",
      confidence_score: number | null = null,
      force = false,
    ) => {
      dispatch({
        type: "UPDATE_FIELD",
        payload: { path, value, source, confidence_score, force },
      });
    },
    [],
  );

  const resolveConflict = useCallback(
    (path: string, accepted_value: unknown, accepted_source: FieldSource) => {
      dispatch({
        type: "RESOLVE_CONFLICT",
        payload: { path, accepted_value, accepted_source },
      });
    },
    [],
  );

  const confirmField = useCallback((path: string) => {
    dispatch({ type: "CONFIRM_FIELD", payload: { path } });
  }, []);

  const confirmAll = useCallback(() => {
    dispatch({ type: "CONFIRM_ALL" });
  }, []);

  const applyExtraction = useCallback((application: ExtractionApplication) => {
    dispatch({
      type: "APPLY_EXTRACTION",
      payload: {
        fieldUpdates: application.fieldUpdates,
        attorneyAdds: application.attorneyAdds,
        attorneyPatches: application.attorneyPatches,
        witnessAdds: application.witnessAdds,
        witnessPatches: application.witnessPatches,
        keyterms: application.keyterms,
      },
    });
  }, []);

  // ── Attorneys ──────────────────────────────────────────────────────────────

  const addAttorney = useCallback((attorney: Omit<Attorney, "attorney_id">) => {
    dispatch({ type: "ADD_ATTORNEY", payload: { attorney } });
  }, []);

  const removeAttorney = useCallback((attorney_id: string) => {
    dispatch({ type: "REMOVE_ATTORNEY", payload: { attorney_id } });
  }, []);

  const updateAttorney = useCallback(
    (attorney_id: string, patch: Partial<Omit<Attorney, "attorney_id">>) => {
      dispatch({ type: "UPDATE_ATTORNEY", payload: { attorney_id, patch } });
    },
    [],
  );

  // ── Witnesses ──────────────────────────────────────────────────────────────

  const addWitness = useCallback((witness: Omit<Witness, "witness_id">) => {
    dispatch({ type: "ADD_WITNESS", payload: { witness } });
  }, []);

  const removeWitness = useCallback((witness_id: string) => {
    dispatch({ type: "REMOVE_WITNESS", payload: { witness_id } });
  }, []);

  const updateWitness = useCallback(
    (witness_id: string, patch: Partial<Omit<Witness, "witness_id">>) => {
      dispatch({ type: "UPDATE_WITNESS", payload: { witness_id, patch } });
    },
    [],
  );

  // ── Interpreters ───────────────────────────────────────────────────────────

  const addInterpreter = useCallback((interpreter: Omit<Interpreter, "interpreter_id">) => {
    dispatch({ type: "ADD_INTERPRETER", payload: { interpreter } });
  }, []);

  const removeInterpreter = useCallback((interpreter_id: string) => {
    dispatch({ type: "REMOVE_INTERPRETER", payload: { interpreter_id } });
  }, []);

  const updateInterpreter = useCallback(
    (interpreter_id: string, patch: Partial<Omit<Interpreter, "interpreter_id">>) => {
      dispatch({ type: "UPDATE_INTERPRETER", payload: { interpreter_id, patch } });
    },
    [],
  );

  // ── Videographers ──────────────────────────────────────────────────────────

  const addVideographer = useCallback((videographer: Omit<Videographer, "videographer_id">) => {
    dispatch({ type: "ADD_VIDEOGRAPHER", payload: { videographer } });
  }, []);

  const removeVideographer = useCallback((videographer_id: string) => {
    dispatch({ type: "REMOVE_VIDEOGRAPHER", payload: { videographer_id } });
  }, []);

  const updateVideographer = useCallback(
    (videographer_id: string, patch: Partial<Omit<Videographer, "videographer_id">>) => {
      dispatch({ type: "UPDATE_VIDEOGRAPHER", payload: { videographer_id, patch } });
    },
    [],
  );

  // ── Participants ───────────────────────────────────────────────────────────

  const addParticipant = useCallback((participant: Omit<Participant, "participant_id">) => {
    dispatch({ type: "ADD_PARTICIPANT", payload: { participant } });
  }, []);

  const removeParticipant = useCallback((participant_id: string) => {
    dispatch({ type: "REMOVE_PARTICIPANT", payload: { participant_id } });
  }, []);

  const updateParticipant = useCallback(
    (participant_id: string, patch: Partial<Omit<Participant, "participant_id">>) => {
      dispatch({ type: "UPDATE_PARTICIPANT", payload: { participant_id, patch } });
    },
    [],
  );

  // ── Exhibits ───────────────────────────────────────────────────────────────

  const addExhibit = useCallback((exhibit: Omit<CaseExhibit, "exhibit_id">) => {
    dispatch({ type: "ADD_EXHIBIT", payload: { exhibit } });
  }, []);

  const removeExhibit = useCallback((exhibit_id: string) => {
    dispatch({ type: "REMOVE_EXHIBIT", payload: { exhibit_id } });
  }, []);

  const updateExhibit = useCallback(
    (exhibit_id: string, patch: Partial<Omit<CaseExhibit, "exhibit_id">>) => {
      dispatch({ type: "UPDATE_EXHIBIT", payload: { exhibit_id, patch } });
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────────

  const value: IntakeContextValue = {
    state,
    dispatch,
    record,
    dirty,
    editSeq,
    validation,
    initNewCase,
    loadCase,
    setProceedingType,
    setStage,
    setStageComplete,
    setNotes,
    setAudio,
    setKeyterms,
    updateField,
    applyExtraction,
    resolveConflict,
    confirmField,
    confirmAll,
    addAttorney,
    removeAttorney,
    updateAttorney,
    addWitness,
    removeWitness,
    updateWitness,
    addInterpreter,
    removeInterpreter,
    updateInterpreter,
    addVideographer,
    removeVideographer,
    updateVideographer,
    addParticipant,
    removeParticipant,
    updateParticipant,
    addExhibit,
    removeExhibit,
    updateExhibit,
  };

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

// ─── Primary hook ─────────────────────────────────────────────────────────────

export function useIntake(): IntakeContextValue {
  const ctx = useContext(IntakeContext);
  if (!ctx) throw new Error("useIntake must be used inside IntakeProvider");
  return ctx;
}

// ─── Selector hooks ───────────────────────────────────────────────────────────
// Fine-grained hooks so components only re-render when their slice changes.

export function useIntakeRecord(): CaseRecord {
  return useIntake().record;
}

export function useIntakeValidation(): ValidationResult {
  return useIntake().validation;
}

export function useIntakeDirty(): boolean {
  return useIntake().dirty;
}

export function useIntakeEditSeq(): number {
  return useIntake().editSeq;
}

export function useAttorneys(): Attorney[] {
  return useIntake().record.attorneys;
}

export function useWitnesses(): Witness[] {
  return useIntake().record.witnesses;
}

export function useInterpreters(): Interpreter[] {
  return useIntake().record.interpreters;
}

export function useVideographers(): Videographer[] {
  return useIntake().record.videographers;
}

export function useParticipants(): Participant[] {
  return useIntake().record.participants;
}

export function useExhibits(): CaseExhibit[] {
  return useIntake().record.exhibits;
}
