import { describe, expect, it } from "vitest";

import { emptyCaseRecord, type CaseRecord } from "../../types/case";
import { assertCaseAudioIntegrity, validateCaseAudioIntegrity } from "./caseAudioIntegrity";

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
  const record = emptyCaseRecord("case_garza", "2026-06-23T12:00:00.000Z");
  record.caption.case_style = manualField("Delia Garza v. Home Depot U.S.A., Inc. and Shawn Herber");
  record.caption.county = manualField("Bexar County");
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
  ];
  return record;
}

function buildEtminanRecord(): CaseRecord {
  const record = emptyCaseRecord("case_etminan", "2026-06-23T12:00:00.000Z");
  record.caption.case_style = manualField(
    "Rocio Laura Elizondo Vargas v. Leonardo Isaias Rodriguez, Sandy Dean Koepke, and Standing Seam & Specialty Company, Inc.",
  );
  record.witnesses = [{
    witness_id: "wit_1",
    name: manualField("Mohammad Etminan"),
    role: manualField("WITNESS"),
    title: manualField("Doctor"),
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
    name: manualField("Laura Rico"),
    firm: manualField("Rico Law Firm, PLLC"),
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
  record.parties = [
    {
      party_id: "p1",
      name: manualField("Rocio Laura Elizondo Vargas"),
      role: manualField("plaintiff"),
      role_modifier: manualField(null),
      entity_type: manualField(null),
      fka_or_dba: manualField(null),
    },
    {
      party_id: "p2",
      name: manualField("Standing Seam & Specialty Company, Inc."),
      role: manualField("defendant"),
      role_modifier: manualField(null),
      entity_type: manualField(null),
      fka_or_dba: manualField(null),
    },
  ];
  return record;
}

describe("validateCaseAudioIntegrity", () => {
  it("accepts case A audio with case A keyterms", () => {
    const result = validateCaseAudioIntegrity(buildGarzaRecord(), "2026-04-24 Heath Thomas Garza depo audio.mp3");

    expect(result.ok).toBe(true);
    expect(result.matchedTokens).toEqual(expect.arrayContaining(["heath", "thomas", "garza"]));
  });

  it("accepts case B audio with case B keyterms", () => {
    const result = validateCaseAudioIntegrity(buildEtminanRecord(), "04-24-26 Dr Mohammed Etminan MD Vargas Audio.mp3");

    expect(result.ok).toBe(true);
    expect(result.matchedTokens).toEqual(expect.arrayContaining(["etminan", "vargas"]));
  });

  it("rejects a filename whose distinctive tokens do not belong to the case", () => {
    const result = validateCaseAudioIntegrity(buildGarzaRecord(), "04-24-26 Dr Mohammed Etminan MD Vargas Audio.mp3");

    expect(result.ok).toBe(false);
    expect(result.unmatchedDistinctiveTokens).toEqual(expect.arrayContaining(["mohammed", "etminan", "vargas"]));
    expect(() => assertCaseAudioIntegrity(buildGarzaRecord(), "04-24-26 Dr Mohammed Etminan MD Vargas Audio.mp3"))
      .toThrow(/Audio filename appears inconsistent with case-derived keyterms/);
  });

  it("allows generic filenames when there is no distinctive case signal to compare", () => {
    const result = validateCaseAudioIntegrity(buildGarzaRecord(), "audio1728584021 (4).mp3");

    expect(result.ok).toBe(true);
    expect(result.matchedTokens).toHaveLength(0);
  });
});
