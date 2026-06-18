import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import type {
  ReviewPayload,
  AiSuggestion,
  CertifyChecklist,
  EditorDocument,
  Exhibit,
  SaveWorkingPayload,
  SaveWorkingResponse,
  SpeakersPayload,
  Speaker,
  Utterance,
  Word,
} from "../../../src/api/types.ts";
import {
  buildParticipantId,
  buildResolvedSpeakerViews,
  isResolvedSpeakerMappingComplete,
  type ResolvedSpeakerView,
} from "../../../src/lib/transcript/resolvedSpeakers.ts";
import { normalizeTranscriptResponse } from "../../../src/lib/transcript/normalize.ts";
import type { DeepgramResponse } from "../../../src/lib/transcript/types.ts";
import {
  buildNormalizedTranscriptMetrics,
  buildReassemblyPreviewToken,
  buildStoredTranscriptMetrics,
  CURRENT_ASSEMBLY_VERSION,
  evaluateReassemblyEligibility,
  type HumanWorkSignal,
  type HumanWorkSummary,
  LATEST_ASSEMBLY_VERSION,
  type TranscriptReassemblyApplyResult,
  type TranscriptReassemblyPreview,
  type TranscriptReassemblyRestoreResult,
  type TranscriptReassemblyUndoSnapshot,
} from "../../../src/lib/transcript/reassembly.ts";

type Database = Record<string, never>;

type TranscriptRow = {
  transcript_id: string;
  case_id: string;
  job_id: string;
  media_url: string | null;
  duration: number | null;
  duration_seconds?: number | null;
  avg_confidence?: string | null;
  based_on?: string | null;
  speaker_map_confirmed?: boolean | null;
  raw_storage_path?: string | null;
  raw_checksum?: string | null;
  updated_at?: string | null;
};

type TranscriptSpeakerRow = {
  speaker_id: string;
  display_name: string;
  deepgram_speaker: number;
  role: string | null;
  job_id?: string | null;
  speaker_index?: number | null;
  speaker_label?: string | null;
  assigned_name?: string | null;
  speaker_role?: string | null;
  word_count?: number | null;
  transcript_id?: string;
};

type SpeakerResolutionCurrentRow = {
  id: string;
  transcript_id: string;
  raw_speaker_id: string;
  raw_speaker_index: number;
  participant_id: string;
  resolved_role: string | null;
  resolved_label: string | null;
  resolved_by: string;
  resolved_at: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

type SpeakerResolutionCurrentInsert = {
  transcript_id: string;
  raw_speaker_id: string;
  raw_speaker_index: number;
  participant_id: string;
  resolved_role: string | null;
  resolved_label: string | null;
  resolved_by: string;
  resolved_at: string;
  owner_user_id: string;
};

type SpeakerResolutionHistoryRow = {
  resolution_id: string;
  transcript_id: string;
  raw_speaker_id: string;
  raw_speaker_index: number;
  participant_id: string;
  resolved_role: string | null;
  resolved_label: string | null;
  resolved_by: string;
  resolved_at: string;
  supersedes_resolution_id: string | null;
  owner_user_id: string;
  created_at: string;
};

type SpeakerResolutionHistoryInsert = {
  transcript_id: string;
  raw_speaker_id: string;
  raw_speaker_index: number;
  participant_id: string;
  resolved_role: string | null;
  resolved_label: string | null;
  resolved_by: string;
  resolved_at: string;
  supersedes_resolution_id: string | null;
  owner_user_id: string;
};

type TranscriptUtteranceRow = {
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  ordinal: number;
  job_id?: string | null;
  utterance_index?: number | null;
  speaker_index?: number | null;
  speaker_label?: string | null;
  text?: string | null;
  avg_confidence?: string | null;
};

type TranscriptWordRow = {
  word_id: string;
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  confidence: number;
  reviewed: boolean;
  edited: boolean;
  text: string;
  raw_text: string;
  ordinal: number;
  job_id?: string | null;
  word_index?: number | null;
  working_text?: string | null;
  speaker_index?: number | null;
  is_filler?: boolean | null;
  removed?: boolean | null;
};

type CaseAudioRow = {
  audio_id?: string | null;
  storage_path: string | null;
  media_url: string | null;
};

type RouteContext = {
  supabase: SupabaseClient<Database>;
  transcript: TranscriptRow;
  suggestionId?: string;
  request: Request;
};

type RouteMatch =
  | { kind: "document"; jobId: string }
  | { kind: "resolvedSpeakers"; jobId: string }
  | { kind: "working"; jobId: string }
  | { kind: "review"; jobId: string }
  | { kind: "speakers"; jobId: string }
  | { kind: "suggestions"; jobId: string }
  | { kind: "resolveSuggestion"; jobId: string; suggestionId: string }
  | { kind: "exhibits"; jobId: string }
  | { kind: "certifyStatus"; jobId: string }
  | { kind: "reassemblyPreview"; jobId: string }
  | { kind: "reassemblyApply"; jobId: string }
  | { kind: "reassemblyRestore"; jobId: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CASE_FILES_BUCKET = "case-files";
const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60; // 6h supports long review sessions without mid-session expiry.
const WORD_PAGE_SIZE = 1000;
const CONFIDENCE_THRESHOLD = 0.70;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return respondJson(200, { ok: true });
  }

  const match = matchRoute(request);
  if (!match) {
    return respondError(404, "not found");
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return respondError(401, "unauthorized");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[editor-api] missing supabase env", {
      route: match.kind,
      jobId: match.jobId,
    });
    return respondError(500, "server misconfigured");
  }

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const transcript = await requireTranscript(supabase, match.jobId);

    const context: RouteContext = {
      supabase,
      transcript,
      suggestionId: "suggestionId" in match ? match.suggestionId : undefined,
      request,
    };

    switch (match.kind) {
      case "document":
        return handleGetDocument(context);
      case "resolvedSpeakers":
        return handleGetResolvedSpeakers(context);
      case "working":
        return handlePutWorking(context);
      case "review":
        return handlePutReview(context);
      case "speakers":
        return handlePutSpeakers(context);
      case "suggestions":
        return handleGetSuggestions(context);
      case "resolveSuggestion":
        return handleResolveSuggestion(context);
      case "exhibits":
        return handleGetExhibits(context);
      case "certifyStatus":
        return handleGetCertifyStatus(context);
      case "reassemblyPreview":
        return handleGetReassemblyPreview(context);
      case "reassemblyApply":
        return handlePostReassemblyApply(context);
      case "reassemblyRestore":
        return handlePostReassemblyRestore(context);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return respondError(error.status, error.message);
    }

    console.error("[editor-api] unexpected error", {
      route: match.kind,
      jobId: match.jobId,
      message: error instanceof Error ? error.message : String(error),
    });
    return respondError(500, "unexpected server error");
  }
});

