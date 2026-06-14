import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewPayload, SaveWorkingPayload, SpeakersPayload } from "./types";
import type { TranscriptJobRow } from "./transcriptRepository";

const mocks = vi.hoisted(() => ({
  contractApi: {
    saveWorking: vi.fn(),
    saveReview: vi.fn(),
    saveSpeakers: vi.fn(),
  },
  transcriptRepository: {
    getTranscriptJobByTranscriptId: vi.fn(),
    getTranscriptJobByJobId: vi.fn(),
    listCompletedTranscriptJobsBySequence: vi.fn(),
    listTranscriptJobs: vi.fn(),
    loadTranscriptSnapshot: vi.fn(),
    updateTranscriptJob: vi.fn(),
  },
}));

vi.mock("./client", () => ({
  api: mocks.contractApi,
}));

vi.mock("../lib/runtime/mode", () => ({
  isRealApiMode: () => true,
}));

vi.mock("./transcriptRepository", () => mocks.transcriptRepository);

import { workspaceApi } from "./workspaceService";

function buildJob(updatedAt: string): TranscriptJobRow {
  return {
    id: "uuid-1",
    transcript_id: "tr_001",
    case_id: "case_001",
    job_id: "job_001",
    media_url: null,
    duration: 120,
    based_on: null,
    deepgram_request_id: null,
    session_id: null,
    source_filename: "source.m4a",
    media_kind: "audio",
    status: "completed",
    engine: "nova-3",
    transcription_source: "deepgram",
    sequence_index: 0,
    duration_seconds: 120,
    word_count: 10,
    utterance_count: 2,
    speaker_count: 2,
    avg_confidence: "0.9000",
    raw_storage_path: null,
    raw_checksum: null,
    last_error: null,
    speaker_map_confirmed: false,
    created_at: "2026-06-14T17:00:00.000Z",
    updated_at: updatedAt,
  };
}

describe("workspaceApi real-API save wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transcriptRepository.getTranscriptJobByTranscriptId.mockImplementation(async () => buildJob("2026-06-14T17:00:00.000Z"));
    mocks.transcriptRepository.getTranscriptJobByJobId.mockResolvedValue(null);
    mocks.transcriptRepository.listCompletedTranscriptJobsBySequence.mockImplementation(async () => [
      buildJob("2026-06-14T17:00:00.000Z"),
    ]);
  });

  async function expectConsecutiveSaveStaysFresh<TPayload, TResult extends { updatedAt: string | null }>(
    payload: TPayload,
    invoke: (lastKnownUpdatedAt: string | null, payload: TPayload) => Promise<TResult>,
    setResponse: (nextUpdatedAt: string, setCurrentUpdatedAt: (updatedAt: string) => void) => void,
    expectedSecond: Partial<TResult>,
  ) {
    let currentUpdatedAt = "2026-06-14T17:00:00.000Z";
    mocks.transcriptRepository.getTranscriptJobByTranscriptId.mockImplementation(async () => buildJob(currentUpdatedAt));
    mocks.transcriptRepository.listCompletedTranscriptJobsBySequence.mockImplementation(async () => [
      buildJob(currentUpdatedAt),
    ]);

    setResponse("2026-06-14T17:00:01.000Z", (updatedAt) => {
      currentUpdatedAt = updatedAt;
    });
    const firstResult = await invoke("2026-06-14T17:00:00.000Z", payload);

    expect(firstResult.updatedAt).toBe("2026-06-14T17:00:01.000Z");

    setResponse("2026-06-14T17:00:02.000Z", (updatedAt) => {
      currentUpdatedAt = updatedAt;
    });
    const secondResult = await invoke(firstResult.updatedAt, payload);

    expect(secondResult).toMatchObject(expectedSecond);
  }

  it("returns the server's fresh updatedAt for saveWorking so consecutive saves stay fresh", async () => {
    await expectConsecutiveSaveStaysFresh(
      {
        changes: [{ utterance_id: "utt_001", working_text: "hello there" }],
        source: "editor",
      } satisfies SaveWorkingPayload,
      (lastKnownUpdatedAt, payload) => workspaceApi.saveWorking("tr_001", payload, { lastKnownUpdatedAt }),
      (nextUpdatedAt, setCurrentUpdatedAt) => {
        mocks.contractApi.saveWorking.mockImplementation(async () => {
          setCurrentUpdatedAt(nextUpdatedAt);
          return { saved: 1, updatedAt: nextUpdatedAt };
        });
      },
      { saved: 1, updatedAt: "2026-06-14T17:00:02.000Z" },
    );
  });

  it("returns the server's fresh updatedAt for saveReview so consecutive saves stay fresh", async () => {
    await expectConsecutiveSaveStaysFresh(
      {
        reviewed_word_ids: ["w_001"],
        unreviewed_word_ids: [],
      } satisfies ReviewPayload,
      (lastKnownUpdatedAt, payload) => workspaceApi.saveReview("tr_001", payload, { lastKnownUpdatedAt }),
      (nextUpdatedAt, setCurrentUpdatedAt) => {
        mocks.contractApi.saveReview.mockImplementation(async () => {
          setCurrentUpdatedAt(nextUpdatedAt);
          return { ok: true, updatedAt: nextUpdatedAt };
        });
      },
      { ok: true, updatedAt: "2026-06-14T17:00:02.000Z" },
    );
  });

  it("returns the server's fresh updatedAt for saveSpeakers so consecutive saves stay fresh", async () => {
    await expectConsecutiveSaveStaysFresh(
      {
        speakers: [{ speaker_id: "spk_001", display_name: "THE WITNESS", role: "WITNESS" }],
      } satisfies SpeakersPayload,
      (lastKnownUpdatedAt, payload) => workspaceApi.saveSpeakers("tr_001", payload, { lastKnownUpdatedAt }),
      (nextUpdatedAt, setCurrentUpdatedAt) => {
        mocks.contractApi.saveSpeakers.mockImplementation(async () => {
          setCurrentUpdatedAt(nextUpdatedAt);
          return { ok: true, updatedAt: nextUpdatedAt };
        });
      },
      {
        ok: true,
        updatedAt: "2026-06-14T17:00:02.000Z",
        speakerMapConfirmed: true,
      },
    );
  });

  it("keeps the freshness guard intact when a caller reuses a stale token", async () => {
    mocks.transcriptRepository.getTranscriptJobByTranscriptId.mockResolvedValue(
      buildJob("2026-06-14T17:00:01.000Z"),
    );
    mocks.transcriptRepository.listCompletedTranscriptJobsBySequence.mockResolvedValue([
      buildJob("2026-06-14T17:00:01.000Z"),
    ]);

    await expect(workspaceApi.saveSpeakers("tr_001", {
      speakers: [{ speaker_id: "spk_001", display_name: "THE WITNESS", role: "WITNESS" }],
    }, {
      lastKnownUpdatedAt: "2026-06-14T17:00:00.000Z",
    })).rejects.toThrow("Transcript changed elsewhere — reload.");

    expect(mocks.contractApi.saveSpeakers).not.toHaveBeenCalled();
  });
});
