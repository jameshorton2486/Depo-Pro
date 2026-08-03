import { describe, expect, it, vi } from "vitest";

import { projectFieldRows } from "../../components/ExtractedFieldsTable/fieldProjection";
import { applyAndPersistExtraction } from "../../components/IntakeScreen/extractionPersistence";
import { initialIntakeState, intakeReducer } from "../../store/intakeReducer";
import { emptyCaseRecord, normalizeCaseRecord } from "../../types/case";
import { normalizeFields } from "../../../supabase/functions/extract-nod/normalization.js";
import { applyExtraction } from "./applyExtraction";

function buildRecord() {
  return emptyCaseRecord("case_cause_number_migration", "2026-08-03T12:00:00.000Z");
}

describe("caption.case_number canonical migration", () => {
  it("preserves extraction evidence and carries the canonical value through Intake", async () => {
    const fields = normalizeFields({
      cause_number: { value: "25-cv-00598-olg", confidence: 0.87 },
    });
    const originalFields = structuredClone(fields);
    const application = applyExtraction(fields, buildRecord());
    const causeNumberUpdate = application.fieldUpdates.find(
      ({ path }) => path === "caption.case_number",
    );

    expect(fields).toEqual(originalFields);
    expect(causeNumberUpdate).toEqual({
      path: "caption.case_number",
      value: "25-CV-00598-OLG",
      confidence_score: 0.87,
      label: "Case Number",
    });

    const reduced = intakeReducer(
      { ...initialIntakeState(), record: buildRecord() },
      { type: "APPLY_EXTRACTION", payload: application },
    );

    expect(reduced.record.caption.case_number).toEqual({
      value: "25-CV-00598-OLG",
      source: "extracted",
      confirmed: false,
      conflict: false,
      confidence_score: 0.87,
    });

    const recordExtraction = vi.fn();
    const saveCaseRecord = vi.fn().mockResolvedValue(undefined);
    await applyAndPersistExtraction({
      caseId: reduced.record.case_id,
      application,
      applyParsedExtraction: vi.fn(),
      recordExtraction,
      detectConflict: vi.fn(),
      onRevealExtractedFields: vi.fn(),
      saveCaseRecord,
      recordToSave: reduced.record,
    });

    expect(recordExtraction).toHaveBeenCalledWith(
      reduced.record.case_id,
      "caption.case_number",
      "Case Number",
      "25-CV-00598-OLG",
      "Notice",
      0.87,
    );
    expect(saveCaseRecord).toHaveBeenCalledWith(reduced.record);

    const roundTripped = normalizeCaseRecord(
      JSON.parse(JSON.stringify(reduced.record)) as unknown,
    );
    expect(roundTripped.caption.case_number).toEqual(reduced.record.caption.case_number);

    const projected = projectFieldRows(roundTripped).find(
      ({ path }) => path === "caption.case_number",
    );
    expect(projected?.value).toBe("25-CV-00598-OLG");
  });

  it("preserves conflict behavior with a canonical incoming value", () => {
    const record = buildRecord();
    record.caption.case_number = {
      value: "SYN-2025-009",
      source: "manual",
      confirmed: true,
      conflict: false,
      confidence_score: null,
    };

    const application = applyExtraction(
      normalizeFields({
        cause_number: { value: "syn-2026-010", confidence: 0.92 },
      }),
      record,
    );

    expect(application.fieldUpdates).not.toContainEqual(
      expect.objectContaining({ path: "caption.case_number" }),
    );
    expect(application.conflicts).toContainEqual({
      path: "caption.case_number",
      label: "Case Number",
      currentValue: "SYN-2025-009",
      currentSource: "manual",
      incomingValue: "SYN-2026-010",
      incomingConfidence: 0.92,
    });
  });

  it("does not create a Cause Number update for empty or missing input", () => {
    for (const causeNumber of ["", null]) {
      const application = applyExtraction(
        normalizeFields({ cause_number: causeNumber }),
        buildRecord(),
      );

      expect(application.fieldUpdates).not.toContainEqual(
        expect.objectContaining({ path: "caption.case_number" }),
      );
    }
  });

  it("produces identical applications for lowercase and canonical Cause Numbers", () => {
    const lowercase = applyExtraction(
      normalizeFields({ cause_number: "syn-2026-011" }),
      buildRecord(),
    );
    const canonical = applyExtraction(
      normalizeFields({ cause_number: "SYN-2026-011" }),
      buildRecord(),
    );

    expect(lowercase).toEqual(canonical);
  });
});
