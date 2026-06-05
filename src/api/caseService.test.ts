import { describe, expect, it } from "vitest";
import { generateCaseId } from "./caseService";
import { emptyCaseRecord } from "../types/case";

function collectConfirmedValues(value: unknown): boolean[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (
    "value" in value
    && "source" in value
    && "confirmed" in value
    && "conflict" in value
    && "confidence_score" in value
  ) {
    return [(value as { confirmed: boolean }).confirmed];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectConfirmedValues(item));
  }

  return Object.values(value).flatMap((item) => collectConfirmedValues(item));
}

describe("generateCaseId", () => {
  it("formats ids as case_YYYYMMDD_xxxxxx", () => {
    const id = generateCaseId(new Date("2026-06-05T12:00:00Z"), 0.5);
    expect(id).toMatch(/^case_20260605_[0-9a-z]{6}$/);
  });

  it("produces unique ids across 1000 draws", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateCaseId()));
    expect(ids.size).toBe(1000);
  });
});

describe("emptyCaseRecord", () => {
  it("starts with no pre-confirmed extracted fields", () => {
    const record = emptyCaseRecord("case_20260605_000001", "2026-06-05T12:00:00Z");
    expect(collectConfirmedValues(record).every((confirmed) => confirmed === false)).toBe(true);
  });
});
