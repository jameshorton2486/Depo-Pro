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

  it("does not throw when witnesses is a malformed object", () => {
    const record = {
      ...emptyCaseRecord("case_20260606_malformed", "2026-06-06T12:00:00Z"),
      witnesses: {},
    } as unknown as Parameters<typeof projectFieldRows>[0];

    expect(() => projectFieldRows(record)).not.toThrow();
  });

  it("uses the corrected Case Style / Cause Number display labels without changing field paths", () => {
    const rows = projectFieldRows(emptyCaseRecord("case_20260608_labels", "2026-06-08T12:00:00Z"));
    const caseStyleRow = rows.find((row) => row.id === "caption.case_style");
    const causeNumberRow = rows.find((row) => row.id === "caption.case_number");

    expect(caseStyleRow).toMatchObject({
      id: "caption.case_style",
      path: "caption.case_style",
      label: "Case Style",
    });
    expect(causeNumberRow).toMatchObject({
      id: "caption.case_number",
      path: "caption.case_number",
      label: "Cause Number",
    });
  });
});
