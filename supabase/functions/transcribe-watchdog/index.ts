import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  classifyStaleJob,
  type WatchdogJobView,
  type WatchdogPolicy,
} from "../../../src/lib/transcript/watchdogPolicy.ts";
import {
  CASE_FILES_BUCKET,
  downloadJsonArtifact,
  MAX_FINALIZE_ATTEMPTS,
  updateJob,
  type Database,
} from "../_shared/transcriptFinalize.ts";
import { dispatchFinalizeTask, FinalizeTaskDispatchError } from "../transcribe-callback/finalizeTasks.ts";
import { TRANSCRIPTION_SIGNED_URL_TTL_SECONDS } from "../../../src/lib/transcriptionJobs.ts";

// Auto-retry watchdog (DTAS Roadmap Phase 4).
//
// Sweeps stalled transcription jobs and re-drives them:
//   - queued/processing past the stale timeout (dropped Deepgram callback) are
//     re-signed and resubmitted to Deepgram, bounded by WATCHDOG_MAX_ATTEMPTS.
//   - `finalizing` past the finalize lease (dropped finalize dispatch or a dead
//     worker) are re-dispatched to the Cloud Run finalize worker via Cloud
//     Tasks, bounded by MAX_FINALIZE_ATTEMPTS (enforced by the worker itself).
// The per-job decision lives in the pure `classifyStaleJob` policy; this is the
// I/O shell. The pure-SQL reaper (fail_stale_transcription_jobs) remains a
// last-resort fallback where this function is not scheduled.

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY") ?? "";
// Optional dedicated scheduler secret, decoupled from the (rotating) service-role
// key. When set, the scheduler should send `Bearer <WATCHDOG_SECRET>`; this fixes
// the class of 401s caused by the Vault service_role_key drifting from the
// function's SUPABASE_SERVICE_ROLE_KEY. The service-role key is still accepted.
const watchdogSecret = Deno.env.get("WATCHDOG_SECRET") ?? "";
const staleTranscribeMinutes = Number(Deno.env.get("WATCHDOG_STALE_MINUTES") ?? "20");
const staleFinalizeMinutes = Number(Deno.env.get("WATCHDOG_FINALIZE_STALE_MINUTES") ?? "15");
const maxDeepgramAttempts = Number(Deno.env.get("WATCHDOG_MAX_ATTEMPTS") ?? "2");

type StoredRequestArtifact = {
  url?: unknown;
  storage_path?: unknown;
};

type WatchdogJobRow = {
  id: string;
  status: WatchdogJobView["status"];
  updated_at: string;
  request_path: string | null;
  finalize_started_at: string | null;
  finalize_attempts: number | null;
  watchdog_attempts: number | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respondJson(200, { ok: true });
  }
  if (request.method !== "POST") {
    return respondError(405, "method not allowed");
  }
  if (!supabaseUrl || !supabaseServiceRoleKey || !deepgramApiKey) {
    console.error("[transcribe-watchdog] missing function env");
    return respondError(500, "server misconfigured");
  }

  // Only the scheduler (pg_cron via pg_net, or an external cron) may run the
  // sweep — it resubmits work and reads across all owners.
  if (!isAuthorized(request.headers.get("Authorization") ?? "")) {
    return respondError(401, "unauthorized");
  }

  const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
  const policy: WatchdogPolicy = {
    nowMs: Date.now(),
    staleTranscribeMs: staleTranscribeMinutes * 60_000,
    staleFinalizeMs: staleFinalizeMinutes * 60_000,
    maxDeepgramAttempts,
    maxFinalizeAttempts: MAX_FINALIZE_ATTEMPTS,
  };

  // Coarse prefilter: touch only jobs inactive past the *smaller* threshold, then
  // let the pure policy apply the precise per-status rule.
  const coarseCutoffMs = Math.min(policy.staleTranscribeMs, policy.staleFinalizeMs);
  const cutoffIso = new Date(policy.nowMs - coarseCutoffMs).toISOString();

  const { data, error } = await serviceClient
    .from("transcription_jobs")
    .select("id, status, updated_at, request_path, finalize_started_at, finalize_attempts, watchdog_attempts")
    .in("status", ["queued", "processing", "finalizing"])
    .lt("updated_at", cutoffIso)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[transcribe-watchdog] failed to load stale jobs", { message: error.message });
    return respondError(500, "failed to load stale jobs");
  }

  const staleJobs = (data ?? []) as unknown as WatchdogJobRow[];
  const summary = { swept: staleJobs.length, resubmitted: 0, redriven: 0, failed: 0, skipped: 0 };

  for (const job of staleJobs) {
    const view: WatchdogJobView = {
      status: job.status,
      updated_at: job.updated_at,
      finalize_started_at: job.finalize_started_at,
      watchdog_attempts: job.watchdog_attempts ?? 0,
      finalize_attempts: job.finalize_attempts ?? 0,
    };
    const action = classifyStaleJob(view, policy);

    try {
      switch (action.kind) {
        case "skip":
          summary.skipped += 1;
          break;
        case "fail":
          await updateJob(serviceClient, job.id, { status: "failed", error: action.reason });
          summary.failed += 1;
          break;
        case "redrive_finalize":
          await redriveFinalize(job.id);
          summary.redriven += 1;
          break;
        case "resubmit_deepgram":
          await resubmitDeepgram(serviceClient, job, view.watchdog_attempts);
          summary.resubmitted += 1;
          break;
      }
    } catch (jobError) {
      const message = jobError instanceof Error ? jobError.message : String(jobError);
      console.error("[transcribe-watchdog] job sweep error", { jobId: job.id, action: action.kind, message });
    }
  }

  return respondJson(200, { ok: true, ...summary });
});

