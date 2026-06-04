import { describe, expect, it } from "vitest";
import type { Speaker, Word, Utterance } from "../../api/types";
import { emptyCaseRecord } from "../../types/case";
import { caseIdToJobId, caseToEditorDocument } from "../caseToEditorDocument";
import type { ReviewStateFile, WorkingTranscriptFile } from "../types";

function makeSpeaker(overrides: Partial<Speaker> = {}): Speaker {
  return {
    speaker_id: "spk_001",
    display_name: "THE WITNESS",
    deepgram_speaker: 1,
    role: undefined,
    ...overrides,
  };
}

function makeUtterance(overrides: Partial<Utterance> = {}): Utterance {
  return {
    utterance_id: "utt_0001",
    speaker_id: "spk_001",
    start_time: 0,
    end_time: 1,
    word_ids: ["w_00000001"],
    ...overrides,
  };
}

function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    word_id: "w_00000001",
    text: "Hello",
    raw_text: "Hello",
    speaker_id: "spk_001",
    utterance_id: "utt_0001",
    start_time: 0,
    end_time: 0.5,
    confidence: 0.99,
    reviewed: false,
    edited: false,
    ...overrides,
  };
}

describe("caseIdToJobId", () => {
  it("maps case_id directly to jobId", () => {
    expect(caseIdToJobId("case_20240602_001")).toBe("case_20240602_001");
  });
});

describe("caseToEditorDocument", () => {
  it("uses case_id as the runtime job_id", () => {
    const record = emptyCaseRecord("case_20240602_001", "2026-06-02T12:00:00Z");
    const transcript: WorkingTranscriptFile = {
      case_id: "case_20240602_001",
      job_id: "deepgram-job-123",
      media_url: "/audio.wav",
      duration: 8,
      speakers: [makeSpeaker()],
      utterances: [makeUtterance()],
      words: [makeWord()],
    };

    const doc = caseToEditorDocument(record, transcript);
    expect(doc.job_id).toBe("case_20240602_001");
  });

  it("merges review flags from review_state over transcript words", () => {
    const record = emptyCaseRecord("case_20240602_001", "2026-06-02T12:00:00Z");
    const transcript: WorkingTranscriptFile = {
      case_id: "case_20240602_001",
      job_id: "deepgram-job-123",
      media_url: "/audio.wav",
      duration: 8,
      speakers: [makeSpeaker()],
      utterances: [makeUtterance()],
      words: [
        makeWord({ word_id: "w_00000001", reviewed: false }),
        makeWord({ word_id: "w_00000002", reviewed: true }),
      ],
    };
    const reviewState: ReviewStateFile = {
      case_id: "case_20240602_001",
      reviewed_word_ids: ["w_00000001"],
      unreviewed_word_ids: ["w_00000002"],
    };

    const doc = caseToEditorDocument(record, transcript, reviewState);
    expect(doc.words[0].reviewed).toBe(true);
    expect(doc.words[1].reviewed).toBe(false);
  });

  it("falls back to CaseRecord audio metadata when transcript media is missing", () => {
    const record = emptyCaseRecord("case_20240602_001", "2026-06-02T12:00:00Z");
    record.audio = {
      audio_id: "aud_001",
      original_filename: "hearing.mp3",
      mime_type: "audio/mpeg",
      duration_seconds: 123,
      file_size_bytes: 1000,
      uploaded_at: "2026-06-02T12:00:00Z",
      media_url: "/cases/case_20240602_001/audio/hearing.mp3",
    };

    const transcript: WorkingTranscriptFile = {
      case_id: "case_20240602_001",
      job_id: "deepgram-job-123",
      media_url: null,
      duration: null,
      speakers: [],
      utterances: [],
      words: [],
    };

    const doc = caseToEditorDocument(record, transcript);
    expect(doc.media_url).toBe("/cases/case_20240602_001/audio/hearing.mp3");
    expect(doc.duration).toBe(123);
  });
});
