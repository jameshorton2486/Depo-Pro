/**
 * Recovery policy (DTAS Roadmap Phase 3) — pure classification of whether a
 * transcription job can be rebuilt from its stored Deepgram chunk responses
 * without re-running Deepgram.
 *
 * The finalize worker only accepts jobs in `finalizing`, but a job that stalled
 * mid-pipeline is usually still `processing` (or `failed` after a crash). This
 * decides whether an operator-triggered recovery should promote the job to
 * `finalizing` and re-drive the finalize worker.
 *
 * Pure and side-effect free so it can be unit-tested exhaustively; the Deno
 * `recover-transcript` function is a thin shell that executes the result.
 */

import type { TranscriptionJobStatus } from "../transcriptionJobs.ts";

export type RecoveryDecision =
  | { kind: "recover" }
  | { kind: "noop"; reason: string }
  | { kind: "refuse"; reason: string };

/**
 * @param status current transcription-job status
 *
 * - `complete`  → noop (already rebuilt).
 * - `queued`    → refuse: Deepgram never ran, so there are no stored responses
 *                 to rebuild from. The correct action is to (re)start
 *                 transcription, not recover.
 * - `processing` / `finalizing` / `failed` → recover: the chunk responses are
 *   (expected to be) stored; promote to `finalizing` and re-drive finalize. If a
 *   response is actually missing, the finalize worker fails loudly with the real
 *   reason — recovery never fabricates a transcript.
 */
export function classifyRecovery(status: TranscriptionJobStatus): RecoveryDecision {
  if (status === "complete") {
    return { kind: "noop", reason: "transcript is already complete" };
  }
  if (status === "queued") {
    return {
      kind: "refuse",
      reason: "job has not been transcribed yet (no stored responses to rebuild). Start transcription instead.",
    };
  }
  return { kind: "recover" };
}
