// Shared transcript-finalization logic (DTAS Stage 1 -> persistence).
//
// Phase 2 of the DTAS Roadmap moves the heavy finalize out of the Deepgram
// webhook (`transcribe-callback`) into a dedicated Cloud Run worker.
// The webhook now only stores the last chunk, flips the job to `finalizing`, and
// hands off to that worker. This module is the single home for:
//   - loading the stored per-source Deepgram responses (recovery-safe: it reads
//     only persisted state, never the live webhook payload),
//   - the pure merge + canonical-integrity gate (`finalizeTranscript`),
//   - idempotent ingest of the canonical transcript, and
//   - the post-completion boundary + AI enrichment (off the critical path).
//
// Both the webhook and the worker import the low-level storage/db helpers here
// so there is exactly one implementation (DTAS Law 1: no competing pipelines).
//
// The orchestrator (`finalizeTranscriptJob`) is idempotent and resumable: it can
// be re-invoked for the same job (by the watchdog, or a manual recovery trigger)
// and will rebuild the transcript from stored responses without re-running
// Deepgram. A mid-ingest timeout leaves the job in `finalizing`; a re-invocation
// cleans any partial rows and re-ingests from scratch.

import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { PRIMARY_MODEL } from "./models.ts";

import { type CanonicalIntegrityResult } from "../../../src/lib/transcript/canonicalIntegrity.ts";
import { finalizeTranscript } from "../../../src/lib/transcript/finalizationPipeline.ts";
import { normalizeTranscriptResponse } from "../../../src/lib/transcript/normalize.ts";
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
  buildDeepgramResponseFileName,
  buildTranscriptionArtifactPath,
  sha256Hex,
  type TranscriptionJobRecord,
} from "../../../src/lib/transcriptionJobs.ts";

type GenericRow = Record<string, unknown>;
type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};
type Table<Row extends GenericRow, Insert extends GenericRow = Row, Update extends GenericRow = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: GenericRelationship[];
};
type GenericTable = Table<GenericRow>;

type CasesRow = GenericRow & { payload: unknown };
type TranscriptsRow = GenericRow;
type TranscriptSpeakersRow = GenericRow;
type TranscriptAuditRow = GenericRow;

