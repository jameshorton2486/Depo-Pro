import type { TranscriptionJobRecord } from "../transcriptionJobs";
import type { SequentialTranscriptSource } from "./autoChunking";

export interface NextRequestArtifact {
  url: string;
  callback_url: string;
}

export interface AdvanceOrFinalizeArgs {
  job: TranscriptionJobRecord;
  orderedSources: SequentialTranscriptSource[];
  currentSource: SequentialTranscriptSource;
  totalSources: number;
  responsePath: string;
}

export interface AdvanceOrFinalizeDeps {
  requireRequestArtifact: (requestPath: string | null) => Promise<NextRequestArtifact>;
  submitNextDeepgramJob: (
    job: TranscriptionJobRecord,
    source: SequentialTranscriptSource,
    totalSources: number,
    requestArtifact: NextRequestArtifact,
  ) => Promise<string>;
  updateJob: (
    jobId: string,
    patch: Partial<Pick<TranscriptionJobRecord, "status" | "source_audio_id" | "source_index" | "request_path" | "response_path" | "error">>,
  ) => Promise<void>;
  finalize: () => Promise<{ status: "complete" | "needs_manual_review"; responsePath: string }>;
  cleanupTranscript: (job: Pick<TranscriptionJobRecord, "id" | "transcript_id">) => Promise<void>;
  failJob: (jobId: string, responsePath: string, errorMessage: string) => Promise<void>;
}

export async function advanceOrFinalizeMultifileJob(
  args: AdvanceOrFinalizeArgs,
  deps: AdvanceOrFinalizeDeps,
): Promise<{ status: "processing" | "complete" | "needs_manual_review"; responsePath: string }> {
  const { job, orderedSources, currentSource, totalSources, responsePath } = args;

  try {
    const currentPosition = orderedSources.findIndex((source) =>
      source.source_audio_id === currentSource.source_audio_id && source.source_index === currentSource.source_index
    );
    if (currentPosition < 0) {
      throw new Error(`Unknown sequential source ${currentSource.source_audio_id}:${currentSource.source_index} for transcription job ${job.id}.`);
    }

    if (currentPosition < orderedSources.length - 1) {
      const requestArtifact = await deps.requireRequestArtifact(job.request_path);
      const nextSource = orderedSources[currentPosition + 1];
      const nextRequestPath = await deps.submitNextDeepgramJob(job, nextSource, totalSources, requestArtifact);
      await deps.updateJob(job.id, {
        status: "processing",
        source_audio_id: nextSource.source_audio_id,
        source_index: nextSource.source_index ?? currentPosition + 1,
        request_path: nextRequestPath,
        response_path: responsePath,
        error: null,
      });
      return { status: "processing", responsePath };
    }

    return deps.finalize();
  } catch (error) {
    await deps.cleanupTranscript(job);
    await deps.failJob(
      job.id,
      responsePath,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
