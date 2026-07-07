// Pure reducer for Intake state management.
// No React, no side effects — safe to unit-test in isolation.
// All mutations go through this reducer; nothing updates CaseRecord directly.

import type {
  CaseRecord,
  CaseCertification,
  Attorney,
  CaseParty,
  Witness,
  Interpreter,
  LawFirm,
  Videographer,
  Participant,
  CaseExhibit,
  CaseAudio,
  ExtractedField,
  FieldSource,
  LocationType,
  ProceedingType,
  WorkflowStage,
} from "../types/case";

import {
  emptyCaseRecord,
} from "../types/case";

// ─── ID generator ─────────────────────────────────────────────────────────────
// Deterministic prefix + timestamp + random suffix — no external dependency.
function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Conflict resolution helpers ─────────────────────────────────────────────

export type ConflictEntry<T> = {
  previous_value: T;
  previous_source: FieldSource;
  replaced_at: string; // ISO datetime
};

// When a field is updated, if the existing value is confirmed and a new value
// arrives from a different source, we flag a conflict instead of overwriting.
function applyFieldUpdate<T>(
  existing: ExtractedField<T>,
  incoming_value: T,
  incoming_source: FieldSource,
  incoming_confidence: number | null,
  force: boolean,
): ExtractedField<T> {
  const same_value = JSON.stringify(existing.value) === JSON.stringify(incoming_value);
  if (same_value) return existing;

  // If confirmed and the update is from a different source, flag conflict.
  const conflict =
    !force &&
    existing.confirmed &&
    existing.source !== incoming_source &&
    existing.value !== null &&
    existing.value !== "";

  return {
    value: conflict ? existing.value : incoming_value,
    source: conflict ? existing.source : incoming_source,
    confirmed: conflict ? existing.confirmed : false,
    conflict,
    confidence_score: conflict ? existing.confidence_score : incoming_confidence,
  };
}

// ─── Action definitions ───────────────────────────────────────────────────────

// ── Case-level ────────────────────────────────────────────────────────────────
export type InitNewCaseAction    = { type: "INIT_NEW_CASE"; payload: { case_id: string; now: string } };
export type LoadCaseAction       = { type: "LOAD_CASE"; payload: { record: CaseRecord } };
export type SetProceedingTypeAction = { type: "SET_PROCEEDING_TYPE"; payload: { proceeding_type: ProceedingType } };
export type SetStageAction       = { type: "SET_STAGE"; payload: { stage: WorkflowStage } };
export type SetStageCompleteAction = { type: "SET_STAGE_COMPLETE"; payload: { stage: WorkflowStage; complete: boolean } };
export type SetNotesAction       = { type: "SET_NOTES"; payload: { notes: string } };
export type SetAudioAction       = { type: "SET_AUDIO"; payload: { audio: CaseAudio | null } };
export type SetKeytermsAction    = { type: "SET_KEYTERMS"; payload: { keyterms: CaseRecord["deepgram"]["keyterms"] } };
export type SetCertificationAction = { type: "SET_CERTIFICATION"; payload: { certification: CaseCertification | null } };

// ── Field update (generic path into CaseRecord) ───────────────────────────────
// Targets a dot-path within the record's ExtractedField leaves.
export type UpdateFieldAction = {
  type: "UPDATE_FIELD";
  payload: {
    path: string;            // e.g. "caption.case_name" | "session.deposition_date"
    value: unknown;
    source: FieldSource;
    confidence_score: number | null;
    force?: boolean;         // bypass conflict detection
  };
};

export type ApplyExtractionAction = {
  type: "APPLY_EXTRACTION";
  payload: {
    fieldUpdates: Array<{
      path: string;
      value: unknown;
      confidence_score: number | null;
    }>;
    attorneyAdds?: Array<{ attorney: Omit<Attorney, "attorney_id"> }>;
    attorneyPatches?: Array<{
      attorney_id: string;
      patch: Partial<Omit<Attorney, "attorney_id">>;
    }>;
    witnessAdds?: Array<{ witness: Omit<Witness, "witness_id"> }>;
    witnessPatches?: Array<{
      witness_id: string;
      patch: Partial<Omit<Witness, "witness_id">>;
    }>;
    partyAdds?: Array<{ party: Omit<CaseParty, "party_id"> }>;
    partyPatches?: Array<{
      party_id: string;
      patch: Partial<Omit<CaseParty, "party_id">>;
    }>;
    lawFirmAdds?: Array<{ law_firm: Omit<LawFirm, "law_firm_id"> }>;
    lawFirmPatches?: Array<{
      law_firm_id: string;
      patch: Partial<Omit<LawFirm, "law_firm_id">>;
    }>;
    keyterms?: CaseRecord["deepgram"]["keyterms"];
  };
};

