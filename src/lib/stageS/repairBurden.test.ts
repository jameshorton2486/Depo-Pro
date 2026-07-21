import { describe, expect, it } from "vitest";

import { computeRepairBurden, mergeRepairBurdens } from "./repairBurden";
import type { RepairFinding } from "./types";

function finding(overrides: Partial<RepairFinding>): RepairFinding {
  return {
    id: overrides.id ?? "id",
    category: overrides.category ?? "QA_CONTINUITY",
    severity: overrides.severity ?? "MAJOR",
    owner: overrides.owner ?? "COMPILER",
    paragraphId: overrides.paragraphId ?? null,
    paragraphIndex: overrides.paragraphIndex ?? null,
    message: overrides.message ?? "message",
    autoRepairable: overrides.autoRepairable ?? false,
  };
}

describe("computeRepairBurden", () => {
  it("aggregates severity, category, owner, density and percentage", () => {
    const burden = computeRepairBurden(
      [
        finding({ id: "a", severity: "CRITICAL", category: "QA_CONTINUITY", owner: "COMPILER", paragraphId: "p1" }),
        finding({ id: "b", severity: "MINOR", category: "EDITORIAL", owner: "EDITORIAL", paragraphId: "p1" }),
        finding({ id: "c", severity: "MAJOR", category: "INDENT", owner: "GEOMETRY", paragraphId: "p2" }),
      ],
      4,
    );

    expect(burden.total).toBe(3);
    expect(burden.bySeverity.CRITICAL).toBe(1);
    expect(burden.bySeverity.MINOR).toBe(1);
    expect(burden.byOwner.GEOMETRY).toBe(1);
    expect(burden.byCategory.QA_CONTINUITY).toBe(1);
    expect(burden.paragraphsAffected).toBe(2);
    expect(burden.paragraphsTotal).toBe(4);
    expect(burden.repairDensity).toBe(0.75);
    expect(burden.repairPercentage).toBe(50);
  });

  it("handles zero paragraphs without dividing by zero", () => {
    const burden = computeRepairBurden([], 0);
    expect(burden.repairDensity).toBe(0);
    expect(burden.repairPercentage).toBe(0);
  });

  it("merges burdens across a suite", () => {
    const a = computeRepairBurden([finding({ id: "a", severity: "CRITICAL", paragraphId: "p1" })], 2);
    const b = computeRepairBurden([finding({ id: "b", severity: "MINOR", paragraphId: "p2" })], 3);
    const merged = mergeRepairBurdens([a, b]);
    expect(merged.total).toBe(2);
    expect(merged.bySeverity.CRITICAL).toBe(1);
    expect(merged.bySeverity.MINOR).toBe(1);
    expect(merged.paragraphsTotal).toBe(5);
    expect(merged.paragraphsAffected).toBe(2);
  });
});
