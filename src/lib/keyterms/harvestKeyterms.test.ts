import { describe, expect, it } from "vitest";

import type { FieldProvenanceRow } from "../../components/conflict/types";
import { emptyCaseRecord } from "../../types/case";
import {
  generateNameVariants,
  generateOrgVariants,
  harvestKeyterms,
  inferCaseContext,
} from "./harvestKeyterms";
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

function buildSpineRecord() {
  const record = emptyCaseRecord("case_etminan", "2026-06-05T20:00:00.000Z");
  record.caption.case_style.value = "Motor vehicle collision involving lumbar spine injury";
  record.caption.case_number.value = "C-5722-24-L";
  record.witnesses = [{
    witness_id: "wit_expert",
    name: { value: "Mohammad Etminan, M.D.", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    role: { value: "EXPERT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    title: { value: "Orthopedic Spine Surgeon", source: "manual", confirmed: true, conflict: false, confidence_score: null },
    employer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    prefix_suffix: "M.D.",
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
  it("generates spoken name variants", () => {
    expect(generateNameVariants("Dennis J. Bentley")).toEqual(
      expect.arrayContaining(["Dennis Bentley", "Bentley", "Dennis"]),
    );
    expect(generateNameVariants("Mohammad Etminan, M.D.")).toEqual(
      expect.arrayContaining(["Mohammad Etminan", "Etminan"]),
    );
    expect(generateNameVariants("Miah Bardot")).toEqual(
      expect.arrayContaining(["Bardot", "Miah"]),
    );
    expect(generateNameVariants("Etminan")).toEqual(["Etminan"]);
  });

  it("generates organization short forms", () => {
    expect(generateOrgVariants("Standing Seam & Specialty Company, Inc.")).toEqual(
      expect.arrayContaining(["Standing Seam & Specialty Company, Inc.", "Standing Seam"]),
    );
    expect(generateOrgVariants("Tijerina Legal Group, P.C.")).toEqual(
      expect.arrayContaining(["Tijerina"]),
    );
    expect(generateOrgVariants("Goldman & Peterson, PLLC")).toEqual(
      expect.arrayContaining(["Goldman & Peterson"]),
    );
  });

  it("infers case context from style and witness role", () => {
    const spineRecord = buildSpineRecord();
    expect(inferCaseContext(spineRecord)).toBe("personal_injury_spine");

    const malpracticeRecord = emptyCaseRecord("case_mal", "2026-06-05T20:00:00.000Z");
    malpracticeRecord.caption.case_style.value = "Medical malpractice negligence action";
    expect(inferCaseContext(malpracticeRecord)).toBe("medical_malpractice");

    const workersCompRecord = emptyCaseRecord("case_wc", "2026-06-05T20:00:00.000Z");
    workersCompRecord.caption.case_style.value = "Workers comp claim for back injury";
    expect(inferCaseContext(workersCompRecord)).toBe("workers_compensation");

    const generalRecord = emptyCaseRecord("case_general", "2026-06-05T20:00:00.000Z");
    expect(inferCaseContext(generalRecord)).toBe("general");
  });

  it("harvests Garza-shaped suggestions from extracted fields and provenance", () => {
    const keyterms = harvestKeyterms(buildRecord(), buildProvenance());
    const terms = keyterms.map((keyterm) => keyterm.term);

    expect(terms).toEqual(expect.arrayContaining([
      "Maria L. Lopez De Martinez",
      "Alfredo Montes Navarro",
      "Raul Garza",
      "Garza",
      "Derek I. Salinas",
      "Salinas",
      "Goldman & Peterson, PLLC",
      "Goldman & Peterson",
      "Tijerina Legal Group, P.C.",
      "Tijerina",
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

  it("injects medical terms for an Etminan-style spine case", () => {
    const terms = harvestKeyterms(buildSpineRecord(), buildProvenance()).map((keyterm) => keyterm.term);
    expect(terms).toEqual(expect.arrayContaining([
      "discectomy",
      "radiculopathy",
      "pars interarticularis",
    ]));
  });

  it("harvests party names and spoken variants", () => {
    const record = buildRecord();
    record.parties = [{
      party_id: "party_1",
      name: { value: "Rocio Laura Elizondo Vargas", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role_modifier: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      entity_type: { value: "individual", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      fka_or_dba: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    }];

    const terms = harvestKeyterms(record, buildProvenance()).map((keyterm) => keyterm.term);
    expect(terms).toEqual(expect.arrayContaining([
      "Rocio Laura Elizondo Vargas",
      "Vargas",
    ]));
  });

  it("caps total suggestions at the configured maximum", () => {
    const record = buildRecord();
    record.caption.case_style.value = "Motor vehicle collision with cervical spine and lumbar spine injury";
    record.witnesses = [{
      witness_id: "wit_limit",
      name: { value: "Mohammad Etminan, M.D.", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "EXPERT", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      title: { value: "Orthopedic Spine Surgeon", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      employer: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      prefix_suffix: "M.D.",
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
    record.parties = Array.from({ length: 25 }, (_, index) => ({
      party_id: `party_${index}`,
      name: { value: `Plaintiff Person ${index} Vargas`, source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role: { value: "plaintiff", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      role_modifier: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
      entity_type: { value: "individual", source: "manual", confirmed: true, conflict: false, confidence_score: null },
      fka_or_dba: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
    }));

    expect(harvestKeyterms(record, buildProvenance()).length).toBeLessThanOrEqual(100);
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
