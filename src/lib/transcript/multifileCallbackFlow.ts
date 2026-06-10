import type { TranscriptionJobRecord } from "../transcriptionJobs";

export interface CallbackAudioSource {
  audio_id: string;
  source_index: number | null;
}

export interface NextRequestArtifact {
  url: string;
  callback_url: string;
}

export interface AdvanceOrFinalizeArgs {
  job: TranscriptionJobRecord;
  orderedAudio: CallbackAudioSource[];
  currentAudio: CallbackAudioSource;
  totalSources: number;
  responsePath: string;
}

export interface AdvanceOrFinalizeDeps {
  requireRequestArtifact: (requestPath: string | null) => Promise<NextRequestArtifact>;
  submitNextDeepgramJob: (
    job: TranscriptionJobRecord,
    audio: CallbackAudioSource,
    totalSources: number,
    requestArtifact: NextRequestArtifact,
  ) => Promise<string>;
  updateJob: (
    jobId: string,
    patch: Partial<Pick<TranscriptionJobRecord, "status" | "source_audio_id" | "source_index" | "request_path" | "response_path" | "error">>,
  ) => Promise<void>;
  finalize: () => Promise<string>;
  cleanupTranscript: (transcriptId: string) => Promise<void>;
  failJob: (jobId: string, responsePath: string, errorMessage: string) => Promise<void>;
}

export async function advanceOrFinalizeMultifileJob(
  args: AdvanceOrFinalizeArgs,
  deps: AdvanceOrFinalizeDeps,
): Promise<{ status: "processing" | "complete"; responsePath: string }> {
  const { job, orderedAudio, currentAudio, totalSources, responsePath } = args;

  try {
    const currentPosition = orderedAudio.findIndex((audio) => audio.audio_id === currentAudio.audio_id);
    if (currentPosition < 0) {
      throw new Error(`Unknown source audio ${currentAudio.audio_id} for transcription job ${job.id}.`);
    }

    if (currentPosition < orderedAudio.length - 1) {
      const requestArtifact = await deps.requireRequestArtifact(job.request_path);
      const nextAudio = orderedAudio[currentPosition + 1];
      const nextRequestPath = await deps.submitNextDeepgramJob(job, nextAudio, totalSources, requestArtifact);
      await deps.updateJob(job.id, {
        status: "processing",
        source_audio_id: nextAudio.audio_id,
        source_index: nextAudio.source_index ?? currentPosition + 1,
        request_path: nextRequestPath,
        response_path: responsePath,
        error: null,
      });
      return { status: "processing", responsePath };
    }

    const completedResponsePath = await deps.finalize();
    return { status: "complete", responsePath: completedResponsePath };
  } catch (error) {
    await deps.cleanupTranscript(job.transcript_id);
    await deps.failJob(
      job.id,
      responsePath,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
