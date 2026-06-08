import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../../types/case";
import { shouldSuggestLowercaseKeyterm } from "./manualKeytermHint";

function manualField<T>(value: T) {
  return {
    value,
    source: "manual" as const,
    confirmed: true,
    conflict: false,
    confidence_score: null,
  };
}

describe("shouldSuggestLowercaseKeyterm", () => {
  it("suggests lowercase for a single capitalized common-style word not present in case metadata", () => {
    const record = emptyCaseRecord("case_hint", "2026-06-07T20:00:00.000Z");
    expect(shouldSuggestLowercaseKeyterm("Technical", record)).toBe(true);
  });

  it("does not suggest lowercase for multi-word terms or already-lowercase terms", () => {
    const record = emptyCaseRecord("case_hint_multi", "2026-06-07T20:00:00.000Z");
    expect(shouldSuggestLowercaseKeyterm("Remote Video", record)).toBe(false);
    expect(shouldSuggestLowercaseKeyterm("technical", record)).toBe(false);
  });

  it("does not suggest lowercase when the term matches a derived case participant or place name", () => {
    const record = emptyCaseRecord("case_hint_match", "2026-06-07T20:00:00.000Z");
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
    record.caption.county = manualField("Bexar County");

    expect(shouldSuggestLowercaseKeyterm("Thomas", record)).toBe(false);
    expect(shouldSuggestLowercaseKeyterm("Bexar", record)).toBe(false);
  });
});
