import { describe, expect, it } from "vitest";

import { emptyCaseRecord, type CaseRecord, type DeepgramKeyterm } from "../types/case";
import { deriveKeytermsWithBudget, shouldAutoSeedDerivedKeyterms } from "./keytermDerivation";
import { mergeManagedDerivedKeyterms } from "./keyterms/managedKeyterms";
import type { ManagedKeyterm } from "../components/DeepgramKeytermManager/types";

function manualField<T>(value: T, confirmed = true) {
  return {
    value,
    source: "manual" as const,
    confirmed,
    conflict: false,
    confidence_score: null,
  };
}

function buildGarzaRecord(): CaseRecord {
  const record = emptyCaseRecord("case_garza", "2026-06-06T20:00:00.000Z");
  record.caption.case_style = manualField("Delia Garza v. Home Depot U.S.A., Inc. and Shawn Herber");
  record.caption.county = manualField("Bexar County");
  record.reporter.name = manualField("Miah Ramirez");
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
  record.attorneys = [
    {
      attorney_id: "a1",
      name: manualField("Curtis L. Cukjati"),
      firm: manualField("Cukjati Law Firm, PLLC"),
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
    },
    {
      attorney_id: "a2",
      name: manualField("Jacob D. Cukjati"),
      firm: manualField("Cukjati Law Firm, PLLC"),
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
    },
    {
      attorney_id: "a3",
      name: manualField("Karen M. Alvarado"),
      firm: manualField("Brothers, Alvarado, Piazza & Cozort, P.C."),
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
    },
    {
      attorney_id: "a4",
      name: manualField("Steven A. Nunez"),
      firm: manualField("Brain and Spine Personal Injury Lawyers of San Antonio, PLLC"),
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
    },
  ];
  record.law_firms = [
    {
      law_firm_id: "lf1",
      name: manualField("Cukjati Law Firm, PLLC"),
      address: manualField(null),
      city: manualField(null),
      state: manualField(null),
      zip: manualField(null),
      phone: manualField(null),
      fax: manualField(null),
      email: manualField(null),
      represented_party: manualField(null),
    },
    {
      law_firm_id: "lf2",
      name: manualField("Brain and Spine Personal Injury Lawyers of San Antonio, PLLC"),
      address: manualField(null),
      city: manualField(null),
      state: manualField(null),
      zip: manualField(null),
      phone: manualField(null),
      fax: manualField(null),
      email: manualField(null),
      represented_party: manualField(null),
    },
    {
      law_firm_id: "lf3",
      name: manualField("Brothers, Alvarado, Piazza & Cozort, P.C."),
      address: manualField(null),
      city: manualField(null),
      state: manualField(null),
      zip: manualField(null),
      phone: manualField(null),
      fax: manualField(null),
      email: manualField(null),
      represented_party: manualField(null),
    },
  ];
  record.parties = [
    {
      party_id: "p1",
      name: manualField("Delia Garza"),
      role: manualField("plaintiff"),
      role_modifier: manualField(null),
      entity_type: manualField(null),
      fka_or_dba: manualField(null),
    },
    {
      party_id: "p2",
      name: manualField("Home Depot U.S.A., Inc."),
      role: manualField("defendant"),
      role_modifier: manualField(null),
      entity_type: manualField(null),
      fka_or_dba: manualField(null),
    },
    {
      party_id: "p3",
      name: manualField("Shawn Herber"),
      role: manualField("defendant"),
      role_modifier: manualField(null),
      entity_type: manualField(null),
      fka_or_dba: manualField(null),
    },
  ];
  return record;
}

function buildStoredKeyterm(term: string, source = "Manual", notes = "keep me"): DeepgramKeyterm {
  return {
    term,
    boost: 0.8,
    category: "proper_name",
    notes: `__depo_keyterm_meta__:${JSON.stringify({ selected: true, pinned: false, source, notes })}`,
  };
}

function buildManagedManualTerm(term: string): ManagedKeyterm {
  return {
    id: "kt_manual",
    term,
    boost: 0.8,
    category: "proper_name",
    source: "Manual",
    notes: "keep me",
    selected: true,
    pinned: false,
    priority: 0,
    confidence: 1,
    token_count: 3,
  };
}

