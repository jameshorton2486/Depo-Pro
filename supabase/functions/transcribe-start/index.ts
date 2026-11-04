import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import { buildDeepgramRequestFromStoredKeyterms } from "../../../src/lib/deepgram/buildDeepgramRequest.ts";
import { fitStoredKeytermsToRequestBudget } from "../../../src/lib/deepgram/requestBudget.ts";
import {
  DEEPGRAM_KEYTERM_SOFT_TERM_CAP,
  DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP,
} from "../../../src/lib/keytermDerivation.ts";
import { assertCaseAudioIntegrity } from "../../../src/lib/keyterms/caseAudioIntegrity.ts";
import { buildAutoSeedKeytermPlan } from "../../../src/lib/keyterms/autoSeedKeyterms.ts";
import { normalizeCaseRecord } from "../../../src/lib/normalizeCaseRecord.ts";
import {
  shouldAutoChunk,
  buildAutoChunkManifest,
  type AutoChunkRequestMetadata,
  type SequentialTranscriptSource,
} from "../../../src/lib/transcript/autoChunking.ts";
import {
  buildDeepgramRequestFileName,
  buildRetranscriptionAuditFileName,
  buildTranscriptionArtifactPath,
  createCallbackToken,
  createTranscriptBusinessId,
  sha256Hex,
  TRANSCRIPTION_SIGNED_URL_TTL_SECONDS,
  type TranscriptionJobRecord,
  type TranscriptionJobAutoSeedAudit,
} from "../../../src/lib/transcriptionJobs.ts";
import { buildRetranscriptionAuditArtifact } from "../../../src/lib/retranscription.ts";

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

type SelectedKeytermMeta = {
  selected?: boolean;
};

type TranscriptRow = {
  transcript_id: string;
  case_id: string;
};

type DeepgramRequestArtifact = {
  method: "POST";
  url: string;
  headers: {
    Authorization: string;
    "Content-Type": string;
  };
  body: {
    url: string;
  };
  preview: ReturnType<typeof buildDeepgramRequestFromStoredKeyterms>["envelope"];
  callback_url: string;
  source_audio_id: string;
  source_index: number;
  total_sources: number;
  source_filename: string;
  storage_path: string | null;
  retranscription: ReturnType<typeof buildRetranscriptionAuditArtifact> | null;
  start_seconds?: number;
  end_seconds?: number;
  auto_chunk?: AutoChunkRequestMetadata;
};

