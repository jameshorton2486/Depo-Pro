import { describe, expect, it } from "vitest";

import type { CaseAudioRecord } from "../api/fileService";
import type { TranscriptJobRow } from "../api/transcriptRepository";
import type { TranscriptionJobRecord } from "../lib/transcriptionJobs";
import { buildSourceTranscriptRows, hasCompletedTranscriptRow } from "./TranscriptCreationScreen";

function buildAudio(sourceIndex: number, name: string): CaseAudioRecord {
  return {
    id: `row_${sourceIndex}`,
    case_id: "case_001",
    audio_id: `audio_${sourceIndex}`,
    created_at: `2026-06-12T13:5${sourceIndex}:00.000Z`,
    original_filename: name,
    media_url: null,
    mime_type: "audio/mpeg",
    file_size_bytes: 1024,
    duration_seconds: 30 + sourceIndex,
    storage_path: `audio/${name}`,
    uploaded_at: `2026-06-12T13:5${sourceIndex}:00.000Z`,
    source_index: sourceIndex,
  };
}

function buildTranscript(sequenceIndex: number, status: TranscriptJobRow["status"] = "completed"): TranscriptJobRow {
  return {
    id: `db_${sequenceIndex}`,
    transcript_id: `tr_${sequenceIndex}`,
    case_id: "case_001",
    job_id: `job_seg_${sequenceIndex}`,
    media_url: null,
    duration: 31,
    based_on: `audio_${sequenceIndex}`,
    deepgram_request_id: null,
    session_id: null,
    source_filename: `source_${sequenceIndex}.mp3`,
    media_kind: "audio",
    status,
    engine: "deepgram-nova-3",
    transcription_source: "deepgram",
    sequence_index: sequenceIndex,
    duration_seconds: 31,
    word_count: 10,
    utterance_count: 2,
    speaker_count: 1,
    avg_confidence: "0.9000",
    raw_storage_path: null,
    raw_checksum: null,
    last_error: null,
    speaker_map_confirmed: false,
    created_at: "2026-06-12T13:50:00.000Z",
    updated_at: "2026-06-12T13:55:00.000Z",
  };
}

function buildJob(sourceIndex: number | null, status: TranscriptionJobRecord["status"]): TranscriptionJobRecord {
  return {
    id: `job_${sourceIndex ?? "none"}_${status}`,
    case_id: "case_001",
    transcript_id: "tr_parent",
    owner_user_id: "user_001",
    status,
    callback_token_hash: "hash",
    source_audio_id: sourceIndex == null ? null : `audio_${sourceIndex}`,
    source_index: sourceIndex,
    request_path: null,
    response_path: null,
    error: status === "failed" ? "boom" : null,
    created_at: "2026-06-12T13:50:00.000Z",
    updated_at: `2026-06-12T13:5${sourceIndex ?? 0}:30.000Z`,
  };
}

describe("buildSourceTranscriptRows", () => {
  it("lists all source files in source_index order", () => {
    const rows = buildSourceTranscriptRows(
      [buildAudio(2, "gamma.mp3"), buildAudio(0, "alpha.mp3"), buildAudio(1, "beta.mp3")],
      [],
      [],
    );

    expect(rows.map((row) => row.originalFilename)).toEqual([
      "alpha.mp3",
      "beta.mp3",
      "gamma.mp3",
    ]);
    expect(rows.map((row) => row.sourceIndex)).toEqual([0, 1, 2]);
  });

  it("reflects real segment and job state per source file", () => {
    const rows = buildSourceTranscriptRows(
      [buildAudio(0, "alpha.mp3"), buildAudio(1, "beta.mp3"), buildAudio(2, "gamma.mp3")],
      [buildTranscript(0)],
      [buildJob(1, "processing")],
    );

    expect(rows.map((row) => [row.sourceIndex, row.status, row.transcriptId])).toEqual([
      [0, "completed", "tr_0"],
      [1, "processing", null],
      [2, "pending", null],
    ]);
  });

  it("keeps the single-file case behavior intact", () => {
    const rows = buildSourceTranscriptRows(
      [buildAudio(0, "solo.mp3")],
      [buildTranscript(0)],
      [buildJob(0, "complete")],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      originalFilename: "solo.mp3",
      sourceIndex: 0,
      status: "completed",
      transcriptId: "tr_0",
    });
  });

  it("requires a completed transcript row before considering workspace ready", () => {
    expect(hasCompletedTranscriptRow([buildTranscript(0, "assembling")])).toBe(false);
    expect(hasCompletedTranscriptRow([buildTranscript(0, "failed")])).toBe(false);
    expect(hasCompletedTranscriptRow([buildTranscript(0, "completed")])).toBe(true);
  });
});
