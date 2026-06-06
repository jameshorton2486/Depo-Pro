import { createContext } from "react";

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
import type {
  IntakeState,
  IntakeAction,
  ValidationResult,
} from "../store/intakeReducer";
import type { ExtractionApplication } from "../lib/parsing/applyExtraction";

export interface IntakeContextValue {
  state: IntakeState;
  dispatch: React.Dispatch<IntakeAction>;
  record: CaseRecord;
  dirty: boolean;
  editSeq: number;
  validation: ValidationResult;
  initNewCase: (case_id: string) => void;
  loadCase: (record: CaseRecord) => void;
  setProceedingType: (proceeding_type: ProceedingType) => void;
  setStage: (stage: WorkflowStage) => void;
  setStageComplete: (stage: WorkflowStage, complete: boolean) => void;
  setNotes: (notes: string) => void;
  setAudio: (audio: CaseAudio | null) => void;
  setKeyterms: (keyterms: CaseRecord["deepgram"]["keyterms"]) => void;
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
  addAttorney: (attorney: Omit<Attorney, "attorney_id">) => void;
  removeAttorney: (attorney_id: string) => void;
  updateAttorney: (attorney_id: string, patch: Partial<Omit<Attorney, "attorney_id">>) => void;
  addWitness: (witness: Omit<Witness, "witness_id">) => void;
  removeWitness: (witness_id: string) => void;
  updateWitness: (witness_id: string, patch: Partial<Omit<Witness, "witness_id">>) => void;
  addInterpreter: (interpreter: Omit<Interpreter, "interpreter_id">) => void;
  removeInterpreter: (interpreter_id: string) => void;
  updateInterpreter: (interpreter_id: string, patch: Partial<Omit<Interpreter, "interpreter_id">>) => void;
  addVideographer: (videographer: Omit<Videographer, "videographer_id">) => void;
  removeVideographer: (videographer_id: string) => void;
  updateVideographer: (videographer_id: string, patch: Partial<Omit<Videographer, "videographer_id">>) => void;
  addParticipant: (participant: Omit<Participant, "participant_id">) => void;
  removeParticipant: (participant_id: string) => void;
  updateParticipant: (participant_id: string, patch: Partial<Omit<Participant, "participant_id">>) => void;
  addExhibit: (exhibit: Omit<CaseExhibit, "exhibit_id">) => void;
  removeExhibit: (exhibit_id: string) => void;
  updateExhibit: (exhibit_id: string, patch: Partial<Omit<CaseExhibit, "exhibit_id">>) => void;
}

export const IntakeContext = createContext<IntakeContextValue | null>(null);
