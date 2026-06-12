import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { normalizeTranscriptResponse } from "../../../src/lib/transcript/normalize.ts";
import { advanceOrFinalizeMultifileJob } from "../../../src/lib/transcript/multifileCallbackFlow.ts";
import {
  type SourceTranscriptSegment,
} from "../../../src/lib/transcript/multifileMerge.ts";
import type { DeepgramResponse } from "../../../src/lib/transcript/types.ts";
import {
  buildSegmentTranscriptBundle,
  replaceCaseSegmentTranscripts,
  type SegmentTranscriptBundle,
} from "../../../src/lib/transcript/segmentFinalization.ts";
import {
  buildDeepgramRequestFileName,
  buildDeepgramResponseFileName,
  buildTranscriptionArtifactPath,
  sha256Hex,
  type TranscriptionJobRecord,
} from "../../../src/lib/transcriptionJobs.ts";

type Database = Record<string, never>;

type CaseAudioRow = {
  audio_id: string;
  original_filename: string;
  mime_type: string;
  duration_seconds: number | null;
  source_index: number | null;
  storage_path: string | null;
  media_url: string | null;
  uploaded_at: string | null;
};


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CASE_FILES_BUCKET = "case-files";
const WORD_CHUNK_SIZE = 500;
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

  const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

  try {
    const job = await requireJob(serviceClient, jobId);
    const tokenHash = await sha256Hex(token);
    if (tokenHash !== job.callback_token_hash) {
      return respondError(401, "unauthorized");
    }

    if (job.status !== "processing") {
      return respondError(409, "job is not accepting callbacks");
    }

    const payload = await request.json();
    const orderedAudio = await loadOrderedAudio(serviceClient, job.case_id);
    const currentAudio = resolveCurrentAudio(job, orderedAudio);
    const totalSources = orderedAudio.length;
    const responsePath = buildTranscriptionArtifactPath(
      job.owner_user_id,
      job.case_id,
      buildDeepgramResponseFileName(job.id, currentAudio.source_index ?? 0, totalSources),
    );
    const rawChecksum = await uploadJsonArtifact(serviceClient, responsePath, payload);

    const parsed = parseDeepgramResponse(payload);
    if (!parsed.ok) {
      await failJob(serviceClient, job.id, responsePath, parsed.error);
      return respondJson(200, { ok: true, status: "failed" });
    }

    try {
      const outcome = await advanceOrFinalizeMultifileJob({
        job,
        orderedAudio,
        currentAudio,
        totalSources,
        responsePath,
      }, {
        requireRequestArtifact: (requestPath) => requireRequestArtifact(serviceClient, requestPath),
        submitNextDeepgramJob: (jobRecord, audioRecord, sourceCount, requestArtifact) =>
          submitNextDeepgramJob(serviceClient, jobRecord, audioRecord, sourceCount, requestArtifact),
        updateJob: (jobId, patch) => updateJob(serviceClient, jobId, patch),
        finalize: async () => {
          const sourceSegments = await loadSourceTranscriptSegments(serviceClient, job, orderedAudio);
          const segmentBundles = sourceSegments.map((segment) =>
            buildSegmentTranscriptBundle({
              transcriptId: job.transcript_id,
              caseId: job.case_id,
              jobId: job.id,
              ownerUserId: job.owner_user_id,
            }, {
              sourceAudioId: segment.source_audio_id,
              sourceIndex: segment.source_index,
              sourceFilename: segment.source_filename,
              mimeType: segment.mime_type,
              storagePath: segment.storage_path,
              mediaUrl: segment.media_url,
              normalized: segment.normalized,
              deepgramRequestId: segment.response.metadata.request_id ?? null,
              rawStoragePath: segment.response_path,
              rawChecksum: segment.response_path === responsePath ? rawChecksum : null,
            })
          );

          await replaceCaseSegmentTranscripts({
            listCaseTranscriptIds: (caseId) => listCaseTranscriptIds(serviceClient, caseId),
            deleteTranscriptData: (transcriptId) => cleanupTranscript(serviceClient, transcriptId),
            insertTranscriptBundle: (bundle) => insertSegmentTranscriptBundle(serviceClient, bundle),
          }, job.case_id, segmentBundles);
          await updateJob(serviceClient, job.id, {
            status: "complete",
            response_path: responsePath,
            error: null,
          });
          return responsePath;
        },
        cleanupTranscript: (transcriptId) => cleanupTranscript(serviceClient, transcriptId),
        failJob: (jobId, failedResponsePath, errorMessage) =>
          failJob(serviceClient, jobId, failedResponsePath, errorMessage),
      });

      return respondJson(200, { ok: true, status: outcome.status });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error("[transcribe-callback] unexpected error", {
      jobId,
      message: error instanceof Error ? error.message : String(error),
    });
    return respondError(500, "unexpected server error");
  }
});