async function requireTranscript(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<TranscriptRow> {
  const { data, error } = await supabase
    .from("transcripts")
    .select("transcript_id, case_id, job_id, media_url, duration, duration_seconds, avg_confidence, based_on, speaker_map_confirmed, raw_storage_path, raw_checksum, updated_at")
    .eq("transcript_id", jobId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "failed to load transcript");
  }

  if (!data) {
    throw new HttpError(404, "unknown jobId");
  }

  return data as TranscriptRow;
}

async function handleGetDocument(context: RouteContext): Promise<Response> {
  const { supabase, transcript } = context;
  const [speakerRows, utteranceRows, words, mediaUrl] = await Promise.all([
    loadSpeakers(supabase, transcript.transcript_id),
    loadUtterances(supabase, transcript.transcript_id),
    loadWords(supabase, transcript.transcript_id),
    resolveMediaUrl(supabase, transcript),
  ]);

  const wordIdsByUtterance = new Map<string, string[]>();
  for (const word of words) {
    const ids = wordIdsByUtterance.get(word.utterance_id) ?? [];
    ids.push(word.word_id);
    wordIdsByUtterance.set(word.utterance_id, ids);
  }

  const document: EditorDocument = {
    job_id: transcript.transcript_id,
    media_url: mediaUrl,
    duration: transcript.duration_seconds ?? transcript.duration ?? 0,
    speakers: speakerRows.map(mapSpeakerRow),
    utterances: utteranceRows.map((row) => mapUtteranceRow(row, wordIdsByUtterance)),
    words: words.map(mapWordRow),
  };

  return respondJson(200, document);
}

async function handleGetResolvedSpeakers(context: RouteContext): Promise<Response> {
  const resolvedSpeakers = await loadResolvedSpeakerViews(
    context.supabase,
    context.transcript.transcript_id,
  );

  return respondJson(200, resolvedSpeakers);
}

async function loadSpeakers(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<TranscriptSpeakerRow[]> {
  const { data, error } = await supabase
    .from("transcript_speakers")
    .select("speaker_id, display_name, deepgram_speaker, role, speaker_index, speaker_label, assigned_name, speaker_role")
    .eq("transcript_id", transcriptId)
    .order("speaker_index", { ascending: true })
    .order("deepgram_speaker", { ascending: true });

  if (error) {
    throw new HttpError(500, "failed to load speakers");
  }

  return (data ?? []) as TranscriptSpeakerRow[];
}

async function loadUtterances(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<TranscriptUtteranceRow[]> {
  const { data, error } = await supabase
    .from("transcript_utterances")
    .select("utterance_id, speaker_id, start_time, end_time, ordinal, job_id, utterance_index, speaker_index, speaker_label, text, avg_confidence")
    .eq("transcript_id", transcriptId)
    .order("utterance_index", { ascending: true })
    .order("ordinal", { ascending: true });

  if (error) {
    throw new HttpError(500, "failed to load utterances");
  }

  return (data ?? []) as TranscriptUtteranceRow[];
}

async function loadSpeakerResolutionOverlay(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<SpeakerResolutionCurrentRow[]> {
  const { data, error } = await supabase
    .from("speaker_resolution_current")
    .select("*")
    .eq("transcript_id", transcriptId)
    .order("raw_speaker_index", { ascending: true });

  if (error) {
    throw new HttpError(500, "failed to load speaker resolution overlay");
  }

  return (data ?? []) as SpeakerResolutionCurrentRow[];
}

async function loadResolvedSpeakerViews(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
  speakerRows?: TranscriptSpeakerRow[],
): Promise<ResolvedSpeakerView[]> {
  const [rawSpeakers, overlayRows] = await Promise.all([
    speakerRows ? Promise.resolve(speakerRows) : loadSpeakers(supabase, transcriptId),
    loadSpeakerResolutionOverlay(supabase, transcriptId),
  ]);

  return buildResolvedSpeakerViews(rawSpeakers, overlayRows);
}

async function loadWords(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
  options: { includeRemoved?: boolean } = {},
): Promise<TranscriptWordRow[]> {
  const rows: TranscriptWordRow[] = [];
  let from = 0;

  while (true) {
    const to = from + WORD_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("transcript_words")
      .select("word_id, utterance_id, speaker_id, start_time, end_time, confidence, reviewed, edited, text, raw_text, ordinal, job_id, word_index, working_text, speaker_index, is_filler, removed")
      .eq("transcript_id", transcriptId)
      .order("word_index", { ascending: true })
      .order("ordinal", { ascending: true })
      .range(from, to);

    if (error) {
      throw new HttpError(500, "failed to load words");
    }

    const page = (data ?? []) as TranscriptWordRow[];
    rows.push(...page);

    if (page.length < WORD_PAGE_SIZE) {
      break;
    }

    from += WORD_PAGE_SIZE;
  }

  if (options.includeRemoved) {
    return rows;
  }

  return rows.filter((row) => !row.removed);
}

async function resolveMediaUrl(
  supabase: SupabaseClient<Database>,
  transcript: TranscriptRow,
): Promise<string> {
  const { data, error } = await supabase
    .from("case_audio")
    .select("audio_id, storage_path, media_url")
    .eq("case_id", transcript.case_id)
    .eq("audio_id", transcript.based_on ?? "")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "failed to load case audio");
  }

  const audio = (data as CaseAudioRow | null) ?? null;
  if (audio?.storage_path) {
    const signed = await supabase.storage
      .from(CASE_FILES_BUCKET)
      .createSignedUrl(audio.storage_path, SIGNED_URL_TTL_SECONDS);

    if (signed.error) {
      throw new HttpError(500, "failed to sign media url");
    }

    return signed.data.signedUrl;
  }

  if (audio?.media_url) {
    return audio.media_url;
  }

  console.warn("[editor-api] transcript has no case audio media", {
    jobId: transcript.transcript_id,
    caseId: transcript.case_id,
  });

  return "";
}

function mapSpeakerRow(row: TranscriptSpeakerRow): Speaker {
  return {
    speaker_id: row.speaker_id,
    display_name: row.assigned_name || row.display_name || row.speaker_label || "",
    deepgram_speaker: row.speaker_index ?? row.deepgram_speaker,
    role: normalizeSpeakerRole(row.speaker_role ?? row.role),
  };
}

function mapUtteranceRow(
  row: TranscriptUtteranceRow,
  wordIdsByUtterance: Map<string, string[]>,
): Utterance {
  return {
    utterance_id: row.utterance_id,
    speaker_id: row.speaker_id,
    start_time: row.start_time,
    end_time: row.end_time,
    word_ids: wordIdsByUtterance.get(row.utterance_id) ?? [],
  };
}

function mapWordRow(row: TranscriptWordRow): Word {
  const text = row.working_text ?? row.text;
  return {
    word_id: row.word_id,
    text,
    raw_text: row.raw_text,
    speaker_id: row.speaker_id,
    utterance_id: row.utterance_id,
    start_time: row.start_time,
    end_time: row.end_time,
    confidence: row.confidence,
    reviewed: row.reviewed,
    edited: text !== row.raw_text,
  };
}

function normalizeSpeakerRole(value: string | null | undefined): Speaker["role"] | undefined {
  switch ((value ?? "").toUpperCase()) {
    case "REPORTER":
    case "COURT_REPORTER":
      return "REPORTER";
    case "WITNESS":
      return "WITNESS";
    case "ATTORNEY":
    case "EXAMINING_ATTORNEY":
    case "DEFENDING_ATTORNEY":
      return "ATTORNEY";
    case "INTERPRETER":
      return "INTERPRETER";
    case "OTHER":
      return "OTHER";
    default:
      return undefined;
  }
}

async function handlePutWorking(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateSaveWorkingPayload(body);

  const { data, error } = await context.supabase.rpc("editor_apply_working_changes", {
    p_transcript_id: context.transcript.transcript_id,
    p_case_id: context.transcript.case_id,
    p_job_id: context.transcript.job_id,
    p_changes: payload.changes,
  });

  if (error) {
    console.error("[editor-api] PUT working failed", {
      route: "PUT /:jobId/working",
      jobId: context.transcript.transcript_id,
      message: error.message,
    });
    throw new HttpError(500, "failed to save working transcript");
  }

  const response: SaveWorkingResponse = {
    saved: typeof data === "number" ? data : 0,
  };

  return respondJson(200, {
    ...response,
    updatedAt: await touchTranscriptUpdatedAt(context),
  });
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "bad payload");
  }
}

