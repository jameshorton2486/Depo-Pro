import { describe, expect, it } from "vitest";

import type { FieldProvenanceRow, ProvenanceEventType } from "../../components/conflict/types";
import { deriveOpenConflicts } from "./deriveOpenConflicts";

function makeRow(
  id: string,
  fieldPath: string,
  eventType: ProvenanceEventType,
  overrides: Partial<FieldProvenanceRow> = {},
): FieldProvenanceRow {
  return {
    id,
    case_id: "case_20260605_fixture",
    field_path: fieldPath,
    field_label: fieldPath,
    event_type: eventType,
    value: overrides.value ?? "current value",
    source: overrides.source ?? "Notice",
    winning_value: overrides.winning_value ?? null,
    rejected_value: overrides.rejected_value ?? "challenger value",
    rejected_source: overrides.rejected_source ?? "Job Sheet",
    confidence_score: overrides.confidence_score ?? 0.91,
    resolution_user: overrides.resolution_user ?? "reporter",
    resolved_at: overrides.resolved_at ?? "2026-06-05T20:00:00.000Z",
  };
}

describe("deriveOpenConflicts", () => {
  it("opens a conflict from a detected event", () => {
    const rows = [
      makeRow("prov_1", "caption.case_name", "conflict_detected"),
    ];

    expect(deriveOpenConflicts(rows)).toEqual([
      {
        field_path: "caption.case_name",
        field_label: "caption.case_name",
        case_id: "case_20260605_fixture",
        option_a: {
          value: "current value",
          source: "Notice",
          confidence_score: 0.91,
        },
        option_b: {
          value: "challenger value",
          source: "Job Sheet",
          confidence_score: null,
        },
        detected_at: "2026-06-05T20:00:00.000Z",
        provenance_row_ids: ["prov_1"],
      },
    ]);
  });

  it("closes a conflict after a resolution event", () => {
    const rows = [
      makeRow("prov_1", "caption.case_name", "conflict_detected"),
      makeRow("prov_2", "caption.case_name", "conflict_resolved"),
    ];

    expect(deriveOpenConflicts(rows)).toEqual([]);
  });

  it("reopens a conflict when a later extraction collides again", () => {
    const rows = [
      makeRow("prov_1", "caption.case_name", "conflict_detected", { resolved_at: "2026-06-05T20:00:00.000Z" }),
      makeRow("prov_2", "caption.case_name", "conflict_resolved", { resolved_at: "2026-06-05T20:05:00.000Z" }),
      makeRow("prov_3", "caption.case_name", "conflict_detected", {
        value: "saved current",
        rejected_value: "new challenger",
        resolved_at: "2026-06-05T20:10:00.000Z",
      }),
    ];

    expect(deriveOpenConflicts(rows)).toEqual([
      {
        field_path: "caption.case_name",
        field_label: "caption.case_name",
        case_id: "case_20260605_fixture",
        option_a: {
          value: "saved current",
          source: "Notice",
          confidence_score: 0.91,
        },
        option_b: {
          value: "new challenger",
          source: "Job Sheet",
          confidence_score: null,
        },
        detected_at: "2026-06-05T20:10:00.000Z",
        provenance_row_ids: ["prov_3"],
      },
    ]);
  });

  it("handles multiple interleaved fields", () => {
    const rows = [
      makeRow("prov_1", "caption.case_name", "conflict_detected"),
      makeRow("prov_2", "caption.county", "conflict_detected"),
      makeRow("prov_3", "caption.case_name", "conflict_resolved"),
    ];

    expect(deriveOpenConflicts(rows)).toEqual([
      {
        field_path: "caption.county",
        field_label: "caption.county",
        case_id: "case_20260605_fixture",
        option_a: {
          value: "current value",
          source: "Notice",
          confidence_score: 0.91,
        },
        option_b: {
          value: "challenger value",
          source: "Job Sheet",
          confidence_score: null,
        },
        detected_at: "2026-06-05T20:00:00.000Z",
        provenance_row_ids: ["prov_2"],
      },
    ]);
  });

  it("ignores a closing event without a prior detection", () => {
    const rows = [
      makeRow("prov_1", "caption.case_name", "conflict_resolved"),
    ];

    expect(deriveOpenConflicts(rows)).toEqual([]);
  });

  it("returns empty for empty history", () => {
    expect(deriveOpenConflicts([])).toEqual([]);
  });

  it("matches the audit shape with 1 applied extraction and 11 conflicts", () => {
    const rows: FieldProvenanceRow[] = [
      makeRow("prov_applied", "reporter.name", "extracted"),
      ...Array.from({ length: 11 }, (_, index) =>
        makeRow(`prov_conflict_${index + 1}`, `conflict.field_${index + 1}`, "conflict_detected"),
      ),
    ];

    expect(deriveOpenConflicts(rows)).toHaveLength(11);
  });
});