type TranscriptFinalizeTables = Record<string, GenericTable> & {
  case_audio: Table<GenericRow & CaseAudioRow>;
  cases: Table<CasesRow>;
  transcription_jobs: Table<GenericRow & TranscriptionJobRecord, GenericRow, GenericRow & JobPatch>;
  transcripts: Table<TranscriptsRow, GenericRow & TranscriptInsertRow, GenericRow>;
  transcript_speakers: Table<TranscriptSpeakersRow>;
  transcript_utterances: Table<GenericRow & BoundaryTranscriptUtteranceRow>;
  transcript_words: Table<GenericRow & BoundaryTranscriptWordRow>;
  transcript_audit_log: Table<TranscriptAuditRow>;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: TranscriptFinalizeTables;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
export type CaseAudioRow = {
  audio_id: string;
  original_filename: string;
  mime_type: string;
  duration_seconds: number | null;
  source_index: number | null;
  storage_path: string | null;
  media_url: string | null;
  uploaded_at: string | null;
};

export type DeepgramRequestArtifact = {
  method?: "POST";
  url: string;
  headers?: Record<string, string>;
  body?: { url: string };
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

export type TranscriptInsertRow = {
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

export type FinalizeOutcome =
  | { status: "complete"; responsePath: string }
  | { status: "needs_manual_review"; responsePath: string }
  | { status: "failed"; responsePath: string | null; error: string };

export const CASE_FILES_BUCKET = "case-files";
const WORD_CHUNK_SIZE = 500;
const SYNTHETIC_BOUNDARY_SPEAKER_ID = "spk_synthetic_boundary";

// A poison finalize (e.g. corrupt stored response) must not loop forever. After
// this many attempts the worker marks the job `failed` instead of re-driving.
export const MAX_FINALIZE_ATTEMPTS = 5;

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

type JobPatch = Partial<
  Pick<
    TranscriptionJobRecord,
    | "status"
    | "source_audio_id"
    | "source_index"
    | "request_path"
    | "response_path"
    | "error"
    | "finalize_started_at"
    | "finalize_attempts"
  >
>;

/**
 * Idempotent, resumable finalize for a single transcription job.
 *
 * Rebuilds the canonical transcript purely from the job's persisted state
 * (stored Deepgram chunk responses), runs the integrity gate, ingests, and marks
 * the job `complete` — then runs boundary + AI enrichment as a separate,
 * best-effort step that can never flip a COMPLETE transcript back to failed.
 *
 * Safe to call more than once for the same job:
 *   - already `complete`  -> no-op, returns complete.
 *   - attempts exhausted  -> marks `failed` and returns.
 *   - otherwise           -> cleans any partial rows and re-ingests.
 */
export async function finalizeTranscriptJob(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
): Promise<FinalizeOutcome> {
  if (job.status === "complete") {
    return { status: "complete", responsePath: job.response_path ?? "" };
  }

  const attempts = (job.finalize_attempts ?? 0) + 1;
  if (attempts > MAX_FINALIZE_ATTEMPTS) {
    const error = `Finalization exceeded ${MAX_FINALIZE_ATTEMPTS} attempts; marking failed for manual recovery.`;
    await updateJob(supabase, job.id, { status: "failed", error });
    return { status: "failed", responsePath: job.response_path, error };
  }

  // Claim the attempt up front so a timeout still advances the counter (the
  // watchdog re-drive is bounded by MAX_FINALIZE_ATTEMPTS).
  await updateJob(supabase, job.id, {
    status: "finalizing",
    finalize_started_at: new Date().toISOString(),
    finalize_attempts: attempts,
  });

  // Re-derive ordered sources from the case + request artifact exactly as the
  // webhook did, so finalize depends only on persisted state.
  const orderedAudio = await loadOrderedAudio(supabase, job.case_id);
  const requestArtifact = await requireRequestArtifact(supabase, job.request_path);
  const orderedSources = requestArtifact.auto_chunk
    ? await loadOrderedChunkSources(supabase, requestArtifact.auto_chunk.manifest_path)
    : audioRowsToSequentialSources(orderedAudio);
  const totalSources = orderedSources.length;

  const sourceSegments = await loadSourceTranscriptSegments(supabase, job, orderedSources);
  const result = finalizeTranscript(sourceSegments);

  const deepgramRequestId = totalSources === 1
    ? sourceSegments[0]?.response.metadata.request_id ?? null
    : `${job.id}_multifile`;
  const finalArtifact = totalSources === 1
    ? await singleSourceFinalArtifact(supabase, job, orderedSources[0])
    : await multiSourceFinalArtifact(supabase, job, result.segments, sourceSegments);

  if (!result.integrityPassed) {
    await persistCanonicalManualReviewTranscript(
      supabase,
      job,
      result.segments,
      result.normalized,
      deepgramRequestId,
      finalArtifact.path,
      finalArtifact.checksum,
      result.integrity,
    );
    await updateJob(supabase, job.id, {
      status: "failed",
      response_path: finalArtifact.path,
      error: buildCanonicalIntegrityFailureMessage(result.integrity),
    });
    return { status: "needs_manual_review", responsePath: finalArtifact.path };
  }

  // Idempotency: drop any partial rows from a prior interrupted attempt before
  // re-inserting, so a resumed finalize is a clean rebuild.
  await cleanupTranscript(supabase, job.transcript_id);
  await ingestTranscript(
    supabase,
    job,
    result.segments,
    result.normalized,
    deepgramRequestId,
    finalArtifact.path,
    finalArtifact.checksum,
  );
  await updateJob(supabase, job.id, {
    status: "complete",
    response_path: finalArtifact.path,
    error: null,
  });

  // Best-effort enrichment: the transcript is already COMPLETE and must not be
  // flipped to `failed` if boundary detection or AI review throws.
  try {
    await runBoundaryEngine(supabase, job);
    triggerAiReview(job.transcript_id);
  } catch (enrichmentError) {
    console.error("[transcript-finalize] post-completion enrichment failed", {
      jobId: job.id,
      message: enrichmentError instanceof Error ? enrichmentError.message : String(enrichmentError),
    });
  }

  return { status: "complete", responsePath: finalArtifact.path };
}

async function singleSourceFinalArtifact(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
  source: SequentialTranscriptSource,
): Promise<{ path: string; checksum: string }> {
  const path = buildTranscriptionArtifactPath(
    job.owner_user_id,
    job.case_id,
    buildDeepgramResponseFileName(job.id, source.source_index ?? 0, 1),
  );
  return { path, checksum: await hashStoredArtifact(supabase, path) };
}

async function multiSourceFinalArtifact(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
  segments: MergedSourceSegment[],
  sourceSegments: Array<{ response: DeepgramResponse }>,
): Promise<{ path: string; checksum: string }> {
  const path = buildTranscriptionArtifactPath(
    job.owner_user_id,
    job.case_id,
    `${job.id}_multifile_manifest.json`,
  );
  // upsert: a resumed finalize may have already written the manifest.
  const checksum = await uploadJsonArtifact(
    supabase,
    path,
    buildMergeManifest(job, segments, sourceSegments),
    { upsert: true },
  );
  return { path, checksum };
}

async function hashStoredArtifact(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<string> {
  const { data, error } = await supabase.storage.from(CASE_FILES_BUCKET).download(storagePath);
  if (error) {
    throw error;
  }
  return sha256Hex(await data.text());
}

export function parseDeepgramResponse(
  value: unknown,
): { ok: true; response: DeepgramResponse } | { ok: false; error: string } {
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

  const { error: transcriptError } = await supabase.from("transcripts").insert(transcriptRow);
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

  const { error: auditError } = await supabase.from("transcript_audit_log").insert(auditRow);
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
    async completeJson<T>(input: Parameters<BoundaryAiClient["completeJson"]>[0]): Promise<T> {
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
    console.warn("[transcript-finalize] boundary engine skipped: missing ANTHROPIC_API_KEY", {
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
    console.error("[transcript-finalize] boundary engine failed", {
      transcriptId: job.transcript_id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function requireJob(
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

export async function loadOrderedAudio(
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

export async function uploadJsonArtifact(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  payload: unknown,
  options: { upsert?: boolean } = {},
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
        upsert: options.upsert ?? false,
        contentType: "application/json",
      },
    );

  if (error) {
    throw error;
  }

  return checksum;
}

export async function updateJob(
  supabase: SupabaseClient<Database>,
  jobId: string,
  patch: JobPatch,
): Promise<void> {
  const { error } = await supabase
    .from("transcription_jobs")
    .update(patch)
    .eq("id", jobId);

  if (error) {
    throw error;
  }
}

export async function failJob(
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

async function persistCanonicalManualReviewTranscript(
  supabase: SupabaseClient<Database>,
  job: TranscriptionJobRecord,
  segments: MergedSourceSegment[],
  normalized: ReturnType<typeof mergeSourceTranscriptSegments>["normalized"],
  deepgramRequestId: string | null,
  responsePath: string,
  rawChecksum: string,
  auditResult: CanonicalIntegrityResult,
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
    status: "needs_manual_review",
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
    last_error: buildCanonicalIntegrityFailureMessage(auditResult),
    speaker_map_confirmed: false,
    owner_user_id: job.owner_user_id,
  };

  const { error } = await supabase.from("transcripts").upsert(transcriptRow, { onConflict: "transcript_id" });
  if (error) {
    throw error;
  }
}

function buildCanonicalIntegrityFailureMessage(auditResult: CanonicalIntegrityResult): string {
  return `NEEDS_MANUAL_REVIEW: ${auditResult.failures[0] ?? "Canonical integrity audit failed."}`;
}

export async function requireRequestArtifact(
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

export async function downloadJsonArtifact(
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

export async function loadOrderedChunkSources(
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

export async function cleanupTranscript(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<void> {
  await supabase.from("transcript_words").delete().eq("transcript_id", transcriptId);
  await supabase.from("transcript_utterances").delete().eq("transcript_id", transcriptId);
  await supabase.from("transcript_speakers").delete().eq("transcript_id", transcriptId);
  await supabase.from("transcript_audit_log").delete().eq("transcript_id", transcriptId);
  await supabase.from("transcripts").delete().eq("transcript_id", transcriptId);
}

export function detectMediaKind(mimeType: string): "audio" | "video" {
  return mimeType.startsWith("video/") ? "video" : "audio";
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
    console.error("[transcript-finalize] ai-review trigger failed", {
      transcriptId,
      message: error instanceof Error ? error.message : String(error),
    });
  });
}
