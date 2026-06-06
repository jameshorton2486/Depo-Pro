import { describe, expect, it } from "vitest";

import { emptyCaseRecord, normalizeCaseRecord } from "./case";

describe("normalizeCaseRecord", () => {
  it("does not guess location_type from legacy is_remote values", () => {
    const legacyRecord = emptyCaseRecord("case_legacy_remote", "2026-06-05T18:00:00.000Z");
    legacyRecord.session.is_remote = true;
    legacyRecord.session.remote_platform = "Zoom";
    delete (legacyRecord.session as { location_type?: unknown }).location_type;

    const normalized = normalizeCaseRecord(legacyRecord);

    expect(normalized.session.is_remote).toBe(true);
    expect(normalized.session.location_type.value).toBeNull();
    expect(normalized.session.location_type.confirmed).toBe(false);
  });
});
