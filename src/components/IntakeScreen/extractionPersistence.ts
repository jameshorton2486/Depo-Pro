import type { ExtractionApplication } from "../../lib/parsing/applyExtraction";
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
  ) => void;
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
  ) => void;
  onRevealExtractedFields: () => void;
  saveCaseRecord: () => Promise<unknown>;
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
      application.witnessPatches.length,
    conflictCount: application.conflicts.length,
  };
}

function persistConflict(
  caseId: string,
  conflict: ExtractionConflict,
  detectConflict: ApplyAndPersistExtractionParams["detectConflict"],
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
      source: "Notice",
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
}: ApplyAndPersistExtractionParams): Promise<ExtractionPersistenceResult> {
  applyParsedExtraction(application);

  for (const update of application.fieldUpdates) {
    recordExtraction(caseId, update.path, update.label, String(update.value), "Notice", update.confidence_score);
  }

  for (const conflict of application.conflicts) {
    persistConflict(caseId, conflict, detectConflict);
  }

  const summary = buildSummary(application);
  onRevealExtractedFields();

  try {
    await saveCaseRecord();
    return { summary, saveErrorMessage: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      summary,
      saveErrorMessage: `Extraction applied, but saving the case failed: ${message}`,
    };
  }
}
