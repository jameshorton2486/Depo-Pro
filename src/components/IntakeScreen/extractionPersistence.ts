import type { ExtractionApplication } from "../../lib/parsing/applyExtraction";
import type { CaseRecord } from "../../types/case";
import type { FieldSource } from "../../types/case";

export interface ExtractionSummary {
  appliedCount: number;
  conflictCount: number;
}

type DisplaySource = "Notice" | "Job Sheet" | "Reporter Profile" | "Manual";

type ExtractionConflict = ExtractionApplication["conflicts"][number];

type ApplyAndPersistExtractionParams = {
  caseId: string;
  application: ExtractionApplication;
  applyParsedExtraction: (application: ExtractionApplication) => void;
  recordExtraction: (
    caseId: string,
    fieldPath: string,
    fieldLabel: string,
    value: string,
    source: DisplaySource,
    confidence: number | null,
  ) => void | Promise<void>;
  detectConflict: (
    caseId: string,
    fieldPath: string,
    fieldLabel: string,
    optionA: {
      value: string;
      source: DisplaySource;
      confidence_score: number | null;
    },
    optionB: {
      value: string;
      source: DisplaySource;
      confidence_score: number | null;
    },
  ) => void | Promise<void>;
  onRevealExtractedFields: () => void;
  saveCaseRecord: (recordOverride?: CaseRecord) => Promise<unknown>;
  recordToSave?: CaseRecord;
  sourceLabel?: DisplaySource;
};

export interface ExtractionPersistenceResult {
  summary: ExtractionSummary;
  saveErrorMessage: string | null;
}

function toDisplaySourceFromFieldSource(source: FieldSource): DisplaySource {
  if (source === "extracted") return "Notice";
  if (source === "imported") return "Reporter Profile";
  return "Manual";
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function isExtractedField(value: unknown): value is { value: unknown; source: FieldSource } {
  return typeof value === "object"
    && value !== null
    && "value" in value
    && "source" in value;
}

function countAppliedFields(value: unknown): number {
  if (isExtractedField(value)) {
    return hasMeaningfulValue(value.value) ? 1 : 0;
  }
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + countAppliedFields(item), 0);
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).reduce((count, item) => count + countAppliedFields(item), 0);
  }
  return 0;
}
function buildSummary(application: ExtractionApplication): ExtractionSummary {
  return {
    appliedCount:
      application.fieldUpdates.filter((update) => hasMeaningfulValue(update.value)).length +
      countAppliedFields(application.attorneyAdds) +
      countAppliedFields(application.attorneyPatches) +
      countAppliedFields(application.witnessAdds) +
      countAppliedFields(application.witnessPatches) +
      countAppliedFields(application.partyAdds) +
      countAppliedFields(application.partyPatches) +
      countAppliedFields(application.lawFirmAdds) +
      countAppliedFields(application.lawFirmPatches),
    conflictCount: application.conflicts.length,
  };
}

function persistConflict(
  caseId: string,
  conflict: ExtractionConflict,
  detectConflict: ApplyAndPersistExtractionParams["detectConflict"],
  sourceLabel: DisplaySource,
) {
  detectConflict(
    caseId,
    conflict.path,
    conflict.label,
    {
      value: conflict.currentValue,
      source: toDisplaySourceFromFieldSource(conflict.currentSource),
      confidence_score: null,
    },
    {
      value: conflict.incomingValue,
      source: sourceLabel,
      confidence_score: conflict.incomingConfidence,
    },
  );
}

export async function applyAndPersistExtraction({
  caseId,
  application,
  applyParsedExtraction,
  recordExtraction,
  detectConflict,
  onRevealExtractedFields,
  saveCaseRecord,
  recordToSave,
  sourceLabel = "Notice",
}: ApplyAndPersistExtractionParams): Promise<ExtractionPersistenceResult> {
  applyParsedExtraction(application);

  for (const update of application.fieldUpdates) {
    recordExtraction(caseId, update.path, update.label, String(update.value), sourceLabel, update.confidence_score);
  }

  for (const conflict of application.conflicts) {
    persistConflict(caseId, conflict, detectConflict, sourceLabel);
  }

  const summary = buildSummary(application);
  onRevealExtractedFields();

  try {
    await saveCaseRecord(recordToSave);
    return { summary, saveErrorMessage: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      summary,
      saveErrorMessage: `Extraction applied, but saving the case failed: ${message}`,
    };
  }
}
