import { describe, expect, it } from "vitest";

import type { FieldProvenanceRow } from "../../components/conflict/types";
import { emptyCaseRecord } from "../../types/case";
import { harvestKeyterms } from "./harvestKeyterms";
import { mergeManagedKeytermSuggestions } from "./managedKeyterms";

function buildRecord() {
  const record = emptyCaseRecord("case_garza", "2026-06-05T20:00:00.000Z");
  record.caption.case_style.value = "Maria L. Lopez De Martinez and Alfredo Montes Navarro v. Rafael Robles Calderon and All American Heavy Equipment Leasing, LLC";
  record.caption.case_number.value = "C-1628-25-E";
  record.caption.county.value = "Hidalgo County";
  record.caption.court_name.value = "275th Judicial District";
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
});
