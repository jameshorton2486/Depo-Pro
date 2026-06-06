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

  it("derives is_remote from location_type and preserves the value across load", () => {
    const now = "2026-06-05T00:00:00.000Z";
    const baseState = {
      ...initialIntakeState(),
      record: emptyCaseRecord("case_test_location_type", now),
    };

    const edited = intakeReducer(baseState, {
      type: "UPDATE_FIELD",
      payload: {
        path: "session.location_type",
        value: "zoom",
        source: "manual",
        confidence_score: null,
        force: true,
      },
    });

    expect(edited.record.session.location_type.value).toBe("zoom");
    expect(edited.record.session.is_remote).toBe(true);

    const reloaded = intakeReducer(edited, {
      type: "LOAD_CASE",
      payload: {
        record: {
          ...edited.record,
          updated_at: "2026-06-05T00:00:10.000Z",
        },
      },
    });

    expect(reloaded.record.session.location_type.value).toBe("zoom");
    expect(reloaded.record.session.is_remote).toBe(true);
  });

  it("stores uploaded audio in the case record and marks the state dirty", () => {
    const now = "2026-06-05T00:00:00.000Z";
    const baseState = {
      ...initialIntakeState(),
      record: emptyCaseRecord("case_test_audio", now),
    };

    const next = intakeReducer(baseState, {
      type: "SET_AUDIO",
      payload: {
        audio: {
          audio_id: "audio_test_001",
          original_filename: "hearing.mp3",
          mime_type: "audio/mpeg",
          duration_seconds: 42,
          file_size_bytes: 1024,
          uploaded_at: now,
          media_url: "https://example.com/hearing.mp3",
        },
      },
    });

    expect(next.dirty).toBe(true);
    expect(next.editSeq).toBe(1);
    expect(next.record.audio?.audio_id).toBe("audio_test_001");
  });

  it("stores keyterm changes in the case record and marks the state dirty", () => {
    const now = "2026-06-05T00:00:00.000Z";
    const baseState = {
      ...initialIntakeState(),
      record: emptyCaseRecord("case_test_keyterms", now),
    };

    const next = intakeReducer(baseState, {
      type: "SET_KEYTERMS",
      payload: {
        keyterms: [
          {
            term: "Goldman & Peterson",
            boost: 0.8,
            category: "company",
            notes: "Ordering counsel",
          },
        ],
      },
    });

    expect(next.dirty).toBe(true);
    expect(next.editSeq).toBe(1);
    expect(next.record.deepgram.keyterms).toEqual([
      {
        term: "Goldman & Peterson",
        boost: 0.8,
        category: "company",
        notes: "Ordering counsel",
      },
    ]);
  });
});
