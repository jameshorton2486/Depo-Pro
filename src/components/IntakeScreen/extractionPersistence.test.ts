import { describe, expect, it, vi } from "vitest";

import type { ExtractionApplication } from "../../lib/parsing/applyExtraction";
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
});
