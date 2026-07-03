import { describe, expect, it, vi } from "vitest";

import type { TranscriptionJobRecord } from "../transcriptionJobs";
import { advanceOrFinalizeMultifileJob } from "./multifileCallbackFlow";

function buildJob(): TranscriptionJobRecord {
  return {
    id: "job_001",
    case_id: "case_001",
    transcript_id: "tr_001",
    owner_user_id: "user_001",
    status: "processing",
    callback_token_hash: "hash",
    source_audio_id: "audio_0",
    source_index: 0,
    request_path: "artifacts/job_001_file_000_deepgram_request.json",
    response_path: null,
    error: null,
    auto_seed_audit: null,
    created_at: "2026-06-10T12:00:00.000Z",
    updated_at: "2026-06-10T12:00:00.000Z",
  };
}

describe("advanceOrFinalizeMultifileJob", () => {
  it("fails the parent job, persists zero canonical rows, and preserves completed source artifacts when the next file cannot start", async () => {
    const job = buildJob();
    const orderedSources = [
      {
        source_audio_id: "audio_0",
        source_index: 0,
        source_filename: "source_1.mp3",
        mime_type: "audio/mpeg",
        storage_path: "cases/demo/audio_0.mp3",
        media_url: null,
        kind: "physical_audio" as const,
      },
      {
        source_audio_id: "audio_1",
        source_index: 1,
        source_filename: "source_2.mp3",
        mime_type: "audio/mpeg",
        storage_path: "cases/demo/audio_1.mp3",
        media_url: null,
        kind: "physical_audio" as const,
      },
    ];
    const responsePath = "artifacts/job_001_file_000_deepgram_response.json";
    const preservedArtifacts = new Set<string>([responsePath]);
    const canonicalTranscriptRows: string[] = [];
    const canonicalWordRows: string[] = [];

    const requireRequestArtifact = vi.fn().mockResolvedValue({
      url: "https://api.deepgram.test/listen?callback=1",
      callback_url: "https://callback.test",
    });
    const submitNextDeepgramJob = vi.fn().mockRejectedValue(new Error("Deepgram start failed for source 1"));
    const updateJob = vi.fn();
    const finalize = vi.fn(async () => {
      canonicalTranscriptRows.push("tr_001");
      canonicalWordRows.push("w_001");
      return "artifacts/job_001_multifile_manifest.json";
    });
    const cleanupTranscript = vi.fn(async () => {
      canonicalTranscriptRows.length = 0;
      canonicalWordRows.length = 0;
    });
    const failJob = vi.fn(async () => {
      job.status = "failed";
      job.response_path = responsePath;
      job.error = "Deepgram start failed for source 1";
    });

    await expect(advanceOrFinalizeMultifileJob({
      job,
      orderedSources,
      currentSource: orderedSources[0],
      totalSources: orderedSources.length,
      responsePath,
    }, {
      requireRequestArtifact,
      submitNextDeepgramJob,
      updateJob,
      finalize,
      cleanupTranscript,
      failJob,
    })).rejects.toThrow("Deepgram start failed for source 1");

    expect(requireRequestArtifact).toHaveBeenCalledWith(job.request_path);
    expect(submitNextDeepgramJob).toHaveBeenCalledOnce();
    expect(updateJob).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
    expect(cleanupTranscript).toHaveBeenCalledWith(job.transcript_id);
    expect(failJob).toHaveBeenCalledWith(job.id, responsePath, "Deepgram start failed for source 1");
    expect(job.status).toBe("failed");
    expect(canonicalTranscriptRows).toEqual([]);
    expect(canonicalWordRows).toEqual([]);
    expect(preservedArtifacts.has(responsePath)).toBe(true);
  });
});
