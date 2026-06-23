import { describe, expect, it } from "vitest";

import { fitStoredKeytermsToRequestBudget } from "./requestBudget";
import { DEEPGRAM_KEYTERM_SOFT_TERM_CAP, DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP, deriveKeytermsWithBudget } from "../keytermDerivation";
import { emptyCaseRecord, type DeepgramKeyterm, type KeytermCategory } from "../../types/case";

function manualField<T>(value: T) {
  return {
    value,
    source: "manual" as const,
    confirmed: true,
    conflict: false,
    confidence_score: null,
  };
}

function buildStoredKeyterm(
  term: string,
  category: KeytermCategory,
  notes: string,
  selected = true,
): DeepgramKeyterm {
  return {
    term,
    boost: 0.5,
    category,
    notes: `__depo_keyterm_meta__:${JSON.stringify({ selected, pinned: false, source: "UFM Metadata", notes })}`,
  };
}

function estimateTermTokens(term: string): number {
  return term.trim().split(/\s+/).filter(Boolean).length + 1;
}

function legacyFitStoredKeytermsToRequestBudget(keyterms: DeepgramKeyterm[]) {
  const included: DeepgramKeyterm[] = [];
  let estimatedTokens = 0;

  for (const keyterm of keyterms) {
    const selected = !keyterm.notes.includes('"selected":false');
    if (!selected) {
      continue;
    }

    const termTokens = estimateTermTokens(keyterm.term);
    if (
      included.length + 1 > DEEPGRAM_KEYTERM_SOFT_TERM_CAP
      || estimatedTokens + termTokens > DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP
    ) {
      continue;
    }

    included.push(keyterm);
    estimatedTokens += termTokens;
  }

  return included;
}

function buildOverflowBoilerplate(count: number): DeepgramKeyterm[] {
  return Array.from({ length: count }, (_, index) =>
    buildStoredKeyterm(`Generic Legal Boilerplate ${index + 1}`, "legal_term", "derived:legal_term"),
  );
}

describe("fitStoredKeytermsToRequestBudget", () => {
  it("keeps selected keyterms within the soft term cap", () => {
    const result = fitStoredKeytermsToRequestBudget(
      Array.from({ length: 95 }, (_, index) => buildStoredKeyterm(`Term ${index}`, "other", "manual")),
    );

    expect(result.keyterms).toHaveLength(90);
    expect(result.droppedCount).toBe(5);
    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
  });

  it("drops trailing terms when the token budget would overflow", () => {
    const result = fitStoredKeytermsToRequestBudget([
      buildStoredKeyterm(
        "Extremely Specific Orthopedic Neurological Interventional Radiology Phrase",
        "technical",
        "derived:medical_provider",
      ),
      ...Array.from({ length: 120 }, (_, index) =>
        buildStoredKeyterm(`Witness Variant ${index}`, "proper_name", "derived:witness"),
      ),
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
      ...Array.from({ length: 40 }, (_, index) =>
        buildStoredKeyterm(`Overflow Tail ${index}`, "other", "manual"),
      ),
    ];

    const result = fitStoredKeytermsToRequestBudget(withTail);
    const terms = new Set(result.keyterms.map((keyterm) => keyterm.term));

    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
    expect(terms.has("Heath Thomas")).toBe(true);
    expect(terms.has("Delia Garza")).toBe(true);
    expect(terms.has("Curtis L. Cukjati")).toBe(true);
    expect(terms.has("Overflow Tail 39")).toBe(false);
  });

  it("preserves tier 1 entities ahead of earlier tier 4 boilerplate", () => {
    const keyterms = [
      ...buildOverflowBoilerplate(90),
      buildStoredKeyterm("Mohammad Etminan", "proper_name", "derived:witness"),
      buildStoredKeyterm("Rocio Laura Elizondo Vargas", "proper_name", "derived:caption_entity"),
      buildStoredKeyterm("Dennis Malley", "proper_name", "derived:attorney"),
    ];

    const beforeTerms = new Set(legacyFitStoredKeytermsToRequestBudget(keyterms).map((keyterm) => keyterm.term));
    const afterTerms = new Set(fitStoredKeytermsToRequestBudget(keyterms).keyterms.map((keyterm) => keyterm.term));

    expect(beforeTerms.has("Mohammad Etminan")).toBe(false);
    expect(beforeTerms.has("Rocio Laura Elizondo Vargas")).toBe(false);
    expect(afterTerms.has("Mohammad Etminan")).toBe(true);
    expect(afterTerms.has("Rocio Laura Elizondo Vargas")).toBe(true);
    expect(afterTerms.has("Dennis Malley")).toBe(true);
    expect(afterTerms.has("Generic Legal Boilerplate 90")).toBe(false);
  });

  it("preserves tier 2 entities ahead of tier 4 boilerplate", () => {
    const keyterms = [
      ...buildOverflowBoilerplate(90),
      buildStoredKeyterm("Rico Law Firm, PLLC", "company", "derived:firm"),
      buildStoredKeyterm("Standing Seam & Specialty Company, Inc.", "company", "derived:organization"),
      buildStoredKeyterm("Memorial Hermann Spine Clinic", "company", "derived:medical_provider"),
    ];

    const beforeTerms = new Set(legacyFitStoredKeytermsToRequestBudget(keyterms).map((keyterm) => keyterm.term));
    const afterTerms = new Set(fitStoredKeytermsToRequestBudget(keyterms).keyterms.map((keyterm) => keyterm.term));

    expect(beforeTerms.has("Rico Law Firm, PLLC")).toBe(false);
    expect(afterTerms.has("Rico Law Firm, PLLC")).toBe(true);
    expect(afterTerms.has("Standing Seam & Specialty Company, Inc.")).toBe(true);
    expect(afterTerms.has("Memorial Hermann Spine Clinic")).toBe(true);
  });

  it("preserves tier 3 identifiers ahead of tier 4 boilerplate", () => {
    const keyterms = [
      ...buildOverflowBoilerplate(90),
      buildStoredKeyterm("Cause Number C572224L", "legal_term", "derived:caption_entity"),
      buildStoredKeyterm("464th Judicial District", "location", "derived:location"),
      buildStoredKeyterm("Hidalgo County, Texas", "location", "derived:location"),
    ];

    const beforeTerms = new Set(legacyFitStoredKeytermsToRequestBudget(keyterms).map((keyterm) => keyterm.term));
    const afterTerms = new Set(fitStoredKeytermsToRequestBudget(keyterms).keyterms.map((keyterm) => keyterm.term));

    expect(beforeTerms.has("Cause Number C572224L")).toBe(false);
    expect(afterTerms.has("Cause Number C572224L")).toBe(true);
    expect(afterTerms.has("464th Judicial District")).toBe(true);
    expect(afterTerms.has("Hidalgo County, Texas")).toBe(true);
  });

  it("keeps deselection, payload shape, and budget enforcement intact", () => {
    const result = fitStoredKeytermsToRequestBudget([
      buildStoredKeyterm("oral deposition", "legal_term", "derived:legal_term", false),
      buildStoredKeyterm("Mohammad Etminan", "proper_name", "derived:witness"),
      buildStoredKeyterm("Rico Law Firm, PLLC", "company", "derived:firm"),
    ]);

    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
    expect(result.keyterms).toEqual([
      buildStoredKeyterm("Mohammad Etminan", "proper_name", "derived:witness"),
      buildStoredKeyterm("Rico Law Firm, PLLC", "company", "derived:firm"),
    ]);
  });
});
