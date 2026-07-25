import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { classifyRecovery } from "../../../src/lib/transcript/recoveryPolicy.ts";
import {
  requireJob,
  updateJob,
  type Database,
} from "../_shared/transcriptFinalize.ts";
import { dispatchFinalizeTask, FinalizeTaskDispatchError } from "../transcribe-callback/finalizeTasks.ts";
import type { TranscriptionJobRecord } from "../../../src/lib/transcriptionJobs.ts";

// Operator-triggered recovery (DTAS Roadmap Phase 3).
//
// Rebuilds a transcript that stalled mid-pipeline from its already-stored
// Deepgram chunk responses — no re-transcription. A stalled job is usually still
// `processing` (or `failed` after a crash), but the finalize worker only accepts
// `finalizing`; this promotes the job to `finalizing` (resetting the finalize
// attempt counter so the re-drive isn't immediately capped) and dispatches the
// Cloud Run finalize worker. If any chunk response is actually missing, the
// worker fails loudly with the real reason — recovery never fabricates data.
//
// Internal-only: invoked by an operator with the service-role key.

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
    console.error("[recover-transcript] missing function env");
    return respondError(500, "server misconfigured");
  }
  if (request.headers.get("Authorization") !== `Bearer ${supabaseServiceRoleKey}`) {
    return respondError(401, "unauthorized");
  }

  const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

  try {
    const body = await request.json().catch(() => null) as
      | { job_id?: unknown; transcript_id?: unknown }
      | null;
    const jobId = typeof body?.job_id === "string" ? body.job_id : "";
    const transcriptId = typeof body?.transcript_id === "string" ? body.transcript_id : "";
    if (!jobId && !transcriptId) {
      return respondError(400, "job_id or transcript_id is required");
    }

    const job = await loadJob(serviceClient, { jobId, transcriptId });
    const decision = classifyRecovery(job.status);

    if (decision.kind === "noop") {
      return respondJson(200, { ok: true, status: job.status, recovered: false, reason: decision.reason });
    }
    if (decision.kind === "refuse") {
      return respondError(409, decision.reason);
    }

    // Promote to `finalizing` and reset the attempt counter so the finalize
    // worker (and watchdog) treat this as a fresh finalize.
    await updateJob(serviceClient, job.id, {
      status: "finalizing",
      finalize_started_at: new Date().toISOString(),
      finalize_attempts: 0,
      error: null,
    });

    // Dispatch immediately; if the finalizer task dispatch is unconfigured, the
    // job is already `finalizing` and the watchdog will re-drive it.
    let dispatched = true;
    try {
      await dispatchFinalizeTask(job.id);
    } catch (error) {
      if (error instanceof FinalizeTaskDispatchError) {
        dispatched = false;
        console.error("[recover-transcript] finalize dispatch failed; watchdog will re-drive", {
          jobId: job.id,
          status: error.status,
          message: error.message,
        });
      } else {
        throw error;
      }
    }

    return respondJson(200, {
      ok: true,
      status: "finalizing",
      recovered: true,
      dispatched,
      job_id: job.id,
      transcript_id: job.transcript_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[recover-transcript] recovery failed", { message });
    return respondError(500, `recovery failed: ${message}`);
  }
});

async function loadJob(
  supabase: SupabaseClient<Database>,
  ref: { jobId: string; transcriptId: string },
): Promise<TranscriptionJobRecord> {
  if (ref.jobId) {
    return requireJob(supabase, ref.jobId);
  }
  const { data, error } = await supabase
    .from("transcription_jobs")
    .select("*")
    .eq("transcript_id", ref.transcriptId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error(`No transcription job found for transcript ${ref.transcriptId}.`);
  }
  return data as TranscriptionJobRecord;
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
