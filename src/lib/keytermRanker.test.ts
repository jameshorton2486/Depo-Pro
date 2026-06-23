import { describe, expect, it } from "vitest";

import type { ManagedKeyterm } from "../components/DeepgramKeytermManager/types";
import { computePriority, rankKeyterms } from "./keytermRanker";

function buildManagedTerm(term: string, notes: string): ManagedKeyterm {
  return {
    id: `kt_${term.toLowerCase().replace(/\s+/g, "_")}`,
    term,
    boost: 0.5,
    category: notes === "derived:legal_term" ? "legal_term" : notes === "derived:caption_entity" ? "other" : notes.includes("organization") || notes.includes("firm") || notes.includes("medical_provider") ? "company" : "proper_name",
    source: "UFM Metadata",
    notes,
    selected: true,
    pinned: false,
    priority: 0,
    confidence: 1,
    token_count: term.split(/\s+/).length,
  };
}

describe("rankKeyterms", () => {
  it("prioritizes case people and entities above generic legal terminology", () => {
    const ranked = rankKeyterms([
      buildManagedTerm("Texas Rules of Civil Procedure", "derived:legal_term"),
      buildManagedTerm("Delia Garza", "derived:caption_entity"),
      buildManagedTerm("South Texas Spine Clinic", "derived:medical_provider"),
      buildManagedTerm("Brain and Spine Personal Injury Lawyers of San Antonio, PLLC", "derived:firm"),
      buildManagedTerm("Standing Seam & Specialty Company, Inc.", "derived:organization"),
      buildManagedTerm("Mohammad Etminan", "derived:expert"),
      buildManagedTerm("Curtis L. Cukjati", "derived:attorney"),
      buildManagedTerm("Heath Thomas", "derived:witness"),
    ]);

    expect(ranked.map((term) => term.notes)).toEqual([
      "derived:witness",
      "derived:attorney",
      "derived:expert",
      "derived:organization",
      "derived:firm",
      "derived:medical_provider",
      "derived:caption_entity",
      "derived:legal_term",
    ]);
  });

  it("promotes difficult attorney spellings above simpler attorney names", () => {
    const simple = buildManagedTerm("John Smith", "derived:attorney");
    const difficult = buildManagedTerm("Ana De La Cruz", "derived:attorney:sbot");

    expect(computePriority(difficult)).toBeGreaterThan(computePriority(simple));
  });

  it("promotes uncommon surnames and long organization phrases", () => {
    const uncommon = buildManagedTerm("Farooq Qureshi", "derived:expert");
    const common = buildManagedTerm("Laura Stone", "derived:expert");
    const organization = buildManagedTerm("Standing Seam & Specialty Company, Inc.", "derived:organization");
    const shortCompany = buildManagedTerm("Acme LLC", "derived:organization");

    expect(computePriority(uncommon)).toBeGreaterThan(computePriority(common));
    expect(computePriority(organization)).toBeGreaterThan(computePriority(shortCompany));
  });
});
