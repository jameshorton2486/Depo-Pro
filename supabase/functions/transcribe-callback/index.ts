import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { integrityAudit, type IntegrityAuditResult } from "../../../src/lib/transcript/integrityAudit.ts";
import { advanceOrFinalizeMultifileJob } from "../../../src/lib/transcript/multifileCallbackFlow.ts";
import {
  audioRowsToSequentialSources,
  type SequentialTranscriptSource,
} from "../../../src/lib/transcript/autoChunking.ts";
import type { DeepgramResponse } from "../../../src/lib/transcript/types.ts";
import {
  buildDeepgramRequestFileName,
  buildDeepgramResponseFileName,
  buildTranscriptionArtifactPath,
  sha256Hex,
  type TranscriptionJobRecord,
} from "../../../src/lib/transcriptionJobs.ts";
import {
  CASE_FILES_BUCKET,
  cleanupTranscript,
  detectMediaKind,
  failJob,
  loadOrderedAudio,
  loadOrderedChunkSources,
  parseDeepgramResponse,
  requireJob,
  requireRequestArtifact,
  updateJob,
  uploadJsonArtifact,
  type CaseAudioRow,
  type Database,
  type DeepgramRequestArtifact,
  type TranscriptInsertRow,
} from "../_shared/transcriptFinalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY") ?? "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respondJson(200, { ok: true });
  }

  if (request.method !== "POST") {
    return respondError(405, "method not allowed");
  }

  if (!supabaseUrl || !supabaseServiceRoleKey || !deepgramApiKey) {
    console.error("[transcribe-callback] missing function env");
    return respondError(500, "server misconfigured");
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get("job") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!jobId || !token) {
    return respondError(401, "unauthorized");
  }

  // SECURITY INVARIANT: serviceClient carries service-role privileges. It is
  // created here because we must fetch the job row to read its stored token
  // hash before we can validate the caller. Nothing between this line and the
  // tokenHash check below may perform any mutation or expose data to the
  // caller. Only the single job read via requireJob is permitted. If you add
  // work here, either move it below the token check or refactor to fetch the
  // token hash via an anon-scoped RPC.
  const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

  // Once the callback token is validated, any later failure must mark the job
  // `failed` (with the real error) rather than leave it silently stuck in
  // `processing`. currentResponsePath records the raw response we were on.
  let authenticated = false;
  let currentResponsePath: string | null = null;

  try {
    const job = await requireJob(serviceClient, jobId);
    const tokenHash = await sha256Hex(token);
    if (tokenHash !== job.callback_token_hash) {
      return respondError(401, "unauthorized");
    }
    authenticated = true;

    if (job.status !== "processing") {
      return respondError(409, "job is not accepting callbacks");
    }

    const payload = await request.json();
    const orderedAudio = await loadOrderedAudio(serviceClient, job.case_id);
    const requestArtifact = await requireRequestArtifact(serviceClient, job.request_path);
    const orderedSources = requestArtifact.auto_chunk
      ? await loadOrderedChunkSources(serviceClient, requestArtifact.auto_chunk.manifest_path)
      : audioRowsToSequentialSources(orderedAudio);
    const currentSource = resolveCurrentSource(job, orderedSources);
    const totalSources = orderedSources.length;
    const responsePath = buildTranscriptionArtifactPath(
      job.owner_user_id,
      job.case_id,
      buildDeepgramResponseFileName(job.id, currentSource.source_index, totalSources),
    );
    const rawChecksum = await uploadJsonArtifact(serviceClient, responsePath, payload);
    currentResponsePath = responsePath;

    const parsed = parseDeepgramResponse(payload);
    if (!parsed.ok) {
      await failJob(serviceClient, job.id, responsePath, parsed.error);
      return respondJson(200, { ok: true, status: "failed" });
    }

    const auditResult = integrityAudit(parsed.response);
    if (!auditResult.integrity_passed) {
      await persistManualReviewTranscript(
        serviceClient,
        job,
        orderedAudio,
        responsePath,
        rawChecksum,
        parsed.response,
        auditResult,
      );
      await updateJob(serviceClient, job.id, {
        status: "failed",
        response_path: responsePath,
        error: buildIntegrityFailureMessage(auditResult),
      });
      return respondJson(200, { ok: true, status: "needs_manual_review" });
    }

    const outcome = await advanceOrFinalizeMultifileJob({
      job,
      orderedSources,
      currentSource,
      totalSources,
      responsePath,
    }, {
      requireRequestArtifact: (requestPath) => requireRequestArtifact(serviceClient, requestPath),
      submitNextDeepgramJob: (jobRecord, sourceRecord, sourceCount, nextRequestArtifact) =>
        submitNextDeepgramJob(serviceClient, jobRecord, sourceRecord, sourceCount, nextRequestArtifact),
      updateJob: (jobId, patch) => updateJob(serviceClient, jobId, patch),
      // Phase 2: the webhook no longer finalizes inline (that heavy work blew
      // edge limits and left jobs stuck). On the last chunk we flip the job to
      // `finalizing` and hand off to the dedicated `finalize-transcript` worker,
      // returning fast. If the dispatch is dropped, the watchdog (Phase 4)
      // re-drives any stale `finalizing` job.
      finalize: async () => {
        await updateJob(serviceClient, job.id, {
          status: "finalizing",
          finalize_started_at: new Date().toISOString(),
          response_path: responsePath,
          error: null,
        });
        dispatchFinalize(job.id);
        return { status: "finalizing" as const, responsePath };
      },
      cleanupTranscript: (transcriptId) => cleanupTranscript(serviceClient, transcriptId),
      failJob: (jobId, failedResponsePath, errorMessage) =>
        failJob(serviceClient, jobId, failedResponsePath, errorMessage),
    });

    return respondJson(200, { ok: true, status: outcome.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[transcribe-callback] unexpected error", { jobId, message });
    if (authenticated) {
      // Never leave an authenticated job silently stuck in `processing`.
      try {
        await updateJob(serviceClient, jobId, {
          status: "failed",
          error: `finalization failed: ${message}`,
          ...(currentResponsePath ? { response_path: currentResponsePath } : {}),
        });
      } catch (markError) {
        console.error("[transcribe-callback] failed to mark job failed", {
          jobId,
          message: markError instanceof Error ? markError.message : String(markError),
        });
      }
      return respondJson(200, { ok: true, status: "failed" });
    }
    return respondError(500, "unexpected server error");
  }
});

