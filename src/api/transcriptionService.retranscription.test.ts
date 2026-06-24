import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();

vi.mock("../lib/runtime/mode", () => ({
  isMockMode: () => false,
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: vi.fn(async () => ({
    functions: {
      invoke,
    },
  })),
  supabase: null,
}));

describe("startTranscription retranscription path", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("passes source_transcript_id when creating a retranscription", async () => {
    invoke.mockResolvedValue({
      data: {
        job: {
          id: "job_2",
          case_id: "case_123",
          transcript_id: "tr_rerun",
          status: "processing",
          source_audio_id: "audio_1",
          source_index: 0,
          request_path: null,
          response_path: null,
          error: null,
          created_at: "2026-06-23T12:00:00.000Z",
          updated_at: "2026-06-23T12:00:00.000Z",
        },
      },
      error: null,
    });

    const mod = await import("./transcriptionService");
    await mod.startTranscription("case_123", { sourceTranscriptId: "tr_original" });

    expect(invoke).toHaveBeenCalledWith("transcribe-start", {
      body: {
        case_id: "case_123",
        source_transcript_id: "tr_original",
      },
    });
  });
});
