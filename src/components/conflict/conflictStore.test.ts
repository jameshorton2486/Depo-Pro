import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveConflict, ConflictState, ProvenanceEntry } from "./types";
import { submitConflictResolution } from "./ConflictResolutionModal";
import { conflictReducer, persistEntry } from "./conflictStore";

const { getSupabaseClientMock } = vi.hoisted(() => ({
  getSupabaseClientMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  getSupabaseClient: getSupabaseClientMock,
}));

function buildEntry(overrides: Partial<ProvenanceEntry> = {}): ProvenanceEntry {
  return {
    id: "prov_1",
    case_id: "case_20260612_conflict",
    field_path: "witnesses[0].name",
    field_label: "Witness 1 - Name",
    event_type: "conflict_resolved",
    value: "Delia Garza",
    source: "Notice",
    winning_value: "Delia Garza",
    rejected_value: "D. Garza",
    rejected_source: "Manual",
    confidence_score: 0.92,
    resolution_user: "reporter",
    resolved_at: "2026-06-12T16:30:00.000Z",
    ...overrides,
  };
}

function buildConflict(): ActiveConflict {
  return {
    field_path: "witnesses[0].name",
    field_label: "Witness 1 - Name",
    case_id: "case_20260612_conflict",
    option_a: {
      value: "Delia Garza",
      source: "Notice",
      confidence_score: 0.92,
    },
    option_b: {
      value: "D. Garza",
      source: "Manual",
      confidence_score: null,
    },
    detected_at: "2026-06-12T16:29:00.000Z",
    provenance_row_ids: ["prov_detected"],
  };
}

function buildState(): ConflictState {
  const conflict = buildConflict();
  return {
    history: {
      [conflict.field_path]: [buildEntry({ id: "prov_detected", event_type: "conflict_detected" })],
    },
    active: {
      [conflict.field_path]: conflict,
    },
    modalFieldPath: conflict.field_path,
    persisting: false,
  };
}

describe("persistEntry", () => {
  beforeEach(() => {
    getSupabaseClientMock.mockReset();
  });

  it("returns true when the provenance insert succeeds", async () => {
    getSupabaseClientMock.mockResolvedValue({
      from() {
        return {
          insert: async () => ({ error: null }),
        };
      },
    });

    await expect(persistEntry(buildEntry())).resolves.toBe(true);
  });

  it("returns false when the provenance insert fails", async () => {
    getSupabaseClientMock.mockResolvedValue({
      from() {
        return {
          insert: async () => ({ error: new Error("write exploded") }),
        };
      },
    });

    await expect(persistEntry(buildEntry())).resolves.toBe(false);
  });
});

describe("conflictReducer", () => {
  it("restores an active conflict and removes the failed optimistic resolution entry", () => {
    const conflict = buildConflict();
    const resolvedState = conflictReducer(buildState(), {
      type: "RESOLVE_CONFLICT",
      payload: {
        resolution: buildEntry({ id: "prov_resolved" }),
      },
    });

    expect(resolvedState.active[conflict.field_path]).toBeUndefined();
    expect(resolvedState.modalFieldPath).toBeNull();

    const restoredState = conflictReducer(resolvedState, {
      type: "RESTORE_CONFLICT",
      payload: {
        conflict,
        failedResolutionId: "prov_resolved",
      },
    });

    expect(restoredState.active[conflict.field_path]).toEqual(conflict);
    expect(restoredState.modalFieldPath).toBe(conflict.field_path);
    expect(restoredState.history[conflict.field_path].map((entry) => entry.id)).toEqual(["prov_detected"]);
  });
});

describe("submitConflictResolution", () => {
  it("returns an inline error and skips onResolved when persistence fails", async () => {
    const onResolved = vi.fn();
    const resolveConflict = vi.fn().mockResolvedValue(false);
    const conflict = buildConflict();

    const error = await submitConflictResolution({
      resolveConflict,
      fieldPath: conflict.field_path,
      winning: conflict.option_a,
      rejected: conflict.option_b,
      caseId: conflict.case_id,
      fieldLabel: conflict.field_label,
      onResolved,
    });

    expect(error).toBe("Could not save the conflict resolution. Please try again.");
    expect(onResolved).not.toHaveBeenCalled();
  });

  it("returns null and calls onResolved when persistence succeeds", async () => {
    const onResolved = vi.fn();
    const resolveConflict = vi.fn().mockResolvedValue(true);
    const conflict = buildConflict();

    const error = await submitConflictResolution({
      resolveConflict,
      fieldPath: conflict.field_path,
      winning: conflict.option_a,
      rejected: conflict.option_b,
      caseId: conflict.case_id,
      fieldLabel: conflict.field_label,
      onResolved,
    });

    expect(error).toBeNull();
    expect(onResolved).toHaveBeenCalledWith(
      conflict.field_path,
      conflict.option_a,
      conflict.option_b,
    );
  });
});
