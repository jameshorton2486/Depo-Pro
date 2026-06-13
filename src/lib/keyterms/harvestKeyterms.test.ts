import { describe, expect, it } from "vitest";

import type { FieldProvenanceRow } from "../../components/conflict/types";
import type { DeepgramKeyterm } from "../../types/case";
import { emptyCaseRecord } from "../../types/case";
import { fitStoredKeytermsToRequestBudget } from "../deepgram/requestBudget";
import { harvestKeyterms, harvestParticipantKeyterms } from "./harvestKeyterms";
import { mergeManagedKeytermSuggestions, seedStoredKeytermsFromParticipants } from "./managedKeyterms";

function buildRecord() {
  const record = emptyCaseRecord("case_garza", "2026-06-05T20:00:00.000Z");
  record.caption.case_style.value = "Maria L. Lopez De Martinez and Alfredo Montes Navarro v. Rafael Robles Calderon and All American Heavy Equipment Leasing, LLC";
  record.caption.case_number.value = "C-1628-25-E";
  record.caption.county.value = "Hidalgo County";
  record.caption.court_name.value = "275th Judicial District";
  record.reporter.name.value = "Neibardel Corporal";
  record.reporter.firm.value = "Valley Court Reporting";
  record.witnesses = [
    {
      witness_id: "wit_1",
      name: { value: "Mohammad Entiminan", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "EXPERT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      title: { value: "MD", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      employer: { value: "Houston Spine Institute", source: "manual", confirmed: true, conflict: false, confidence_score: null },
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
    },
  ];
  record.parties = [
    {
      party_id: "party_1",
      name: { value: "Proceo Vargas", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role_modifier: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      entity_type: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      fka_or_dba: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    },
    {
      party_id: "party_2",
      name: { value: "Standing Seam and Specialty Company Inc.", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "defendant", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role_modifier: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      entity_type: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      fka_or_dba: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    },
  ];
  record.law_firms = [
    {
      law_firm_id: "firm_1",
      name: { value: "Lopez Judge Garza Law Firm", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      address: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      city: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      state: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      zip: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      phone: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      fax: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      email: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      represented_party: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    },
  ];
  record.attorneys = [
    {
      attorney_id: "atty_1",
      name: { value: "Raul Garza", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
      firm: { value: "Goldman & Peterson, PLLC", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
      role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: "FOR THE PLAINTIFF", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      address: null,
      city: "San Antonio",
      state: "TX",
      zip: null,
      time_used: null,
      email: "Raul@LJGLaw.com",
      phone: "(210) 340-9800",
    },
    {
      attorney_id: "atty_2",
      name: { value: "Derek I. Salinas", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
      firm: { value: "Tijerina Legal Group, P.C.", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
      role: { value: "OPPOSING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      representing: { value: "FOR THE DEFENDANT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      address: null,
      city: "McAllen",
      state: "TX",
      zip: null,
      time_used: null,
      email: null,
      phone: null,
    },
  ];

  return record;
}

function buildProvenance(): FieldProvenanceRow[] {
  const now = "2026-06-05T20:00:00.000Z";

  return [
    {
      id: "prov_style",
      case_id: "case_garza",
      field_path: "caption.case_style",
      field_label: "Case Style",
      event_type: "extracted",
      value: "Maria L. Lopez De Martinez and Alfredo Montes Navarro v. Rafael Robles Calderon and All American Heavy Equipment Leasing, LLC",
      source: "Notice",
      winning_value: null,
      rejected_value: null,
      rejected_source: null,
      confidence_score: 0.9,
      resolution_user: "reporter",
      resolved_at: now,
    },
    {
      id: "prov_cause",
      case_id: "case_garza",
      field_path: "caption.case_number",
      field_label: "Case Number",
      event_type: "extracted",
      value: "C-1628-25-E",
      source: "Notice",
      winning_value: null,
      rejected_value: null,
      rejected_source: null,
      confidence_score: 0.9,
      resolution_user: "reporter",
      resolved_at: now,
    },
    {
      id: "prov_county",
      case_id: "case_garza",
      field_path: "caption.county",
      field_label: "County",
      event_type: "extracted",
      value: "Hidalgo County",
      source: "Notice",
      winning_value: null,
      rejected_value: null,
      rejected_source: null,
      confidence_score: 0.9,
      resolution_user: "reporter",
      resolved_at: now,
    },
    {
      id: "prov_attorney",
      case_id: "case_garza",
      field_path: "attorneys[0].name",
      field_label: "Attorney",
      event_type: "extracted",
      value: "Raul Garza",
      source: "Job Sheet",
      winning_value: null,
      rejected_value: null,
      rejected_source: null,
      confidence_score: 0.9,
      resolution_user: "reporter",
      resolved_at: now,
    },
  ];
}

describe("harvestKeyterms", () => {
  it("harvests Garza-shaped suggestions from extracted fields and provenance", () => {
    const keyterms = harvestKeyterms(buildRecord(), buildProvenance());
    const terms = keyterms.map((keyterm) => keyterm.term);

    expect(terms).toEqual(expect.arrayContaining([
      "Maria L. Lopez De Martinez",
      "Alfredo Montes Navarro",
      "Raul Garza",
      "Derek I. Salinas",
      "Goldman & Peterson, PLLC",
      "Tijerina Legal Group, P.C.",
      "C-1628-25-E",
      "Hidalgo County",
    ]));
  });

  it("dedupes case-insensitively when the same person appears in multiple fields", () => {
    const record = buildRecord();
    record.witnesses.push({
      witness_id: "wit_1",
      name: { value: "RAUL GARZA", source: "extracted", confirmed: false, conflict: false, confidence_score: 0.9 },
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
    });

    const terms = harvestKeyterms(record, buildProvenance()).filter((keyterm) => keyterm.term.toLowerCase() === "raul garza");
    expect(terms).toHaveLength(1);
  });

  it("preserves user-edited boost/category on re-harvest merges", () => {
    const merged = mergeManagedKeytermSuggestions(
      [
        {
          id: "kt_raul_garza",
          term: "Raul Garza",
          boost: 0.4,
          category: "technical",
          source: "Manual",
          notes: "Reporter tuned this manually",
          selected: false,
          pinned: true,
          priority: 0,
          confidence: 1,
          token_count: 2,
        },
      ],
      harvestKeyterms(buildRecord(), buildProvenance()),
    );

    expect(merged).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          term: "Raul Garza",
          boost: 0.4,
          category: "technical",
          source: "Manual",
          selected: false,
          pinned: true,
        }),
      ]),
    );
  });

  it("seeds participant-derived names deterministically and keeps them inside the existing cap", () => {
    const record = buildRecord();
    const participantTerms = harvestParticipantKeyterms(record).map((keyterm) => keyterm.term);

    expect(participantTerms).toEqual([
      "Mohammad Entiminan",
      "Proceo Vargas",
      "Standing Seam and Specialty Company Inc.",
      "Derek I. Salinas",
      "Raul Garza",
      "Goldman & Peterson, PLLC",
      "Lopez Judge Garza Law Firm",
      "Tijerina Legal Group, P.C.",
      "Neibardel Corporal",
      "C-1628-25-E",
    ]);

    const seededOnce = seedStoredKeytermsFromParticipants(record, []);
    const seededTwice = seedStoredKeytermsFromParticipants(record, []);
    expect(seededOnce).toEqual(seededTwice);
    expect(seededOnce.map((keyterm) => keyterm.term)).toEqual(expect.arrayContaining(participantTerms));
  });

  it("dedupes participant seeds against existing keyterms and lets them win truncation through the current cap", () => {
    const record = buildRecord();
    const existing: DeepgramKeyterm[] = [
      {
        term: "raul garza",
        boost: 0.9,
        category: "technical",
        notes: "custom",
      },
      ...Array.from({ length: 140 }, (_, index) => ({
        term: `overflow term ${index + 1}`,
        boost: 0.5,
        category: "other" as const,
        notes: "overflow",
      })),
    ];

    const seeded = seedStoredKeytermsFromParticipants(record, existing);
    const included = fitStoredKeytermsToRequestBudget(seeded).keyterms.map((keyterm) => keyterm.term.toLowerCase());

    expect(included.filter((term) => term === "raul garza")).toHaveLength(1);
    expect(included).toEqual(expect.arrayContaining([
      "mohammad entiminan",
      "proceo vargas",
      "standing seam and specialty company inc.",
      "derek i. salinas",
      "raul garza",
      "goldman & peterson, pllc",
      "lopez judge garza law firm",
      "tijerina legal group, p.c.",
      "neibardel corporal",
      "c-1628-25-e",
    ]));
    expect(included.length).toBeLessThanOrEqual(90);
    expect(included).not.toContain("overflow term 140");
  });
});
