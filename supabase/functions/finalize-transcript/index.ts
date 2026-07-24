import { createClient } from "npm:@supabase/supabase-js@2";

import {
  finalizeTranscriptJob,
  requireJob,
  updateJob,
  type Database,
} from "../_shared/transcriptFinalize.ts";

// Phase 2 finalize worker (DTAS Roadmap).
//
// Invoked by `transcribe-callback` once the last Deepgram chunk lands (the job
// is flipped to `finalizing`), and re-invokable by the watchdog / a recovery
// trigger. It rebuilds the canonical transcript from the stored chunk responses
// — never re-running Deepgram — and marks the job `complete`.
//
// This function does the heavy work the webhook used to do inline. It is only
// ever called internally, so it authenticates by requiring the caller to present
// the service-role key as a bearer token (verify_jwt=false in config.toml).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respondJson(200, { ok: true });
  }
  if (request.method !== "POST") {
    return respondError(405, "method not allowed");
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[finalize-transcript] missing function env");
    return respondError(500, "server misconfigured");
  }

  // Internal-only: the caller must present the service-role key.
  const authorization = request.headers.get("Authorization");
  if (authorization !== `Bearer ${supabaseServiceRoleKey}`) {
    return respondError(401, "unauthorized");
  }

  const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

  let jobId = "";
  try {
    const body = await request.json().catch(() => null);
    jobId = typeof body?.job_id === "string" ? body.job_id : "";
    if (!jobId) {
      return respondError(400, "job_id is required");
    }

    const job = await requireJob(serviceClient, jobId);

    // Idempotent: a completed job needs no work.
    if (job.status === "complete") {
      return respondJson(200, { ok: true, status: "complete" });
    }
    // Only a job that has been handed off for finalization is drivable here.
    // `processing` (mid-transcription) and terminal `failed`/`queued` are not —
    // recovery of those is Roadmap Phase 3.
    if (job.status !== "finalizing") {
      return respondError(409, `job status ${job.status} is not finalizable`);
    }

    const outcome = await finalizeTranscriptJob(serviceClient, job);
    return respondJson(200, { ok: true, status: outcome.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[finalize-transcript] finalize failed", { jobId, message });
    // Never leave a job silently stuck: record the real error as `failed`. A
    // wall-clock timeout (no catch) instead leaves it `finalizing` for the
    // watchdog to re-drive, bounded by MAX_FINALIZE_ATTEMPTS.
    if (jobId) {
      try {
        await updateJob(serviceClient, jobId, {
          status: "failed",
          error: `finalization failed: ${message}`,
        });
      } catch (markError) {
        console.error("[finalize-transcript] failed to mark job failed", {
          jobId,
          message: markError instanceof Error ? markError.message : String(markError),
        });
      }
    }
    return respondJson(200, { ok: true, status: "failed" });
  }
});

function respondJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function respondError(status: number, error: string): Response {
  return respondJson(status, { error });
}
