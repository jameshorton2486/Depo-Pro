import { describe, expect, it } from "vitest";

import { emptyCaseRecord, normalizeCaseRecord } from "../types/case";
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

  it("increments editSeq for exhibit collection mutations", () => {
    const now = "2026-06-05T00:00:00.000Z";
    const baseState = {
      ...initialIntakeState(),
      record: emptyCaseRecord("case_test_exhibits", now),
    };

    const added = intakeReducer(baseState, {
      type: "ADD_EXHIBIT",
      payload: {
        exhibit: {
          label: "Exhibit 1",
          description: "Contract",
          filename: "contract.pdf",
          file_url: null,
          marked_by: null,
          admitted: false,
          page_reference: null,
          line_reference: null,
        },
      },
    });

    expect(added.editSeq).toBe(1);
    expect(added.record.exhibits).toHaveLength(1);

    const updated = intakeReducer(added, {
      type: "UPDATE_EXHIBIT",
      payload: {
        exhibit_id: added.record.exhibits[0].exhibit_id,
        patch: {
          description: "Signed contract",
        },
      },
    });

    expect(updated.editSeq).toBe(2);
    expect(updated.record.exhibits[0].description).toBe("Signed contract");

    const removed = intakeReducer(updated, {
      type: "REMOVE_EXHIBIT",
      payload: {
        exhibit_id: updated.record.exhibits[0].exhibit_id,
      },
    });

    expect(removed.editSeq).toBe(3);
    expect(removed.record.exhibits).toHaveLength(0);
  });

  it("preserves array shapes when updating indexed witness and attorney fields", () => {
    const now = "2026-06-05T00:00:00.000Z";
    const baseRecord = emptyCaseRecord("case_test_array_fields", now);
    const seededRecord = normalizeCaseRecord({
      ...baseRecord,
      witnesses: [
        {
          name: { value: "", source: "manual", confirmed: false, conflict: false, confidence_score: null },
        },
      ],
      attorneys: [
        {
          name: { value: "", source: "manual", confirmed: false, conflict: false, confidence_score: null },
        },
      ],
    });
    const baseState = {
      ...initialIntakeState(),
      record: seededRecord,
    };

    const witnessEdited = intakeReducer(baseState, {
      type: "UPDATE_FIELD",
      payload: {
        path: "witnesses[0].name",
        value: "Heath Thomas",
        source: "manual",
        confidence_score: null,
        force: true,
      },
    });

    expect(Array.isArray(witnessEdited.record.witnesses)).toBe(true);
    expect(witnessEdited.record.witnesses).toHaveLength(1);
    expect(witnessEdited.record.witnesses[0].name.value).toBe("Heath Thomas");

    const attorneyEdited = intakeReducer(witnessEdited, {
      type: "UPDATE_FIELD",
      payload: {
        path: "attorneys[0].name",
        value: "Raul Garza",
        source: "manual",
        confidence_score: null,
        force: true,
      },
    });

    expect(Array.isArray(attorneyEdited.record.attorneys)).toBe(true);
    expect(attorneyEdited.record.attorneys).toHaveLength(1);
    expect(attorneyEdited.record.attorneys[0].name.value).toBe("Raul Garza");
  });
});
