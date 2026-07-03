import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { PRIMARY_MODEL } from "../_shared/models.ts";

import { integrityAudit, type IntegrityAuditResult } from "../../../src/lib/transcript/integrityAudit.ts";
import { normalizeTranscriptResponse } from "../../../src/lib/transcript/normalize.ts";
import { advanceOrFinalizeMultifileJob } from "../../../src/lib/transcript/multifileCallbackFlow.ts";
import {
  audioRowsToSequentialSources,
  manifestToSequentialSources,
  type AutoChunkRequestMetadata,
  type SequentialTranscriptSource,
  type VirtualChunkManifest,
} from "../../../src/lib/transcript/autoChunking.ts";
import {
  applyOffRecordSections,
  applyPostRecordCutoff,
  applyPreRecordCutoff,
  detectFormalOpening,
  detectOffRecordSections,
  detectPostRecordContent,
  generateSyntheticParentheticals,
  type BoundaryAiClient,
  type BoundaryJobConfig,
  type BoundaryUtteranceView,
  type OffRecordSection,
} from "../../../src/lib/transcript/boundaryEngine.ts";
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
  source_audio_id?: string;
  source_index?: number;
  source_filename?: string;
  storage_path?: string | null;
  start_seconds?: number;
  end_seconds?: number;
  auto_chunk?: AutoChunkRequestMetadata;
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
  status: "completed" | "needs_manual_review";
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
const SYNTHETIC_BOUNDARY_SPEAKER_ID = "spk_synthetic_boundary";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY") ?? "";
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

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
      finalize: async () => {
        const sourceSegments = await loadSourceTranscriptSegments(serviceClient, job, orderedSources);
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
        await runBoundaryEngine(serviceClient, job);
        triggerAiReview(job.transcript_id);
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

type BoundaryTranscriptUtteranceRow = {
  transcript_id: string;
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  ordinal: number;
  job_id: string | null;
  utterance_index: number | null;
  speaker_index: number | null;
  speaker_label: string | null;
  text: string | null;
  avg_confidence: string | null;
  excluded_from_output?: boolean | null;
  exclusion_reason?: "PRE_RECORD" | "OFF_RECORD" | "POST_RECORD" | null;
  is_synthetic?: boolean | null;
  owner_user_id: string | null;
};

type BoundaryTranscriptWordRow = {
  word_index: number | null;
};

function createBoundaryAiClient(apiKey: string): BoundaryAiClient {
  return {
    async completeJson<T>(input): Promise<T> {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: PRIMARY_MODEL,
          max_tokens: input.maxTokens,
          temperature: 0,
          system: input.system,
          messages: [{ role: "user", content: input.user }],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Boundary engine request failed: ${response.status} ${text}`);
      }

      const payload = await response.json() as {
        content?: Array<{ type?: string; text?: string }>;
      };
      const text = payload.content?.find((item) => item.type === "text")?.text;
      if (!text) {
        throw new Error("Boundary engine returned no text payload.");
      }

      return JSON.parse(text) as T;
    },
  };
}

function buildBoundarySyntheticInsert(
  section: OffRecordSection,
  template: BoundaryUtteranceView,
  position: number,
  job: TranscriptionJobRecord,
  rows: BoundaryTranscriptUtteranceRow[],
  nextWordIndex: number,
): {
  utterance: BoundaryTranscriptUtteranceRow;
  word: {
    transcript_id: string;
    utterance_id: string;
    word_id: string;
    speaker_id: string;
    ordinal: number;
    text: string;
    raw_text: string;
    start_time: number;
    end_time: number;
    confidence: number;
    reviewed: boolean;
    edited: boolean;
    job_id: string;
    word_index: number;
    working_text: string | null;
    speaker_index: number | null;
    is_filler: boolean | null;
    removed: boolean;
    owner_user_id: string;
  };
} {
  const offAnchor = rows[Math.min(Math.max(section.off_utterance_index, 0), Math.max(rows.length - 1, 0))];
  const onAnchor = rows[Math.min(Math.max(section.on_utterance_index, 0), Math.max(rows.length - 1, 0))];
  const anchor = template.utterance_id.endsWith("_on")
    ? onAnchor ?? offAnchor
    : offAnchor ?? onAnchor;
  const timestamp = anchor?.start_time ?? 0;
  const utteranceId = `${job.transcript_id}_${template.utterance_id}`;
  const wordId = `${utteranceId}_w1`;

  return {
    utterance: {
      transcript_id: job.transcript_id,
      utterance_id: utteranceId,
      speaker_id: SYNTHETIC_BOUNDARY_SPEAKER_ID,
      start_time: timestamp,
      end_time: timestamp,
      ordinal: position,
      job_id: job.id,
      utterance_index: position,
      speaker_index: null,
      speaker_label: "",
      text: template.text,
      avg_confidence: null,
      excluded_from_output: false,
      exclusion_reason: null,
      is_synthetic: true,
      owner_user_id: job.owner_user_id,
    },
    word: {
      transcript_id: job.transcript_id,
      utterance_id: utteranceId,
      word_id: wordId,
      speaker_id: SYNTHETIC_BOUNDARY_SPEAKER_ID,
      ordinal: nextWordIndex,
      text: template.text,
      raw_text: template.text,
      start_time: timestamp,
      end_time: timestamp,
      confidence: 1,
      reviewed: true,
      edited: false,
      job_id: job.id,
      word_index: nextWordIndex,
      working_text: null,
      speaker_index: null,
      is_filler: false,
      removed: false,
      owner_user_id: job.owner_user_id,
    },
  };
}

async function runBoundaryEngine(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
): Promise<void> {
  if (!anthropicApiKey) {
    console.warn("[transcribe-callback] boundary engine skipped: missing ANTHROPIC_API_KEY", {
      transcriptId: job.transcript_id,
    });
    return;
  }

  const [utterancesResult, caseResult, wordIndexResult] = await Promise.all([
    supabase
      .from("transcript_utterances")
      .select("transcript_id, utterance_id, speaker_id, start_time, end_time, ordinal, job_id, utterance_index, speaker_index, speaker_label, text, avg_confidence, excluded_from_output, exclusion_reason, is_synthetic, owner_user_id")
      .eq("transcript_id", job.transcript_id)
      .order("utterance_index", { ascending: true }),
    supabase
      .from("cases")
      .select("payload")
      .eq("case_id", job.case_id)
      .maybeSingle(),
    supabase
      .from("transcript_words")
      .select("word_index")
      .eq("transcript_id", job.transcript_id)
      .order("word_index", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (utterancesResult.error) {
    throw utterancesResult.error;
  }
  if (caseResult.error) {
    throw caseResult.error;
  }
  if (wordIndexResult.error) {
    throw wordIndexResult.error;
  }

  const rows = ((utterancesResult.data ?? []) as BoundaryTranscriptUtteranceRow[])
    .filter((row) => row.is_synthetic !== true);
  if (rows.length === 0) {
    return;
  }

  const casePayload = (caseResult.data?.payload ?? null) as Record<string, unknown> | null;
  const scheduling = casePayload && typeof casePayload === "object" && "scheduling" in casePayload
    ? casePayload.scheduling as Record<string, unknown> | null
    : null;
  const jobConfig: BoundaryJobConfig = {
    proceedingType: typeof scheduling?.proceeding_type === "string" ? scheduling.proceeding_type : null,
  };
  const client = createBoundaryAiClient(anthropicApiKey);
  const boundaryUtterances: BoundaryUtteranceView[] = rows.map((row) => ({
    utterance_id: row.utterance_id,
    speaker_id: row.speaker_id,
    start_time: row.start_time,
    end_time: row.end_time,
    text: row.text ?? "",
    excluded_from_output: row.excluded_from_output ?? false,
    exclusion_reason: row.exclusion_reason ?? null,
  }));

  try {
    const formalOpening = await detectFormalOpening(boundaryUtterances, jobConfig, client);
    const preRecordApplied = applyPreRecordCutoff(boundaryUtterances, formalOpening);
    const offRecord = await detectOffRecordSections(preRecordApplied, {}, jobConfig, client);
    const offRecordApplied = applyOffRecordSections(preRecordApplied, offRecord);
    const postRecord = await detectPostRecordContent(offRecordApplied, jobConfig, client);
    const finalUtterances = applyPostRecordCutoff(offRecordApplied, postRecord);
    const finalById = new Map(finalUtterances.map((utterance) => [utterance.utterance_id, utterance]));

    const syntheticBeforeIndex = new Map<number, BoundaryUtteranceView[]>();
    const pushSynthetic = (index: number, utterance: BoundaryUtteranceView) => {
      const bucket = syntheticBeforeIndex.get(index) ?? [];
      bucket.push(utterance);
      syntheticBeforeIndex.set(index, bucket);
    };

    for (const section of offRecord.off_record_sections) {
      const generated = generateSyntheticParentheticals([section]);
      if (generated.length === 1) {
        const insertionIndex = generated[0]?.utterance_id.endsWith("_conclusion")
          ? section.on_utterance_index
          : section.off_utterance_index;
        pushSynthetic(insertionIndex, generated[0]);
        continue;
      }
      if (generated[0]) {
        pushSynthetic(section.off_utterance_index, generated[0]);
      }
      if (generated[1]) {
        pushSynthetic(section.on_utterance_index, generated[1]);
      }
    }

    const existingUtterances: BoundaryTranscriptUtteranceRow[] = [];
    const syntheticUtterances: BoundaryTranscriptUtteranceRow[] = [];
    const syntheticWords: Array<ReturnType<typeof buildBoundarySyntheticInsert>["word"]> = [];
    let nextWordIndex = (wordIndexResult.data as BoundaryTranscriptWordRow | null)?.word_index ?? rows.length;
    let position = 0;

    for (let index = 0; index <= rows.length; index += 1) {
      const pendingSynthetic = syntheticBeforeIndex.get(index) ?? [];
      for (const synthetic of pendingSynthetic) {
        const sourceSection = offRecord.off_record_sections.find((section) => {
          if (synthetic.utterance_id.endsWith("_off")) {
            return section.off_utterance_index === index;
          }
          if (synthetic.utterance_id.endsWith("_on") || synthetic.utterance_id.endsWith("_conclusion")) {
            return section.on_utterance_index === index;
          }
          return section.off_utterance_index === index;
        });
        if (!sourceSection) {
          continue;
        }
        nextWordIndex += 1;
        const insert = buildBoundarySyntheticInsert(sourceSection, synthetic, position, job, rows, nextWordIndex);
        syntheticUtterances.push(insert.utterance);
        syntheticWords.push(insert.word);
        position += 1;
      }

      const row = rows[index];
      if (!row) {
        continue;
      }
      const updatedBoundary = finalById.get(row.utterance_id);
      existingUtterances.push({
        ...row,
        ordinal: position,
        utterance_index: position,
        excluded_from_output: updatedBoundary?.excluded_from_output ?? false,
        exclusion_reason: updatedBoundary?.exclusion_reason ?? null,
        is_synthetic: false,
      });
      position += 1;
    }

    const { error: deleteSyntheticWordsError } = await supabase
      .from("transcript_words")
      .delete()
      .eq("transcript_id", job.transcript_id)
      .eq("speaker_id", SYNTHETIC_BOUNDARY_SPEAKER_ID);
    if (deleteSyntheticWordsError) {
      throw deleteSyntheticWordsError;
    }

    const { error: deleteSyntheticUtterancesError } = await supabase
      .from("transcript_utterances")
      .delete()
      .eq("transcript_id", job.transcript_id)
      .eq("speaker_id", SYNTHETIC_BOUNDARY_SPEAKER_ID);
    if (deleteSyntheticUtterancesError) {
      throw deleteSyntheticUtterancesError;
    }

    const { error: upsertUtterancesError } = await supabase
      .from("transcript_utterances")
      .upsert(existingUtterances, { onConflict: "transcript_id,utterance_id" });
    if (upsertUtterancesError) {
      throw upsertUtterancesError;
    }

    if (syntheticUtterances.length > 0) {
      const { error: insertSyntheticUtterancesError } = await supabase
        .from("transcript_utterances")
        .insert(syntheticUtterances);
      if (insertSyntheticUtterancesError) {
        throw insertSyntheticUtterancesError;
      }

      const { error: insertSyntheticWordsError } = await supabase
        .from("transcript_words")
        .insert(syntheticWords);
      if (insertSyntheticWordsError) {
        throw insertSyntheticWordsError;
      }
    }
  } catch (error) {
    console.error("[transcribe-callback] boundary engine failed", {
      transcriptId: job.transcript_id,
      message: error instanceof Error ? error.message : String(error),
    });
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

async function loadOrderedChunkSources(
  supabase: SupabaseClient<Database>,
  manifestPath: string,
): Promise<SequentialTranscriptSource[]> {
  const manifestPayload = await downloadJsonArtifact(supabase, manifestPath);
  if (
    typeof manifestPayload !== "object"
    || manifestPayload === null
    || (manifestPayload as Partial<VirtualChunkManifest>).kind !== "auto_chunk_v1"
    || !Array.isArray((manifestPayload as Partial<VirtualChunkManifest>).chunks)
  ) {
    throw new Error("Auto-chunk manifest is invalid.");
  }

  return manifestToSequentialSources(manifestPayload as VirtualChunkManifest);
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

async function loadSourceTranscriptSegments(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
  orderedSources: SequentialTranscriptSource[],
) {
  const totalSources = orderedSources.length;

  return Promise.all(
    orderedSources.map(async (source, fallbackIndex) => {
      const sourceIndex = source.source_index ?? fallbackIndex;
      const responsePath = buildTranscriptionArtifactPath(
        job.owner_user_id,
        job.case_id,
        buildDeepgramResponseFileName(job.id, sourceIndex, totalSources),
      );
      const payload = await downloadJsonArtifact(supabase, responsePath);
      const parsed = parseDeepgramResponse(payload);
      if (!parsed.ok) {
        throw new Error(`Stored Deepgram response for ${source.source_filename} was invalid: ${parsed.error}`);
      }

      return {
        source_audio_id: source.source_audio_id,
        source_index: sourceIndex,
        source_filename: source.source_filename,
        mime_type: source.mime_type,
        storage_path: source.storage_path,
        media_url: source.media_url,
        response: parsed.response,
        normalized: normalizeTranscriptResponse(parsed.response),
        fallback_duration_seconds: source.kind === "virtual_chunk"
          ? (source.end_seconds ?? 0) - (source.start_seconds ?? 0)
          : null,
        virtual_chunk: source.kind === "virtual_chunk"
          ? {
              chunk_index: source.chunk_index ?? sourceIndex,
              start_seconds: source.start_seconds ?? 0,
              end_seconds: source.end_seconds ?? 0,
              nominal_offset_seconds: source.nominal_offset_seconds ?? 0,
              overlap_with_next_seconds: source.overlap_with_next_seconds ?? 0,
            }
          : undefined,
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

function triggerAiReview(transcriptId: string): void {
  const url = `${supabaseUrl}/functions/v1/ai-review`;
  const headers = {
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };

  void fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ transcript_id: transcriptId }),
  }).catch((error) => {
    console.error("[transcribe-callback] ai-review trigger failed", {
      transcriptId,
      message: error instanceof Error ? error.message : String(error),
    });
  });
}
