import { describe, expect, it } from "vitest";

import { normalizeCaseRecord } from "../lib/normalizeCaseRecord";
import { emptyCaseRecord } from "./case";

describe("normalizeCaseRecord", () => {
  it("does not guess location_type from legacy is_remote values", () => {
    const legacyRecord = emptyCaseRecord("case_legacy_remote", "2026-06-05T18:00:00.000Z");
    legacyRecord.session.is_remote = true;
    legacyRecord.session.remote_platform = {
      value: "Zoom",
      source: "manual",
      confirmed: false,
      conflict: false,
      confidence_score: null,
    };
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

  it("coerces a singular witness object into an array of one", () => {
    const normalized = normalizeCaseRecord({
      case_id: "case_single_witness",
      created_at: "2026-06-05T18:00:00.000Z",
      updated_at: "2026-06-05T18:00:00.000Z",
      witnesses: {
        name: {
          value: "Heath Thomas",
          source: "manual",
          confirmed: true,
          conflict: false,
          confidence_score: null,
        },
      },
    });

    expect(normalized.witnesses).toHaveLength(1);
    expect(normalized.witnesses[0].name.value).toBe("Heath Thomas");
  });

  it("defaults missing witnesses to an empty array", () => {
    const normalized = normalizeCaseRecord({
      case_id: "case_missing_witnesses",
      created_at: "2026-06-05T18:00:00.000Z",
      updated_at: "2026-06-05T18:00:00.000Z",
    });

    expect(normalized.witnesses).toEqual([]);
  });

  it("coerces invalid witness shapes to an empty array", () => {
    const nullWitnesses = normalizeCaseRecord({
      case_id: "case_null_witnesses",
      created_at: "2026-06-05T18:00:00.000Z",
      updated_at: "2026-06-05T18:00:00.000Z",
      witnesses: null,
    });
    const stringWitnesses = normalizeCaseRecord({
      case_id: "case_string_witnesses",
      created_at: "2026-06-05T18:00:00.000Z",
      updated_at: "2026-06-05T18:00:00.000Z",
      witnesses: "not an array",
    });

    expect(nullWitnesses.witnesses).toEqual([]);
    expect(stringWitnesses.witnesses).toEqual([]);
  });

  it("passes through an already valid record unchanged", () => {
    const record = emptyCaseRecord("case_valid", "2026-06-05T18:00:00.000Z");
    record.witnesses = [{
      witness_id: "wit_1",
      name: { value: "Valid Witness", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "WITNESS", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      title: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      employer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      prefix_suffix: null,
      party_affiliation: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_interpreter: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      requires_videographer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      spelling_corrections: [],
      email: null,
      phone: null,
    }];

    expect(normalizeCaseRecord(record)).toEqual(record);
  });

  it("drops extra unknown keys", () => {
    const normalized = normalizeCaseRecord({
      ...emptyCaseRecord("case_unknown_keys", "2026-06-05T18:00:00.000Z"),
      unexpected_top_level: "drop me",
      caption: {
        case_name: { value: "Known", source: "manual", confirmed: true, conflict: false, confidence_score: null },
        unexpected_nested: "drop me too",
      },
    });

    expect("unexpected_top_level" in (normalized as unknown as Record<string, unknown>)).toBe(false);
    expect("unexpected_nested" in (normalized.caption as unknown as Record<string, unknown>)).toBe(false);
    expect(normalized.caption.case_name.value).toBe("Known");
  });
});