/**
 * Fire-and-forget invocation of the finalize worker. Best-effort: the webhook
 * must not block on the (potentially minutes-long) finalize. Reliability comes
 * from the watchdog re-driving any job left in `finalizing`.
 */
function dispatchFinalize(jobId: string): void {
  const finalizeUrl = `${supabaseUrl}/functions/v1/finalize-transcript`;
  void fetch(finalizeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ job_id: jobId }),
  }).catch((error) => {
    console.error("[transcribe-callback] finalize dispatch failed", {
      jobId,
      message: error instanceof Error ? error.message : String(error),
    });
  });
}

async function persistManualReviewTranscript(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
  orderedAudio: CaseAudioRow[],
  responsePath: string,
  rawChecksum: string,
  response: DeepgramResponse,
  auditResult: IntegrityAuditResult,
): Promise<void> {
  const transcriptRow: TranscriptInsertRow = {
    transcript_id: job.transcript_id,
    case_id: job.case_id,
    job_id: job.id,
    media_url: orderedAudio[0]?.media_url ?? null,
    duration: response.metadata.duration,
    based_on: orderedAudio[0]?.audio_id ?? null,
    deepgram_request_id: response.metadata.request_id ?? null,
    session_id: null,
    source_filename: orderedAudio[0]?.original_filename ?? null,
    media_kind: detectMediaKind(orderedAudio[0]?.mime_type ?? "audio/mpeg"),
    status: "needs_manual_review",
    engine: "deepgram-nova-3",
    transcription_source: "deepgram",
    sequence_index: 0,
    duration_seconds: response.metadata.duration,
    word_count: auditResult.word_count,
    utterance_count: auditResult.utterance_count,
    speaker_count: auditResult.speaker_ids_found.length,
    avg_confidence: auditResult.confidence_stats.mean.toFixed(4),
    raw_storage_path: responsePath,
    raw_checksum: rawChecksum,
    last_error: buildIntegrityFailureMessage(auditResult),
    speaker_map_confirmed: false,
    owner_user_id: job.owner_user_id,
  };

  const { error } = await supabase
    .from("transcripts")
    .upsert(transcriptRow, { onConflict: "transcript_id" });
  if (error) {
    throw error;
  }
}

