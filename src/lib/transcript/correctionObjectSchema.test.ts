import { describe, expect, it } from "vitest";
import schema from "./correction_object.schema.json";
import {
  collectCorrectionErrors,
  STRUCTURAL_CHANGE_TYPES,
  TEXT_CHANGE_TYPES,
} from "./correctionObject";

// DOC-0327 — CorrectionObject drift guard. The co-located schema is the contract of
// record; correctionObject.ts is the surviving production authority. This test fails
// if the two drift, so they are mechanically synchronized rather than hand-synced.

// Mirror of the TS union types (kept here so a drift shows as a test failure, not a
// silent compile-time-only divergence).
const TS_SPECIALTIES = [
  "proper_name_novel", "medical_context", "qa_split", "speaker_reassignment",
  "objection_attribution", "examination_section", "off_record_boundary",
  "inconsistency_flag", "contextual_number", "phonetic_disambiguation", "deterministic_rule",
];
const TS_CHANGE_TYPES = [
  "proper_name_correction", "medical_term_correction", "speaker_reassignment", "qa_split",
  "objection_split", "objection_attribution", "examination_section_change", "off_record_boundary_mark",
  "inconsistency_flag", "contextual_number_flag",
];
const TS_REASON_KINDS = [
  "registry_match", "phonetic_similarity", "context_pattern", "prior_correction",
  "inconsistency_detected", "structural_boundary", "confidence_threshold",
  "reporter_preference", "rule_pattern",
];
const TS_PROVENANCE_SOURCES = ["ai", "deterministic", "reporter"];
const TS_REVIEW_STATES = ["pending", "accepted", "rejected", "edited", "superseded"];

// Fields the TS CorrectionObject interface makes non-optional (its required set).
const TS_REQUIRED = [
  "id", "transcript_id", "case_id", "specialty", "prompt_version", "location",
  "change", "reason", "reason_kind", "confidence", "provenance", "review", "downstream",
];

const props = (schema as { properties: Record<string, { enum?: string[] }> }).properties;
const sorted = (xs: string[]) => [...xs].sort();

describe("CorrectionObject schema ↔ TS drift guard", () => {
  it("specialty enum matches", () => {
    expect(sorted(props.specialty.enum!)).toEqual(sorted(TS_SPECIALTIES));
  });

  it("change.type enum matches", () => {
    const changeTypeEnum = (props.change as unknown as {
      properties: { type: { enum: string[] } };
    }).properties.type.enum;
    expect(sorted(changeTypeEnum)).toEqual(sorted(TS_CHANGE_TYPES));
    // Every change.type is exactly one of: text, structural, or the lone marker
    // inconsistency_flag (neither) — no orphans on either side.
    for (const t of changeTypeEnum) {
      const isText = TEXT_CHANGE_TYPES.has(t as never);
      const isStructural = STRUCTURAL_CHANGE_TYPES.has(t as never);
      const isMarker = t === "inconsistency_flag";
      expect(Number(isText) + Number(isStructural) + Number(isMarker)).toBe(1);
    }
  });

  it("reason_kind enum matches", () => {
    expect(sorted(props.reason_kind.enum!)).toEqual(sorted(TS_REASON_KINDS));
  });

  it("provenance.source enum matches", () => {
    const sourceEnum = (props.provenance as unknown as {
      properties: { source: { enum: string[] } };
    }).properties.source.enum;
    expect(sorted(sourceEnum)).toEqual(sorted(TS_PROVENANCE_SOURCES));
  });

  it("review.state enum matches", () => {
    const stateEnum = (props.review as unknown as {
      properties: { state: { enum: string[] } };
    }).properties.state.enum;
    expect(sorted(stateEnum)).toEqual(sorted(TS_REVIEW_STATES));
  });

  it("required field set matches the TS interface's required fields", () => {
    expect(sorted((schema as { required: string[] }).required)).toEqual(sorted(TS_REQUIRED));
  });

  it("both worked examples in the schema pass the TS validator", () => {
    const defs = (schema as { $defs: Record<string, unknown> }).$defs;
    for (const key of ["example_proper_name_correction", "example_qa_split"]) {
      expect(collectCorrectionErrors(defs[key])).toEqual([]);
    }
  });
});
