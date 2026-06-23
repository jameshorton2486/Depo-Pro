import { describe, expect, it } from "vitest";

import type { ManagedKeyterm } from "../components/DeepgramKeytermManager/types";
import { rankKeyterms } from "./keytermRanker";

function buildManagedTerm(term: string, notes: string): ManagedKeyterm {
  return {
    id: `kt_${term.toLowerCase().replace(/\s+/g, "_")}`,
    term,
    boost: 0.5,
    category: notes === "derived:legal_term" ? "legal_term" : notes === "derived:caption_entity" ? "other" : "proper_name",
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
});
