import { describe, expect, it } from "vitest";
import {
  DEMO_CASE_ID,
  caseStatusFromStage,
  matchesCaseSearch,
  shouldPersistLastOpenedCaseId,
} from "./caseLifecycle";

describe("caseStatusFromStage", () => {
  it("marks certified cases from the certification record rather than stage alone", () => {
    expect(caseStatusFromStage("certification", false)).toEqual({
      label: "Certification",
      tone: "blue",
    });
    expect(caseStatusFromStage("certification", true)).toEqual({
      label: "Certified",
      tone: "emerald",
    });
  });
});

describe("shouldPersistLastOpenedCaseId", () => {
  it("refuses to persist the standalone demo case", () => {
    expect(shouldPersistLastOpenedCaseId(DEMO_CASE_ID)).toBe(false);
    expect(shouldPersistLastOpenedCaseId("case_20260605_abcd12")).toBe(true);
  });
});

describe("matchesCaseSearch", () => {
  const summary = {
    case_id: "case_20260605_abcd12",
    caseName: "Goldman & Peterson",
    caseStyle: "Maria L. Lopez De Martinez v. Rafael Robles Calderon",
    witnessName: "Maria L. Lopez De Martinez",
  };

  it("matches against case id, case style, and witness name", () => {
    expect(matchesCaseSearch(summary, "abcd12")).toBe(true);
    expect(matchesCaseSearch(summary, "robles calderon")).toBe(true);
    expect(matchesCaseSearch(summary, "lopez de martinez")).toBe(true);
  });

  it("returns false for non-matching queries", () => {
    expect(matchesCaseSearch(summary, "smith meridian")).toBe(false);
  });
});
