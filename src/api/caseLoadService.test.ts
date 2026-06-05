import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyCaseRecord } from "../types/case";
import { loadCaseBundle } from "./caseLoadService";

const {
  loadCaseMock,
  listCaseFilesMock,
  listCaseAudioMock,
} = vi.hoisted(() => ({
  loadCaseMock: vi.fn(),
  listCaseFilesMock: vi.fn(),
  listCaseAudioMock: vi.fn(),
}));

vi.mock("./caseService", () => ({
  loadCase: loadCaseMock,
}));

vi.mock("./fileService", () => ({
  listCaseFiles: listCaseFilesMock,
  listCaseAudio: listCaseAudioMock,
}));

describe("loadCaseBundle", () => {
  beforeEach(() => {
    loadCaseMock.mockReset();
    listCaseFilesMock.mockReset();
    listCaseAudioMock.mockReset();
  });

  it("returns null when no case row exists", async () => {
    loadCaseMock.mockResolvedValue(null);
    listCaseFilesMock.mockResolvedValue([]);
    listCaseAudioMock.mockResolvedValue([]);

    await expect(loadCaseBundle("case_missing")).resolves.toBeNull();
  });

  it("assembles record, files, and audio into one bundle", async () => {
    const record = emptyCaseRecord("case_20260605_abcd12", "2026-06-05T18:00:00Z");
    const files = [{
      id: "uuid-file",
      case_id: record.case_id,
      file_id: "f_1_abcd",
      file_type: "notice",
      original_filename: "notice.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 100,
      checksum: "abc",
      uploaded_by: null,
      storage_path: "cases/case_20260605_abcd12/notice/f_1_abcd_notice.pdf",
      uploaded_at: "2026-06-05T18:01:00Z",
      status: "active",
      created_at: "2026-06-05T18:01:00Z",
    }];
    const audio = [{
      id: "uuid",
      case_id: record.case_id,
      audio_id: "f_2_bcde",
      original_filename: "audio.mp3",
      mime_type: "audio/mpeg",
      file_size_bytes: 200,
      duration_seconds: 30,
      uploaded_at: "2026-06-05T18:02:00Z",
      created_at: "2026-06-05T18:02:00Z",
      media_url: null,
      storage_path: "cases/case_20260605_abcd12/audio/f_2_bcde_audio.mp3",
    }];

    loadCaseMock.mockResolvedValue(record);
    listCaseFilesMock.mockResolvedValue(files);
    listCaseAudioMock.mockResolvedValue(audio);

    await expect(loadCaseBundle(record.case_id)).resolves.toEqual({
      record,
      files,
      audio,
    });
  });

  it("returns empty arrays rather than undefined for missing files", async () => {
    const record = emptyCaseRecord("case_20260605_abcd12", "2026-06-05T18:00:00Z");
    loadCaseMock.mockResolvedValue(record);
    listCaseFilesMock.mockResolvedValue([]);
    listCaseAudioMock.mockResolvedValue([]);

    const bundle = await loadCaseBundle(record.case_id);
    expect(bundle?.files).toEqual([]);
    expect(bundle?.audio).toEqual([]);
  });
});