function buildIntegrityFailureMessage(auditResult: IntegrityAuditResult): string {
  return `NEEDS_MANUAL_REVIEW: ${auditResult.failures[0] ?? "Integrity audit failed."}`;
}

function resolveCurrentSource(job: TranscriptionJobRecord, orderedSources: SequentialTranscriptSource[]): SequentialTranscriptSource {
  if (job.source_audio_id) {
    const boundSource = orderedSources.find((source) =>
      source.source_audio_id === job.source_audio_id && source.source_index === job.source_index
    );
    if (boundSource) {
      return boundSource;
    }
  }

  if (typeof job.source_index === "number") {
    const indexedSource = orderedSources.find((source) => source.source_index === job.source_index);
    if (indexedSource) {
      return indexedSource;
    }
  }

  throw new Error(`Could not resolve the active sequential source for job ${job.id}.`);
}

async function signAudioUrl(supabase: SupabaseClient<Database>, storagePath: string): Promise<string> {
  const signed = await supabase.storage
    .from(CASE_FILES_BUCKET)
    .createSignedUrl(storagePath, 6 * 60 * 60);

  if (signed.error) {
    throw signed.error;
  }

  return signed.data.signedUrl;
}

async function submitNextDeepgramJob(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
  source: SequentialTranscriptSource,
  totalSources: number,
  requestArtifact: DeepgramRequestArtifact,
): Promise<string> {
  if (!source.storage_path) {
    throw new Error(`Source file ${source.source_filename} is missing a storage path.`);
  }

  const signedAudioUrl = await signAudioUrl(supabase, source.storage_path);
  const sourceIndex = source.source_index;
  const requestPath = buildTranscriptionArtifactPath(
    job.owner_user_id,
    job.case_id,
    buildDeepgramRequestFileName(job.id, sourceIndex, totalSources),
  );
  const nextUrl = new URL(requestArtifact.url);
  if (source.kind === "virtual_chunk") {
    nextUrl.searchParams.set("start", String(source.start_seconds ?? 0));
    nextUrl.searchParams.set("end", String(source.end_seconds ?? 0));
  } else {
    nextUrl.searchParams.delete("start");
    nextUrl.searchParams.delete("end");
  }
  const nextArtifact: DeepgramRequestArtifact = {
    ...requestArtifact,
    url: nextUrl.toString(),
    body: {
      url: signedAudioUrl,
    },
    source_audio_id: source.source_audio_id,
    source_index: sourceIndex,
    total_sources: totalSources,
    source_filename: source.source_filename,
    storage_path: source.storage_path,
  };
  if (source.kind === "virtual_chunk") {
    nextArtifact.start_seconds = source.start_seconds;
    nextArtifact.end_seconds = source.end_seconds;
    nextArtifact.auto_chunk = requestArtifact.auto_chunk
      ? {
          ...requestArtifact.auto_chunk,
          current_chunk_index: source.chunk_index ?? sourceIndex,
        }
      : undefined;
  }
  await uploadJsonArtifact(supabase, requestPath, nextArtifact);

  const deepgramResponse = await fetch(nextArtifact.url, {
    method: "POST",
    headers: {
      Authorization: `Token ${deepgramApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: signedAudioUrl }),
  });

  if (!deepgramResponse.ok) {
    const errorText = await deepgramResponse.text();
    throw new Error(
      `Deepgram start failed for source ${sourceIndex}: ${deepgramResponse.status} ${deepgramResponse.statusText}${errorText ? ` — ${errorText}` : ""}`,
    );
  }

  return requestPath;
}

function respondJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function respondError(status: number, error: string): Response {
  return respondJson(status, { error });
}
