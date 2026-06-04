import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import { editorDocumentToWorkingTranscript } from "../editorDocumentToWorkingTranscript";
import type { WorkingTranscriptFile } from "../types";

const DOCUMENT: EditorDocument = {
  job_id: "case_20240602_001",
  media_url: "/audio.wav",
  duration: 42,
  speakers: [
    { speaker_id: "spk_001", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
  ],
  utterances: [
    {
      utterance_id: "utt_0001",
      speaker_id: "spk_001",
      start_time: 0,
      end_time: 1,
      word_ids: ["w_00000001"],
    },
  ],
  words: [
    {
      word_id: "w_00000001",
      text: "Hello",
      raw_text: "Hello",
      speaker_id: "spk_001",
      utterance_id: "utt_0001",
      start_time: 0,
      end_time: 0.5,
      confidence: 0.99,
      reviewed: true,
      edited: false,
    },
  ],
};

describe("editorDocumentToWorkingTranscript", () => {
  it("preserves provenance fields from an existing working transcript", () => {
    const existing: WorkingTranscriptFile = {
      version: "1.0",
      case_id: "case_20240602_001",
      job_id: "deepgram-job-123",
      media_url: "/old.wav",
      duration: 10,
      speakers: [],
      utterances: [],
      words: [],
      deepgram_request_id: "dg_req_001",
      based_on: "raw_transcript.json",
      original_transcript: { preserved: true },
    };

    const next = editorDocumentToWorkingTranscript(DOCUMENT, existing, {
      lastSavedAt: "2026-06-02T12:30:00Z",
      dirty: false,
    });

    expect(next.deepgram_request_id).toBe("dg_req_001");
    expect(next.original_transcript).toEqual({ preserved: true });
    expect(next.last_saved_at).toBe("2026-06-02T12:30:00Z");
    expect(next.job_id).toBe("deepgram-job-123");
    expect(next.case_id).toBe("case_20240602_001");
  });

  it("preserves transcript content without loss", () => {
    const next = editorDocumentToWorkingTranscript(DOCUMENT);

    expect(next.words).toEqual(DOCUMENT.words);
    expect(next.utterances).toEqual(DOCUMENT.utterances);
    expect(next.speakers).toEqual(DOCUMENT.speakers);
    expect(next.words[0].raw_text).toBe("Hello");
  });

  it("uses runtime job_id only when no persisted transcript provenance exists", () => {
    const next = editorDocumentToWorkingTranscript(DOCUMENT, null, {
      lastSavedAt: "2026-06-02T12:30:00Z",
      dirty: false,
    });

    expect(next.case_id).toBe("case_20240602_001");
    expect(next.job_id).toBe("case_20240602_001");
    expect(next.last_saved_at).toBe("2026-06-02T12:30:00Z");
  });

  it("preserves transcript job provenance across a round trip", () => {
    const existing: WorkingTranscriptFile = {
      version: "1.0",
      case_id: "case_20240602_001",
      job_id: "deepgram-job-456",
      media_url: "/audio.wav",
      duration: 42,
      speakers: DOCUMENT.speakers,
      utterances: DOCUMENT.utterances,
      words: DOCUMENT.words,
      deepgram_response: { request_id: "dg_req_456" },
    };

    const next = editorDocumentToWorkingTranscript(DOCUMENT, existing);

    expect(next.job_id).toBe("deepgram-job-456");
    expect(next.case_id).toBe("case_20240602_001");
    expect(next.deepgram_response).toEqual({ request_id: "dg_req_456" });
  });
});
