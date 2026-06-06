import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../types/case";
import type { IntakeFileState } from "./intakeValidation";
import { evaluateIntake } from "./intakeValidation";

function buildReadyRecord() {
  const record = emptyCaseRecord("case_20260605_abcd12", "2026-06-05T18:00:00Z");
  record.caption.case_number.value = "25-cv-00598-OLG";
  record.caption.case_style.value = "Delia Garza v. Home Depot U.S.A., Inc.";
  record.caption.court_name.value = "United States District Court";
  record.caption.county.value = "Bexar County";
  record.session.deposition_date.value = "2026-04-30";
  record.session.reporting_method.value = "machine_shorthand";
  record.witnesses = [
    {
      witness_id: "wit_1",
      name: { value: "Heath Thomas", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "WITNESS", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      title: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      employer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      prefix_suffix: null,
      party_affiliation: { value: "defendant", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: { value: "read_and_sign", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      requires_interpreter: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_videographer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      spelling_corrections: [],
      email: null,
      phone: null,
    },
  ];
  record.attorneys = [
    {
      attorney_id: "atty_1",
      name: { value: "Karen Doe", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      firm: { value: "Defense Firm", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: "FOR THE DEFENDANT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      bar_number: { value: "12345678", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      address: "123 Main St",
      city: "San Antonio",
      state: "TX",
      zip: "78205",
      time_used: null,
      email: "karen@example.com",
      phone: "(210) 555-1212",
    },
  ];
  return record;
}

function itemSatisfied(result: ReturnType<typeof evaluateIntake>, id: string): boolean {
  const item = result.items.find((entry) => entry.id === id);
  if (!item) {
    throw new Error(`Missing validation item ${id}`);
  }
  return item.satisfied;
}

describe("evaluateIntake file-state validation", () => {
  const record = buildReadyRecord();

  it("fails the audio gate when no durable files exist", () => {
    const fileState: IntakeFileState = {
      hasNotice: false,
      hasScheduling: false,
      hasSupporting: false,
      hasAudio: false,
    };

    const result = evaluateIntake(record, fileState);
    expect(itemSatisfied(result, "fail.audio_uploaded")).toBe(false);
    expect(itemSatisfied(result, "info.supporting_documents")).toBe(false);
    expect(itemSatisfied(result, "info.scheduling_notes")).toBe(false);
    expect(result.canProceed).toBe(false);
  });

  it("keeps the audio gate failed when only documents exist", () => {
    const fileState: IntakeFileState = {
      hasNotice: true,
      hasScheduling: true,
      hasSupporting: true,
      hasAudio: false,
    };

    const result = evaluateIntake(record, fileState);
    expect(itemSatisfied(result, "fail.audio_uploaded")).toBe(false);
    expect(itemSatisfied(result, "info.supporting_documents")).toBe(true);
    expect(itemSatisfied(result, "info.scheduling_notes")).toBe(true);
    expect(result.canProceed).toBe(false);
  });

  it("passes the audio gate when only durable audio exists", () => {
    const fileState: IntakeFileState = {
      hasNotice: false,
      hasScheduling: false,
      hasSupporting: false,
      hasAudio: true,
    };

    const result = evaluateIntake(record, fileState);
    expect(itemSatisfied(result, "fail.audio_uploaded")).toBe(true);
    expect(itemSatisfied(result, "info.supporting_documents")).toBe(false);
    expect(itemSatisfied(result, "info.scheduling_notes")).toBe(false);
    expect(result.canProceed).toBe(true);
  });

  it("passes the full matrix when all durable file categories exist", () => {
    const fileState: IntakeFileState = {
      hasNotice: true,
      hasScheduling: true,
      hasSupporting: true,
      hasAudio: true,
    };

    const result = evaluateIntake(record, fileState);
    expect(itemSatisfied(result, "fail.audio_uploaded")).toBe(true);
    expect(itemSatisfied(result, "info.supporting_documents")).toBe(true);
    expect(itemSatisfied(result, "info.scheduling_notes")).toBe(true);
    expect(result.canProceed).toBe(true);
  });

  it("treats malformed collections as empty instead of throwing", () => {
    const malformedRecord = {
      ...buildReadyRecord(),
      witnesses: { name: "Heath Thomas" },
      attorneys: null,
      interpreters: {},
      videographers: "camera",
      participants: undefined,
    } as unknown as Parameters<typeof evaluateIntake>[0];

    const fileState: IntakeFileState = {
      hasNotice: false,
      hasScheduling: false,
      hasSupporting: false,
      hasAudio: false,
    };

    const result = evaluateIntake(malformedRecord, fileState);

    expect(itemSatisfied(result, "fail.witness_name")).toBe(false);
    expect(itemSatisfied(result, "fail.attorney_representing")).toBe(false);
    expect(itemSatisfied(result, "warning.interpreter_language")).toBe(true);
    expect(itemSatisfied(result, "info.other_attendees")).toBe(false);
  });
});
