import { describe, expect, it } from "vitest";

import type { ExtractedField } from "../types/case";
import { emptyCaseRecord } from "../types/case";
import { initialIntakeState, intakeReducer } from "./intakeReducer";

function field<T>(value: T): ExtractedField<T> {
  return { value, source: "manual", confirmed: false, conflict: false, confidence_score: null };
}

function state() {
  return { ...initialIntakeState(), record: emptyCaseRecord("case_manual_names", "2026-08-03T12:00:00.000Z") };
}

describe("manual canonical name writers", () => {
  it("canonicalizes court and reporter field writes while preserving metadata", () => {
    const court = intakeReducer(state(), {
      type: "UPDATE_FIELD",
      payload: { path: "caption.court_name", value: "SYNTHETIC DISTRICT COURT", source: "manual", confidence_score: 0.8 },
    });
    const reporter = intakeReducer(court, {
      type: "UPDATE_FIELD",
      payload: { path: "reporter.name", value: "AVERY QUILL", source: "manual", confidence_score: 0.9 },
    });
    expect(reporter.record.caption.court_name).toMatchObject({ value: "Synthetic District Court", source: "manual", confidence_score: 0.8 });
    expect(reporter.record.reporter.name).toMatchObject({ value: "Avery Quill", source: "manual", confidence_score: 0.9 });
  });

  it("canonicalizes person and organization values on add and update actions", () => {
    let next = intakeReducer(state(), {
      type: "ADD_ATTORNEY",
      payload: { attorney: {
        name: field("JORDAN VALE"), firm: field("FALCON, REED & VALE, P.C."), role: field("OTHER"),
        representing: field(null), bar_number: field(null), address: null, city: null,
        state: null, zip: null, time_used: null, email: null, phone: null,
      } },
    });
    const id = next.record.attorneys[0]?.attorney_id;
    next = intakeReducer(next, {
      type: "UPDATE_ATTORNEY",
      payload: { attorney_id: id!, patch: { name: field("morgan reed"), firm: field("northstar hardware llc") } },
    });
    expect(next.record.attorneys[0]?.name.value).toBe("Morgan Reed");
    expect(next.record.attorneys[0]?.firm.value).toBe("Northstar Hardware LLC");
  });

  it("preserves uncertain mixed-case and punctuated identities", () => {
    const next = intakeReducer(state(), {
      type: "ADD_PARTICIPANT",
      payload: { participant: {
        name: field("Anne-Marie O'Neal"), role: "OTHER", organization: "eBay Legal",
        email: null, phone: null, role_in_this_proceeding: null, notes: null,
      } },
    });
    expect(next.record.participants[0]?.name.value).toBe("Anne-Marie O'Neal");
    expect(next.record.participants[0]?.organization).toBe("eBay Legal");
  });
});
