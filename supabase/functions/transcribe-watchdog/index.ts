import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { fetchWithRetry } from "../_shared/deepgramFetch.ts";
import type { Database } from "../_shared/database.ts";
import {
  TRANSCRIPTION_SIGNED_URL_TTL_SECONDS,
  type TranscriptionJobRecord,
} from "../../../src/lib/transcriptionJobs.ts";

// Auto-retry watchdog.
//
// Jobs that stall in queued/processing (dropped Deepgram callback, provider
// blip) are re-signed and resubmitted to Deepgram, reusing the original request
// artifact (same callback URL + token). After WATCHDOG_MAX_ATTEMPTS resubmits the
// job is failed with an actionable error so the case is freed for a manual
// restart. The pure-SQL reaper (fail_stale_transcription_jobs) remains a
// last-resort fallback for environments where this function is not scheduled.

const CASE_FILES_BUCKET = "case-files";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY") ?? "";
const staleMinutes = Number(Deno.env.get("WATCHDOG_STALE_MINUTES") ?? "20");
const maxAttempts = Number(Deno.env.get("WATCHDOG_MAX_ATTEMPTS") ?? "2");

type StoredRequestArtifact = {
  url?: unknown;
  storage_path?: unknown;
};

type WatchdogJobRow = TranscriptionJobRecord & { watchdog_attempts?: number | null };

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

  // Only the service role (pg_cron via pg_net, or an external scheduler) may run
  // the sweep — it resubmits work and reads across all owners.
  const authHeader = request.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${supabaseServiceRoleKey}`) {
    return respondError(401, "unauthorized");
  }

  const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
  const cutoffIso = new Date(Date.now() - staleMinutes * 60_000).toISOString();

  const { data, error } = await serviceClient
    .from("transcription_jobs")
    .select("*")
    .in("status", ["queued", "processing"])
    .lt("updated_at", cutoffIso)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[transcribe-watchdog] failed to load stale jobs", { message: error.message });
    return respondError(500, "failed to load stale jobs");
  }

  const staleJobs = (data ?? []) as unknown as WatchdogJobRow[];
  let resubmitted = 0;
  let failed = 0;

  for (const job of staleJobs) {
    try {
      const attempts = job.watchdog_attempts ?? 0;
      if (attempts >= maxAttempts) {
        await failJob(serviceClient, job.id, exhaustedMessage(attempts));
        failed += 1;
        continue;
      }

      const artifact = job.request_path
        ? await downloadRequestArtifact(serviceClient, job.request_path)
        : null;
      const wireUrl = typeof artifact?.url === "string" ? artifact.url : null;
      const storagePath = typeof artifact?.storage_path === "string" ? artifact.storage_path : null;
      if (!wireUrl || !storagePath) {
        await failJob(serviceClient, job.id, "RETRYABLE_WATCHDOG_TIMEOUT: request artifact missing; cannot resubmit. Restart transcription for this case.");
        failed += 1;
        continue;
      }

      const signedUrl = await signAudioUrl(serviceClient, storagePath);
      const deepgramResponse = await fetchWithRetry(wireUrl, {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: signedUrl }),
      });

      if (!deepgramResponse.ok) {
        const errorText = await deepgramResponse.text();
        await bumpAttempt(serviceClient, job.id, attempts + 1, `RETRYABLE_WATCHDOG_RESUBMIT_FAILED: ${deepgramResponse.status} ${deepgramResponse.statusText}${errorText ? ` — ${errorText}` : ""}`);
        continue;
      }

      // Keep the job "processing" and touch updated_at (the set_updated_at trigger
      // does this on any update) so the stale timer restarts for this attempt.
      await bumpAttempt(serviceClient, job.id, attempts + 1, null);
      resubmitted += 1;
    } catch (jobError) {
      const message = jobError instanceof Error ? jobError.message : String(jobError);
      console.error("[transcribe-watchdog] job sweep error", { jobId: job.id, message });
    }
  }

  return respondJson(200, {
    ok: true,
    swept: staleJobs.length,
    resubmitted,
    failed,
    stale_minutes: staleMinutes,
  });
});

function exhaustedMessage(attempts: number): string {
  return `RETRYABLE_WATCHDOG_TIMEOUT: no Deepgram callback after ${attempts} automatic resubmit${attempts === 1 ? "" : "s"}. Restart transcription for this case.`;
}

async function downloadRequestArtifact(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<StoredRequestArtifact | null> {
  const { data, error } = await supabase.storage.from(CASE_FILES_BUCKET).download(storagePath);
  if (error || !data) {
    return null;
  }
  try {
    return JSON.parse(await data.text()) as StoredRequestArtifact;
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

async function bumpAttempt(
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

async function failJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase
    .from("transcription_jobs")
    .update({ status: "failed", error: message })
    .eq("id", jobId);
  if (error) {
    throw error;
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
