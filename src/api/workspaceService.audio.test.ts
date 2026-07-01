import { beforeEach, describe, expect, it, vi } from "vitest";

const clientApi = {
  getDocument: vi.fn(),
  saveWorking: vi.fn(),
  saveReview: vi.fn(),
  saveSpeakers: vi.fn(),
  addSpeaker: vi.fn(),
  getAISuggestions: vi.fn(),
  acceptAllAISuggestions: vi.fn(),
  resolveAISuggestion: vi.fn(),
  triggerAIReview: vi.fn(),
  getSuggestions: vi.fn(),
  resolveSuggestion: vi.fn(),
  getExhibits: vi.fn(),
  getCertifyStatus: vi.fn(),
};

const repo = {
  getLatestCompletedTranscriptJob: vi.fn(),
  getTranscriptJobByJobId: vi.fn(),
  getTranscriptJobByTranscriptId: vi.fn(),
  listTranscriptJobs: vi.fn(),
  loadTranscriptSnapshot: vi.fn(),
  updateTranscriptJob: vi.fn(),
};

const getSignedUrl = vi.fn();
const getSupabaseClient = vi.fn();

vi.mock("./client", () => ({
  api: clientApi,
}));

vi.mock("./transcriptRepository", () => ({
  getLatestCompletedTranscriptJob: repo.getLatestCompletedTranscriptJob,
  getTranscriptJobByJobId: repo.getTranscriptJobByJobId,
  getTranscriptJobByTranscriptId: repo.getTranscriptJobByTranscriptId,
  listTranscriptJobs: repo.listTranscriptJobs,
  loadTranscriptSnapshot: repo.loadTranscriptSnapshot,
  updateTranscriptJob: repo.updateTranscriptJob,
}));

vi.mock("./fileService", () => ({
  getSignedUrl,
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient,
}));

function buildTranscriptRow() {
  return {
    id: "row_1",
    transcript_id: "tr_123",
    case_id: "case_123",
    job_id: "job_123",
    media_url: null,
    duration: 120,
    based_on: "audio_123",
    deepgram_request_id: null,
    session_id: null,
    source_filename: "audio.m4a",
    media_kind: "audio" as const,
    status: "completed" as const,
    engine: "deepgram-nova-3",
    transcription_source: "deepgram" as const,
    sequence_index: 0,
    duration_seconds: 120,
    word_count: 0,
    utterance_count: 0,
    speaker_count: 0,
    avg_confidence: null,
    raw_storage_path: null,
    raw_checksum: null,
    last_error: null,
    speaker_map_confirmed: false,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };
}

describe("workspaceService audio fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    repo.getLatestCompletedTranscriptJob.mockReset();
    repo.getTranscriptJobByJobId.mockReset();
    repo.getTranscriptJobByTranscriptId.mockReset();
    repo.listTranscriptJobs.mockReset();
    repo.loadTranscriptSnapshot.mockReset();
    getSignedUrl.mockReset();
    getSupabaseClient.mockReset();
  });

  it("falls back to case_audio.storage_path when document media_url is empty in real API mode", async () => {
    vi.doMock("../lib/runtime/mode", () => ({
      isRealApiMode: () => true,
    }));

    const transcript = buildTranscriptRow();
    repo.getTranscriptJobByTranscriptId.mockResolvedValue(transcript);
    clientApi.getDocument.mockResolvedValue({
      job_id: "tr_123",
      media_url: "",
      duration: 120,
      speakers: [],
      utterances: [],
      words: [],
    });

    getSignedUrl.mockResolvedValue("https://signed.example/audio.m4a");
    getSupabaseClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  storage_path: "76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260701_hnetcd/audio/f_1782932451723_7bmw_audio1728584021_4.m4a",
                  media_url: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const { workspaceApi } = await import("./workspaceService");
    const result = await workspaceApi.getDocument("tr_123");

    expect(getSignedUrl).toHaveBeenCalledWith(
      "76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260701_hnetcd/audio/f_1782932451723_7bmw_audio1728584021_4.m4a",
    );
    expect(result.document.media_url).toBe("https://signed.example/audio.m4a");
    expect(result.audioSegments[0]?.mediaUrl).toBe("https://signed.example/audio.m4a");
  });

  it("falls back to case_audio.storage_path when snapshot job media_url is null", async () => {
    vi.doMock("../lib/runtime/mode", () => ({
      isRealApiMode: () => false,
    }));

    const transcript = buildTranscriptRow();
    repo.getTranscriptJobByTranscriptId.mockResolvedValue(transcript);
    repo.loadTranscriptSnapshot.mockResolvedValue({
      job: transcript,
      speakers: [],
      speakerResolutions: [],
      utterances: [],
      words: [],
    });

    getSignedUrl.mockResolvedValue("https://signed.example/audio.m4a");
    getSupabaseClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  storage_path: "76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260701_hnetcd/audio/f_1782932451723_7bmw_audio1728584021_4.m4a",
                  media_url: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const { workspaceApi } = await import("./workspaceService");
    const result = await workspaceApi.getDocument("tr_123");

    expect(getSignedUrl).toHaveBeenCalledWith(
      "76c5dbc9-a65c-4e2f-9813-06bd3b066e49/case_20260701_hnetcd/audio/f_1782932451723_7bmw_audio1728584021_4.m4a",
    );
    expect(result.document.media_url).toBe("https://signed.example/audio.m4a");
    expect(result.audioSegments[0]?.mediaUrl).toBe("https://signed.example/audio.m4a");
  });
});