function validateSaveWorkingPayload(value: unknown): SaveWorkingPayload {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "bad payload");
  }

  const payload = value as Record<string, unknown>;
  if (payload.source !== "editor" || !Array.isArray(payload.changes)) {
    throw new HttpError(400, "bad payload");
  }

  for (const change of payload.changes) {
    if (!change || typeof change !== "object") {
      throw new HttpError(400, "bad payload");
    }

    const candidate = change as Record<string, unknown>;
    if (
      typeof candidate.utterance_id !== "string"
      || typeof candidate.working_text !== "string"
    ) {
      throw new HttpError(400, "bad payload");
    }
  }

  return payload as SaveWorkingPayload;
}

async function handlePutReview(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateReviewPayload(body);
  const transcriptId = context.transcript.transcript_id;

  if (payload.reviewed_word_ids.length > 0) {
    const reviewedResult = await context.supabase
      .from("transcript_words")
      .update({ reviewed: true })
      .eq("transcript_id", transcriptId)
      .in("word_id", payload.reviewed_word_ids);

    if (reviewedResult.error) {
      throw new HttpError(500, "failed to save review");
    }
  }

  if (payload.unreviewed_word_ids.length > 0) {
    const unreviewedResult = await context.supabase
      .from("transcript_words")
      .update({ reviewed: false })
      .eq("transcript_id", transcriptId)
      .in("word_id", payload.unreviewed_word_ids);

    if (unreviewedResult.error) {
      throw new HttpError(500, "failed to save review");
    }
  }

  const remainingCount = await countUnreviewedWords(context.supabase, transcriptId);
  const totalCount = await countAllWords(context.supabase, transcriptId);
  const reviewComplete = remainingCount === 0;
  const reviewPct = totalCount === 0 ? null : Math.round(((totalCount - remainingCount) / totalCount) * 100);

  const reviewStateResult = await context.supabase
    .from("transcript_review_state")
    .upsert({
      transcript_id: transcriptId,
      reviewed_word_ids: payload.reviewed_word_ids,
      unreviewed_word_ids: payload.unreviewed_word_ids,
      review_complete: reviewComplete,
      review_pct: reviewPct,
    }, { onConflict: "transcript_id" });

  if (reviewStateResult.error) {
    throw new HttpError(500, "failed to save review");
  }

  return respondJson(200, {
    ok: true,
    updatedAt: await touchTranscriptUpdatedAt(context),
  });
}

async function handlePutSpeakers(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateSpeakersPayload(body);
  const transcriptId = context.transcript.transcript_id;
  const userId = await requireCurrentUserId(context.supabase);
  const rawSpeakerRows = await loadSpeakers(context.supabase, transcriptId);
  const rawSpeakerById = new Map(rawSpeakerRows.map((speaker) => [speaker.speaker_id, speaker]));
  const rawSpeakerIds = payload.speakers.map((speaker) => speaker.speaker_id);
  const currentRows = await loadCurrentSpeakerResolutionRows(context.supabase, transcriptId, rawSpeakerIds);
  const currentRowBySpeakerId = new Map(currentRows.map((row) => [row.raw_speaker_id, row]));
  const latestHistoryBySpeakerId = await loadLatestSpeakerResolutionHistoryRows(
    context.supabase,
    transcriptId,
    rawSpeakerIds,
  );
  const now = new Date().toISOString();
  const changedCurrentRows: SpeakerResolutionCurrentInsert[] = [];
  const changedHistoryRows: SpeakerResolutionHistoryInsert[] = [];
  const auditRows: AuditInsertRow[] = [];

  for (const speaker of payload.speakers) {
    const rawSpeaker = rawSpeakerById.get(speaker.speaker_id);
    if (!rawSpeaker) {
      throw new HttpError(400, `unknown raw speaker ${speaker.speaker_id}`);
    }

    const resolvedLabel = speaker.display_name.trim();
    const resolvedRole = normalizeSpeakerRoleForDatabase(speaker.role);
    const participantId = buildParticipantId(speaker.role, resolvedLabel);
    const currentRow = currentRowBySpeakerId.get(speaker.speaker_id) ?? null;
    const changed = !currentRow
      || currentRow.participant_id !== participantId
      || currentRow.resolved_label !== resolvedLabel
      || currentRow.resolved_role !== resolvedRole;

    if (!changed) {
      continue;
    }

    changedCurrentRows.push({
      transcript_id: transcriptId,
      raw_speaker_id: rawSpeaker.speaker_id,
      raw_speaker_index: rawSpeaker.speaker_index ?? rawSpeaker.deepgram_speaker,
      participant_id: participantId,
      resolved_role: resolvedRole,
      resolved_label: resolvedLabel,
      resolved_by: userId,
      resolved_at: now,
      owner_user_id: userId,
    });

    changedHistoryRows.push({
      transcript_id: transcriptId,
      raw_speaker_id: rawSpeaker.speaker_id,
      raw_speaker_index: rawSpeaker.speaker_index ?? rawSpeaker.deepgram_speaker,
      participant_id: participantId,
      resolved_role: resolvedRole,
      resolved_label: resolvedLabel,
      resolved_by: userId,
      resolved_at: now,
      supersedes_resolution_id: latestHistoryBySpeakerId.get(rawSpeaker.speaker_id)?.resolution_id ?? null,
      owner_user_id: userId,
    });

    auditRows.push({
      utterance_id: null,
      word_id: null,
      source: "workspace",
      action: "assign_speaker",
      old_text: rawSpeaker.speaker_id,
      new_text: `${resolvedLabel}${speaker.role ? ` (${speaker.role})` : ""}`,
      before_text: rawSpeaker.speaker_id,
      after_text: `${resolvedLabel}${speaker.role ? ` (${speaker.role})` : ""}`,
    });
  }

  if (changedCurrentRows.length > 0) {
    const upsertResult = await context.supabase
      .from("speaker_resolution_current")
      .upsert(changedCurrentRows, { onConflict: "transcript_id,raw_speaker_id" });

    if (upsertResult.error) {
      throw new HttpError(500, "failed to save speakers");
    }
  }

  if (changedHistoryRows.length > 0) {
    const insertResult = await context.supabase
      .from("speaker_resolution_history")
      .insert(changedHistoryRows);

    if (insertResult.error) {
      throw new HttpError(500, "failed to save speakers");
    }
  }

  if (payload.utterance_speaker_map) {
    for (const assignment of payload.utterance_speaker_map) {
      const speaker = payload.speakers.find((candidate) => candidate.speaker_id === assignment.speaker_id);
      const utteranceResult = await context.supabase
        .from("transcript_utterances")
        .update({
          speaker_id: assignment.speaker_id,
          speaker_label: speaker?.display_name ?? assignment.speaker_id,
        })
        .eq("transcript_id", transcriptId)
        .eq("utterance_id", assignment.utterance_id);

      if (utteranceResult.error) {
        throw new HttpError(500, "failed to save speakers");
      }

      const wordsResult = await context.supabase
        .from("transcript_words")
        .update({
          speaker_id: assignment.speaker_id,
        })
        .eq("transcript_id", transcriptId)
        .eq("utterance_id", assignment.utterance_id);

      if (wordsResult.error) {
        throw new HttpError(500, "failed to save speakers");
      }

      auditRows.push({
        utterance_id: assignment.utterance_id,
        word_id: null,
        source: "workspace",
        action: "assign_speaker",
        old_text: "speaker reassignment",
        new_text: assignment.speaker_id,
        before_text: "speaker reassignment",
        after_text: assignment.speaker_id,
      });
    }
  }

  await appendAuditRows(context, auditRows);

  const resolvedSpeakers = await loadResolvedSpeakerViews(
    context.supabase,
    transcriptId,
    rawSpeakerRows,
  );
  const speakerMapConfirmed = isResolvedSpeakerMappingComplete(resolvedSpeakers);

  const transcriptResult = await context.supabase
    .from("transcripts")
    .update({ speaker_map_confirmed: speakerMapConfirmed })
    .eq("transcript_id", transcriptId)
    .select("updated_at")
    .single();

  if (transcriptResult.error || !transcriptResult.data?.updated_at) {
    throw new HttpError(500, "failed to save speakers");
  }

  return respondJson(200, {
    ok: true,
    updatedAt: transcriptResult.data.updated_at as string,
  });
}