async function requireJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<TranscriptionJobRecord> {
  const { data, error } = await supabase
    .from("transcription_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Unknown transcription job.");
  }

  return data as TranscriptionJobRecord;
}

function parseDeepgramResponse(value: unknown): { ok: true; response: DeepgramResponse } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "Deepgram callback payload was not JSON." };
  }

  const payload = value as Record<string, unknown>;
  const metadata = payload.metadata;
  const results = payload.results;
  if (
    typeof metadata !== "object"
    || metadata === null
    || typeof results !== "object"
    || results === null
    || !Array.isArray((results as Record<string, unknown>).channels)
  ) {
    const message = typeof payload.err_msg === "string"
      ? payload.err_msg
      : typeof payload.error === "string"
        ? payload.error
        : "Deepgram callback payload did not contain a transcript.";
    return { ok: false, error: message };
  }

  return { ok: true, response: value as DeepgramResponse };
}

async function loadOrderedAudio(
  supabase: SupabaseClient<Database>,
  caseId: string,
): Promise<CaseAudioRow[]> {
  const { data, error } = await supabase
    .from("case_audio")
    .select("audio_id, original_filename, mime_type, duration_seconds, source_index, storage_path, media_url, uploaded_at")
    .eq("case_id", caseId)
    .order("source_index", { ascending: true })
    .order("uploaded_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data as CaseAudioRow[] | null) ?? []).map((row, index) => ({
    ...row,
    source_index: typeof row.source_index === "number" ? row.source_index : index,
  }));
}

async function uploadJsonArtifact(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  payload: unknown,
): Promise<string> {
  const body = JSON.stringify(payload, null, 2);
  const bytes = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

  const { error } = await supabase.storage
    .from(CASE_FILES_BUCKET)
    .upload(
      storagePath,
      new Blob([body], { type: "application/json" }),
      {
        upsert: false,
        contentType: "application/json",
      },
    );

  if (error) {
    throw error;
  }

  return checksum;
}

async function failJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  responsePath: string,
  errorMessage: string,
): Promise<void> {
  await updateJob(supabase, jobId, {
    status: "failed",
    response_path: responsePath,
    error: errorMessage,
  });
}

async function updateJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  patch: Partial<Pick<TranscriptionJobRecord, "status" | "source_audio_id" | "source_index" | "request_path" | "response_path" | "error">>,
): Promise<void> {
  const { error } = await supabase
    .from("transcription_jobs")
    .update(patch)
    .eq("id", jobId);

  if (error) {
    throw error;
  }
}

function resolveCurrentAudio(job: TranscriptionJobRecord, orderedAudio: CaseAudioRow[]): CaseAudioRow {
  if (job.source_audio_id) {
    const boundAudio = orderedAudio.find((audio) => audio.audio_id === job.source_audio_id);
    if (boundAudio) {
      return boundAudio;
    }
  }

  if (typeof job.source_index === "number") {
    const indexedAudio = orderedAudio.find((audio) => (audio.source_index ?? 0) === job.source_index);
    if (indexedAudio) {
      return indexedAudio;
    }
  }

  throw new Error(`Could not resolve the active source audio for job ${job.id}.`);
}

async function requireRequestArtifact(
  supabase: SupabaseClient<Database>,
  requestPath: string | null,
): Promise<{
  url: string;
  callback_url: string;
  preview?: unknown;
  total_sources?: number;
}> {
  if (!requestPath) {
    throw new Error("Transcription job is missing its request artifact path.");
  }

  const artifact = await downloadJsonArtifact(supabase, requestPath);
  if (
    typeof artifact !== "object"
    || artifact === null
    || typeof (artifact as Record<string, unknown>).url !== "string"
    || typeof (artifact as Record<string, unknown>).callback_url !== "string"
  ) {
    throw new Error("Request artifact is missing required callback metadata.");
  }

  return artifact as {
    url: string;
    callback_url: string;
    preview?: unknown;
    total_sources?: number;
  };
}

