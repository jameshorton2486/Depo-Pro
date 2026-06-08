import { describe, expect, it } from "vitest";

import { emptyCaseRecord } from "../types/case";
import { initialIntakeState, intakeReducer } from "./intakeReducer";

describe("participant add/remove provenance behavior", () => {
  it("currently mutates participant collections without creating any provenance rows on add/remove", () => {
    const record = emptyCaseRecord("case_participant_provenance", "2026-06-08T00:00:00.000Z");
    const state = {
      ...initialIntakeState(),
      record,
    };

    const added = intakeReducer(state, {
      type: "ADD_PARTICIPANT",
      payload: {
        participant: {
          name: { value: "Jordan Smith", source: "manual", confirmed: true, conflict: false, confidence_score: null },
          role: "OTHER",
          organization: "Home Depot",
          email: "jordan@example.com",
          phone: "2105550101",
          role_in_this_proceeding: "Corporate representative",
          notes: "manual add",
        },
      },
    });

    const participantId = added.record.participants[0]?.participant_id;
    if (!participantId) {
      throw new Error("ADD_PARTICIPANT did not create a participant id.");
    }

    const removed = intakeReducer(added, {
      type: "REMOVE_PARTICIPANT",
      payload: { participant_id: participantId },
    });

    // AUDIT NOTE: manual participant entries are not provenance-tracked today — fix is post-beta, behavioral.
    expect(added.record.participants).toHaveLength(1);
    expect(removed.record.participants).toEqual([]);
    expect(("field_provenance" in (added.record as unknown as Record<string, unknown>))).toBe(false);
    expect(("field_provenance" in (removed.record as unknown as Record<string, unknown>))).toBe(false);
    expect(("provenance" in (added.record as unknown as Record<string, unknown>))).toBe(false);
    expect(("provenance" in (removed.record as unknown as Record<string, unknown>))).toBe(false);
  });
});
