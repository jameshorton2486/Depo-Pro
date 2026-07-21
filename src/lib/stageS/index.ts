/**
 * Stage S — Validation & Repair Burden Measurement (PR #19).
 *
 * Public surface for the Stage S quality gate. Stage S observes and measures
 * the compiled transcript pipeline (Structured Package → Geometry → Unified
 * Rendering → Editorial → Export Contract) and applies only deterministic,
 * semantics-preserving, Stage-S-owned presentation repairs. It never modifies
 * any upstream owner.
 */

export type {
  AppliedRepair,
  RepairBurden,
  RepairCategory,
  RepairFinding,
  RepairOwner,
  RepairSeverity,
  StageSSuiteResult,
  StageSValidationResult,
  UpstreamMetrics,
} from "./types";
export {
  REPAIR_CATEGORIES,
  REPAIR_OWNERS,
  REPAIR_SEVERITIES,
} from "./types";

export { computeRepairBurden, mergeRepairBurdens } from "./repairBurden";
export { applyStageSPresentationRepairs, type PresentationRepairResult } from "./deterministicRepairs";
export {
  estimateCharsPerLine,
  estimatePageCount,
  STRUCTURAL_VALIDATORS,
  validateColloquyTransitions,
  validateExaminationBoundary,
  validateGeometry,
  validateObjectionPlacement,
  validateParagraphContinuity,
  validateParentheticalPlacement,
  validateQaContinuity,
  validateSectionTransitions,
  validateSpeakerLabelContinuity,
} from "./validators";
export {
  runStageSValidation,
  runStageSValidationSuite,
  type RunOptions,
  type StageSFixture,
} from "./validationEngine";
export {
  generateMetricsJson,
  generateRepairBurdenReport,
  generateValidationReport,
} from "./reportGenerators";
export { STAGE_S_RC_FIXTURES } from "./fixtures";
