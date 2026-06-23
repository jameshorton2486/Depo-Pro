import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { normalizeTranscriptResponse } from "../../../src/lib/transcript/normalize.ts";
import { advanceOrFinalizeMultifileJob } from "../../../src/lib/transcript/multifileCallbackFlow.ts";
import {
  getPrimaryMediaUrl,
  getPrimaryMimeType,
  getPrimarySourceAudioId,
  getPrimarySourceFilename,
  mergeSourceTranscriptSegments,
  type MergedSourceSegment,
} from "../../../src/lib/transcript/multifileMerge.ts";
import type { DeepgramResponse } from "../../../src/lib/transcript/types.ts";
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

type DeepgramRequestArtifact = {
  url: string;
  callback_url: string;
  preview?: unknown;
  total_sources?: number;
};

type TranscriptInsertRow = {
  transcript_id: string;
  case_id: string;
  job_id: string;
  media_url: string | null;
  duration: number | null;
  based_on: string | null;
  deepgram_request_id: string | null;
  session_id: string | null;
  source_filename: string | null;
  media_kind: "audio" | "video";
  status: "completed";
  engine: string;
  transcription_source: "deepgram";
  sequence_index: number;
  duration_seconds: number | null;
  word_count: number;
  utterance_count: number;
  speaker_count: number;
  avg_confidence: string | null;
  raw_storage_path: string | null;
  raw_checksum: string | null;
  last_error: string | null;
  speaker_map_confirmed: boolean;
  owner_user_id: string;
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
        const merged = mergeSourceTranscriptSegments(sourceSegments);
        const deepgramRequestId = totalSources === 1
          ? sourceSegments[0]?.response.metadata.request_id ?? null
          : `${job.id}_multifile`;
        const finalArtifact = totalSources === 1
          ? { path: responsePath, checksum: rawChecksum }
          : await (async () => {
              const manifestPath = buildTranscriptionArtifactPath(
                job.owner_user_id,
                job.case_id,
                `${job.id}_multifile_manifest.json`,
              );
              const checksum = await uploadJsonArtifact(
                serviceClient,
                manifestPath,
                buildMergeManifest(job, merged.segments, sourceSegments),
              );
              return { path: manifestPath, checksum };
            })();

        await ingestTranscript(
          serviceClient,
          job,
          merged.segments,
          merged.normalized,
          deepgramRequestId,
          finalArtifact.path,
          finalArtifact.checksum,
        );
        await updateJob(serviceClient, job.id, {
          status: "complete",
          response_path: finalArtifact.path,
          error: null,
        });
        return finalArtifact.path;
      },
      cleanupTranscript: (transcriptId) => cleanupTranscript(serviceClient, transcriptId),
      failJob: (jobId, failedResponsePath, errorMessage) =>
        failJob(serviceClient, jobId, failedResponsePath, errorMessage),
    });

    return respondJson(200, { ok: true, status: outcome.status });
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

