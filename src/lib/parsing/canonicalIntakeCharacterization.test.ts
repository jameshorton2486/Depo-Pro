import { describe, expect, it } from "vitest";

import { normalizeFields } from "../../../supabase/functions/extract-nod/normalization.js";

describe("current canonical Intake field behavior", () => {
  it.each([
    ["25-cv-00598-olg", "25-cv-00598-olg"],
    ["25-CV-00598-OLG", "25-CV-00598-OLG"],
    ["  SYN-2026-001  ", "SYN-2026-001"],
  ])("preserves cause-number casing and separators for %j", (input, expected) => {
    const normalized = normalizeFields({ cause_number: input });

    expect(normalized.cause_number.value).toBe(expected);
  });

  it.each([
    ["2105550101", "2105550101"],
    ["210-555-0101", "210-555-0101"],
    ["(210) 555-0101", "(210) 555-0101"],
  ])("preserves extracted phone punctuation for %j", (input, expected) => {
    const normalized = normalizeFields({
      law_firms: [{ name: "Synthetic Legal Group", phone: input }],
      attorneys: [{ name: "Avery Quill", phone: input }],
    });

    expect(normalized.law_firms[0]?.phone.value).toBe(expected);
    expect(normalized.attorneys[0]?.phone.value).toBe(expected);
  });

  it.each([
    ["AVERY QUILL", "AVERY QUILL"],
    ["Avery Quill", "Avery Quill"],
    ["avery quill", "avery quill"],
  ])("preserves person-name casing for %j", (input, expected) => {
    const normalized = normalizeFields({
      witness: { name: input },
      attorneys: [{ name: input }],
    });

    expect(normalized.witness.name.value).toBe(expected);
    expect(normalized.attorneys[0]?.name.value).toBe(expected);
  });

  it.each([
    ["NORTHSTAR HARDWARE", "NORTHSTAR HARDWARE"],
    ["Falcon, Reed & Vale, P.C.", "Falcon, Reed & Vale, P.C."],
    ["northstar hardware", "northstar hardware"],
  ])("preserves organization-name casing and punctuation for %j", (input, expected) => {
    const normalized = normalizeFields({
      law_firms: [{ name: input, phone: "" }],
    });

    expect(normalized.law_firms[0]?.name.value).toBe(expected);
  });

  it.each([
    ["SYNTHETIC DISTRICT COURT", "SYNTHETIC DISTRICT COURT"],
    ["Synthetic District Court", "Synthetic District Court"],
    ["synthetic district court", "synthetic district court"],
  ])("preserves court-name casing for %j", (input, expected) => {
    const normalized = normalizeFields({ court_name: input });

    expect(normalized.court_name.value).toBe(expected);
  });

  it("removes the current trailing federal-district suffix from a court name", () => {
    const normalized = normalizeFields({
      court_name: "United States District Court, Western District of Texas",
    });

    expect(normalized.court_name.value).toBe("United States District Court");
  });
});