// ── Conflict resolution ───────────────────────────────────────────────────────
export type ResolveConflictAction = {
  type: "RESOLVE_CONFLICT";
  payload: {
    path: string;
    accepted_value: unknown;
    accepted_source: FieldSource;
  };
};

// ── Field confirmation ────────────────────────────────────────────────────────
export type ConfirmFieldAction = {
  type: "CONFIRM_FIELD";
  payload: { path: string };
};

export type ConfirmAllAction = {
  type: "CONFIRM_ALL";
};

// ── Attorneys ─────────────────────────────────────────────────────────────────
export type AddAttorneyAction    = { type: "ADD_ATTORNEY";    payload: { attorney: Omit<Attorney, "attorney_id"> } };
export type RemoveAttorneyAction = { type: "REMOVE_ATTORNEY"; payload: { attorney_id: string } };
export type UpdateAttorneyAction = {
  type: "UPDATE_ATTORNEY";
  payload: {
    attorney_id: string;
    patch: Partial<Omit<Attorney, "attorney_id">>;
  };
};

// ── Witnesses ─────────────────────────────────────────────────────────────────
export type AddWitnessAction    = { type: "ADD_WITNESS";    payload: { witness: Omit<Witness, "witness_id"> } };
export type RemoveWitnessAction = { type: "REMOVE_WITNESS"; payload: { witness_id: string } };
export type UpdateWitnessAction = {
  type: "UPDATE_WITNESS";
  payload: {
    witness_id: string;
    patch: Partial<Omit<Witness, "witness_id">>;
  };
};

// ── Interpreters ──────────────────────────────────────────────────────────────
export type AddInterpreterAction    = { type: "ADD_INTERPRETER";    payload: { interpreter: Omit<Interpreter, "interpreter_id"> } };
export type RemoveInterpreterAction = { type: "REMOVE_INTERPRETER"; payload: { interpreter_id: string } };
export type UpdateInterpreterAction = {
  type: "UPDATE_INTERPRETER";
  payload: {
    interpreter_id: string;
    patch: Partial<Omit<Interpreter, "interpreter_id">>;
  };
};

// ── Videographers ─────────────────────────────────────────────────────────────
export type AddVideographerAction    = { type: "ADD_VIDEOGRAPHER";    payload: { videographer: Omit<Videographer, "videographer_id"> } };
export type RemoveVideographerAction = { type: "REMOVE_VIDEOGRAPHER"; payload: { videographer_id: string } };
export type UpdateVideographerAction = {
  type: "UPDATE_VIDEOGRAPHER";
  payload: {
    videographer_id: string;
    patch: Partial<Omit<Videographer, "videographer_id">>;
  };
};

// ── Participants ──────────────────────────────────────────────────────────────
export type AddParticipantAction    = { type: "ADD_PARTICIPANT";    payload: { participant: Omit<Participant, "participant_id"> } };
export type RemoveParticipantAction = { type: "REMOVE_PARTICIPANT"; payload: { participant_id: string } };
export type UpdateParticipantAction = {
  type: "UPDATE_PARTICIPANT";
  payload: {
    participant_id: string;
    patch: Partial<Omit<Participant, "participant_id">>;
  };
};

// ── Exhibits ──────────────────────────────────────────────────────────────────
export type AddExhibitAction    = { type: "ADD_EXHIBIT";    payload: { exhibit: Omit<CaseExhibit, "exhibit_id"> } };
export type RemoveExhibitAction = { type: "REMOVE_EXHIBIT"; payload: { exhibit_id: string } };
export type UpdateExhibitAction = {
  type: "UPDATE_EXHIBIT";
  payload: {
    exhibit_id: string;
    patch: Partial<Omit<CaseExhibit, "exhibit_id">>;
  };
};

