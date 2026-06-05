import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../types/case";
import { intakeReducer, initialIntakeState } from "./intakeReducer";

describe("intakeReducer edit sequencing", () => {
  it("increments editSeq for field edits and resets on load", () => {
    const now = "2026-06-05T00:00:00.000Z";
    const seeded = emptyCaseRecord("case_test_001", now);
    const baseState = {
      ...initialIntakeState(),
      record: seeded,
    };

    const edited = intakeReducer(baseState, {
      type: "UPDATE_FIELD",
      payload: {
        path: "caption.case_name",
        value: "Garza v. Robles",
        source: "manual",
        confidence_score: null,
      },
    });

    expect(edited.dirty).toBe(true);
    expect(edited.editSeq).toBe(1);

    const reloaded = intakeReducer(edited, {
      type: "LOAD_CASE",
      payload: {
        record: {
          ...edited.record,
          updated_at: "2026-06-05T00:00:10.000Z",
        },
      },
    });

    expect(reloaded.dirty).toBe(false);
    expect(reloaded.editSeq).toBe(0);
  });

  it("increments editSeq for collection mutations", () => {
    const now = "2026-06-05T00:00:00.000Z";
    const baseState = {
      ...initialIntakeState(),
      record: emptyCaseRecord("case_test_002", now),
    };

    const next = intakeReducer(baseState, {
      type: "ADD_ATTORNEY",
      payload: {
        attorney: {
          name: { value: "Raul Garza", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          firm: { value: "Goldman & Peterson", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: { value: "EXAMINING", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          representing: { value: "FOR THE PLAINTIFF", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          bar_number: { value: null, source: "manual", confirmed: false, conflict: false, confidence_score: null },
          address: null,
          city: null,
          state: null,
          zip: null,
          time_used: null,
          email: null,
          phone: null,
        },
      },
    });

    expect(next.editSeq).toBe(1);
    expect(next.record.attorneys).toHaveLength(1);
  });
});