function isAuthorized(authHeader: string): boolean {
  if (watchdogSecret && authHeader === `Bearer ${watchdogSecret}`) {
    return true;
  }
  return authHeader === `Bearer ${supabaseServiceRoleKey}`;
}

async function redriveFinalize(jobId: string): Promise<void> {
  try {
    await dispatchFinalizeTask(jobId);
  } catch (error) {
    if (error instanceof FinalizeTaskDispatchError) {
      // A dispatch/config failure must not crash the sweep — the job stays
      // `finalizing` and will be retried on the next tick.
      console.error("[transcribe-watchdog] finalize re-dispatch failed", { jobId, status: error.status, message: error.message });
      return;
    }
    throw error;
  }
}

async function resubmitDeepgram(
  supabase: SupabaseClient<Database>,
  job: WatchdogJobRow,
  attempts: number,
): Promise<void> {
  const artifact = job.request_path ? await tryDownloadRequestArtifact(supabase, job.request_path) : null;
  const wireUrl = typeof artifact?.url === "string" ? artifact.url : null;
  const storagePath = typeof artifact?.storage_path === "string" ? artifact.storage_path : null;

  if (!wireUrl || !storagePath) {
    await updateJob(supabase, job.id, {
      status: "failed",
      error: "RETRYABLE_WATCHDOG_TIMEOUT: request artifact missing; cannot resubmit. Restart transcription for this case.",
    });
    return;
  }

  const signedUrl = await signAudioUrl(supabase, storagePath);
  const deepgramResponse = await fetch(wireUrl, {
    method: "POST",
    headers: {
      Authorization: `Token ${deepgramApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: signedUrl }),
  });

  if (!deepgramResponse.ok) {
    const errorText = await deepgramResponse.text();
    await bumpWatchdogAttempt(
      supabase,
      job.id,
      attempts + 1,
      `RETRYABLE_WATCHDOG_RESUBMIT_FAILED: ${deepgramResponse.status} ${deepgramResponse.statusText}${errorText ? ` — ${errorText}` : ""}`,
    );
    return;
  }

  // Keep the job "processing" and touch updated_at (the set_updated_at trigger
  // does this on any update) so the stale timer restarts for this attempt.
  await bumpWatchdogAttempt(supabase, job.id, attempts + 1, null);
}

async function tryDownloadRequestArtifact(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<StoredRequestArtifact | null> {
  try {
    return await downloadJsonArtifact(supabase, storagePath) as StoredRequestArtifact;
  } catch {
    return null;
  }
}

async function signAudioUrl(supabase: SupabaseClient<Database>, storagePath: string): Promise<string> {
  const signed = await supabase.storage
    .from(CASE_FILES_BUCKET)
    .createSignedUrl(storagePath, TRANSCRIPTION_SIGNED_URL_TTL_SECONDS);
  if (signed.error) {
    throw signed.error;
  }
  return signed.data.signedUrl;
}

async function bumpWatchdogAttempt(
  supabase: SupabaseClient<Database>,
  jobId: string,
  attempts: number,
  error: string | null,
): Promise<void> {
  const { error: updateError } = await supabase
    .from("transcription_jobs")
    .update({ status: "processing", watchdog_attempts: attempts, error })
    .eq("id", jobId);
  if (updateError) {
    throw updateError;
  }
}

function respondJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function respondError(status: number, error: string): Response {
  return respondJson(status, { error });
}