const allowedOrigins = (Deno.env.get("TRANSCRIBE_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function buildCorsHeaders(request: Request): Record<string, string> {
  const requestOrigin = request.headers.get("Origin") ?? "";
  // If no allowlist is configured, fall back to permissive * for dev/mock only.
  // In production, set TRANSCRIBE_ALLOWED_ORIGINS to lock down origins.
  const allowOrigin = allowedOrigins.length === 0
    ? "*"
    : allowedOrigins.includes(requestOrigin) ? requestOrigin : "null";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const CASE_FILES_BUCKET = "case-files";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY") ?? "";

Deno.serve(async (request) => {
  const corsHeaders = buildCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return respondJson(200, { ok: true }, corsHeaders);
  }

  if (request.method !== "POST") {
    return respondError(405, "method not allowed", corsHeaders);
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return respondError(401, "unauthorized", corsHeaders);
  }

  if (!supabaseUrl || !supabaseAnonKey || !deepgramApiKey) {
    console.error("[transcribe-start] missing function env");
    return respondError(500, "server misconfigured", corsHeaders);
  }

  try {
    const body = await request.json() as {
      case_id?: unknown;
      source_transcript_id?: unknown;
    };
    const caseId = typeof body.case_id === "string" ? body.case_id.trim() : "";
    const sourceTranscriptId = typeof body.source_transcript_id === "string" && body.source_transcript_id.trim().length > 0
      ? body.source_transcript_id.trim()
      : null;
    if (!caseId) {
      return respondError(400, "bad payload", corsHeaders);
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
      return respondError(409, "active transcription job already exists for this case", corsHeaders);
    }

    // Retranscription replaces the case's transcript, but a certified transcript
    // is a locked official record. Block the overwrite at the source so a bypassed
    // UI can never discard a certified transcript (the finalize prune also skips
    // certified transcripts defensively).
    if (sourceTranscriptId && await isCaseCertificationLocked(supabase, caseId)) {
      return respondError(409, "case is certified; decertify before retranscribing", corsHeaders);
    }

    const caseRow = await requireCase(supabase, caseId);
    const audioRows = await requireOrderedAudio(supabase, caseId);
    const firstAudio = audioRows[0];
    if (!firstAudio?.storage_path) {
      return respondError(400, "case audio must be storage-backed before transcription", corsHeaders);
    }
    // Reject when duration is unknown — long files often lack duration metadata,
    // and silently falling back to single-file submission was masking auto-chunking
    // failures on 2h+ audio. Client must reprobe before starting.
    if (firstAudio.duration_seconds == null) {
      return respondError(
        400,
        "audio duration is unavailable — reprobe audio metadata before starting transcription",
        corsHeaders,
      );
    }

    const record = normalizeCaseRecord(caseRow.payload);
    assertCaseAudioIntegrity(record, firstAudio.original_filename);
    const sourceTranscript = sourceTranscriptId
      ? await requireTranscriptForCase(supabase, caseId, sourceTranscriptId)
      : null;
    const autoSeedPlan = buildAutoSeedKeytermPlan(record, record.deepgram.keyterms);
    const budgetedManualKeyterms = fitStoredKeytermsToRequestBudget(record.deepgram.keyterms);
    const budgetedAutoSeededKeyterms = fitAutoSeededKeytermsWithinRemainingBudget(
      budgetedManualKeyterms.keyterms,
      autoSeedPlan.autoSeededKeyterms,
    );
    const budgetedKeyterms = {
      keyterms: [...budgetedManualKeyterms.keyterms, ...budgetedAutoSeededKeyterms.keyterms],
      estimatedTokens: budgetedManualKeyterms.estimatedTokens
        + budgetedAutoSeededKeyterms.keyterms.reduce((sum, keyterm) => sum + estimateTermTokens(keyterm.term), 0),
      droppedCount: budgetedManualKeyterms.droppedCount + budgetedAutoSeededKeyterms.droppedForBudgetTerms.length,
    };
    const autoSeedAudit: TranscriptionJobAutoSeedAudit = {
      ...autoSeedPlan.audit,
      dropped_for_cap_terms: [
        ...autoSeedPlan.audit.dropped_for_cap_terms,
        ...budgetedAutoSeededKeyterms.droppedForBudgetTerms,
      ],
      final_auto_seeded_terms: budgetedAutoSeededKeyterms.keyterms.map((keyterm) => keyterm.term),
    };
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
      auto_seed_audit: autoSeedAudit,
    });

    const callbackUrl = buildCallbackUrl(createdJob.id, callbackToken);

    const requestPath = shouldAutoChunk(firstAudio.duration_seconds)
      ? await submitAutoChunkedJob({
          supabase,
          job: createdJob,
          ownerUserId,
          caseId,
          audio: firstAudio,
          callbackUrl,
          requestPreview,
          sourceTranscriptId: sourceTranscript?.transcript_id ?? null,
          durationSeconds: firstAudio.duration_seconds,
        })
      : await submitDeepgramJob({
          supabase,
          job: createdJob,
          ownerUserId,
          caseId,
          source: {
            source_audio_id: firstAudio.audio_id,
            source_index: firstAudio.source_index ?? 0,
            source_filename: firstAudio.original_filename,
            mime_type: firstAudio.mime_type,
            storage_path: firstAudio.storage_path,
            media_url: firstAudio.media_url,
            kind: "physical_audio",
          },
          totalSources: audioRows.length,
          callbackUrl,
          requestPreview,
          sourceTranscriptId: sourceTranscript?.transcript_id ?? null,
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
    }, corsHeaders);
  } catch (error) {
    console.error("[transcribe-start] unexpected error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return respondError(500, "unexpected server error", corsHeaders);
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

async function requireTranscriptForCase(
  supabase: SupabaseClient<Database>,
  caseId: string,
  transcriptId: string,
): Promise<TranscriptRow> {
  const { data, error } = await supabase
    .from("transcripts")
    .select("transcript_id, case_id")
    .eq("case_id", caseId)
    .eq("transcript_id", transcriptId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Transcript ${transcriptId} does not belong to case ${caseId}.`);
  }

  return data as TranscriptRow;
}

async function isCaseCertificationLocked(
  supabase: SupabaseClient<Database>,
  caseId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("case_certifications")
    .select("certification_date")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean((data as { certification_date?: string | null } | null)?.certification_date);
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
  insert: Pick<TranscriptionJobRecord, "case_id" | "transcript_id" | "owner_user_id" | "callback_token_hash" | "source_audio_id" | "source_index" | "auto_seed_audit">,
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
      auto_seed_audit: insert.auto_seed_audit,
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
  source: SequentialTranscriptSource;
  totalSources: number;
  callbackUrl: string;
  requestPreview: ReturnType<typeof buildDeepgramRequestFromStoredKeyterms>;
  sourceTranscriptId: string | null;
  autoChunk?: AutoChunkRequestMetadata;
}): Promise<string> {
  const {
    supabase,
    job,
    ownerUserId,
    caseId,
    source,
    totalSources,
    callbackUrl,
    requestPreview,
    sourceTranscriptId,
    autoChunk,
  } = params;

  if (!source.storage_path) {
    throw new Error("case audio must be storage-backed before transcription");
  }

  const signedAudioUrl = await signAudioUrl(supabase, source.storage_path);
  const wireUrl = new URL(requestPreview.wireUrl);
  wireUrl.searchParams.set("callback", callbackUrl);
  if (source.kind === "virtual_chunk") {
    wireUrl.searchParams.set("start", String(source.start_seconds ?? 0));
    wireUrl.searchParams.set("end", String(source.end_seconds ?? 0));
  }

  const requestArtifact: DeepgramRequestArtifact = {
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
    source_audio_id: source.source_audio_id,
    source_index: source.source_index,
    total_sources: totalSources,
    source_filename: source.source_filename,
    storage_path: source.storage_path,
    retranscription: sourceTranscriptId
      ? buildRetranscriptionAuditArtifact({
        caseId,
        sourceAudioId: source.source_audio_id,
        sourceTranscriptId,
        newTranscriptId: job.transcript_id,
      })
      : null,
  };
  if (source.kind === "virtual_chunk") {
    requestArtifact.start_seconds = source.start_seconds;
    requestArtifact.end_seconds = source.end_seconds;
  }
  // Attach auto_chunk metadata BEFORE the first upload so the artifact never
  // exists in a partial state. Prior implementation uploaded then re-uploaded,
  // creating a window where a failure would leave the callback misinterpreting
  // the job as a physical multi-file transcription.
  if (autoChunk) {
    requestArtifact.auto_chunk = autoChunk;
  }

  const requestPath = buildTranscriptionArtifactPath(
    ownerUserId,
    caseId,
    buildDeepgramRequestFileName(job.id, source.source_index, totalSources),
  );
  await uploadJsonArtifact(supabase, requestPath, requestArtifact);
  if (sourceTranscriptId) {
    const auditPath = buildTranscriptionArtifactPath(
      ownerUserId,
      caseId,
      buildRetranscriptionAuditFileName(job.id),
    );
    await uploadJsonArtifact(
      supabase,
      auditPath,
      buildRetranscriptionAuditArtifact({
        caseId,
        sourceAudioId: source.source_audio_id,
        sourceTranscriptId,
        newTranscriptId: job.transcript_id,
      }),
    );
  }
  await updateJob(supabase, job.id, {
    status: "queued",
    source_audio_id: source.source_audio_id,
    source_index: source.source_index,
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
      source_audio_id: source.source_audio_id,
      source_index: source.source_index,
      error: `Deepgram start failed: ${deepgramResponse.status} ${deepgramResponse.statusText}${errorText ? ` — ${errorText}` : ""}`,
    });
    throw new Error("failed to start deepgram job");
  }

  await updateJob(supabase, job.id, {
    status: "processing",
    source_audio_id: source.source_audio_id,
    source_index: source.source_index,
    request_path: requestPath,
    error: null,
  });

  return requestPath;
}

function readStoredSelectedMeta(notes: string): SelectedKeytermMeta {
  const prefix = "__depo_keyterm_meta__:";
  if (!notes.startsWith(prefix)) {
    return {};
  }

  try {
    return JSON.parse(notes.slice(prefix.length)) as SelectedKeytermMeta;
  } catch {
    return {};
  }
}

function estimateTermTokens(term: string): number {
  return term.trim().split(/\s+/).filter(Boolean).length + 1;
}

function fitAutoSeededKeytermsWithinRemainingBudget(
  manualKeyterms: ReturnType<typeof fitStoredKeytermsToRequestBudget>["keyterms"],
  autoKeyterms: ReturnType<typeof buildAutoSeedKeytermPlan>["autoSeededKeyterms"],
): {
  keyterms: typeof autoKeyterms;
  droppedForBudgetTerms: string[];
} {
  const selectedManualTerms = manualKeyterms.filter((keyterm) => readStoredSelectedMeta(keyterm.notes ?? "").selected !== false);
  const remainingTermSlots = Math.max(0, DEEPGRAM_KEYTERM_SOFT_TERM_CAP - selectedManualTerms.length);
  const remainingTokenBudget = Math.max(
    0,
    DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP - selectedManualTerms.reduce((sum, keyterm) => sum + estimateTermTokens(keyterm.term), 0),
  );

  const included: typeof autoKeyterms = [];
  const droppedForBudgetTerms: string[] = [];
  let usedTokens = 0;

  for (const keyterm of autoKeyterms) {
    const termTokens = estimateTermTokens(keyterm.term);
    if (included.length + 1 > remainingTermSlots || usedTokens + termTokens > remainingTokenBudget) {
      droppedForBudgetTerms.push(keyterm.term);
      continue;
    }

    included.push(keyterm);
    usedTokens += termTokens;
  }

  return {
    keyterms: included,
    droppedForBudgetTerms,
  };
}

async function submitAutoChunkedJob(params: {
  supabase: SupabaseClient<Database>;
  job: TranscriptionJobRecord;
  ownerUserId: string;
  caseId: string;
  audio: CaseAudioRow;
  callbackUrl: string;
  requestPreview: ReturnType<typeof buildDeepgramRequestFromStoredKeyterms>;
  sourceTranscriptId: string | null;
  durationSeconds: number;
}): Promise<string> {
  const {
    supabase,
    job,
    ownerUserId,
    caseId,
    audio,
    callbackUrl,
    requestPreview,
    sourceTranscriptId,
    durationSeconds,
  } = params;

  const manifest = buildAutoChunkManifest({
    audio_id: audio.audio_id,
    original_filename: audio.original_filename,
    mime_type: audio.mime_type,
    storage_path: audio.storage_path,
    media_url: audio.media_url,
  }, durationSeconds);
  const manifestPath = buildTranscriptionArtifactPath(
    ownerUserId,
    caseId,
    `${job.id}_auto_chunk_manifest.json`,
  );
  await uploadJsonArtifact(supabase, manifestPath, manifest);
  const firstChunk = manifest.chunks[0];
  if (!firstChunk) {
    throw new Error("Auto-chunk manifest produced no chunks.");
  }

  return submitDeepgramJob({
    supabase,
    job,
    ownerUserId,
    caseId,
    source: {
      source_audio_id: firstChunk.source_audio_id,
      source_index: firstChunk.source_index,
      source_filename: firstChunk.source_filename,
      mime_type: firstChunk.mime_type,
      storage_path: firstChunk.storage_path,
      media_url: firstChunk.media_url,
      kind: "virtual_chunk",
      chunk_index: firstChunk.chunk_index,
      start_seconds: firstChunk.start_seconds,
      end_seconds: firstChunk.end_seconds,
      nominal_offset_seconds: firstChunk.nominal_offset_seconds,
      overlap_with_next_seconds: firstChunk.overlap_with_next_seconds,
    },
    totalSources: manifest.chunk_count,
    callbackUrl,
    requestPreview,
    sourceTranscriptId,
    autoChunk: {
      enabled: true,
      manifest_path: manifestPath,
      chunk_count: manifest.chunk_count,
      current_chunk_index: firstChunk.chunk_index,
    },
  });
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

function respondJson(status: number, body: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function respondError(status: number, error: string, corsHeaders: Record<string, string>): Response {
  return respondJson(status, { error }, corsHeaders);
}