async function ingestTranscript(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
  segments: MergedSourceSegment[],
  normalized: ReturnType<typeof mergeSourceTranscriptSegments>["normalized"],
  deepgramRequestId: string | null,
  responsePath: string,
  rawChecksum: string,
): Promise<void> {
  const transcriptRow: TranscriptInsertRow = {
    transcript_id: job.transcript_id,
    case_id: job.case_id,
    job_id: job.id,
    media_url: getPrimaryMediaUrl(segments),
    duration: normalized.durationSeconds,
    based_on: getPrimarySourceAudioId(segments),
    deepgram_request_id: deepgramRequestId,
    session_id: null,
    source_filename: getPrimarySourceFilename(segments),
    media_kind: detectMediaKind(getPrimaryMimeType(segments)),
    status: "completed",
    engine: "deepgram-nova-3",
    transcription_source: "deepgram",
    sequence_index: 0,
    duration_seconds: normalized.durationSeconds,
    word_count: normalized.words.length,
    utterance_count: normalized.utterances.length,
    speaker_count: normalized.speakers.length,
    avg_confidence: normalized.avgConfidence != null ? normalized.avgConfidence.toFixed(4) : null,
    raw_storage_path: responsePath,
    raw_checksum: rawChecksum,
    last_error: null,
    speaker_map_confirmed: false,
    owner_user_id: job.owner_user_id,
  };

  const { error: transcriptError } = await supabase
    .from("transcripts")
    .insert(transcriptRow);
  if (transcriptError) {
    throw transcriptError;
  }

  const speakers = normalized.speakers.map((speaker) => ({
    transcript_id: job.transcript_id,
    speaker_id: speaker.speaker_id,
    display_name: speaker.speaker_label,
    deepgram_speaker: speaker.speaker_index,
    role: null,
    job_id: job.id,
    speaker_index: speaker.speaker_index,
    speaker_label: speaker.speaker_label,
    assigned_name: null,
    speaker_role: null,
    word_count: speaker.word_count,
    owner_user_id: job.owner_user_id,
  }));

  if (speakers.length > 0) {
    const { error } = await supabase.from("transcript_speakers").insert(speakers);
    if (error) {
      throw error;
    }
  }

  const utterances = normalized.utterances.map((utterance) => ({
    transcript_id: job.transcript_id,
    utterance_id: utterance.utterance_id,
    speaker_id: utterance.speaker_id,
    start_time: utterance.start_time,
    end_time: utterance.end_time,
    ordinal: utterance.utterance_index,
    job_id: job.id,
    utterance_index: utterance.utterance_index,
    speaker_index: utterance.speaker_index,
    speaker_label: utterance.speaker_label,
    text: utterance.text,
    avg_confidence: utterance.avg_confidence.toFixed(4),
    owner_user_id: job.owner_user_id,
  }));

  if (utterances.length > 0) {
    const { error } = await supabase.from("transcript_utterances").insert(utterances);
    if (error) {
      throw error;
    }
  }

  const words = normalized.words.map((word) => ({
    transcript_id: job.transcript_id,
    utterance_id: word.utterance_id,
    word_id: word.word_id,
    speaker_id: word.speaker_id,
    ordinal: word.word_index,
    text: word.raw_text,
    raw_text: word.raw_text,
    start_time: word.start_time,
    end_time: word.end_time,
    confidence: word.confidence,
    reviewed: word.reviewed,
    edited: word.edited,
    job_id: job.id,
    word_index: word.word_index,
    working_text: word.working_text,
    speaker_index: word.speaker_index,
    is_filler: word.is_filler,
    removed: false,
    owner_user_id: job.owner_user_id,
  }));

  for (let index = 0; index < words.length; index += WORD_CHUNK_SIZE) {
    const chunk = words.slice(index, index + WORD_CHUNK_SIZE);
    const { error } = await supabase.from("transcript_words").insert(chunk);
    if (error) {
      throw error;
    }
  }

  const auditRow = {
    transcript_id: job.transcript_id,
    change_id: `chg_ingest_${job.id}`,
    utterance_id: null,
    word_id: null,
    old_text: null,
    new_text: null,
    source: "system",
    suggestion_id: null,
    reviewer_user_id: null,
    case_id: job.case_id,
    job_id: job.id,
    actor: null,
    action: "ingest",
    before_text: null,
    after_text: null,
    owner_user_id: job.owner_user_id,
  };

  const { error: auditError } = await supabase
    .from("transcript_audit_log")
    .insert(auditRow);
  if (auditError) {
    throw auditError;
  }
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
): Promise<DeepgramRequestArtifact> {
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

  return artifact as DeepgramRequestArtifact;
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
  requestArtifact: DeepgramRequestArtifact,
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
) {
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
      };
    }),
  );
}

function buildMergeManifest(
  job: TranscriptionJobRecord,
  segments: MergedSourceSegment[],
  sourceSegments: Array<{ response: DeepgramResponse }>,
) {
  const totalSources = segments.length;

  return {
    job_id: job.id,
    transcript_id: job.transcript_id,
    case_id: job.case_id,
    sources: segments.map((segment, index) => ({
      ...segment,
      deepgram_request_id: sourceSegments[index]?.response.metadata.request_id ?? null,
      response_path: buildTranscriptionArtifactPath(
        job.owner_user_id,
        job.case_id,
        buildDeepgramResponseFileName(job.id, segment.source_index, totalSources),
      ),
    })),
  };
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

function detectMediaKind(mimeType: string): "audio" | "video" {
  return mimeType.startsWith("video/") ? "video" : "audio";
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
