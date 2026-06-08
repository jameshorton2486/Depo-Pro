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

  it("repairs duplicate collections and removes party names leaked into attorneys", () => {
    const normalized = normalizeCaseRecord({
      case_id: "case_repair",
      created_at: "2026-06-07T00:00:00.000Z",
      updated_at: "2026-06-07T00:00:00.000Z",
      parties: [
        {
          name: { value: "Delia Garza", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
          role: { value: "plaintiff", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
          role_modifier: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
          entity_type: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
          fka_or_dba: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
        },
        {
          name: { value: "DELIA GARZA", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.8 },
          role: { value: "plaintiff", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.8 },
          role_modifier: { value: "Individually", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.8 },
          entity_type: { value: "person", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.8 },
          fka_or_dba: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
        },
      ],
      attorneys: [
        {
          name: { value: "Delia Garza", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.7 },
          firm: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
          role: { value: "OTHER", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.7 },
          representing: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
          bar_number: { value: null, source: "extracted", confirmed: false, conflict: false, confidence_score: null },
          address: null,
          city: null,
          state: null,
          zip: null,
          time_used: null,
          email: null,
          phone: null,
        },
        {
          name: { value: "Curtis L. Cukjati", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Cukjati Law Firm, PLLC", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          representing: { value: "Plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: "12345", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          address: "123 Main Street",
          city: "San Antonio",
          state: "TX",
          zip: "78205",
          time_used: null,
          email: "curtis@example.com",
          phone: "555-1234",
        },
      ],
      participants: [
        {
          name: { value: "Shawn Herber", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: "OTHER",
          organization: null,
          email: null,
          phone: null,
          role_in_this_proceeding: null,
          notes: null,
        },
        {
          name: { value: "Shawn Herber", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: "PARALEGAL",
          organization: "Home Depot",
          email: "shawn@example.com",
          phone: "555-5678",
          role_in_this_proceeding: "Observer",
          notes: "Duplicate test",
        },
      ],
    });

    expect(normalized.parties).toHaveLength(1);
    expect(normalized.parties[0]?.role_modifier.value).toBe("Individually");
    expect(normalized.parties[0]?.entity_type.value).toBe("person");
    expect(normalized.attorneys).toHaveLength(1);
    expect(normalized.attorneys[0]?.name.value).toBe("Curtis L. Cukjati");
    expect(normalized.participants).toHaveLength(2);
    expect(normalized.participants.map((participant) => participant.role)).toEqual(["OTHER", "PARALEGAL"]);
    expect(normalized.participants[1]?.organization).toBe("Home Depot");
  });

  it("preserves the same name across distinct collections", () => {
    const normalized = normalizeCaseRecord({
      case_id: "case_cross_collection",
      created_at: "2026-06-07T00:00:00.000Z",
      updated_at: "2026-06-07T00:00:00.000Z",
      parties: [
        {
          name: { value: "Delia Garza", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role_modifier: { value: null, source: "manual", confirmed: true, conflict: false, confidence_score: null },
          entity_type: { value: null, source: "manual", confirmed: true, conflict: false, confidence_score: null },
          fka_or_dba: { value: null, source: "manual", confirmed: true, conflict: false, confidence_score: null },
        },
      ],
      witnesses: {
        name: { value: "Delia Garza", source: "manual", confirmed: true, conflict: false, confidence_score: null },
        role: { value: "WITNESS", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      },
    });

    expect(normalized.parties).toHaveLength(1);
    expect(normalized.witnesses).toHaveLength(1);
    expect(normalized.parties[0]?.name.value).toBe("Delia Garza");
    expect(normalized.witnesses[0]?.name.value).toBe("Delia Garza");
  });
});