async function touchTranscriptUpdatedAt(
  context: RouteContext,
): Promise<string> {
  const { data, error } = await context.supabase
    .from("transcripts")
    .update({
      based_on: context.transcript.based_on ?? null,
      job_id: context.transcript.job_id,
    })
    .eq("transcript_id", context.transcript.transcript_id)
    .select("updated_at")
    .single();

  if (error || !data?.updated_at) {
    throw new HttpError(500, "failed to load transcript version");
  }

  return data.updated_at as string;
}

function validateReviewPayload(value: unknown): ReviewPayload {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "bad payload");
  }

  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.reviewed_word_ids) || !Array.isArray(payload.unreviewed_word_ids)) {
    throw new HttpError(400, "bad payload");
  }

  return {
    reviewed_word_ids: payload.reviewed_word_ids.map(requireStringValue),
    unreviewed_word_ids: payload.unreviewed_word_ids.map(requireStringValue),
  };
}

function validateSpeakersPayload(value: unknown): SpeakersPayload {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "bad payload");
  }

  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.speakers)) {
    throw new HttpError(400, "bad payload");
  }

  const speakers = payload.speakers.map((speaker) => {
    if (!speaker || typeof speaker !== "object") {
      throw new HttpError(400, "bad payload");
    }

    const candidate = speaker as Record<string, unknown>;
    const role = candidate.role;
    if (
      typeof candidate.speaker_id !== "string"
      || typeof candidate.display_name !== "string"
      || (role !== undefined && role !== "REPORTER" && role !== "WITNESS" && role !== "ATTORNEY" && role !== "INTERPRETER" && role !== "OTHER")
    ) {
      throw new HttpError(400, "bad payload");
    }

    return {
      speaker_id: candidate.speaker_id,
      display_name: candidate.display_name,
      role: role as SpeakersPayload["speakers"][number]["role"],
    };
  });

  const utterance_speaker_map = payload.utterance_speaker_map;
  if (utterance_speaker_map === undefined) {
    return { speakers };
  }

  if (!Array.isArray(utterance_speaker_map)) {
    throw new HttpError(400, "bad payload");
  }

  return {
    speakers,
    utterance_speaker_map: utterance_speaker_map.map((assignment) => {
      if (!assignment || typeof assignment !== "object") {
        throw new HttpError(400, "bad payload");
      }

      const candidate = assignment as Record<string, unknown>;
      if (typeof candidate.utterance_id !== "string" || typeof candidate.speaker_id !== "string") {
        throw new HttpError(400, "bad payload");
      }

      return {
        utterance_id: candidate.utterance_id,
        speaker_id: candidate.speaker_id,
      };
    }),
  };
}

function requireStringValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "bad payload");
  }

  return value;
}

async function countUnreviewedWords(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("transcript_words")
    .select("word_id", { count: "exact", head: true })
    .eq("transcript_id", transcriptId)
    .eq("reviewed", false)
    .eq("removed", false);

  if (error) {
    throw new HttpError(500, "failed to save review");
  }

  return count ?? 0;
}

async function countAllWords(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("transcript_words")
    .select("word_id", { count: "exact", head: true })
    .eq("transcript_id", transcriptId)
    .eq("removed", false);

  if (error) {
    throw new HttpError(500, "failed to save review");
  }

  return count ?? 0;
}

async function countRowsByFilter(
  supabase: SupabaseClient<Database>,
  table: "transcript_review_state" | "transcript_suggestions" | "case_certifications" | "exports",
  column: "transcript_id" | "case_id",
  value: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);

  if (error) {
    throw new HttpError(500, `failed to load ${table}`);
  }

  return count ?? 0;
}