describe("deriveKeytermsWithBudget", () => {
  it("derives the expected Garza-style term set with casing preserved and suffix stripping", () => {
    const result = deriveKeytermsWithBudget(buildGarzaRecord());
    const terms = result.included.map((keyterm) => keyterm.term);

    expect(terms).toEqual([
      "Heath Thomas",
      "Thomas",
      "Heath",
      "Miah Ramirez",
      "Ramirez",
      "Miah",
      "Curtis L. Cukjati",
      "Cukjati",
      "Curtis",
      "Jacob D. Cukjati",
      "Jacob",
      "Karen M. Alvarado",
      "Alvarado",
      "Karen",
      "Steven A. Nunez",
      "Nunez",
      "Piazza",
      "Cozort",
      "Bexar County",
      "Bexar",
      "Garza",
      "Herber",
      "certified court reporter",
      "civil action",
      "counsel",
      "oral deposition",
      "remote video conference",
      "stenographically",
      "Texas Rules of Civil Procedure",
    ]);
    expect(result.included.every((keyterm) => keyterm.notes === "derived")).toBe(true);
  });

  it("skips common first names but keeps uncommon ones", () => {
    const record = emptyCaseRecord("case_names", "2026-06-06T20:00:00.000Z");
    record.witnesses = [
      {
        witness_id: "wit_1",
        name: manualField("John Smith"),
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
      },
      {
        witness_id: "wit_2",
        name: manualField("Miah Ramirez"),
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
      },
    ];

    const terms = deriveKeytermsWithBudget(record).included.map((keyterm) => keyterm.term);
    expect(terms).toContain("Smith");
    expect(terms).not.toContain("John");
    expect(terms).toContain("Miah");
  });

  it("drops lowest-priority terms when over budget and keeps person variants all-or-nothing", () => {
    const record = emptyCaseRecord("case_budget", "2026-06-06T20:00:00.000Z");
    record.witnesses = Array.from({ length: 55 }, (_, index) => ({
      witness_id: `wit_${index}`,
      name: manualField(`Rareperson${index} Lastname${index}`),
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
    }));

    const result = deriveKeytermsWithBudget(record);
    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
    expect(result.included.length).toBeLessThanOrEqual(90);

    const included = new Set(result.included.map((keyterm) => keyterm.term.toLowerCase()));
    const dropped = result.dropped.map((keyterm) => keyterm.term);
    const droppedFullName = dropped.find((term) => term.startsWith("Rareperson"));
    expect(droppedFullName).toBeDefined();
    if (droppedFullName) {
      const [firstName, surname] = droppedFullName.split(" ");
      expect(included.has(droppedFullName.toLowerCase())).toBe(false);
      expect(included.has(firstName.toLowerCase())).toBe(false);
      expect(included.has(surname.toLowerCase())).toBe(false);
    }
  });

  it("dedupes across sources while keeping the highest-priority casing", () => {
    const record = emptyCaseRecord("case_dedupe", "2026-06-06T20:00:00.000Z");
    record.witnesses = [{
      witness_id: "wit_1",
      name: manualField("Miah Ramirez"),
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
      name: manualField("shawn ramirez"),
      role: manualField("plaintiff"),
      role_modifier: manualField(null),
      entity_type: manualField(null),
      fka_or_dba: manualField(null),
    }];

    const terms = deriveKeytermsWithBudget(record).included.map((keyterm) => keyterm.term);
    expect(terms.filter((term) => term.toLowerCase() === "ramirez")).toEqual(["Ramirez"]);
  });
});

describe("mergeManagedDerivedKeyterms", () => {
  it("does not duplicate or overwrite an existing manual term", () => {
    const existing = [buildManagedManualTerm("BEXAR COUNTY")];

    const merged = mergeManagedDerivedKeyterms(existing, [{
      term: "Bexar County",
      boost: 0.5,
      category: "location",
      notes: "derived",
    }]);

    expect(merged).toHaveLength(1);
    expect(merged[0].term).toBe("BEXAR COUNTY");
    expect(merged[0].source).toBe("Manual");
    expect(merged[0].notes).toBe("keep me");
  });
});

describe("shouldAutoSeedDerivedKeyterms", () => {
  it("runs once for empty-keyterm cases with confirmed witness or attorney data", () => {
    const record = buildGarzaRecord();
    record.deepgram.keyterms = [];

    expect(shouldAutoSeedDerivedKeyterms(record, false)).toBe(true);
    expect(shouldAutoSeedDerivedKeyterms(record, true)).toBe(false);

    record.deepgram.keyterms = [buildStoredKeyterm("Heath Thomas")];
    expect(shouldAutoSeedDerivedKeyterms(record, false)).toBe(false);
  });
});
