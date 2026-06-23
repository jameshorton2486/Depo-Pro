import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { buildDeepgramRequestFromStoredKeyterms } from "../../../src/lib/deepgram/buildDeepgramRequest.ts";
import { fitStoredKeytermsToRequestBudget } from "../../../src/lib/deepgram/requestBudget.ts";
import { assertCaseAudioIntegrity } from "../../../src/lib/keyterms/caseAudioIntegrity.ts";
import { normalizeCaseRecord } from "../../../src/lib/normalizeCaseRecord.ts";
import {
  buildDeepgramRequestFileName,
  buildTranscriptionArtifactPath,
  createCallbackToken,
  createTranscriptBusinessId,
  sha256Hex,
  TRANSCRIPTION_SIGNED_URL_TTL_SECONDS,
  type TranscriptionJobRecord,
} from "../../../src/lib/transcriptionJobs.ts";

type Database = Record<string, never>;

type CaseRow = {
  case_id: string;
  payload: unknown;
};

type CaseAudioRow = {
  case_id: string;
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
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY") ?? "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respondJson(200, { ok: true });
  }

  if (request.method !== "POST") {
    return respondError(405, "method not allowed");
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return respondError(401, "unauthorized");
  }

  if (!supabaseUrl || !supabaseAnonKey || !deepgramApiKey) {
    console.error("[transcribe-start] missing function env");
    return respondError(500, "server misconfigured");
  }

  try {
    const body = await request.json() as { case_id?: unknown };
    const caseId = typeof body.case_id === "string" ? body.case_id.trim() : "";
    if (!caseId) {
      return respondError(400, "bad payload");
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const ownerUserId = await requireUserId(supabase);
    const activeJob = await findActiveJob(supabase, caseId);
    if (activeJob) {
      return respondError(409, "active transcription job already exists for this case");
    }

    const caseRow = await requireCase(supabase, caseId);
    const audioRows = await requireOrderedAudio(supabase, caseId);
    const firstAudio = audioRows[0];
    if (!firstAudio?.storage_path) {
      return respondError(400, "case audio must be storage-backed before transcription");
    }

    const record = normalizeCaseRecord(caseRow.payload);
    assertCaseAudioIntegrity(record, firstAudio.original_filename);
    const budgetedKeyterms = fitStoredKeytermsToRequestBudget(record.deepgram.keyterms);
    if (budgetedKeyterms.droppedCount > 0) {
      console.warn("[transcribe-start] trimmed keyterms to request budget", {
        caseId,
        droppedCount: budgetedKeyterms.droppedCount,
        estimatedTokens: budgetedKeyterms.estimatedTokens,
      });
    }

    const requestPreview = buildDeepgramRequestFromStoredKeyterms({
      caseId,
      keyterms: budgetedKeyterms.keyterms,
    });
    const callbackToken = createCallbackToken();
    const callbackTokenHash = await sha256Hex(callbackToken);
    const transcriptId = createTranscriptBusinessId();

    const createdJob = await createQueuedJob(supabase, {
      case_id: caseId,
      transcript_id: transcriptId,
      owner_user_id: ownerUserId,
      callback_token_hash: callbackTokenHash,
      source_audio_id: firstAudio.audio_id,
      source_index: firstAudio.source_index ?? 0,
    });

    const callbackUrl = buildCallbackUrl(createdJob.id, callbackToken);
    const requestPath = await submitDeepgramJob({
      supabase,
      job: createdJob,
      ownerUserId,
      caseId,
      audio: firstAudio,
      totalSources: audioRows.length,
      callbackUrl,
      requestPreview,
    });

    return respondJson(200, {
      job: {
        id: createdJob.id,
        case_id: caseId,
        transcript_id: transcriptId,
        status: "processing",
        source_audio_id: firstAudio.audio_id,
        source_index: firstAudio.source_index ?? 0,
        request_path: requestPath,
        response_path: null,
        error: null,
      },
    });
  } catch (error) {
    console.error("[transcribe-start] unexpected error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return respondError(500, "unexpected server error");
  }
});

async function requireUserId(supabase: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  const userId = data.user?.id ?? null;
  if (!userId) {
    throw new Error("Authentication is required.");
  }
  return userId;
}