async function countWorkspaceAuditEvents(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("transcript_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("transcript_id", transcriptId)
    .eq("source", "workspace")
    .in("action", ["edit_word", "mark_reviewed", "assign_speaker"]);

  if (error) {
    throw new HttpError(500, "failed to load transcript audit log");
  }

  return count ?? 0;
}

function buildHumanWorkSummary(
  speakers: TranscriptSpeakerRow[],
  utterances: TranscriptUtteranceRow[],
  words: TranscriptWordRow[],
  overlayRows: SpeakerResolutionCurrentRow[],
  lifecycleCounts: ReassemblyEligibilityInput,
  workspaceAuditCount: number,
): HumanWorkSummary {
  const signals: HumanWorkSignal[] = [];

  if (words.some((word) => word.working_text != null || word.edited)) {
    signals.push("edited-words");
  }

  if (words.some((word) => word.reviewed) || lifecycleCounts.reviewStateCount > 0) {
    signals.push("review-progress");
  }

  if (overlayRows.length > 0) {
    signals.push("speaker-resolution");
  }

  if (workspaceAuditCount > 0) {
    signals.push("workspace-audit-history");
  }

  return {
    hasHumanWork: signals.length > 0,
    signals,
  };
}

function buildUndoSnapshot(
  transcript: TranscriptRow,
  speakers: TranscriptSpeakerRow[],
  utterances: TranscriptUtteranceRow[],
  words: TranscriptWordRow[],
): TranscriptReassemblyUndoSnapshot {
  return {
    transcriptId: transcript.transcript_id,
    durationSeconds: transcript.duration_seconds ?? transcript.duration ?? null,
    wordCount: words.length,
    utteranceCount: utterances.length,
    speakerCount: speakers.length,
    avgConfidence: transcript.avg_confidence ?? null,
    speakerMapConfirmed: transcript.speaker_map_confirmed ?? false,
    speakers: speakers.map((speaker) => ({
      speaker_id: speaker.speaker_id,
      display_name: speaker.display_name,
      deepgram_speaker: speaker.deepgram_speaker,
      role: speaker.role,
      job_id: speaker.job_id ?? transcript.job_id,
      speaker_index: speaker.speaker_index ?? speaker.deepgram_speaker,
      speaker_label: speaker.speaker_label ?? speaker.display_name,
      assigned_name: speaker.assigned_name ?? null,
      speaker_role: speaker.speaker_role ?? speaker.role,
      word_count: speaker.word_count ?? 0,
    })),
    utterances: utterances.map((utterance) => ({
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      start_time: utterance.start_time,
      end_time: utterance.end_time,
      ordinal: utterance.ordinal,
      job_id: utterance.job_id ?? transcript.job_id,
      utterance_index: utterance.utterance_index ?? utterance.ordinal,
      speaker_index: utterance.speaker_index ?? 0,
      speaker_label: utterance.speaker_label ?? "",
      text: utterance.text ?? "",
      avg_confidence: utterance.avg_confidence ?? null,
    })),
    words: words.map((word) => ({
      utterance_id: word.utterance_id,
      word_id: word.word_id,
      speaker_id: word.speaker_id,
      ordinal: word.ordinal,
      text: word.text,
      raw_text: word.raw_text,
      start_time: word.start_time,
      end_time: word.end_time,
      confidence: word.confidence,
      reviewed: word.reviewed,
      edited: word.edited,
      job_id: word.job_id ?? transcript.job_id,
      word_index: word.word_index ?? word.ordinal,
      working_text: word.working_text ?? null,
      speaker_index: word.speaker_index ?? 0,
      is_filler: word.is_filler ?? false,
      removed: word.removed ?? false,
    })),
  };
}

async function loadRawDeepgramResponse(
  supabase: SupabaseClient<Database>,
  rawStoragePath: string | null | undefined,
): Promise<DeepgramResponse> {
  if (!rawStoragePath || !rawStoragePath.endsWith(".json") || rawStoragePath.endsWith("_multifile_manifest.json")) {
    throw new HttpError(400, "transcript rebuild requires a preserved raw Deepgram JSON response");
  }

  const { data, error } = await supabase.storage
    .from(CASE_FILES_BUCKET)
    .download(rawStoragePath);

  if (error) {
    throw new HttpError(500, "failed to load raw Deepgram response");
  }

  return JSON.parse(await data.text()) as DeepgramResponse;
}

async function buildReassemblyPreview(
  context: RouteContext,
): Promise<TranscriptReassemblyPreview> {
  const transcriptId = context.transcript.transcript_id;
  const [speakers, utterances, words, overlayRows, reviewStateCount, suggestionCount, certificationCount, exportCount, workspaceAuditCount, rawResponse] = await Promise.all([
    loadSpeakers(context.supabase, transcriptId),
    loadUtterances(context.supabase, transcriptId),
    loadWords(context.supabase, transcriptId),
    loadSpeakerResolutionOverlay(context.supabase, transcriptId),
    countRowsByFilter(context.supabase, "transcript_review_state", "transcript_id", transcriptId),
    countRowsByFilter(context.supabase, "transcript_suggestions", "transcript_id", transcriptId),
    countRowsByFilter(context.supabase, "case_certifications", "case_id", context.transcript.case_id),
    countRowsByFilter(context.supabase, "exports", "case_id", context.transcript.case_id),
    countWorkspaceAuditEvents(context.supabase, transcriptId),
    loadRawDeepgramResponse(context.supabase, context.transcript.raw_storage_path),
  ]);

  const currentMetrics = buildStoredTranscriptMetrics(speakers, utterances, words);
  const candidateMetrics = buildNormalizedTranscriptMetrics(normalizeTranscriptResponse(rawResponse));
  const eligibility = evaluateReassemblyEligibility({
    reviewStateCount,
    suggestionCount,
    certificationCount,
    exportCount,
  });

  return {
    currentAssemblyVersion: CURRENT_ASSEMBLY_VERSION,
    latestAssemblyVersion: LATEST_ASSEMBLY_VERSION,
    canApply: eligibility.canApply,
    blockedReasons: eligibility.blockedReasons,
    currentMetrics,
    candidateMetrics,
    impacts: eligibility.impacts,
    humanWorkSummary: buildHumanWorkSummary(
      speakers,
      utterances,
      words,
      overlayRows,
      {
        reviewStateCount,
        suggestionCount,
        certificationCount,
        exportCount,
      },
      workspaceAuditCount,
    ),
    previewToken: buildReassemblyPreviewToken({
      transcriptId,
      updatedAt: context.transcript.updated_at ?? null,
      rawStoragePath: context.transcript.raw_storage_path ?? null,
      currentMetrics,
      candidateMetrics,
    }),
  };
}

async function replaceTranscriptDerivedRows(
  supabase: SupabaseClient<Database>,
  transcript: TranscriptRow,
  normalized: ReturnType<typeof normalizeTranscriptResponse>,
): Promise<void> {
  const transcriptId = transcript.transcript_id;

  const deleteWordsResult = await supabase
    .from("transcript_words")
    .delete()
    .eq("transcript_id", transcriptId);

  if (deleteWordsResult.error) {
    throw new HttpError(500, "failed to replace transcript words");
  }

  const deleteUtterancesResult = await supabase
    .from("transcript_utterances")
    .delete()
    .eq("transcript_id", transcriptId);

  if (deleteUtterancesResult.error) {
    throw new HttpError(500, "failed to replace transcript utterances");
  }

  const deleteSpeakersResult = await supabase
    .from("transcript_speakers")
    .delete()
    .eq("transcript_id", transcriptId);

  if (deleteSpeakersResult.error) {
    throw new HttpError(500, "failed to replace transcript speakers");
  }

  const speakerRows = normalized.speakers.map((speaker) => ({
    transcript_id: transcriptId,
    speaker_id: speaker.speaker_id,
    display_name: speaker.speaker_label,
    deepgram_speaker: speaker.speaker_index,
    role: null,
    job_id: transcript.job_id,
    speaker_index: speaker.speaker_index,
    speaker_label: speaker.speaker_label,
    assigned_name: null,
    speaker_role: null,
    word_count: speaker.word_count,
  }));

  const utteranceRows = normalized.utterances.map((utterance) => ({
    transcript_id: transcriptId,
    utterance_id: utterance.utterance_id,
    speaker_id: utterance.speaker_id,
    start_time: utterance.start_time,
    end_time: utterance.end_time,
    ordinal: utterance.utterance_index,
    job_id: transcript.job_id,
    utterance_index: utterance.utterance_index,
    speaker_index: utterance.speaker_index,
    speaker_label: utterance.speaker_label,
    text: utterance.text,
    avg_confidence: utterance.avg_confidence.toFixed(4),
  }));

  const wordRows = normalized.words.map((word) => ({
    transcript_id: transcriptId,
    utterance_id: word.utterance_id,
    word_id: word.word_id,
    speaker_id: word.speaker_id,
    ordinal: word.word_index,
    text: word.raw_text,
    raw_text: word.raw_text,
    start_time: word.start_time,
    end_time: word.end_time,
    confidence: word.confidence,
    reviewed: false,
    edited: false,
    job_id: transcript.job_id,
    word_index: word.word_index,
    working_text: null,
    speaker_index: word.speaker_index,
    removed: false,
    is_filler: word.is_filler,
  }));

  if (speakerRows.length > 0) {
    const speakerInsertResult = await supabase.from("transcript_speakers").insert(speakerRows);
    if (speakerInsertResult.error) {
      throw new HttpError(500, "failed to replace transcript speakers");
    }
  }

  if (utteranceRows.length > 0) {
    const utteranceInsertResult = await supabase.from("transcript_utterances").insert(utteranceRows);
    if (utteranceInsertResult.error) {
      throw new HttpError(500, "failed to replace transcript utterances");
    }
  }

  const wordChunkSize = 500;
  for (let index = 0; index < wordRows.length; index += wordChunkSize) {
    const chunk = wordRows.slice(index, index + wordChunkSize);
    const wordInsertResult = await supabase.from("transcript_words").insert(chunk);
    if (wordInsertResult.error) {
      throw new HttpError(500, "failed to replace transcript words");
    }
  }
}

async function handleGetReassemblyPreview(context: RouteContext): Promise<Response> {
  const preview = await buildReassemblyPreview(context);
  return respondJson(200, preview);
}

async function handlePostReassemblyApply(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  if (!body || typeof body !== "object" || typeof (body as Record<string, unknown>).previewToken !== "string") {
    throw new HttpError(400, "bad payload");
  }

  const preview = await buildReassemblyPreview(context);
  const previewToken = (body as Record<string, unknown>).previewToken as string;
  if (preview.previewToken !== previewToken) {
    throw new HttpError(409, "transcript rebuild preview is stale");
  }

  if (!preview.canApply) {
    throw new HttpError(409, preview.blockedReasons[0] ?? "transcript rebuild is blocked");
  }

  const [speakers, utterances, words] = await Promise.all([
    loadSpeakers(context.supabase, context.transcript.transcript_id),
    loadUtterances(context.supabase, context.transcript.transcript_id),
    loadWords(context.supabase, context.transcript.transcript_id, { includeRemoved: true }),
  ]);
  const rawResponse = await loadRawDeepgramResponse(context.supabase, context.transcript.raw_storage_path);
  const normalized = normalizeTranscriptResponse(rawResponse);
  await replaceTranscriptDerivedRows(context.supabase, context.transcript, normalized);

  const auditInsertResult = await context.supabase
    .from("transcript_audit_log")
    .insert({
      transcript_id: context.transcript.transcript_id,
      change_id: `chg_${context.transcript.job_id}_${Date.now()}_reassembly`,
      utterance_id: null,
      word_id: null,
      old_text: `mixed_utterances:${preview.currentMetrics.mixedCanonicalUtterances}`,
      new_text: `mixed_utterances:${preview.candidateMetrics.mixedCanonicalUtterances}`,
      source: "system",
      suggestion_id: null,
      reviewer_user_id: null,
      case_id: context.transcript.case_id,
      job_id: context.transcript.job_id,
      actor: null,
      action: "bulk_save",
      before_text: `reassembly_preview:${preview.currentMetrics.mixedCanonicalUtterances}`,
      after_text: `reassembly_apply:${preview.candidateMetrics.mixedCanonicalUtterances}`,
    });

  if (auditInsertResult.error) {
    throw new HttpError(500, "failed to append rebuild audit event");
  }

  const transcriptUpdateResult = await context.supabase
    .from("transcripts")
    .update({
      duration_seconds: normalized.durationSeconds,
      word_count: normalized.words.length,
      utterance_count: normalized.utterances.length,
      speaker_count: normalized.speakers.length,
      avg_confidence: normalized.avgConfidence == null ? null : normalized.avgConfidence.toFixed(4),
    })
    .eq("transcript_id", context.transcript.transcript_id)
    .select("updated_at")
    .single();

  if (transcriptUpdateResult.error || !transcriptUpdateResult.data?.updated_at) {
    throw new HttpError(500, "failed to update transcript after rebuild");
  }

  const response: TranscriptReassemblyApplyResult = {
    ok: true,
    updatedAt: transcriptUpdateResult.data.updated_at as string,
    currentMetrics: preview.currentMetrics,
    candidateMetrics: preview.candidateMetrics,
    undoSnapshot: buildUndoSnapshot(context.transcript, speakers, utterances, words),
  };

  return respondJson(200, response);
}

async function restoreTranscriptDerivedRows(
  supabase: SupabaseClient<Database>,
  transcript: TranscriptRow,
  snapshot: TranscriptReassemblyUndoSnapshot,
): Promise<void> {
  const transcriptId = transcript.transcript_id;

  const deleteWordsResult = await supabase
    .from("transcript_words")
    .delete()
    .eq("transcript_id", transcriptId);

  if (deleteWordsResult.error) {
    throw new HttpError(500, "failed to restore transcript words");
  }

  const deleteUtterancesResult = await supabase
    .from("transcript_utterances")
    .delete()
    .eq("transcript_id", transcriptId);

  if (deleteUtterancesResult.error) {
    throw new HttpError(500, "failed to restore transcript utterances");
  }

  const deleteSpeakersResult = await supabase
    .from("transcript_speakers")
    .delete()
    .eq("transcript_id", transcriptId);

  if (deleteSpeakersResult.error) {
    throw new HttpError(500, "failed to restore transcript speakers");
  }

  if (snapshot.speakers.length > 0) {
    const speakerInsertResult = await supabase.from("transcript_speakers").insert(
      snapshot.speakers.map((speaker) => ({
        transcript_id: transcriptId,
        speaker_id: speaker.speaker_id,
        display_name: speaker.display_name,
        deepgram_speaker: speaker.deepgram_speaker,
        role: speaker.role,
        job_id: speaker.job_id,
        speaker_index: speaker.speaker_index,
        speaker_label: speaker.speaker_label,
        assigned_name: speaker.assigned_name,
        speaker_role: speaker.speaker_role,
        word_count: speaker.word_count,
      })),
    );
    if (speakerInsertResult.error) {
      throw new HttpError(500, "failed to restore transcript speakers");
    }
  }

  if (snapshot.utterances.length > 0) {
    const utteranceInsertResult = await supabase.from("transcript_utterances").insert(
      snapshot.utterances.map((utterance) => ({
        transcript_id: transcriptId,
        utterance_id: utterance.utterance_id,
        speaker_id: utterance.speaker_id,
        start_time: utterance.start_time,
        end_time: utterance.end_time,
        ordinal: utterance.ordinal,
        job_id: utterance.job_id,
        utterance_index: utterance.utterance_index,
        speaker_index: utterance.speaker_index,
        speaker_label: utterance.speaker_label,
        text: utterance.text,
        avg_confidence: utterance.avg_confidence,
      })),
    );
    if (utteranceInsertResult.error) {
      throw new HttpError(500, "failed to restore transcript utterances");
    }
  }

  const wordChunkSize = 500;
  for (let index = 0; index < snapshot.words.length; index += wordChunkSize) {
    const chunk = snapshot.words.slice(index, index + wordChunkSize);
    const wordInsertResult = await supabase.from("transcript_words").insert(
      chunk.map((word) => ({
        transcript_id: transcriptId,
        utterance_id: word.utterance_id,
        word_id: word.word_id,
        speaker_id: word.speaker_id,
        ordinal: word.ordinal,
        text: word.text,
        raw_text: word.raw_text,
        start_time: word.start_time,
        end_time: word.end_time,
        confidence: word.confidence,
        reviewed: word.reviewed,
        edited: word.edited,
        job_id: word.job_id,
        word_index: word.word_index,
        working_text: word.working_text,
        speaker_index: word.speaker_index,
        removed: word.removed,
        is_filler: word.is_filler,
      })),
    );
    if (wordInsertResult.error) {
      throw new HttpError(500, "failed to restore transcript words");
    }
  }
}

async function handlePostReassemblyRestore(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const snapshot = body && typeof body === "object" ? (body as Record<string, unknown>).snapshot : null;
  if (!snapshot || typeof snapshot !== "object") {
    throw new HttpError(400, "bad payload");
  }

  const restoreSnapshot = snapshot as TranscriptReassemblyUndoSnapshot;
  if (restoreSnapshot.transcriptId !== context.transcript.transcript_id) {
    throw new HttpError(409, "refine undo snapshot does not match transcript");
  }

  await restoreTranscriptDerivedRows(context.supabase, context.transcript, restoreSnapshot);

  const transcriptUpdateResult = await context.supabase
    .from("transcripts")
    .update({
      duration_seconds: restoreSnapshot.durationSeconds,
      word_count: restoreSnapshot.wordCount,
      utterance_count: restoreSnapshot.utteranceCount,
      speaker_count: restoreSnapshot.speakerCount,
      avg_confidence: restoreSnapshot.avgConfidence,
      speaker_map_confirmed: restoreSnapshot.speakerMapConfirmed,
    })
    .eq("transcript_id", context.transcript.transcript_id)
    .select("updated_at")
    .single();

  if (transcriptUpdateResult.error || !transcriptUpdateResult.data?.updated_at) {
    throw new HttpError(500, "failed to restore transcript after refine undo");
  }

  const response: TranscriptReassemblyRestoreResult = {
    ok: true,
    updatedAt: transcriptUpdateResult.data.updated_at as string,
  };

  return respondJson(200, response);
}

async function requireCurrentUserId(
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new HttpError(500, "failed to load authenticated user");
  }

  const userId = data.user?.id ?? null;
  if (!userId) {
    throw new HttpError(401, "unauthorized");
  }

  return userId;
}

