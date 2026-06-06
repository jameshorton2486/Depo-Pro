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

  it("preserves legacy flattened deponentName payloads as a canonical witness array", () => {
    const normalized = normalizeCaseRecord({
      ...emptyCaseRecord("case_legacy_flat", "2026-06-05T18:00:00.000Z"),
      deponentName: "Heath Thomas",
      deponentRole: "WITNESS",
      witnesses: null,
    });

    expect(normalized.witnesses).toHaveLength(1);
    expect(normalized.witnesses[0].name.value).toBe("Heath Thomas");
    expect(normalized.witnesses[0].role.value).toBe("WITNESS");
  });

  it("coerces legacy singular witnesses objects into the canonical array without losing the name", () => {
    const normalized = normalizeCaseRecord({
      ...emptyCaseRecord("case_legacy_object", "2026-06-05T18:00:00.000Z"),
      witnesses: {
        witness_id: "legacy_witness",
        name: "Maria L. Lopez De Martinez",
      },
    });

    expect(normalized.witnesses).toHaveLength(1);
    expect(normalized.witnesses[0].witness_id).toBe("legacy_witness");
    expect(normalized.witnesses[0].name.value).toBe("Maria L. Lopez De Martinez");
  });
});
