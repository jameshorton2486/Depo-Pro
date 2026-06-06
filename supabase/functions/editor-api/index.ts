import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import type {
  ReviewPayload,
  AiSuggestion,
  EditorDocument,
  SaveWorkingPayload,
  SaveWorkingResponse,
  SpeakersPayload,
  Speaker,
  Utterance,
  Word,
} from "../../../src/api/types.ts";

type Database = Record<string, never>;

type TranscriptRow = {
  transcript_id: string;
  case_id: string;
  job_id: string;
  media_url: string | null;
  duration: number | null;
  duration_seconds?: number | null;
};

type TranscriptSpeakerRow = {
  speaker_id: string;
  display_name: string;
  deepgram_speaker: number;
  role: string | null;
  speaker_index?: number | null;
  speaker_label?: string | null;
  assigned_name?: string | null;
  speaker_role?: string | null;
};

type TranscriptUtteranceRow = {
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  ordinal: number;
  utterance_index?: number | null;
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
  word_index?: number | null;
  working_text?: string | null;
  removed?: boolean | null;
};

type CaseAudioRow = {
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
  | { kind: "working"; jobId: string }
  | { kind: "review"; jobId: string }
  | { kind: "speakers"; jobId: string }
  | { kind: "suggestions"; jobId: string }
  | { kind: "resolveSuggestion"; jobId: string; suggestionId: string }
  | { kind: "exhibits"; jobId: string }
  | { kind: "certifyStatus"; jobId: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CASE_FILES_BUCKET = "case-files";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const WORD_PAGE_SIZE = 1000;

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
        return routeNotImplemented("GET /:jobId/exhibits", context);
      case "certifyStatus":
        return routeNotImplemented("GET /:jobId/certify/status", context);
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

async function routeNotImplemented(route: string, context: RouteContext): Promise<Response> {
  console.error("[editor-api] route not implemented", {
    route,
    jobId: context.transcript.transcript_id,
  });
  return respondError(500, "route not implemented");
}

async function requireTranscript(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<TranscriptRow> {
  const { data, error } = await supabase
    .from("transcripts")
    .select("transcript_id, case_id, job_id, media_url, duration, duration_seconds")
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
    job_id: transcript.job_id,
    media_url: mediaUrl,
    duration: transcript.duration_seconds ?? transcript.duration ?? 0,
    speakers: speakerRows.map(mapSpeakerRow),
    utterances: utteranceRows.map((row) => mapUtteranceRow(row, wordIdsByUtterance)),
    words: words.map(mapWordRow),
  };

  return respondJson(200, document);
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
    .select("utterance_id, speaker_id, start_time, end_time, ordinal, utterance_index")
    .eq("transcript_id", transcriptId)
    .order("utterance_index", { ascending: true })
    .order("ordinal", { ascending: true });

  if (error) {
    throw new HttpError(500, "failed to load utterances");
  }

  return (data ?? []) as TranscriptUtteranceRow[];
}

async function loadWords(
  supabase: SupabaseClient<Database>,
  transcriptId: string,
): Promise<TranscriptWordRow[]> {
  const rows: TranscriptWordRow[] = [];
  let from = 0;

  while (true) {
    const to = from + WORD_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("transcript_words")
      .select("word_id, utterance_id, speaker_id, start_time, end_time, confidence, reviewed, edited, text, raw_text, ordinal, word_index, working_text, removed")
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

  return rows.filter((row) => !row.removed);
}

async function resolveMediaUrl(
  supabase: SupabaseClient<Database>,
  transcript: TranscriptRow,
): Promise<string> {
  const { data, error } = await supabase
    .from("case_audio")
    .select("storage_path, media_url, uploaded_at")
    .eq("case_id", transcript.case_id)
    .order("uploaded_at", { ascending: false })
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

  return respondJson(200, response);
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

  return respondJson(200, { ok: true });
}

async function handlePutSpeakers(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateSpeakersPayload(body);
  const transcriptId = context.transcript.transcript_id;
  const speakerMapConfirmed = payload.speakers.length > 0 && payload.speakers.every((speaker) => {
    return speaker.display_name.trim().length > 0 && Boolean(speaker.role);
  });

  for (const speaker of payload.speakers) {
    const normalizedRole = normalizeSpeakerRoleForDatabase(speaker.role);
    const updateResult = await context.supabase
      .from("transcript_speakers")
      .update({
        display_name: speaker.display_name,
        assigned_name: speaker.display_name,
        speaker_label: speaker.display_name,
        role: normalizedRole,
        speaker_role: normalizedRole,
      })
      .eq("transcript_id", transcriptId)
      .eq("speaker_id", speaker.speaker_id);

    if (updateResult.error) {
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

      await appendAuditRows(context, [{
        utterance_id: assignment.utterance_id,
        word_id: null,
        source: "workspace",
        action: "assign_speaker",
        old_text: "speaker reassignment",
        new_text: assignment.speaker_id,
        before_text: "speaker reassignment",
        after_text: assignment.speaker_id,
      }]);
    }
  }

  const transcriptResult = await context.supabase
    .from("transcripts")
    .update({ speaker_map_confirmed: speakerMapConfirmed })
    .eq("transcript_id", transcriptId);

  if (transcriptResult.error) {
    throw new HttpError(500, "failed to save speakers");
  }

  return respondJson(200, { ok: true });
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

function matchRoute(request: Request): RouteMatch | null {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const functionsIndex = parts.indexOf("editor-api");
  const routeParts = functionsIndex >= 0 ? parts.slice(functionsIndex + 1) : parts;

  if (routeParts.length === 2 && request.method === "GET" && routeParts[1] === "document") {
    return { kind: "document", jobId: routeParts[0] };
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
