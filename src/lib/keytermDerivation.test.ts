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
  record.session.location_address = manualField("123 Main Street");
  record.session.location_city = manualField("San Antonio");
  record.reporter.name = manualField("Miah Ramirez");
  record.reporter.firm = manualField("Bardot Reporting, LLC");
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
  record.interpreters = [
    {
      interpreter_id: "interp_1",
      name: manualField("Rosa Pena"),
      language_from: "es",
      language_to: "en",
      oath_administered: true,
      certified: true,
      cert_number: "INT-7788",
      agency: "Lingua Bridge",
      email: null,
      phone: null,
    },
  ];
  record.videographers = [
    {
      videographer_id: "vid_1",
      name: manualField("Victor Stone"),
      firm: manualField("Acme Video, LLC"),
      role_title: null,
      cert_number: null,
      email: null,
      phone: null,
    },
  ];
  record.participants = [
    {
      participant_id: "pt_1",
      name: manualField("Dr. Elena Torres"),
      role: "OTHER",
      organization: "South Texas Spine Clinic",
      email: null,
      phone: null,
      role_in_this_proceeding: "Medical provider",
      notes: null,
    },
    {
      participant_id: "pt_2",
      name: manualField("Jordan Smith"),
      role: "OTHER",
      organization: "Home Depot",
      email: null,
      phone: null,
      role_in_this_proceeding: "Corporate representative",
      notes: null,
    },
    {
      participant_id: "pt_3",
      name: manualField("Casey Brooks"),
      role: "OTHER",
      organization: "Bexar Records Custodians",
      email: null,
      phone: null,
      role_in_this_proceeding: "Records custodian",
      notes: null,
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
      "Mr. Thomas",
      "Ms. Thomas",
      "Heath",
      "Delia Garza",
      "Garza",
      "Delia",
      "Shawn Herber",
      "Herber",
      "Shawn",
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
      "Rosa Pena",
      "Pena",
      "Rosa",
      "Victor Stone",
      "Stone",
      "Victor",
      "Cukjati Law Firm, PLLC",
      "Brain and Spine Personal Injury Lawyers of San Antonio, PLLC",
      "Brothers, Alvarado, Piazza & Cozort, P.C.",
      "Acme Video, LLC",
      "Lingua Bridge",
      "Bardot Reporting, LLC",
      "Piazza",
      "Cozort",
      "Acme",
      "Bexar County",
      "Bexar",
      "123 Main Street",
      "Main",
      "Street",
      "San Antonio",
      "Dr. Elena Torres",
      "Torres",
      "South Texas Spine Clinic",
      "Jordan Smith",
      "Smith",
      "Jordan",
      "Home Depot",
      "Casey Brooks",
      "Brooks",
      "Casey",
      "Bexar Records Custodians",
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

  it("adds honorific variants only for witness-tier names, not later attorney tiers", () => {
    const record = emptyCaseRecord("case_honorifics", "2026-06-06T20:00:00.000Z");
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
    record.attorneys = [{
      attorney_id: "a1",
      name: manualField("Heath Thomas"),
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
    }];

    const terms = deriveKeytermsWithBudget(record).included.map((keyterm) => keyterm.term);
    expect(terms).toEqual(expect.arrayContaining(["Heath Thomas", "Thomas", "Mr. Thomas", "Ms. Thomas", "Heath"]));
    expect(terms.filter((term) => term === "Mr. Thomas")).toHaveLength(1);
    expect(terms.filter((term) => term === "Ms. Thomas")).toHaveLength(1);
  });

  it("harvests participant-derived names that already exist on the case record", () => {
    const terms = deriveKeytermsWithBudget(buildGarzaRecord()).included.map((keyterm) => keyterm.term);

    expect(terms).toEqual(expect.arrayContaining([
      "Heath Thomas",
      "Miah Ramirez",
      "Rosa Pena",
      "Victor Stone",
      "Jordan Smith",
      "Casey Brooks",
    ]));
  });

  it("harvests linked organization phrases from existing case data", () => {
    const terms = deriveKeytermsWithBudget(buildGarzaRecord()).included.map((keyterm) => keyterm.term);

    expect(terms).toEqual(expect.arrayContaining([
      "Cukjati Law Firm, PLLC",
      "Brothers, Alvarado, Piazza & Cozort, P.C.",
      "Acme Video, LLC",
      "Lingua Bridge",
      "Bardot Reporting, LLC",
      "South Texas Spine Clinic",
      "Bexar Records Custodians",
    ]));
  });

  it("harvests long linked organization phrases when budget pressure is removed", () => {
    const record = emptyCaseRecord("case_sparse_organizations", "2026-06-08T20:00:00.000Z");
    record.attorneys = [{
      attorney_id: "a1",
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
    }];
    record.law_firms = [{
      law_firm_id: "lf1",
      name: manualField("Brain and Spine Personal Injury Lawyers of San Antonio, PLLC"),
      address: manualField(null),
      city: manualField(null),
      state: manualField(null),
      zip: manualField(null),
      phone: manualField(null),
      fax: manualField(null),
      email: manualField(null),
      represented_party: manualField(null),
    }];

    const terms = deriveKeytermsWithBudget(record).included.map((keyterm) => keyterm.term);
    expect(terms).toContain("Brain and Spine Personal Injury Lawyers of San Antonio, PLLC");
  });

  it("skips participant and organization sources when the underlying fields are empty", () => {
    const record = emptyCaseRecord("case_sparse_participants", "2026-06-08T20:00:00.000Z");
    record.reporter.name = manualField("");
    record.reporter.firm = manualField(null);
    record.witnesses = [{
      witness_id: "wit_1",
      name: manualField(""),
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
    record.interpreters = [{
      interpreter_id: "interp_1",
      name: manualField(""),
      language_from: "es",
      language_to: "en",
      oath_administered: null,
      certified: false,
      cert_number: null,
      agency: null,
      email: null,
      phone: null,
    }];
    record.videographers = [{
      videographer_id: "vid_1",
      name: manualField(""),
      firm: manualField(null),
      role_title: null,
      cert_number: null,
      email: null,
      phone: null,
    }];
    record.participants = [{
      participant_id: "pt_1",
      name: manualField(""),
      role: "OTHER",
      organization: null,
      email: null,
      phone: null,
      role_in_this_proceeding: null,
      notes: null,
    }];

    const terms = deriveKeytermsWithBudget(record).included.map((keyterm) => keyterm.term);
    expect(terms).not.toContain("Lingua Bridge");
    expect(terms).not.toContain("Acme Video, LLC");
    expect(terms).not.toContain("Jordan Smith");
    expect(terms).not.toContain("Bardot Reporting, LLC");
  });

  it("keeps attorney name and linked firm tokens in the live derivation path after directory-style auto-fill", () => {
    const record = emptyCaseRecord("case_attorney_directory", "2026-06-08T20:00:00.000Z");
    record.attorneys = [{
      attorney_id: "attorney_1",
      name: manualField("Karen M. Alvarado"),
      firm: manualField("Brothers, Alvarado, Piazza & Cozort, P.C."),
      role: manualField("EXAMINING"),
      representing: manualField("FOR DEFENDANT HOME DEPOT"),
      bar_number: manualField("24012345"),
      address: "123 Main St",
      city: "San Antonio",
      state: "TX",
      zip: "78205",
      time_used: null,
      email: "kalvarado@example.com",
      phone: "2105551212",
    }];

    const terms = deriveKeytermsWithBudget(record).included.map((keyterm) => keyterm.term);
    expect(terms).toEqual(expect.arrayContaining([
      "Karen M. Alvarado",
      "Alvarado",
      "Piazza",
      "Cozort",
    ]));
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
      expect(included.has(`mr. ${surname}`.toLowerCase())).toBe(false);
      expect(included.has(`ms. ${surname}`.toLowerCase())).toBe(false);
    }
  });

  it("keeps witness, party, and attorney tiers when truncating an oversized case", () => {
    const record = buildGarzaRecord();
    record.participants = Array.from({ length: 80 }, (_, index) => ({
      participant_id: `pt_${index}`,
      name: manualField(`Provider${index} Specialist${index}`),
      role: "OTHER",
      organization: `Medical Group ${index}`,
      email: null,
      phone: null,
      role_in_this_proceeding: "Medical provider",
      notes: null,
    }));

    const result = deriveKeytermsWithBudget(record);
    const terms = new Set(result.included.map((keyterm) => keyterm.term));

    expect(result.estimatedTokens).toBeLessThanOrEqual(400);
    expect(result.included.length).toBeLessThanOrEqual(90);
    expect(terms.has("Heath Thomas")).toBe(true);
    expect(terms.has("Delia Garza")).toBe(true);
    expect(terms.has("Curtis L. Cukjati")).toBe(true);
    expect(result.dropped.length).toBeGreaterThan(0);
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

  it("derives firm tokens from attorney and videographer case entries when law_firms is empty", () => {
    const record = emptyCaseRecord("case_firm_gap", "2026-06-06T20:00:00.000Z");
    record.attorneys = [{
      attorney_id: "a1",
      name: manualField("Karen M. Alvarado"),
      firm: manualField("Brothers, Alvarado, Piazza & Cozort, P.C."),
      role: manualField("EXAMINING"),
      representing: manualField("Defendant"),
      bar_number: manualField(null),
      address: null,
      city: null,
      state: null,
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    }];
    record.videographers = [{
      videographer_id: "v1",
      name: manualField("Victor Stone"),
      firm: manualField("Acme Video, LLC"),
      role_title: null,
      cert_number: null,
      email: null,
      phone: null,
    }];

    const terms = deriveKeytermsWithBudget(record).included.map((keyterm) => keyterm.term);

    expect(terms).toContain("Alvarado");
    expect(terms).toContain("Piazza");
    expect(terms).toContain("Cozort");
    expect(terms).toContain("Acme");
    expect(terms).not.toContain("Video");
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
