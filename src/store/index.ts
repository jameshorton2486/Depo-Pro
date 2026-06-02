// Barrel export for the intake store layer.
// Import actions and state types from here rather than directly from intakeReducer.

export type {
  IntakeState,
  IntakeAction,
  ValidationResult,
  ConflictEntry,
  InitNewCaseAction,
  LoadCaseAction,
  SetProceedingTypeAction,
  SetStageAction,
  SetStageCompleteAction,
  SetNotesAction,
  UpdateFieldAction,
  ResolveConflictAction,
  ConfirmFieldAction,
  ConfirmAllAction,
  AddAttorneyAction,
  RemoveAttorneyAction,
  UpdateAttorneyAction,
  AddWitnessAction,
  RemoveWitnessAction,
  UpdateWitnessAction,
  AddInterpreterAction,
  RemoveInterpreterAction,
  UpdateInterpreterAction,
  AddVideographerAction,
  RemoveVideographerAction,
  UpdateVideographerAction,
  AddParticipantAction,
  RemoveParticipantAction,
  UpdateParticipantAction,
  AddExhibitAction,
  RemoveExhibitAction,
  UpdateExhibitAction,
} from "./intakeReducer";

export {
  intakeReducer,
  initialIntakeState,
  validateIntake,
} from "./intakeReducer";