// ─── Union ────────────────────────────────────────────────────────────────────

export type IntakeAction =
  | InitNewCaseAction
  | LoadCaseAction
  | SetProceedingTypeAction
  | SetStageAction
  | SetStageCompleteAction
  | SetNotesAction
  | SetAudioAction
  | SetKeytermsAction
  | SetCertificationAction
  | UpdateFieldAction
  | ApplyExtractionAction
  | ResolveConflictAction
  | ConfirmFieldAction
  | ConfirmAllAction
  | AddAttorneyAction
  | RemoveAttorneyAction
  | UpdateAttorneyAction
  | AddWitnessAction
  | RemoveWitnessAction
  | UpdateWitnessAction
  | AddInterpreterAction
  | RemoveInterpreterAction
  | UpdateInterpreterAction
  | AddVideographerAction
  | RemoveVideographerAction
  | UpdateVideographerAction
  | AddParticipantAction
  | RemoveParticipantAction
  | UpdateParticipantAction
  | AddExhibitAction
  | RemoveExhibitAction
  | UpdateExhibitAction;

// ─── State shape ──────────────────────────────────────────────────────────────

export interface IntakeState {
  record: CaseRecord;
  dirty: boolean;            // unsaved changes exist
  last_saved_at: string | null;
  editSeq: number;
}

export function initialIntakeState(): IntakeState {
  return {
    record: emptyCaseRecord("", new Date().toISOString()),
    dirty: false,
    last_saved_at: null,
    editSeq: 0,
  };
}

function deriveIsRemote(locationType: LocationType | null): boolean {
  return locationType === "zoom" || locationType === "phone" || locationType === "hybrid";
}

function applyLocationTypeDerivation(record: CaseRecord): CaseRecord {
  return {
    ...record,
    session: {
      ...record.session,
      is_remote: deriveIsRemote(record.session.location_type.value),
    },
  };
}

// ─── Path resolver ────────────────────────────────────────────────────────────
// Resolves a dot-path against the record and returns the ExtractedField leaf,
// plus a setter that returns a new record with that leaf replaced.
// Only works for paths that resolve to ExtractedField nodes.

type SetterResult<T> = {
  field: ExtractedField<T>;
  set: (next: ExtractedField<T>) => CaseRecord;
} | null;

