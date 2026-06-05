import { describe, expect, it } from "vitest";

import type { CaseBundle } from "../../api/caseLoadService";
import { emptyCaseRecord } from "../../types/case";
import { resolveHydration } from "./hydration";

describe("resolveHydration", () => {
  it("returns row mode when a persisted record exists", () => {
    const record = emptyCaseRecord("case_20260605_abc123", "2026-06-05T12:00:00Z");
    const bundle: CaseBundle = { record, files: [], audio: [] };
    expect(resolveHydration(bundle)).toEqual({ mode: "row", bundle });
  });

  it("returns blank mode when no persisted record exists", () => {
    expect(resolveHydration(null)).toEqual({ mode: "blank" });
  });
});