async function loadCurrentSpeakerResolutionRows(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
  rawSpeakerIds: string[],
): Promise<SpeakerResolutionCurrentRow[]> {
  if (rawSpeakerIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("speaker_resolution_current")
    .select("*")
    .eq("transcript_id", transcriptId)
    .in("raw_speaker_id", rawSpeakerIds);

  if (error) {
    throw new HttpError(500, "failed to load speaker resolution overlay");
  }

  return (data ?? []) as SpeakerResolutionCurrentRow[];
}

async function loadLatestSpeakerResolutionHistoryRows(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
  rawSpeakerIds: string[],
): Promise<Map<string, SpeakerResolutionHistoryRow>> {
  const latest = new Map<string, SpeakerResolutionHistoryRow>();
  if (rawSpeakerIds.length === 0) {
    return latest;
  }

  const { data, error } = await supabase
    .from("speaker_resolution_history")
    .select("*")
    .eq("transcript_id", transcriptId)
    .in("raw_speaker_id", rawSpeakerIds)
    .order("resolved_at", { ascending: false });

  if (error) {
    throw new HttpError(500, "failed to load speaker resolution history");
  }

  for (const row of (data ?? []) as SpeakerResolutionHistoryRow[]) {
    if (!latest.has(row.raw_speaker_id)) {
      latest.set(row.raw_speaker_id, row);
    }
  }

  return latest;
}

type AuditInsertRow = {
  utterance_id: string | null;
  word_id: string | null;
  source: string;
  action: "assign_speaker";
  old_text: string | null;
  new_text: string | null;
  before_text: string | null;
  after_text: string | null;
};

async function appendAuditRows(
  context: RouteContext,
  rows: AuditInsertRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const payload = rows.map((row, index) => ({
    transcript_id: context.transcript.transcript_id,
    change_id: `chg_${context.transcript.job_id}_${Date.now()}_${index}`,
    utterance_id: row.utterance_id,
    word_id: row.word_id,
    old_text: row.old_text,
    new_text: row.new_text,
    source: row.source,
    suggestion_id: null,
    reviewer_user_id: null,
    case_id: context.transcript.case_id,
    job_id: context.transcript.job_id,
    actor: null,
    action: row.action,
    before_text: row.before_text,
    after_text: row.after_text,
  }));

  const { error } = await context.supabase
    .from("transcript_audit_log")
    .insert(payload);

  if (error) {
    throw new HttpError(500, "failed to save speakers");
  }
}

function normalizeSpeakerRoleForDatabase(
  value: SpeakersPayload["speakers"][number]["role"],
): string | null {
  switch (value) {
    case "REPORTER":
      return "reporter";
    case "WITNESS":
      return "witness";
    case "ATTORNEY":
      return "attorney";
    case "INTERPRETER":
      return "interpreter";
    case "OTHER":
      return "other";
    default:
      return null;
  }
}

type SuggestionRow = {
  suggestion_id: string;
  word_id: string;
  utterance_id: string;
  original_text: string;
  suggested_text: string;
  reason: string;
  confidence: number;
  status: string;
};

async function handleGetSuggestions(context: RouteContext): Promise<Response> {
  const { data, error } = await context.supabase
    .from("transcript_suggestions")
    .select("suggestion_id, word_id, utterance_id, original_text, suggested_text, reason, confidence, status")
    .eq("transcript_id", context.transcript.transcript_id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new HttpError(500, "failed to load suggestions");
  }

  const suggestions: AiSuggestion[] = ((data ?? []) as SuggestionRow[]).map((row) => ({
    suggestion_id: row.suggestion_id,
    word_id: row.word_id,
    utterance_id: row.utterance_id,
    original_text: row.original_text,
    suggested_text: row.suggested_text,
    reason: row.reason,
    confidence: row.confidence,
    status: normalizeSuggestionStatus(row.status),
  }));

  return respondJson(200, suggestions);
}

async function handleResolveSuggestion(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateSuggestionResolutionPayload(body);
  const suggestionId = context.suggestionId;

  if (!suggestionId) {
    throw new HttpError(404, "unknown suggestion");
  }

  const existsResult = await context.supabase
    .from("transcript_suggestions")
    .select("suggestion_id")
    .eq("transcript_id", context.transcript.transcript_id)
    .eq("suggestion_id", suggestionId)
    .maybeSingle();

  if (existsResult.error) {
    throw new HttpError(500, "failed to resolve suggestion");
  }

  if (!existsResult.data) {
    throw new HttpError(404, "unknown suggestion");
  }

  const { error } = await context.supabase.rpc("editor_resolve_suggestion", {
    p_transcript_id: context.transcript.transcript_id,
    p_case_id: context.transcript.case_id,
    p_job_id: context.transcript.job_id,
    p_suggestion_id: suggestionId,
    p_action: payload.action,
    p_edited_text: payload.edited_text ?? null,
  });

  if (error) {
    if (error.message.includes("edited_text is required")) {
      throw new HttpError(400, "bad payload");
    }
    throw new HttpError(500, "failed to resolve suggestion");
  }

  return respondJson(200, { ok: true });
}

function validateSuggestionResolutionPayload(value: unknown): {
  action: "accept" | "reject" | "edit";
  edited_text?: string;
} {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "bad payload");
  }

  const payload = value as Record<string, unknown>;
  if (payload.action !== "accept" && payload.action !== "reject" && payload.action !== "edit") {
    throw new HttpError(400, "bad payload");
  }

  if (payload.action === "edit" && typeof payload.edited_text !== "string") {
    throw new HttpError(400, "bad payload");
  }

  return {
    action: payload.action,
    edited_text: typeof payload.edited_text === "string" ? payload.edited_text : undefined,
  };
}