function resolveExtractedPath<T>(record: CaseRecord, path: string): SetterResult<T> {
  const keys = path
    .split(".")
    .flatMap((segment) => {
      const match = segment.match(/^([^[]+)\[(\d+)\]$/);
      return match ? [match[1], match[2]] : [segment];
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = record;
  const ancestry: Array<{ obj: Record<string, unknown>; key: string }> = [];

  for (const key of keys) {
    if (node == null || typeof node !== "object") return null;
    ancestry.push({ obj: node as Record<string, unknown>, key });
    node = (node as Record<string, unknown>)[key];
  }

  // node is now the ExtractedField leaf
  if (node == null || typeof node !== "object" || !("value" in node)) return null;

  const field = node as ExtractedField<T>;

  const set = (next: ExtractedField<T>): CaseRecord => {
    // Immutably rebuild from the leaf outward
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rebuilt: any = next;
    for (let i = ancestry.length - 1; i >= 0; i--) {
      const { obj, key } = ancestry[i];
      if (Array.isArray(obj)) {
        const copy = obj.slice();
        copy[Number(key)] = rebuilt;
        rebuilt = copy;
      } else {
        rebuilt = { ...obj, [key]: rebuilt };
      }
    }
    return rebuilt as CaseRecord;
  };

  return { field, set };
}

// Walk all ExtractedField leaves in the record and confirm them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function confirmAllFields(obj: any): any {
  if (obj == null || typeof obj !== "object") return obj;
  if ("value" in obj && "confirmed" in obj && "source" in obj) {
    return { ...obj, confirmed: true, conflict: false };
  }
  if (Array.isArray(obj)) return obj.map(confirmAllFields);
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key] = confirmAllFields(obj[key]);
  }
  return result;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function intakeReducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {

    case "INIT_NEW_CASE": {
      const { case_id, now } = action.payload;
      return {
        record: emptyCaseRecord(case_id, now),
        dirty: false,
        last_saved_at: null,
        editSeq: 0,
      };
    }

    case "LOAD_CASE": {
      return {
        record: action.payload.record,
        dirty: false,
        last_saved_at: action.payload.record.updated_at,
        editSeq: 0,
      };
    }

    case "SET_PROCEEDING_TYPE": {
      const { proceeding_type } = action.payload;
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          proceeding_type,
          proceeding: { ...state.record.proceeding, proceeding_type },
        },
      };
    }

    case "SET_STAGE": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: { ...state.record, stage: action.payload.stage },
      };
    }

    case "SET_STAGE_COMPLETE": {
      const { stage, complete } = action.payload;
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          stage_completion: { ...state.record.stage_completion, [stage]: complete },
        },
      };
    }

    case "SET_NOTES": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: { ...state.record, notes: action.payload.notes },
      };
    }

    case "SET_AUDIO": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: { ...state.record, audio: action.payload.audio },
      };
    }

    case "SET_KEYTERMS": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          deepgram: {
            ...state.record.deepgram,
            keyterms: action.payload.keyterms,
          },
        },
      };
    }

    case "SET_CERTIFICATION": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          certification: action.payload.certification,
        },
      };
    }

    case "UPDATE_FIELD": {
      const { path, value, source, confidence_score, force = false } = action.payload;
      const resolved = resolveExtractedPath<unknown>(state.record, path);
      if (!resolved) return state;

      const next = applyFieldUpdate(
        resolved.field,
        value,
        source,
        confidence_score,
        force,
      );
      const nextRecord = resolved.set(next);
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: path === "session.location_type" ? applyLocationTypeDerivation(nextRecord) : nextRecord,
      };
    }

    case "APPLY_EXTRACTION": {
      let nextRecord = state.record;

      for (const update of action.payload.fieldUpdates) {
        const resolved = resolveExtractedPath<unknown>(nextRecord, update.path);
        if (!resolved) continue;
        const next: ExtractedField<unknown> = {
          value: update.value,
          source: "extracted",
          confirmed: false,
          conflict: false,
          confidence_score: update.confidence_score,
        };
        nextRecord = resolved.set(next);
      }

      for (const attorneyAdd of action.payload.attorneyAdds ?? []) {
        nextRecord = {
          ...nextRecord,
          attorneys: [
            ...nextRecord.attorneys,
            {
              ...attorneyAdd.attorney,
              attorney_id: newId("atty"),
            },
          ],
        };
      }

      for (const attorneyPatch of action.payload.attorneyPatches ?? []) {
        nextRecord = {
          ...nextRecord,
          attorneys: nextRecord.attorneys.map((attorney) =>
            attorney.attorney_id === attorneyPatch.attorney_id
              ? { ...attorney, ...attorneyPatch.patch }
              : attorney,
          ),
        };
      }

      for (const witnessAdd of action.payload.witnessAdds ?? []) {
        nextRecord = {
          ...nextRecord,
          witnesses: [
            ...nextRecord.witnesses,
            {
              ...witnessAdd.witness,
              witness_id: newId("wit"),
            },
          ],
        };
      }

      for (const witnessPatch of action.payload.witnessPatches ?? []) {
        nextRecord = {
          ...nextRecord,
          witnesses: nextRecord.witnesses.map((witness) =>
            witness.witness_id === witnessPatch.witness_id
              ? { ...witness, ...witnessPatch.patch }
              : witness,
          ),
        };
      }

      for (const partyAdd of action.payload.partyAdds ?? []) {
        nextRecord = {
          ...nextRecord,
          parties: [
            ...nextRecord.parties,
            {
              ...partyAdd.party,
              party_id: newId("party"),
            },
          ],
        };
      }

      for (const partyPatch of action.payload.partyPatches ?? []) {
        nextRecord = {
          ...nextRecord,
          parties: nextRecord.parties.map((party) =>
            party.party_id === partyPatch.party_id
              ? { ...party, ...partyPatch.patch }
              : party,
          ),
        };
      }

      for (const lawFirmAdd of action.payload.lawFirmAdds ?? []) {
        nextRecord = {
          ...nextRecord,
          law_firms: [
            ...nextRecord.law_firms,
            {
              ...lawFirmAdd.law_firm,
              law_firm_id: newId("firm"),
            },
          ],
        };
      }

      for (const lawFirmPatch of action.payload.lawFirmPatches ?? []) {
        nextRecord = {
          ...nextRecord,
          law_firms: nextRecord.law_firms.map((lawFirm) =>
            lawFirm.law_firm_id === lawFirmPatch.law_firm_id
              ? { ...lawFirm, ...lawFirmPatch.patch }
              : lawFirm,
          ),
        };
      }

      if (action.payload.keyterms) {
        nextRecord = {
          ...nextRecord,
          deepgram: {
            ...nextRecord.deepgram,
            keyterms: action.payload.keyterms,
          },
        };
      }

      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: applyLocationTypeDerivation(nextRecord),
      };
    }

    case "RESOLVE_CONFLICT": {
      const { path, accepted_value, accepted_source } = action.payload;
      const resolved = resolveExtractedPath<unknown>(state.record, path);
      if (!resolved) return state;

      const next: ExtractedField<unknown> = {
        value: accepted_value,
        source: accepted_source,
        confirmed: true,
        conflict: false,
        confidence_score: resolved.field.confidence_score,
      };
      return { ...state, dirty: true, editSeq: state.editSeq + 1, record: resolved.set(next) };
    }

    case "CONFIRM_FIELD": {
      const resolved = resolveExtractedPath<unknown>(state.record, action.payload.path);
      if (!resolved) return state;

      const next: ExtractedField<unknown> = {
        ...resolved.field,
        confirmed: true,
        conflict: false,
      };
      return { ...state, dirty: true, editSeq: state.editSeq + 1, record: resolved.set(next) };
    }

    case "CONFIRM_ALL": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: confirmAllFields(state.record) as CaseRecord,
      };
    }

    // ── Attorneys ──────────────────────────────────────────────────────────────

    case "ADD_ATTORNEY": {
      const attorney: Attorney = {
        ...action.payload.attorney,
        attorney_id: newId("atty"),
      };
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          attorneys: [...state.record.attorneys, attorney],
        },
      };
    }

    case "REMOVE_ATTORNEY": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          attorneys: state.record.attorneys.filter(
            (a) => a.attorney_id !== action.payload.attorney_id,
          ),
        },
      };
    }

    case "UPDATE_ATTORNEY": {
      const { attorney_id, patch } = action.payload;
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          attorneys: state.record.attorneys.map((a) =>
            a.attorney_id === attorney_id ? { ...a, ...patch } : a,
          ),
        },
      };
    }

    // ── Witnesses ──────────────────────────────────────────────────────────────

    case "ADD_WITNESS": {
      const witness: Witness = {
        ...action.payload.witness,
        witness_id: newId("wit"),
      };
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          witnesses: [...state.record.witnesses, witness],
        },
      };
    }

    case "REMOVE_WITNESS": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          witnesses: state.record.witnesses.filter(
            (w) => w.witness_id !== action.payload.witness_id,
          ),
        },
      };
    }

    case "UPDATE_WITNESS": {
      const { witness_id, patch } = action.payload;
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          witnesses: state.record.witnesses.map((w) =>
            w.witness_id === witness_id ? { ...w, ...patch } : w,
          ),
        },
      };
    }

    // ── Interpreters ───────────────────────────────────────────────────────────

    case "ADD_INTERPRETER": {
      const interpreter: Interpreter = {
        ...action.payload.interpreter,
        interpreter_id: newId("interp"),
      };
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          interpreters: [...state.record.interpreters, interpreter],
        },
      };
    }

    case "REMOVE_INTERPRETER": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          interpreters: state.record.interpreters.filter(
            (i) => i.interpreter_id !== action.payload.interpreter_id,
          ),
        },
      };
    }

    case "UPDATE_INTERPRETER": {
      const { interpreter_id, patch } = action.payload;
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          interpreters: state.record.interpreters.map((i) =>
            i.interpreter_id === interpreter_id ? { ...i, ...patch } : i,
          ),
        },
      };
    }

    // ── Videographers ──────────────────────────────────────────────────────────

    case "ADD_VIDEOGRAPHER": {
      const videographer: Videographer = {
        ...action.payload.videographer,
        videographer_id: newId("vid"),
      };
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          videographers: [...state.record.videographers, videographer],
        },
      };
    }

    case "REMOVE_VIDEOGRAPHER": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          videographers: state.record.videographers.filter(
            (v) => v.videographer_id !== action.payload.videographer_id,
          ),
        },
      };
    }

    case "UPDATE_VIDEOGRAPHER": {
      const { videographer_id, patch } = action.payload;
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          videographers: state.record.videographers.map((v) =>
            v.videographer_id === videographer_id ? { ...v, ...patch } : v,
          ),
        },
      };
    }

    // ── Participants ───────────────────────────────────────────────────────────

    case "ADD_PARTICIPANT": {
      const participant: Participant = {
        ...action.payload.participant,
        participant_id: newId("part"),
      };
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          participants: [...state.record.participants, participant],
        },
      };
    }

    case "REMOVE_PARTICIPANT": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          participants: state.record.participants.filter(
            (p) => p.participant_id !== action.payload.participant_id,
          ),
        },
      };
    }

    case "UPDATE_PARTICIPANT": {
      const { participant_id, patch } = action.payload;
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          participants: state.record.participants.map((p) =>
            p.participant_id === participant_id ? { ...p, ...patch } : p,
          ),
        },
      };
    }

    // ── Exhibits ───────────────────────────────────────────────────────────────

    case "ADD_EXHIBIT": {
      const exhibit: CaseExhibit = {
        ...action.payload.exhibit,
        exhibit_id: newId("ex"),
      };
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          exhibits: [...state.record.exhibits, exhibit],
        },
      };
    }

    case "REMOVE_EXHIBIT": {
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          exhibits: state.record.exhibits.filter(
            (e) => e.exhibit_id !== action.payload.exhibit_id,
          ),
        },
      };
    }

    case "UPDATE_EXHIBIT": {
      const { exhibit_id, patch } = action.payload;
      return {
        ...state,
        dirty: true,
        editSeq: state.editSeq + 1,
        record: {
          ...state.record,
          exhibits: state.record.exhibits.map((e) =>
            e.exhibit_id === exhibit_id ? { ...e, ...patch } : e,
          ),
        },
      };
    }

    default:
      return state;
  }
}

