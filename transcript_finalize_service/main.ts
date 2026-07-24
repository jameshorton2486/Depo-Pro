import { createClient } from "npm:@supabase/supabase-js@2";

import {
  finalizeTranscriptJob,
  requireJob,
  updateJob,
  type Database,
} from "../supabase/functions/_shared/transcriptFinalize.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const port = Number(Deno.env.get("PORT") ?? "8080");
const leaseTtlMs = Number(Deno.env.get("FINALIZE_LEASE_TTL_SECONDS") ?? "900") * 1000;

Deno.serve({ port }, async (request) => {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/healthz") {
    return respondJson(200, { ok: true });
  }

  if (request.method !== "POST" || url.pathname !== "/tasks/finalize") {
    return respondJson(404, { error: "not found" });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[transcript-finalize-worker] missing runtime configuration");
    return respondJson(500, { error: "server misconfigured" });
  }

  const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  let jobId = "";
  try {
    const body = await request.json().catch(() => null) as { job_id?: unknown; jobId?: unknown } | null;
    jobId = typeof body?.job_id === "string"
      ? body.job_id
      : typeof body?.jobId === "string"
        ? body.jobId
        : "";
    if (!jobId) {
      return respondJson(200, { ok: false, status: "terminal_malformed", error: "job_id is required" });
    }

    const job = await requireJob(serviceClient, jobId);
    if (job.status === "complete" || job.status === "failed") {
      return respondJson(200, { ok: true, status: job.status });
    }
    if (job.status !== "finalizing") {
      return respondJson(409, { error: `job status ${job.status} is not finalizable` });
    }
    if (hasActiveFinalizeLease(job.finalize_started_at, job.finalize_attempts)) {
      return respondJson(200, { ok: true, status: "already_finalizing" });
    }

    const outcome = await finalizeTranscriptJob(serviceClient, job);
    return respondJson(200, { ok: true, status: outcome.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[transcript-finalize-worker] finalize failed", { jobId, message });
    if (jobId) {
      try {
        await updateJob(serviceClient, jobId, {
          status: "failed",
          error: `finalization failed: ${message}`,
        });
      } catch (markError) {
        console.error("[transcript-finalize-worker] failed to mark job failed", {
          jobId,
          message: markError instanceof Error ? markError.message : String(markError),
        });
      }
    }
    return respondJson(200, { ok: true, status: "failed" });
  }
});

function hasActiveFinalizeLease(startedAt: string | null, attempts: number): boolean {
  if (!startedAt || attempts <= 0) {
    return false;
  }
  const startedMs = Date.parse(startedAt);
  return Number.isFinite(startedMs) && Date.now() - startedMs < leaseTtlMs;
}

function respondJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
