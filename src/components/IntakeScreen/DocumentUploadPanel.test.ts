import { describe, expect, it, vi } from "vitest";

import type { CaseAudioRecord } from "../../api/fileService";
import {
  mergeAppendedAudioRecords,
  moveOrderedAudioRecords,
  uploadSelectedAudioFiles,
} from "./DocumentUploadPanel";

function makeAudioRecord(
  audioId: string,
  sourceIndex: number,
  uploadedAt: string,
): CaseAudioRecord {
  return {
    id: `row_${audioId}`,
    case_id: "case_123",
    audio_id: audioId,
    original_filename: `${audioId}.mp3`,
    mime_type: "audio/mpeg",
    file_size_bytes: 1000,
    duration_seconds: 30,
    uploaded_at: uploadedAt,
    storage_path: `audio/${audioId}.mp3`,
    media_url: null,
    created_at: uploadedAt,
    source_index: sourceIndex,
  };
}

describe("uploadSelectedAudioFiles", () => {
  it("adds N audio rows with contiguous appended source_index in selection order", async () => {
    const files = [
      new File(["a"], "source-3.mp3", { type: "audio/mpeg" }),
      new File(["b"], "source-4.mp3", { type: "audio/mpeg" }),
      new File(["c"], "source-5.mp3", { type: "audio/mpeg" }),
    ];
    const uploadAudio = vi.fn<(caseId: string, file: File) => Promise<CaseAudioRecord>>();
    uploadAudio
      .mockResolvedValueOnce(makeAudioRecord("audio_3", 3, "2026-06-12T12:00:03Z"))
      .mockResolvedValueOnce(makeAudioRecord("audio_4", 4, "2026-06-12T12:00:04Z"))
      .mockResolvedValueOnce(makeAudioRecord("audio_5", 5, "2026-06-12T12:00:05Z"));

    const uploaded = await uploadSelectedAudioFiles({
      caseId: "case_123",
      files,
      uploadAudio,
    });

    expect(uploadAudio.mock.calls.map(([, file]) => file.name)).toEqual([
      "source-3.mp3",
      "source-4.mp3",
      "source-5.mp3",
    ]);
    expect(uploaded.map((row) => row.source_index)).toEqual([3, 4, 5]);
  });
});

describe("mergeAppendedAudioRecords", () => {
  it("does not renumber existing rows when new files are appended", () => {
    const existing = [
      makeAudioRecord("audio_0", 0, "2026-06-12T12:00:00Z"),
      makeAudioRecord("audio_1", 1, "2026-06-12T12:00:01Z"),
      makeAudioRecord("audio_2", 2, "2026-06-12T12:00:02Z"),
    ];
    const appended = [
      makeAudioRecord("audio_3", 3, "2026-06-12T12:00:03Z"),
      makeAudioRecord("audio_4", 4, "2026-06-12T12:00:04Z"),
    ];

    const merged = mergeAppendedAudioRecords(existing, appended);

    expect(merged.map((row) => [row.audio_id, row.source_index])).toEqual([
      ["audio_0", 0],
      ["audio_1", 1],
      ["audio_2", 2],
      ["audio_3", 3],
      ["audio_4", 4],
    ]);
  });
});

describe("moveOrderedAudioRecords", () => {
  it("preserves reorder behavior after a multi-file add", () => {
    const ordered = [
      makeAudioRecord("audio_0", 0, "2026-06-12T12:00:00Z"),
      makeAudioRecord("audio_1", 1, "2026-06-12T12:00:01Z"),
      makeAudioRecord("audio_2", 2, "2026-06-12T12:00:02Z"),
      makeAudioRecord("audio_3", 3, "2026-06-12T12:00:03Z"),
    ];

    const reordered = moveOrderedAudioRecords(ordered, "audio_3", -1);

    expect(reordered?.map((row) => row.audio_id)).toEqual([
      "audio_0",
      "audio_1",
      "audio_3",
      "audio_2",
    ]);
    expect(reordered?.map((row) => row.source_index)).toEqual([0, 1, 2, 3]);
  });
});
