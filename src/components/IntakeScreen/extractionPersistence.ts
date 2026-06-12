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

function buildSummary(application: ExtractionApplication): ExtractionSummary {
  return {
    appliedCount:
      application.fieldUpdates.length +
      application.attorneyAdds.length +
      application.attorneyPatches.length +
      application.witnessAdds.length +
      application.witnessPatches.length +
      application.partyAdds.length +
      application.partyPatches.length +
      application.lawFirmAdds.length +
      application.lawFirmPatches.length,
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
