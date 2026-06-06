import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyCaseRecord } from "../types/case";
import { loadCaseBundle } from "./caseLoadService";

const {
  loadCaseMock,
  listCaseFilesMock,
  listCaseAudioMock,
  listTranscriptJobsMock,
  listFieldProvenanceMock,
} = vi.hoisted(() => ({
  loadCaseMock: vi.fn(),
  listCaseFilesMock: vi.fn(),
  listCaseAudioMock: vi.fn(),
  listTranscriptJobsMock: vi.fn(),
  listFieldProvenanceMock: vi.fn(),
}));

vi.mock("./caseService", () => ({
  loadCase: loadCaseMock,
}));

vi.mock("./fileService", () => ({
  listCaseFiles: listCaseFilesMock,
  listCaseAudio: listCaseAudioMock,
}));

vi.mock("./provenanceService", () => ({
  listFieldProvenance: listFieldProvenanceMock,
}));

vi.mock("./transcriptRepository", () => ({
  listTranscriptJobs: listTranscriptJobsMock,
}));

describe("loadCaseBundle", () => {
  beforeEach(() => {
    loadCaseMock.mockReset();
    listCaseFilesMock.mockReset();
    listCaseAudioMock.mockReset();
    listTranscriptJobsMock.mockReset();
    listFieldProvenanceMock.mockReset();
  });

  it("returns null when no case row exists", async () => {
    loadCaseMock.mockResolvedValue(null);
    listCaseFilesMock.mockResolvedValue([]);
    listCaseAudioMock.mockResolvedValue([]);
    listTranscriptJobsMock.mockResolvedValue([]);
    listFieldProvenanceMock.mockResolvedValue([]);

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
    const provenance = [{
      id: "prov-1",
      case_id: record.case_id,
      field_path: "caption.case_name",
      field_label: "Case Name",
      event_type: "extracted",
      value: "Goldman & Peterson",
      source: "Notice",
      winning_value: null,
      rejected_value: null,
      rejected_source: null,
      confidence_score: 0.97,
      resolution_user: "reporter",
      resolved_at: "2026-06-05T18:03:00Z",
    }];

    loadCaseMock.mockResolvedValue(record);
    listCaseFilesMock.mockResolvedValue(files);
    listCaseAudioMock.mockResolvedValue(audio);
    listTranscriptJobsMock.mockResolvedValue([]);
    listFieldProvenanceMock.mockResolvedValue(provenance);

    await expect(loadCaseBundle(record.case_id)).resolves.toEqual({
      record,
      files,
      audio,
      transcripts: [],
      provenance,
    });
  });

  it("returns empty arrays rather than undefined for missing files", async () => {
    const record = emptyCaseRecord("case_20260605_abcd12", "2026-06-05T18:00:00Z");
    loadCaseMock.mockResolvedValue(record);
    listCaseFilesMock.mockResolvedValue([]);
    listCaseAudioMock.mockResolvedValue([]);
    listTranscriptJobsMock.mockResolvedValue([]);
    listFieldProvenanceMock.mockResolvedValue([]);

    const bundle = await loadCaseBundle(record.case_id);
    expect(bundle?.files).toEqual([]);
    expect(bundle?.audio).toEqual([]);
    expect(bundle?.transcripts).toEqual([]);
    expect(bundle?.provenance).toEqual([]);
  });

  it("normalizes legacy single-witness payloads during bundle hydration", async () => {
    const legacyPayload = {
      ...emptyCaseRecord("job_demo_001", "2026-06-05T18:00:00Z"),
      deponentName: "Heath Thomas",
      witnesses: null,
    };

    loadCaseMock.mockResolvedValue(legacyPayload);
    listCaseFilesMock.mockResolvedValue([]);
    listCaseAudioMock.mockResolvedValue([]);
    listTranscriptJobsMock.mockResolvedValue([]);
    listFieldProvenanceMock.mockResolvedValue([]);

    const bundle = await loadCaseBundle("job_demo_001");

    expect(bundle?.record.witnesses).toHaveLength(1);
    expect(bundle?.record.witnesses[0].name.value).toBe("Heath Thomas");
  });
});
