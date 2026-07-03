import { describe, expect, it } from "vitest";

import { emptyCaseRecord, type CaseRecord } from "../../types/case";
import type { DeepgramKeyterm } from "../../types/case";
import { buildAutoSeedKeytermPlan, deriveAutoSeedKeytermsFromCaseRecord } from "./autoSeedKeyterms";

function manualField<T>(value: T, confirmed = true) {
  return {
    value,
    source: "manual" as const,
    confirmed,
    conflict: false,
    confidence_score: null,
  };
}

function buildRecord(): CaseRecord {
  const record = emptyCaseRecord("case_auto_seed", "2026-07-01T21:30:00.000Z");
  record.caption.case_number = manualField("C-5722-24-L");
  record.reporter.name = manualField("Miah Bardot");
  record.witnesses = [{
    witness_id: "wit_1",
    name: manualField("Mohammad Etminan"),
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
  record.attorneys = [{
    attorney_id: "att_1",
    name: manualField("Dennis Bentley"),
    firm: manualField("Bentley Law"),
    role: manualField("EXAMINING"),
    representing: manualField("Plaintiff"),
    bar_number: manualField(null),
    address: null,
    city: null,
    state: null,
    zip: null,
    time_used: null,
    email: null,
    phone: null,
  }];
  return record;
}

function buildStoredManualKeyterm(term: string): DeepgramKeyterm {
  return {
    term,
    boost: 0.8,
    category: "proper_name",
    notes: `__depo_keyterm_meta__:${JSON.stringify({
      selected: true,
      pinned: false,
      source: "Manual",
      notes: "manual",
    })}`,
  };
}

describe("deriveAutoSeedKeytermsFromCaseRecord", () => {
  it("derives witness, attorney, cause number, and reporter terms", () => {
    expect(deriveAutoSeedKeytermsFromCaseRecord(buildRecord())).toEqual([
      "Mohammad Etminan",
      "Etminan",
      "Dennis Bentley",
      "Bentley",
      "C-5722-24-L",
      "Miah Bardot",
      "Bardot",
    ]);
  });

  it("caps auto-seeded terms at 20 entries", () => {
    const record = buildRecord();
    record.attorneys = Array.from({ length: 20 }, (_, index) => ({
      attorney_id: `att_${index}`,
      name: manualField(`Attorney ${index} Surname${index}`),
      firm: manualField(null),
      role: manualField("EXAMINING"),
      representing: manualField("Plaintiff"),
      bar_number: manualField(null),
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    }));

    expect(deriveAutoSeedKeytermsFromCaseRecord(record)).toHaveLength(20);
  });
});

describe("buildAutoSeedKeytermPlan", () => {
  it("records added and already-present terms separately", () => {
    const plan = buildAutoSeedKeytermPlan(buildRecord(), [
      buildStoredManualKeyterm("Dennis Bentley"),
      buildStoredManualKeyterm("Bentley"),
    ]);

    expect(plan.audit.added_terms).toEqual([
      "Mohammad Etminan",
      "Etminan",
      "C-5722-24-L",
      "Miah Bardot",
      "Bardot",
    ]);
    expect(plan.audit.already_present_terms).toEqual(["Dennis Bentley", "Bentley"]);
    expect(plan.autoSeededKeyterms.map((keyterm) => keyterm.term)).toEqual(plan.audit.final_auto_seeded_terms);
  });

  it("deduplicates repeated names", () => {
    const record = buildRecord();
    record.attorneys.push({
      attorney_id: "att_2",
      name: manualField("Dennis Bentley"),
      firm: manualField(null),
      role: manualField("OPPOSING"),
      representing: manualField("Defendant"),
      bar_number: manualField(null),
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    });

    const plan = buildAutoSeedKeytermPlan(record, []);
    expect(plan.autoSeededKeyterms.map((keyterm) => keyterm.term).filter((term) => term === "Dennis Bentley")).toHaveLength(1);
    expect(plan.autoSeededKeyterms.map((keyterm) => keyterm.term).filter((term) => term === "Bentley")).toHaveLength(1);
  });
});
