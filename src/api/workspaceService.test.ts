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

vi.mock("../lib/runtime/mode", () => ({
  isRealApiMode: () => true,
}));

vi.mock("./fileService", () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

function buildTranscriptRow(updatedAt: string) {
  return {
    id: "row_1",
    transcript_id: "tr_123",
    case_id: "case_123",
    job_id: "job_123",
    media_url: null,
    duration: null,
    based_on: null,
    deepgram_request_id: null,
    session_id: null,
    source_filename: null,
    media_kind: "audio" as const,
    status: "completed" as const,
    engine: "deepgram-nova-3",
    transcription_source: "deepgram" as const,
    sequence_index: 0,
    duration_seconds: null,
    word_count: 0,
    utterance_count: 0,
    speaker_count: 0,
    avg_confidence: null,
    raw_storage_path: null,
    raw_checksum: null,
    last_error: null,
    speaker_map_confirmed: false,
    created_at: "2026-06-25T00:00:00.000Z",
    updated_at: updatedAt,
  };
}

describe("workspaceApi real-API mutation wrappers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    repo.getTranscriptJobByTranscriptId.mockReset();
    repo.getTranscriptJobByJobId.mockReset();
    repo.getLatestCompletedTranscriptJob.mockReset();
    repo.listTranscriptJobs.mockReset();
    repo.loadTranscriptSnapshot.mockReset();
    repo.updateTranscriptJob.mockReset();
    clientApi.getDocument.mockReset();
    clientApi.saveWorking.mockReset();
    clientApi.saveReview.mockReset();
    clientApi.saveSpeakers.mockReset();
    clientApi.addSpeaker.mockReset();
    clientApi.getAISuggestions.mockReset();
    clientApi.acceptAllAISuggestions.mockReset();
    clientApi.resolveAISuggestion.mockReset();
    clientApi.triggerAIReview.mockReset();
    clientApi.getSuggestions.mockReset();
    clientApi.resolveSuggestion.mockReset();
    clientApi.getExhibits.mockReset();
    clientApi.getCertifyStatus.mockReset();
  });

  it("returns the post-save token from saveWorking", async () => {
    repo.getTranscriptJobByTranscriptId
      .mockResolvedValueOnce(buildTranscriptRow("T1"))
      .mockResolvedValueOnce(buildTranscriptRow("T2"));
    clientApi.saveWorking.mockResolvedValue({ saved: 1 });

    const { workspaceApi } = await import("./workspaceService");
    const result = await workspaceApi.saveWorking(
      "tr_123",
      { changes: [{ utterance_id: "utt_1", working_text: "updated text" }], source: "editor" },
      { lastKnownUpdatedAt: "T1" },
    );

    expect(clientApi.saveWorking).toHaveBeenCalledWith("tr_123", {
      changes: [{ utterance_id: "utt_1", working_text: "updated text" }],
      source: "editor",
    });
    expect(result.updatedAt).toBe("T2");
  });

  // Tier 2 edge case — browser refresh during a correction save. After a reload
  // the client holds an older revision token; if another writer advanced the
  // transcript in the meantime, the save must be rejected (prompting a reload)
  // instead of silently overwriting the newer server state.
  it("rejects a save whose known revision is stale, without calling the writer", async () => {
    repo.getTranscriptJobByTranscriptId.mockResolvedValueOnce(buildTranscriptRow("T2"));

    const { workspaceApi } = await import("./workspaceService");
    await expect(workspaceApi.saveWorking(
      "tr_123",
      { changes: [{ utterance_id: "utt_1", working_text: "updated text" }], source: "editor" },
      { lastKnownUpdatedAt: "T1" },
    )).rejects.toThrow(/reload/i);

    expect(clientApi.saveWorking).not.toHaveBeenCalled();
  });

  it("returns the post-save token from saveReview", async () => {
    repo.getTranscriptJobByTranscriptId
      .mockResolvedValueOnce(buildTranscriptRow("T1"))
      .mockResolvedValueOnce(buildTranscriptRow("T2"));
    clientApi.saveReview.mockResolvedValue({ ok: true });

    const { workspaceApi } = await import("./workspaceService");
    const result = await workspaceApi.saveReview(
      "tr_123",
      { reviewed_word_ids: ["w_1"], unreviewed_word_ids: [] },
      { lastKnownUpdatedAt: "T1" },
    );

    expect(clientApi.saveReview).toHaveBeenCalledWith("tr_123", {
      reviewed_word_ids: ["w_1"],
      unreviewed_word_ids: [],
    });
    expect(result.updatedAt).toBe("T2");
  });

  it("does not trip the freshness guard after speaker save when the refreshed token is reused", async () => {
    repo.getTranscriptJobByTranscriptId
      .mockResolvedValueOnce(buildTranscriptRow("T1"))
      .mockResolvedValueOnce(buildTranscriptRow("T2"))
      .mockResolvedValueOnce(buildTranscriptRow("T2"))
      .mockResolvedValueOnce(buildTranscriptRow("T3"));
    clientApi.saveSpeakers.mockResolvedValue({ ok: true });
    clientApi.saveReview.mockResolvedValue({ ok: true });

    const { workspaceApi } = await import("./workspaceService");
    const speakerResult = await workspaceApi.saveSpeakers(
      "tr_123",
      {
        speakers: [{ speaker_id: "spk_001", display_name: "THE WITNESS", role: "WITNESS" }],
      },
      { lastKnownUpdatedAt: "T1" },
    );

    await expect(
      workspaceApi.saveReview(
        "tr_123",
        { reviewed_word_ids: ["w_1"], unreviewed_word_ids: [] },
        { lastKnownUpdatedAt: speakerResult.updatedAt },
      ),
    ).resolves.toEqual({
      ok: true,
      updatedAt: "T3",
    });
  });

  it("resolves transcript ids and returns the created speaker from addSpeaker", async () => {
    repo.getTranscriptJobByTranscriptId.mockResolvedValueOnce(buildTranscriptRow("T1"));
    clientApi.addSpeaker.mockResolvedValue({
      speaker: {
        speaker_id: "spk_synthetic_1",
        display_name: "MR. RAMON",
        deepgram_speaker: null,
        role: "ATTORNEY",
      },
    });

    const { workspaceApi } = await import("./workspaceService");
    const result = await workspaceApi.addSpeaker("tr_123", {
      display_name: "MR. RAMON",
      role: "ATTORNEY",
    });

    expect(clientApi.addSpeaker).toHaveBeenCalledWith("tr_123", {
      display_name: "MR. RAMON",
      role: "ATTORNEY",
    });
    expect(result).toEqual({
      speaker_id: "spk_synthetic_1",
      display_name: "MR. RAMON",
      deepgram_speaker: null,
      role: "ATTORNEY",
    });
  });

  it("routes ai suggestion actions through the transcript id in real API mode", async () => {
    repo.getTranscriptJobByTranscriptId.mockResolvedValueOnce(buildTranscriptRow("T1"));
    clientApi.resolveAISuggestion.mockResolvedValue({ ok: true });

    const { workspaceApi } = await import("./workspaceService");
    await workspaceApi.resolveAISuggestion("tr_123", "word_1", { action: "accept" });

    expect(clientApi.resolveAISuggestion).toHaveBeenCalledWith("tr_123", "word_1", { action: "accept" });
  });

  it("invokes the ai-review edge function directly with the transcript id in real API mode", async () => {
    repo.getTranscriptJobByTranscriptId.mockResolvedValueOnce(buildTranscriptRow("T1"));
    const invokeMock = vi.fn().mockResolvedValue({ data: { completed: true, applied_count: 2 }, error: null });
    const { getSupabaseClient } = await import("../lib/supabase");
    (getSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ functions: { invoke: invokeMock } });

    const { workspaceApi } = await import("./workspaceService");
    const result = await workspaceApi.triggerAIReview("tr_123");

    // Directly invokes the ai-review function (not the old editor-api HTTP hop).
    expect(invokeMock).toHaveBeenCalledWith("ai-review", {
      body: { transcript_id: "tr_123", force_rerun: true },
    });
    expect(result.status).toBe("completed");
  });
});