async function downloadJsonArtifact(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<unknown> {
  const { data, error } = await supabase.storage
    .from(CASE_FILES_BUCKET)
    .download(storagePath);

  if (error) {
    throw error;
  }

  return JSON.parse(await data.text()) as unknown;
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
  audio: CaseAudioRow,
  totalSources: number,
  requestArtifact: {
    url: string;
    callback_url: string;
    preview?: unknown;
    total_sources?: number;
  },
): Promise<string> {
  if (!audio.storage_path) {
    throw new Error(`Source file ${audio.original_filename} is missing a storage path.`);
  }

  const signedAudioUrl = await signAudioUrl(supabase, audio.storage_path);
  const sourceIndex = audio.source_index ?? 0;
  const requestPath = buildTranscriptionArtifactPath(
    job.owner_user_id,
    job.case_id,
    buildDeepgramRequestFileName(job.id, sourceIndex, totalSources),
  );
  const nextArtifact = {
    ...requestArtifact,
    body: {
      url: signedAudioUrl,
    },
    source_audio_id: audio.audio_id,
    source_index: sourceIndex,
    total_sources: totalSources,
    source_filename: audio.original_filename,
    storage_path: audio.storage_path,
  };
  await uploadJsonArtifact(supabase, requestPath, nextArtifact);

  const deepgramResponse = await fetch(requestArtifact.url, {
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

async function loadSourceTranscriptSegments(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
  orderedAudio: CaseAudioRow[],
): Promise<Array<SourceTranscriptSegment & { response_path: string }>> {
  const totalSources = orderedAudio.length;

  return Promise.all(
    orderedAudio.map(async (audio, fallbackIndex) => {
      const sourceIndex = audio.source_index ?? fallbackIndex;
      const responsePath = buildTranscriptionArtifactPath(
        job.owner_user_id,
        job.case_id,
        buildDeepgramResponseFileName(job.id, sourceIndex, totalSources),
      );
      const payload = await downloadJsonArtifact(supabase, responsePath);
      const parsed = parseDeepgramResponse(payload);
      if (!parsed.ok) {
        throw new Error(`Stored Deepgram response for ${audio.original_filename} was invalid: ${parsed.error}`);
      }

      return {
        source_audio_id: audio.audio_id,
        source_index: sourceIndex,
        source_filename: audio.original_filename,
        mime_type: audio.mime_type,
        storage_path: audio.storage_path,
        media_url: audio.media_url,
        response: parsed.response,
        normalized: normalizeTranscriptResponse(parsed.response),
        fallback_duration_seconds: audio.duration_seconds,
        response_path: responsePath,
      };
    }),
  );
}

async function cleanupTranscript(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<void> {
  await supabase.from("transcript_words").delete().eq("transcript_id", transcriptId);
  await supabase.from("transcript_utterances").delete().eq("transcript_id", transcriptId);
  await supabase.from("transcript_speakers").delete().eq("transcript_id", transcriptId);
  await supabase.from("transcript_audit_log").delete().eq("transcript_id", transcriptId);
  await supabase.from("transcripts").delete().eq("transcript_id", transcriptId);
}

async function listCaseTranscriptIds(
  supabase: SupabaseClient<Database>,
  caseId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("transcripts")
    .select("transcript_id")
    .eq("case_id", caseId);

  if (error) {
    throw error;
  }

  return ((data as Array<{ transcript_id: string }> | null) ?? []).map((row) => row.transcript_id);
}

async function insertSegmentTranscriptBundle(
  supabase: SupabaseClient<Database>,
  bundle: SegmentTranscriptBundle,
): Promise<void> {
  const { error: transcriptError } = await supabase
    .from("transcripts")
    .insert(bundle.transcript);
  if (transcriptError) {
    throw transcriptError;
  }

  if (bundle.speakers.length > 0) {
    const { error } = await supabase.from("transcript_speakers").insert(bundle.speakers);
    if (error) {
      throw error;
    }
  }

  if (bundle.utterances.length > 0) {
    const { error } = await supabase.from("transcript_utterances").insert(bundle.utterances);
    if (error) {
      throw error;
    }
  }

  for (let index = 0; index < bundle.words.length; index += WORD_CHUNK_SIZE) {
    const chunk = bundle.words.slice(index, index + WORD_CHUNK_SIZE);
    const { error } = await supabase.from("transcript_words").insert(chunk);
    if (error) {
      throw error;
    }
  }

  const { error: auditError } = await supabase
    .from("transcript_audit_log")
    .insert(bundle.audit);
  if (auditError) {
    throw auditError;
  }
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