async function requireCase(supabase: SupabaseClient<Database>, caseId: string): Promise<CaseRow> {
  const { data, error } = await supabase
    .from("cases")
    .select("case_id, payload")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Case ${caseId} was not found.`);
  }

  return data as CaseRow;
}

async function requireOrderedAudio(supabase: SupabaseClient<Database>, caseId: string): Promise<CaseAudioRow[]> {
  const { data, error } = await supabase
    .from("case_audio")
    .select("case_id, audio_id, original_filename, mime_type, duration_seconds, source_index, storage_path, media_url, uploaded_at")
    .eq("case_id", caseId)
    .order("source_index", { ascending: true })
    .order("uploaded_at", { ascending: true });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No audio is attached to this case.");
  }

  return (data as CaseAudioRow[]).map((row, index) => ({
    ...row,
    source_index: typeof row.source_index === "number" ? row.source_index : index,
  }));
}

async function findActiveJob(
  supabase: SupabaseClient<Database>,
  caseId: string,
): Promise<TranscriptionJobRecord | null> {
  const { data, error } = await supabase
    .from("transcription_jobs")
    .select("*")
    .eq("case_id", caseId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as TranscriptionJobRecord | null) ?? null;
}

async function createQueuedJob(
  supabase: SupabaseClient<Database>,
  insert: Pick<TranscriptionJobRecord, "case_id" | "transcript_id" | "owner_user_id" | "callback_token_hash" | "source_audio_id" | "source_index">,
): Promise<TranscriptionJobRecord> {
  const { data, error } = await supabase
    .from("transcription_jobs")
    .insert({
      case_id: insert.case_id,
      transcript_id: insert.transcript_id,
      owner_user_id: insert.owner_user_id,
      callback_token_hash: insert.callback_token_hash,
      source_audio_id: insert.source_audio_id,
      source_index: insert.source_index,
      status: "queued",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("An active transcription job already exists for this case.");
    }
    throw error;
  }

  return data as TranscriptionJobRecord;
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

async function submitDeepgramJob(params: {
  supabase: SupabaseClient<Database>;
  job: TranscriptionJobRecord;
  ownerUserId: string;
  caseId: string;
  audio: CaseAudioRow;
  totalSources: number;
  callbackUrl: string;
  requestPreview: ReturnType<typeof buildDeepgramRequestFromStoredKeyterms>;
}): Promise<string> {
  const {
    supabase,
    job,
    ownerUserId,
    caseId,
    audio,
    totalSources,
    callbackUrl,
    requestPreview,
  } = params;

  if (!audio.storage_path) {
    throw new Error("case audio must be storage-backed before transcription");
  }

  const signedAudioUrl = await signAudioUrl(supabase, audio.storage_path);
  const wireUrl = new URL(requestPreview.wireUrl);
  wireUrl.searchParams.set("callback", callbackUrl);

  const requestArtifact = {
    method: "POST",
    url: wireUrl.toString(),
    headers: {
      Authorization: "[redacted]",
      "Content-Type": "application/json",
    },
    body: {
      url: signedAudioUrl,
    },
    preview: requestPreview.envelope,
    callback_url: callbackUrl,
    source_audio_id: audio.audio_id,
    source_index: audio.source_index ?? 0,
    total_sources: totalSources,
    source_filename: audio.original_filename,
    storage_path: audio.storage_path,
  };

  const requestPath = buildTranscriptionArtifactPath(
    ownerUserId,
    caseId,
    buildDeepgramRequestFileName(job.id, audio.source_index ?? 0, totalSources),
  );
  await uploadJsonArtifact(supabase, requestPath, requestArtifact);
  await updateJob(supabase, job.id, {
    status: "queued",
    source_audio_id: audio.audio_id,
    source_index: audio.source_index ?? 0,
    request_path: requestPath,
    error: null,
  });

  const deepgramResponse = await fetch(wireUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${deepgramApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: signedAudioUrl }),
  });

  if (!deepgramResponse.ok) {
    const errorText = await deepgramResponse.text();
    await updateJob(supabase, job.id, {
      status: "failed",
      source_audio_id: audio.audio_id,
      source_index: audio.source_index ?? 0,
      error: `Deepgram start failed: ${deepgramResponse.status} ${deepgramResponse.statusText}${errorText ? ` — ${errorText}` : ""}`,
    });
    throw new Error("failed to start deepgram job");
  }

  await updateJob(supabase, job.id, {
    status: "processing",
    source_audio_id: audio.audio_id,
    source_index: audio.source_index ?? 0,
    request_path: requestPath,
    error: null,
  });

  return requestPath;
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

function buildCallbackUrl(jobId: string, token: string): string {
  return `${supabaseUrl}/functions/v1/transcribe-callback?job=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`;
}

async function uploadJsonArtifact(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  payload: unknown,
): Promise<void> {
  const { error } = await supabase.storage
    .from(CASE_FILES_BUCKET)
    .upload(
      storagePath,
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      {
        upsert: false,
        contentType: "application/json",
      },
    );

  if (error) {
    throw error;
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
