import { describe, expect, it } from "vitest";

import { fitStoredKeytermsToRequestBudget } from "./requestBudget";
import { deriveKeytermsWithBudget } from "../keytermDerivation";
import { emptyCaseRecord } from "../../types/case";

function manualField<T>(value: T) {
  return {
    value,
    source: "manual" as const,
    confirmed: true,
    conflict: false,
    confidence_score: null,
  };
}

describe("fitStoredKeytermsToRequestBudget", () => {
  it("keeps selected keyterms within the soft term cap", () => {
    const result = fitStoredKeytermsToRequestBudget(
      Array.from({ length: 95 }, (_, index) => ({
        term: `Term ${index}`,
        boost: 0.5,
        category: "other" as const,
        notes: "",
      })),
    );

    expect(result.keyterms).toHaveLength(90);
    expect(result.droppedCount).toBe(5);
    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
  });

  it("drops trailing terms when the token budget would overflow", () => {
    const result = fitStoredKeytermsToRequestBudget([
      {
        term: "Extremely Specific Orthopedic Neurological Interventional Radiology Phrase",
        boost: 0.5,
        category: "technical",
        notes: "",
      },
      ...Array.from({ length: 120 }, (_, index) => ({
        term: `Witness Variant ${index}`,
        boost: 0.5,
        category: "proper_name" as const,
        notes: "",
      })),
    ]);

    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
    expect(result.keyterms.length).toBeLessThan(121);
    expect(result.droppedCount).toBeGreaterThan(0);
  });

  it("preserves highest-priority derived terms when request trimming drops the tail", () => {
    const record = emptyCaseRecord("case_request_budget", "2026-06-08T00:00:00.000Z");
    record.witnesses = [{
      witness_id: "wit_1",
      name: manualField("Heath Thomas"),
      role: manualField("WITNESS"),
      title: manualField(null),
      employer: manualField(null),
      prefix_suffix: null,
      party_affiliation: manualField(null),
      is_corporate_rep: false,
      corporate_entity: null,
      read_and_sign: manualField(null),
      requires_interpreter: manualField(null),
      requires_videographer: manualField(null),
      spelling_corrections: [],
      email: null,
      phone: null,
    }];
    record.parties = [{
      party_id: "p1",
      name: manualField("Delia Garza"),
      role: manualField("plaintiff"),
      role_modifier: manualField(null),
      entity_type: manualField(null),
      fka_or_dba: manualField(null),
    }];
    record.attorneys = [{
      attorney_id: "a1",
      name: manualField("Curtis L. Cukjati"),
      firm: manualField("Cukjati Law Firm, PLLC"),
      role: manualField("EXAMINING"),
      representing: manualField("Plaintiff"),
      bar_number: manualField(null),
      address: "123 Main Street",
      city: "San Antonio",
      state: "TX",
      zip: "78205",
      time_used: null,
      email: null,
      phone: null,
    }];
    record.participants = Array.from({ length: 140 }, (_, index) => ({
      participant_id: `pt_${index}`,
      name: manualField(`Provider${index} Specialist${index}`),
      role: "OTHER",
      organization: `Medical Group ${index}`,
      email: null,
      phone: null,
      role_in_this_proceeding: "Medical provider",
      notes: null,
    }));

    const derived = deriveKeytermsWithBudget(record).included;
    const withTail = [
      ...derived,
      ...Array.from({ length: 40 }, (_, index) => ({
        term: `Overflow Tail ${index}`,
        boost: 0.5,
        category: "other" as const,
        notes: "",
      })),
    ];

    const result = fitStoredKeytermsToRequestBudget(withTail);
    const terms = new Set(result.keyterms.map((keyterm) => keyterm.term));

    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
    expect(terms.has("Heath Thomas")).toBe(true);
    expect(terms.has("Delia Garza")).toBe(true);
    expect(terms.has("Curtis L. Cukjati")).toBe(true);
    expect(terms.has("Overflow Tail 39")).toBe(false);
  });
});