// ─── UFM validation ───────────────────────────────────────────────────────────
// Deprecated for Intake UI gating; Phase 2 uses src/validation/intakeValidation.ts.
// Returns the set of dot-paths that are required but not yet confirmed.

export interface ValidationResult {
  valid: boolean;
  missing: string[];    // required fields with empty values
  unconfirmed: string[]; // populated but not yet confirmed by reporter
  conflicted: string[]; // fields with active conflicts
}

const REQUIRED_PATHS: string[] = [
  "caption.case_name",
  "caption.case_number",
  "caption.court_name",
  "session.deposition_date",
  "session.location_address",
  "session.location_city",
  "session.location_state",
  "reporter.name",
  "reporter.cert_number",
  "reporter.cert_state",
];

export function validateIntake(record: CaseRecord): ValidationResult {
  // Phase 2: validation tiers per UFM_TEXAS_REQUIREMENTS.md §9
  const missing: string[] = [];
  const unconfirmed: string[] = [];
  const conflicted: string[] = [];

  for (const path of REQUIRED_PATHS) {
    const resolved = resolveExtractedPath<unknown>(record, path);
    if (!resolved) { missing.push(path); continue; }

    const { field } = resolved;
    if (field.value === null || field.value === "") {
      missing.push(path);
    } else {
      if (field.conflict) conflicted.push(path);
      if (!field.confirmed) unconfirmed.push(path);
    }
  }

  // At least one examining attorney is required.
  const hasExamining = record.attorneys.some(
    (a) => a.role.value === "EXAMINING",
  );
  if (!hasExamining) missing.push("attorneys[EXAMINING]");

  return {
    valid: missing.length === 0 && conflicted.length === 0,
    missing,
    unconfirmed,
    conflicted,
  };
}