function normalizeSuggestionStatus(value: string): AiSuggestion["status"] {
  switch (value) {
    case "accepted":
    case "rejected":
    case "pending":
      return value;
    case "edited":
      return "accepted";
    default:
      return "pending";
  }
}

type ExhibitRow = {
  exhibit_id: string;
  label: string;
  description: string;
  file_url: string | null;
  storage_path: string | null;
};

async function handleGetExhibits(context: RouteContext): Promise<Response> {
  const { data, error } = await context.supabase
    .from("case_exhibits")
    .select("exhibit_id, label, description, file_url, storage_path")
    .eq("case_id", context.transcript.case_id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new HttpError(500, "failed to load exhibits");
  }

  const exhibits: Exhibit[] = [];
  for (const row of (data ?? []) as ExhibitRow[]) {
    exhibits.push({
      exhibit_id: row.exhibit_id,
      label: row.label,
      description: row.description,
      file_url: await resolveAssetUrl(context.supabase, row.storage_path, row.file_url),
    });
  }

  return respondJson(200, exhibits);
}

async function handleGetCertifyStatus(context: RouteContext): Promise<Response> {
  const [unreviewedCount, lowConfidenceUnreviewedCount, resolvedSpeakers] = await Promise.all([
    countUnreviewedWords(context.supabase, context.transcript.transcript_id),
    countLowConfidenceUnreviewedWords(context.supabase, context.transcript.transcript_id),
    loadResolvedSpeakerViews(context.supabase, context.transcript.transcript_id),
  ]);

  const checklist: CertifyChecklist = {
    review_complete: unreviewedCount === 0,
    speaker_mapping_complete: isResolvedSpeakerMappingComplete(resolvedSpeakers),
    confidence_review_complete: lowConfidenceUnreviewedCount === 0,
  };

  return respondJson(200, checklist);
}

