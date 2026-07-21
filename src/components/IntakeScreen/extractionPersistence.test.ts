import { describe, expect, it, vi } from "vitest";

import type { ExtractionApplication } from "../../lib/parsing/applyExtraction";
import { emptyCaseRecord } from "../../types/case";
import { applyAndPersistExtraction } from "./extractionPersistence";

function buildApplication(): ExtractionApplication {
  return {
    fieldUpdates: [
      {
        path: "caption.case_number",
        label: "Cause number",
        value: "25-cv-00598-OLG",
        confidence_score: 0.98,
      },
    ],
    conflicts: [],
    attorneyAdds: [],
    attorneyPatches: [],
    witnessAdds: [],
    witnessPatches: [],
    partyAdds: [],
    partyPatches: [],
    lawFirmAdds: [],
    lawFirmPatches: [],
    keyterms: [],
  };
}

describe("applyAndPersistExtraction", () => {
  it("triggers exactly one save after extraction is applied", async () => {
    const applyParsedExtraction = vi.fn();
    const recordExtraction = vi.fn();
    const detectConflict = vi.fn();
    const onRevealExtractedFields = vi.fn();
    const saveCaseRecord = vi.fn().mockResolvedValue(undefined);

    const result = await applyAndPersistExtraction({
      caseId: "case_20260605_abcd12",
      application: buildApplication(),
      applyParsedExtraction,
      recordExtraction,
      detectConflict,
      onRevealExtractedFields,
      saveCaseRecord,
    });

    expect(applyParsedExtraction).toHaveBeenCalledTimes(1);
    expect(saveCaseRecord).toHaveBeenCalledTimes(1);
    expect(recordExtraction).toHaveBeenCalledTimes(1);
    expect(result.summary).toEqual({ appliedCount: 1, conflictCount: 0 });
    expect(result.saveErrorMessage).toBeNull();
  });

  it("passes the post-extraction record snapshot to the save step when provided", async () => {
    const applyParsedExtraction = vi.fn();
    const recordExtraction = vi.fn();
    const detectConflict = vi.fn();
    const onRevealExtractedFields = vi.fn();
    const saveCaseRecord = vi.fn().mockResolvedValue(undefined);
    const recordToSave = {
      ...emptyCaseRecord("case_20260606_snap", "2026-06-06T18:00:00.000Z"),
      caption: {
        ...emptyCaseRecord("case_20260606_snap", "2026-06-06T18:00:00.000Z").caption,
        case_number: {
          value: "25-cv-00598-OLG",
          source: "extracted" as const,
          confirmed: false,
          conflict: false,
          confidence_score: 0.98,
        },
      },
    };

    await applyAndPersistExtraction({
      caseId: "case_20260606_snap",
      application: buildApplication(),
      applyParsedExtraction,
      recordExtraction,
      detectConflict,
      onRevealExtractedFields,
      saveCaseRecord,
      recordToSave,
    });

    expect(saveCaseRecord).toHaveBeenCalledWith(recordToSave);
  });

  it("leaves extracted state applied when the save step fails", async () => {
    const applyParsedExtraction = vi.fn();
    const recordExtraction = vi.fn();
    const detectConflict = vi.fn();
    const onRevealExtractedFields = vi.fn();
    const saveCaseRecord = vi.fn().mockRejectedValue(new Error("save exploded"));

    const result = await applyAndPersistExtraction({
      caseId: "case_20260605_abcd12",
      application: buildApplication(),
      applyParsedExtraction,
      recordExtraction,
      detectConflict,
      onRevealExtractedFields,
      saveCaseRecord,
    });

    expect(applyParsedExtraction).toHaveBeenCalledTimes(1);
    expect(saveCaseRecord).toHaveBeenCalledTimes(1);
    expect(result.summary).toEqual({ appliedCount: 1, conflictCount: 0 });
    expect(result.saveErrorMessage).toContain("save exploded");
  });
  it("counts populated fields inside collection additions instead of counting only the add operation", async () => {
    const application = buildApplication();
    const extracted = <T,>(value: T) => ({
      value,
      source: "extracted" as const,
      confirmed: false,
      conflict: false,
      confidence_score: 0.9,
    });
    application.partyAdds.push({
      party: {
        name: extracted("Sample Party"),
        role: extracted("plaintiff" as const),
        role_modifier: extracted(null),
        entity_type: extracted("individual" as const),
        fka_or_dba: extracted(null),
      },
    });

    const result = await applyAndPersistExtraction({
      caseId: "case_20260605_count", application, applyParsedExtraction: vi.fn(), recordExtraction: vi.fn(),
      detectConflict: vi.fn(), onRevealExtractedFields: vi.fn(), saveCaseRecord: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.summary).toEqual({ appliedCount: 4, conflictCount: 0 });
  });
});
