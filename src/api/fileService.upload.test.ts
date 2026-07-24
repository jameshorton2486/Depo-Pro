import { describe, expect, it, vi } from "vitest";

const { getSupabaseClient } = vi.hoisted(() => ({ getSupabaseClient: vi.fn() }));
vi.mock("../lib/supabase", () => ({ getSupabaseClient }));

import { finalizeAudioUpload, uploadCaseAudio } from "./fileService";

type FinalizeClient = Parameters<typeof finalizeAudioUpload>[0];
type CaseAudioInsert = Parameters<typeof finalizeAudioUpload>[2];

const STORAGE_PATH = "owner/case_1/audio/audio_1_depo.mp3";

function abortedSignal(): AbortSignal {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
}

function buildRow(): CaseAudioInsert {
  return {
    case_id: "case_1",
    audio_id: "audio_1",
    original_filename: "depo.mp3",
    mime_type: "audio/mpeg",
    file_size_bytes: 1024,
    duration_seconds: 12,
    source_index: 0,
    storage_path: STORAGE_PATH,
    uploaded_at: "2026-07-24T00:00:00.000Z",
  } as CaseAudioInsert;
}

function buildClient(singleResult: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(singleResult);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const remove = vi.fn().mockResolvedValue({ data: [], error: null });
  const client = {
    from: vi.fn(() => ({ insert })),
    storage: { from: vi.fn(() => ({ remove })) },
  };
  return { client: client as unknown as FinalizeClient, insert, remove };
}

// Tier 2 edge case — mid-upload cancellation. A cancelled/interrupted audio
// upload must never leave an orphaned storage object without a case_audio row,
// and a cancellation known up front must not start the upload at all.
describe("finalizeAudioUpload orphan cleanup", () => {
  it("persists the row and does not clean up on success", async () => {
    const { client, insert, remove } = buildClient({ data: { audio_id: "audio_1" }, error: null });

    const result = await finalizeAudioUpload(client, STORAGE_PATH, buildRow());

    expect(result).toEqual({ audio_id: "audio_1" });
    expect(insert).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes the orphaned object when the row insert fails", async () => {
    const insertError = new Error("insert failed");
    const { client, remove } = buildClient({ data: null, error: insertError });

    await expect(finalizeAudioUpload(client, STORAGE_PATH, buildRow())).rejects.toBe(insertError);

    expect(remove).toHaveBeenCalledWith([STORAGE_PATH]);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("removes the orphaned object and skips the insert when cancelled after the upload", async () => {
    const { client, insert, remove } = buildClient({ data: null, error: null });

    await expect(
      finalizeAudioUpload(client, STORAGE_PATH, buildRow(), abortedSignal()),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(insert).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith([STORAGE_PATH]);
  });
});

describe("uploadCaseAudio cancellation", () => {
  it("throws before any network work when the signal is already aborted", async () => {
    getSupabaseClient.mockReset();
    const file = new File(["x"], "depo.mp3", { type: "audio/mpeg" });

    await expect(
      uploadCaseAudio("case_1", file, { signal: abortedSignal() }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(getSupabaseClient).not.toHaveBeenCalled();
  });
});