async function countLowConfidenceUnreviewedWords(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("transcript_words")
    .select("word_id", { count: "exact", head: true })
    .eq("transcript_id", transcriptId)
    .eq("reviewed", false)
    .eq("removed", false)
    .lt("confidence", CONFIDENCE_THRESHOLD);

  if (error) {
    throw new HttpError(500, "failed to load certify status");
  }

  return count ?? 0;
}

async function resolveAssetUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string | null,
  fallbackUrl: string | null,
): Promise<string> {
  if (storagePath) {
    const signed = await supabase.storage
      .from(CASE_FILES_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signed.error) {
      throw new HttpError(500, "failed to sign asset url");
    }

    return signed.data.signedUrl;
  }

  return fallbackUrl ?? "";
}

function matchRoute(request: Request): RouteMatch | null {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const functionsIndex = parts.indexOf("editor-api");
  const routeParts = functionsIndex >= 0 ? parts.slice(functionsIndex + 1) : parts;

  if (routeParts.length === 2 && request.method === "GET" && routeParts[1] === "document") {
    return { kind: "document", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 3
    && request.method === "GET"
    && routeParts[1] === "speakers"
    && routeParts[2] === "resolved"
  ) {
    return { kind: "resolvedSpeakers", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "working") {
    return { kind: "working", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "review") {
    return { kind: "review", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "speakers") {
    return { kind: "speakers", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "GET" && routeParts[1] === "suggestions") {
    return { kind: "suggestions", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 4
    && request.method === "POST"
    && routeParts[1] === "suggestions"
    && routeParts[3] === "resolve"
  ) {
    return {
      kind: "resolveSuggestion",
      jobId: routeParts[0],
      suggestionId: routeParts[2],
    };
  }

  if (routeParts.length === 2 && request.method === "GET" && routeParts[1] === "exhibits") {
    return { kind: "exhibits", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 3
    && request.method === "GET"
    && routeParts[1] === "certify"
    && routeParts[2] === "status"
  ) {
    return { kind: "certifyStatus", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 3
    && request.method === "GET"
    && routeParts[1] === "reassembly"
    && routeParts[2] === "preview"
  ) {
    return { kind: "reassemblyPreview", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 3
    && request.method === "POST"
    && routeParts[1] === "reassembly"
    && routeParts[2] === "apply"
  ) {
    return { kind: "reassemblyApply", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 3
    && request.method === "POST"
    && routeParts[1] === "reassembly"
    && routeParts[2] === "restore"
  ) {
    return { kind: "reassemblyRestore", jobId: routeParts[0] };
  }

  return null;
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

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
