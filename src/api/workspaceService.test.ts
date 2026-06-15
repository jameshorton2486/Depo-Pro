import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewPayload, SaveWorkingPayload, SpeakersPayload } from "./types";
import { buildTranscriptDocxParagraphSpecs } from "../components/ExportScreen/docxFormatter";
import type { SpeakerResolutionCurrentRow, TranscriptSnapshot, TranscriptSpeakerRow, TranscriptJobRow } from "./transcriptRepository";
import type { ResolvedSpeakerView } from "../lib/transcript/resolvedSpeakers";

const mocks = vi.hoisted(() => ({
  contractApi: {
    saveWorking: vi.fn(),
    saveReview: vi.fn(),
    saveSpeakers: vi.fn(),
    getResolvedSpeakers: vi.fn(),
  },
  transcriptRepository: {
    getTranscriptJobByTranscriptId: vi.fn(),
    getTranscriptJobByJobId: vi.fn(),
    listCompletedTranscriptJobsBySequence: vi.fn(),
    listTranscriptJobs: vi.fn(),
    loadTranscriptSnapshot: vi.fn(),
    updateTranscriptJob: vi.fn(),
  },
  runtimeMode: {
    isRealApiMode: vi.fn(() => true),
  },
}));

vi.mock("./client", () => ({
  api: mocks.contractApi,
}));

vi.mock("./fileService", () => ({
  getSignedUrl: vi.fn(async () => "signed://audio"),
}));

vi.mock("../lib/runtime/mode", () => ({
  isRealApiMode: mocks.runtimeMode.isRealApiMode,
}));

vi.mock("./transcriptRepository", () => mocks.transcriptRepository);

import { workspaceApi } from "./workspaceService";

const RESOLVED_SPEAKERS: ResolvedSpeakerView[] = [
  {
    speaker_id: "pty_witness_the_witness",
    participantId: "pty_witness_the_witness",
    display_name: "THE WITNESS",
    deepgram_speaker: 0,
    role: "WITNESS",
    rawSpeakerIds: ["spk_001"],
    speakerIndices: [0],
  },
];

function buildRawSpeaker(overrides: Partial<TranscriptSpeakerRow>): TranscriptSpeakerRow {
  return {
    id: "speaker-row",
    transcript_id: "tr_001",
    speaker_id: "spk_001",
    display_name: "Speaker 1",
    deepgram_speaker: 0,
    role: "other",
    job_id: "job_001",
    speaker_index: 0,
    speaker_label: "Speaker 1",
    assigned_name: null,
    speaker_role: "other",
    word_count: 10,
    ...overrides,
  };
}

function buildOverlayRow(overrides: Partial<SpeakerResolutionCurrentRow>): SpeakerResolutionCurrentRow {
  return {
    created_at: "2026-06-15T00:00:00.000Z",
    id: "overlay_001",
    owner_user_id: "user_001",
    participant_id: "pty_attorney_mr_nunez",
    raw_speaker_id: "spk_001",
    raw_speaker_index: 0,
    resolved_at: "2026-06-15T00:00:00.000Z",
    resolved_by: "user_001",
    resolved_label: "MR. NUNEZ",
    resolved_role: "attorney",
    transcript_id: "tr_001",
    updated_at: "2026-06-15T00:00:00.000Z",
    ...overrides,
  };
}

function buildSnapshot(job = buildJob("2026-06-14T17:00:00.000Z")): TranscriptSnapshot {
  return {
    job,
    speakers: [
      buildRawSpeaker({
        speaker_id: "spk_002",
        speaker_index: 2,
        display_name: "Speaker 2",
        speaker_label: "Speaker 2",
        assigned_name: null,
        role: "other",
        speaker_role: "other",
      }),
    ],
    utterances: [
      {
        id: "utt-row-001",
        transcript_id: "tr_001",
        utterance_id: "utt_001",
        speaker_id: "spk_002",
        start_time: 0,
        end_time: 1,
        ordinal: 0,
        job_id: "job_001",
        utterance_index: 0,
        speaker_index: 2,
        speaker_label: "Speaker 2",
        text: "Proceed.",
        avg_confidence: "0.9000",
      },
    ],
    words: [
      {
        id: "word-row-001",
        transcript_id: "tr_001",
        utterance_id: "utt_001",
        word_id: "w_001",
        speaker_id: "spk_002",
        ordinal: 0,
        text: "Proceed.",
        raw_text: "Proceed.",
        start_time: 0,
        end_time: 1,
        confidence: 0.9,
        reviewed: true,
        edited: false,
        job_id: "job_001",
        word_index: 0,
        working_text: null,
        speaker_index: 2,
        is_filler: false,
        removed: false,
      },
    ],
    speakerResolutionOverlay: [
      buildOverlayRow({
        raw_speaker_id: "spk_002",
        raw_speaker_index: 2,
      }),
    ],
  };
}

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
    mocks.runtimeMode.isRealApiMode.mockReturnValue(true);
    mocks.transcriptRepository.getTranscriptJobByTranscriptId.mockImplementation(async () => buildJob("2026-06-14T17:00:00.000Z"));
    mocks.transcriptRepository.getTranscriptJobByJobId.mockResolvedValue(null);
    mocks.transcriptRepository.listCompletedTranscriptJobsBySequence.mockImplementation(async () => [
      buildJob("2026-06-14T17:00:00.000Z"),
    ]);
    mocks.contractApi.getResolvedSpeakers.mockResolvedValue(RESOLVED_SPEAKERS);
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

describe("workspaceApi local Step 3 resolved-speaker split", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtimeMode.isRealApiMode.mockReturnValue(false);
    mocks.transcriptRepository.getTranscriptJobByTranscriptId.mockImplementation(async () => buildJob("2026-06-14T17:00:00.000Z"));
    mocks.transcriptRepository.getTranscriptJobByJobId.mockResolvedValue(null);
    mocks.transcriptRepository.listCompletedTranscriptJobsBySequence.mockResolvedValue([
      buildJob("2026-06-14T17:00:00.000Z"),
    ]);
    mocks.transcriptRepository.loadTranscriptSnapshot.mockResolvedValue(buildSnapshot());
  });

  it("shows resolved speaker labels in the panel view while export remains raw-backed", async () => {
    const result = await workspaceApi.getDocument("tr_001");

    expect(result.resolvedSpeakers).toEqual([
      expect.objectContaining({
        participantId: "pty_attorney_mr_nunez",
        display_name: "MR. NUNEZ",
        role: "ATTORNEY",
        rawSpeakerIds: ["spk_002"],
      }),
    ]);
    expect(result.document.speakers).toEqual([
      expect.objectContaining({
        speaker_id: "spk_002",
        display_name: "Speaker 2",
        role: "OTHER",
      }),
    ]);

    const paragraphs = buildTranscriptDocxParagraphSpecs([{
      transcriptId: "tr_001",
      sequenceIndex: 0,
      sourceFilename: "segment.mp3",
      document: result.document,
    }]);

    expect(paragraphs).toEqual([
      expect.objectContaining({
        kind: "colloquy",
        runs: [
          { kind: "text", text: "Speaker 2:" },
          { kind: "tab" },
          { kind: "text", text: "Proceed." },
        ],
      }),
    ]);
  });
});
