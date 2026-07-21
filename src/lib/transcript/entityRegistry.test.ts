import { describe, expect, it } from "vitest";

import { emptyCaseRecord, type CaseRecord } from "../../types/case";
import { buildEntityRegistry, findEntityMatch, listRegistryTerms } from "./entityRegistry";

function buildRecord(): CaseRecord {
  const record = emptyCaseRecord("case_1", "2026-07-13T00:00:00Z");
  record.caption.case_style.value = "Etminan v. Bentley Chiropractic";
  record.caption.case_number.value = "2026-CV-100";
  record.caption.court_name.value = "District Court";
  record.caption.county.value = "Bexar County";
  record.reporter.name.value = "Miah Bardot";
  record.reporter.cert_number.value = "12129";
  record.witnesses = [{
    witness_id: "wit_1",
    name: { value: "Payam Etminan", source: "manual", confirmed: false, conflict: false, confidence_score: null },
    role: { value: "EXPERT", source: "manual", confirmed: false, conflict: false, confidence_score: null },
    title: { value: "M.D.", source: "manual", confirmed: false, conflict: false, confidence_score: null },
    employer: { value: "Etminan Spine Institute", source: "manual", confirmed: false, conflict: false, confidence_score: null },
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
  record.attorneys = [{
    attorney_id: "atty_1",
    name: { value: "Dennis Bentley", source: "manual", confirmed: false, conflict: false, confidence_score: null },
    firm: { value: "Bentley Law", source: "manual", confirmed: false, conflict: false, confidence_score: null },
    role: { value: "EXAMINING", source: "manual", confirmed: false, conflict: false, confidence_score: null },
    representing: { value: "Plaintiff", source: "manual", confirmed: false, conflict: false, confidence_score: null },
    bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
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

describe("entityRegistry", () => {
  it("collects case metadata and common aliases", () => {
    const registry = buildEntityRegistry(buildRecord());

    expect(findEntityMatch(registry, "Dennis Bentley")?.category).toBe("attorney");
    expect(findEntityMatch(registry, "Mr. Bentley")?.canonical).toBe("Dennis Bentley");
    expect(findEntityMatch(registry, "Dr. Etminan")?.canonical).toBe("Payam Etminan");
    expect(findEntityMatch(registry, "The Witness")?.category).toBe("witness");
  });

  it("lists usable registry terms for AI and review context", () => {
    const registry = buildEntityRegistry(buildRecord());
    const terms = listRegistryTerms(registry, ["attorney", "witness", "law_firm"]);

    expect(terms).toContain("Dennis Bentley");
    expect(terms).toContain("Payam Etminan");
    expect(terms).toContain("Bentley Law");
  });
});
