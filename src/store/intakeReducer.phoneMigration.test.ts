import { describe, expect, it } from "vitest";

import type { ExtractedField } from "../types/case";
import { emptyCaseRecord } from "../types/case";
import { initialIntakeState, intakeReducer } from "./intakeReducer";

function field<T>(value: T): ExtractedField<T> {
  return { value, source: "manual", confirmed: false, conflict: false, confidence_score: null };
}

function state() {
  return { ...initialIntakeState(), record: emptyCaseRecord("case_manual_phone", "2026-08-03T12:00:00.000Z") };
}

describe("manual canonical phone writers", () => {
  it("canonicalizes generic reporter and law-firm phone/fax updates", () => {
    const initial = state();
    initial.record.law_firms = [{
      law_firm_id: "firm_1",
      name: field("Synthetic Legal Group"),
      address: field(null),
      city: field(null),
      state: field(null),
      zip: field(null),
      phone: field(null),
      fax: field(null),
      email: field(null),
      represented_party: field(null),
    }];

    const reporter = intakeReducer(initial, {
      type: "UPDATE_FIELD",
      payload: { path: "reporter.phone", value: "210.555.0101", source: "manual", confidence_score: null },
    });
    const phone = intakeReducer(reporter, {
      type: "UPDATE_FIELD",
      payload: { path: "law_firms[0].phone", value: "2105550102", source: "manual", confidence_score: null },
    });
    const fax = intakeReducer(phone, {
      type: "UPDATE_FIELD",
      payload: { path: "law_firms[0].fax", value: "210-555-0103", source: "manual", confidence_score: null },
    });

    expect(fax.record.reporter.phone).toBe("(210) 555-0101");
    expect(fax.record.law_firms[0]?.phone.value).toBe("(210) 555-0102");
    expect(fax.record.law_firms[0]?.fax.value).toBe("(210) 555-0103");
  });

  it("canonicalizes add writers for every plain-phone participant family", () => {
    let next = state();
    next = intakeReducer(next, {
      type: "ADD_ATTORNEY",
      payload: { attorney: {
        name: field("Avery Quill"), firm: field(null), role: field("OTHER"),
        representing: field(null), bar_number: field(null), address: null, city: null,
        state: null, zip: null, time_used: null, email: null, phone: "2105550110",
      } },
    });
    next = intakeReducer(next, {
      type: "ADD_INTERPRETER",
      payload: { interpreter: {
        name: field("Morgan Reed"), language_from: "es", language_to: "en",
        oath_administered: null, certified: false, cert_number: null, agency: null,
        email: null, phone: "210-555-0111",
      } },
    });
    next = intakeReducer(next, {
      type: "ADD_VIDEOGRAPHER",
      payload: { videographer: {
        name: field("Taylor Vale"), firm: field(null), role_title: null,
        cert_number: null, email: null, phone: "210.555.0112",
      } },
    });
    next = intakeReducer(next, {
      type: "ADD_PARTICIPANT",
      payload: { participant: {
        name: field("Jordan North"), role: "OTHER", organization: null,
        email: null, phone: "210 555 0113", role_in_this_proceeding: null, notes: null,
      } },
    });

    expect(next.record.attorneys[next.record.attorneys.length - 1]?.phone).toBe("(210) 555-0110");
    expect(next.record.interpreters[next.record.interpreters.length - 1]?.phone).toBe("(210) 555-0111");
    expect(next.record.videographers[next.record.videographers.length - 1]?.phone).toBe("(210) 555-0112");
    expect(next.record.participants[next.record.participants.length - 1]?.phone).toBe("(210) 555-0113");
  });

  it("canonicalizes update writers and rejects invalid values explicitly", () => {
    let initial = state();
    initial = intakeReducer(initial, {
      type: "ADD_ATTORNEY",
      payload: { attorney: {
        name: field("Avery Quill"), firm: field(null), role: field("OTHER"),
        representing: field(null), bar_number: field(null), address: null, city: null,
        state: null, zip: null, time_used: null, email: null, phone: null,
      } },
    });
    const attorneyId = initial.record.attorneys[0]?.attorney_id;
    expect(attorneyId).toBeTruthy();

    const updated = intakeReducer(initial, {
      type: "UPDATE_ATTORNEY",
      payload: { attorney_id: attorneyId!, patch: { phone: "+1 2105550114" } },
    });
    expect(updated.record.attorneys[0]?.phone).toBe("(210) 555-0114");

    expect(() => intakeReducer(initial, {
      type: "UPDATE_ATTORNEY",
      payload: { attorney_id: attorneyId!, patch: { phone: "555-0114" } },
    })).toThrow("Phone Number canonicalization failed");
  });
});
