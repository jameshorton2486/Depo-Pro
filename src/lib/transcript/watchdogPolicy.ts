/**
 * Watchdog policy (DTAS Roadmap Phase 4) — pure classification of a stalled
 * transcription job into the action the `transcribe-watchdog` sweep should take.
 *
 * Two stall points exist in the pipeline:
 *   - `queued`/`processing`: Deepgram never fired (or dropped) the callback. The
 *     watchdog re-signs the audio and resubmits to Deepgram, bounded by
 *     `maxDeepgramAttempts`.
 *   - `finalizing` (added in Phase 2): the job was handed off to the finalize
 *     worker but the dispatch was dropped or the worker died mid-run. The
 *     watchdog re-drives the finalize worker, bounded by `maxFinalizeAttempts`.
 *
 * The decision is pure so it can be unit-tested exhaustively; the Deno function
 * is a thin I/O shell that executes whatever this returns. No side effects.
 */

import type { TranscriptionJobStatus } from "../transcriptionJobs";

export type WatchdogAction =
  | { kind: "resubmit_deepgram" }
  | { kind: "redrive_finalize" }
  | { kind: "fail"; reason: string }
  | { kind: "skip"; reason: string };

export interface WatchdogJobView {
  status: TranscriptionJobStatus;
  /** Last time the job made progress (set_updated_at trigger touches this). */
  updated_at: string;
  /** When the finalize worker most recently began; the finalize lease anchor. */
  finalize_started_at: string | null;
  /** Deepgram resubmit counter. */
  watchdog_attempts: number;
  /** Finalize re-invocation counter (bounded by MAX_FINALIZE_ATTEMPTS). */
  finalize_attempts: number;
}

export interface WatchdogPolicy {
  nowMs: number;
  /** Inactivity (ms) in queued/processing before a Deepgram resubmit. */
  staleTranscribeMs: number;
  /** Finalize lease TTL (ms): a more recent finalize_started_at means a worker still holds it. */
  staleFinalizeMs: number;
  maxDeepgramAttempts: number;
  maxFinalizeAttempts: number;
}

export function classifyStaleJob(job: WatchdogJobView, policy: WatchdogPolicy): WatchdogAction {
  if (job.status === "queued" || job.status === "processing") {
    const lastProgressMs = Date.parse(job.updated_at);
    if (Number.isFinite(lastProgressMs) && policy.nowMs - lastProgressMs < policy.staleTranscribeMs) {
      return { kind: "skip", reason: "transcription still within timeout" };
    }
    if (job.watchdog_attempts >= policy.maxDeepgramAttempts) {
      const plural = job.watchdog_attempts === 1 ? "" : "s";
      return {
        kind: "fail",
        reason: `RETRYABLE_WATCHDOG_TIMEOUT: no Deepgram callback after ${job.watchdog_attempts} automatic resubmit${plural}. Restart transcription for this case.`,
      };
    }
    return { kind: "resubmit_deepgram" };
  }

  if (job.status === "finalizing") {
    const startedMs = job.finalize_started_at ? Date.parse(job.finalize_started_at) : Number.NaN;
    // A recent finalize_started_at means a worker is (probably) still finalizing
    // — mirror the Cloud Run worker's own lease check and leave it alone.
    if (Number.isFinite(startedMs) && policy.nowMs - startedMs < policy.staleFinalizeMs) {
      return { kind: "skip", reason: "finalize lease still active" };
    }
    if (job.finalize_attempts >= policy.maxFinalizeAttempts) {
      const plural = job.finalize_attempts === 1 ? "" : "s";
      return {
        kind: "fail",
        reason: `FINALIZE_TIMEOUT: finalization did not complete after ${job.finalize_attempts} attempt${plural}. Recover this transcript from its stored responses.`,
      };
    }
    return { kind: "redrive_finalize" };
  }

  return { kind: "skip", reason: "job is terminal" };
}
