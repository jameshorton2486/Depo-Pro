import { describe, expect, it } from "vitest";
import {
  isReviewLocked,
  normalizePersistedLineType,
  normalizeReviewStatus,
} from "./structuredTranscript";

describe("normalizePersistedLineType", () => {
  it("accepts the canonical short-code value space", () => {
    for (const code of ["Q", "A", "SP", "PN", "HEADER"] as const) {
      expect(normalizePersistedLineType(code)).toBe(code);
    }
  });

  it("rejects UNKNOWN, null, and long-name variants (returns null)", () => {
    expect(normalizePersistedLineType("UNKNOWN")).toBeNull();
    expect(normalizePersistedLineType(null)).toBeNull();
    expect(normalizePersistedLineType(undefined)).toBeNull();
    expect(normalizePersistedLineType("COLLOQUY")).toBeNull();
    expect(normalizePersistedLineType("SECTION_HEADER")).toBeNull();
  });
});

describe("normalizeReviewStatus", () => {
  it("passes through the three valid states", () => {
    expect(normalizeReviewStatus("UNREVIEWED")).toBe("UNREVIEWED");
    expect(normalizeReviewStatus("CONFIRMED")).toBe("CONFIRMED");
    expect(normalizeReviewStatus("OVERRIDDEN")).toBe("OVERRIDDEN");
  });

  it("collapses unknown/null/legacy values to UNREVIEWED (safe default)", () => {
    expect(normalizeReviewStatus(null)).toBe("UNREVIEWED");
    expect(normalizeReviewStatus(undefined)).toBe("UNREVIEWED");
    expect(normalizeReviewStatus("")).toBe("UNREVIEWED");
    expect(normalizeReviewStatus("UNKNOWN")).toBe("UNREVIEWED");
    expect(normalizeReviewStatus("garbage")).toBe("UNREVIEWED");
  });
});

describe("isReviewLocked (migration-safety invariant)", () => {
  it("locks CONFIRMED and OVERRIDDEN decisions against overwrite", () => {
    expect(isReviewLocked("CONFIRMED")).toBe(true);
    expect(isReviewLocked("OVERRIDDEN")).toBe(true);
  });

  it("leaves UNREVIEWED (and legacy/null) open for proposals", () => {
    expect(isReviewLocked("UNREVIEWED")).toBe(false);
    expect(isReviewLocked(null)).toBe(false);
    expect(isReviewLocked(undefined)).toBe(false);
    expect(isReviewLocked("UNKNOWN")).toBe(false);
  });
});
