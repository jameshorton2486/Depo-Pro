import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
import { projectFieldRows } from "./fieldProjection";

describe("projectFieldRows", () => {
  it("projects zero confirmed fields for a brand-new case", () => {
    const record = emptyCaseRecord("case_20260605_clean", "2026-06-05T18:00:00Z");

    const rows = projectFieldRows(record);

    expect(rows.filter((row) => row.status === "Confirmed")).toHaveLength(0);
  });

  it("does not keep a cleared field in Confirmed status", () => {
    const record = emptyCaseRecord("case_20260605_clear", "2026-06-05T18:00:00Z");
    record.reporter.firm_registration_number = {
      value: null,
      source: "manual",
      confirmed: true,
      conflict: false,
      confidence_score: null,
    };

    const row = projectFieldRows(record).find(
      (candidate) => candidate.id === "reporter.firm_registration_number",
    );

    expect(row?.status).not.toBe("Confirmed");
  });
});
