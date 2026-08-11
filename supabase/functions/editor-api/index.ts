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
  resolveSpeakerDisplayName,
  UNIDENTIFIED_SPEAKER,
} from "../../../src/lib/transcript/resolveSpeakerDisplayName.ts";

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
  deepgram_speaker: number | null;
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
  excluded_from_output?: boolean | null;
  exclusion_reason?: string | null;
  is_synthetic?: boolean | null;
  text?: string | null;
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
  ai_suggestion?: string | null;
  ai_suggestion_reason?: string | null;
  ai_confidence?: number | null;
  ai_suggestion_status?: string | null;
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
  | { kind: "structure"; jobId: string }
  | { kind: "suggestions"; jobId: string }
  | { kind: "resolveSuggestion"; jobId: string; suggestionId: string }
  | { kind: "aiSuggestions"; jobId: string }
  | { kind: "aiSuggestionAction"; jobId: string; wordId: string }
  | { kind: "aiSuggestionAcceptAll"; jobId: string }
  | { kind: "aiReview"; jobId: string }
  | { kind: "corrections"; jobId: string }
  | { kind: "correctionDecide"; jobId: string; correctionId: string }
  | { kind: "exhibits"; jobId: string }
  | { kind: "certifyStatus"; jobId: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, PUT, POST, PATCH, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CASE_FILES_BUCKET = "case-files";
const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60; // 6h supports long review sessions without mid-session expiry.
const WORD_PAGE_SIZE = 1000;
const UTTERANCE_PAGE_SIZE = 1000;
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

    if (requiresUnlockedTranscript(match)) {
      await requireUnlockedTranscript(context);
    }

    switch (match.kind) {
      case "document":
        return handleGetDocument(context);
      case "working":
        return handlePutWorking(context);
      case "review":
        return handlePutReview(context);
      case "speakers":
        return request.method === "POST"
          ? handlePostSpeaker(context)
          : handlePutSpeakers(context);
      case "structure":
        return handlePutStructure(context);
      case "suggestions":
        return handleGetSuggestions(context);
      case "resolveSuggestion":
        return handleResolveSuggestion(context);
      case "aiSuggestions":
        return handleGetAiSuggestions(context);
      case "aiSuggestionAction":
        return handlePatchAiSuggestion(context, match.wordId);
      case "aiSuggestionAcceptAll":
        return handleAcceptAllAiSuggestions(context);
      case "aiReview":
        return handleForceAiReview(context);
      case "corrections":
        return handleGetCorrections(context);
      case "correctionDecide":
        return handleDecideCorrection(context, match.correctionId);
      case "exhibits":
        return handleGetExhibits(context);
      case "certifyStatus":
        return handleGetCertifyStatus(context);
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

function requiresUnlockedTranscript(match: RouteMatch): boolean {
  return match.kind === "working"
    || match.kind === "review"
    || match.kind === "speakers"
    || match.kind === "structure"
    || match.kind === "resolveSuggestion"
    || match.kind === "aiSuggestionAction"
    || match.kind === "aiSuggestionAcceptAll"
    || match.kind === "aiReview"
    || match.kind === "correctionDecide";
}

async function requireUnlockedTranscript(context: RouteContext): Promise<void> {
  const { data, error } = await context.supabase
    .from("case_certifications")
    .select("certification_date")
    .eq("case_id", context.transcript.case_id)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "failed to verify certification lock");
  }

  if (data?.certification_date) {
    throw new HttpError(409, "certified transcript is locked");
  }
}

async function requireTranscript(
  supabase: SupabaseClient<Database>,
  routeId: string,
): Promise<TranscriptRow> {
  const byTranscriptId = await supabase
    .from("transcripts")
    .select("transcript_id, case_id, job_id, media_url, duration, duration_seconds")
    .eq("transcript_id", routeId)
    .maybeSingle();

  if (byTranscriptId.error) {
    throw new HttpError(500, "failed to load transcript");
  }

  if (byTranscriptId.data) {
    return byTranscriptId.data as TranscriptRow;
  }

  const byJobId = await supabase
    .from("transcripts")
    .select("transcript_id, case_id, job_id, media_url, duration, duration_seconds")
    .eq("job_id", routeId)
    .maybeSingle();

  if (byJobId.error) {
    throw new HttpError(500, "failed to load transcript");
  }

  if (!byJobId.data) {
    throw new HttpError(404, "unknown transcript");
  }

  return byJobId.data as TranscriptRow;
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
  // Paginate to defeat PostgREST's default 1000-row cap. Without this, transcripts
  // with >1000 utterances were silently truncated to the first 1000 entries while
  // all words still loaded, stitching later words onto the wrong utterances and
  // producing garbled display text. Mirrors loadWords below.
  const rows: TranscriptUtteranceRow[] = [];
  let from = 0;

  while (true) {
    const to = from + UTTERANCE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("transcript_utterances")
      .select("utterance_id, speaker_id, start_time, end_time, ordinal, utterance_index, excluded_from_output, exclusion_reason, is_synthetic, text")
      .eq("transcript_id", transcriptId)
      .order("utterance_index", { ascending: true })
      .order("ordinal", { ascending: true })
      .range(from, to);

    if (error) {
      throw new HttpError(500, "failed to load utterances");
    }

    const page = (data ?? []) as TranscriptUtteranceRow[];
    rows.push(...page);

    if (page.length < UTTERANCE_PAGE_SIZE) {
      break;
    }

    from += UTTERANCE_PAGE_SIZE;
  }

  return rows;
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
      .select("word_id, utterance_id, speaker_id, start_time, end_time, confidence, reviewed, edited, text, raw_text, ordinal, word_index, working_text, ai_suggestion, ai_suggestion_reason, ai_confidence, ai_suggestion_status, removed")
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
    display_name: resolveSpeakerDisplayName(row),
    deepgram_speaker: row.speaker_index ?? row.deepgram_speaker ?? null,
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
    // Additive wire fields (NOT part of the frozen Utterance TS contract).
    // buildEditorContent reads excluded_from_output via a local cast to hide
    // boundary-excluded (pre/off/post-record) utterances from the working view.
    // Without them the filter is a silent no-op in real-API mode and off-record
    // content leaks into the Workspace — the snapshot path already filters it.
    excluded_from_output: row.excluded_from_output ?? false,
    is_synthetic: row.is_synthetic ?? false,
  } as Utterance;
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
    ai_suggestion: row.ai_suggestion ?? null,
    ai_suggestion_status: row.ai_suggestion_status ?? null,
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

    await context.supabase
      .from("speaker_resolution_current")
      .update({ ai_suggested: false, verified: true })
      .eq("transcript_id", transcriptId)
      .eq("speaker_id", speaker.speaker_id);
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

// DOC-0325 / D1+D3 — persist reviewed structural decisions (line_type + review_status).
// Mirrors the F10 speaker-reassignment write path: owner-scoped via the RLS-bound client,
// atomic per utterance, audit-logged. The reporter is the authority here, so a review write
// deliberately overwrites any prior value. (The invariant that a *proposal/fallback* must not
// overwrite a CONFIRMED/OVERRIDDEN decision is enforced in the render/build layer, Wave 4.)
// This endpoint sets ONLY line_type + line_type_review_status; confidence/reason are proposal
// fields written at classification time, never by a human review write.
const REVIEWED_LINE_TYPES = new Set(["Q", "A", "SP", "PN", "HEADER", "UNKNOWN"]);
const REVIEWED_STATUSES = new Set(["CONFIRMED", "OVERRIDDEN"]);

interface StructureDecision {
  utterance_id: string;
  line_type: string;
  review_status: string;
}

function validateStructurePayload(value: unknown): { decisions: StructureDecision[] } {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "bad payload");
  }
  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.decisions)) {
    throw new HttpError(400, "bad payload");
  }
  const decisions = payload.decisions.map((decision) => {
    if (!decision || typeof decision !== "object") {
      throw new HttpError(400, "bad payload");
    }
    const candidate = decision as Record<string, unknown>;
    if (
      typeof candidate.utterance_id !== "string"
      || typeof candidate.line_type !== "string"
      || typeof candidate.review_status !== "string"
      || !REVIEWED_LINE_TYPES.has(candidate.line_type)
      || !REVIEWED_STATUSES.has(candidate.review_status)
    ) {
      throw new HttpError(400, "bad payload");
    }
    return {
      utterance_id: candidate.utterance_id,
      line_type: candidate.line_type,
      review_status: candidate.review_status,
    };
  });
  return { decisions };
}

async function handlePutStructure(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateStructurePayload(body);
  const transcriptId = context.transcript.transcript_id;

  for (const decision of payload.decisions) {
    const updateResult = await context.supabase
      .from("transcript_utterances")
      .update({
        line_type: decision.line_type,
        line_type_review_status: decision.review_status,
        // A prior manual reassignment flag stays truthful: an OVERRIDDEN structural decision
        // is a manual reassignment of structure.
        manually_reassigned: decision.review_status === "OVERRIDDEN",
      })
      .eq("transcript_id", transcriptId)
      .eq("utterance_id", decision.utterance_id);

    if (updateResult.error) {
      throw new HttpError(500, "failed to save structure");
    }

    await appendAuditRows(context, [{
      utterance_id: decision.utterance_id,
      word_id: null,
      source: "workspace",
      action: "assign_line_type",
      old_text: "structure review",
      new_text: `${decision.line_type}:${decision.review_status}`,
      before_text: "structure review",
      after_text: `${decision.line_type}:${decision.review_status}`,
    }]);
  }

  return respondJson(200, { ok: true });
}

async function handlePostSpeaker(context: RouteContext): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateAddSpeakerPayload(body);
  const normalizedRole = normalizeSpeakerRoleForDatabase(payload.role) ?? "other";
  const speakerId = `spk_synthetic_${Date.now()}`;

  const { data, error } = await context.supabase
    .from("transcript_speakers")
    .insert({
      transcript_id: context.transcript.transcript_id,
      speaker_id: speakerId,
      display_name: payload.display_name,
      role: normalizedRole,
      deepgram_speaker: null,
      speaker_index: null,
      speaker_label: payload.display_name,
      assigned_name: payload.display_name,
      speaker_role: normalizedRole,
    })
    .select("speaker_id, display_name, deepgram_speaker, role, speaker_index, speaker_label, assigned_name, speaker_role")
    .single();

  if (error) {
    console.error("[editor-api] POST speaker failed", {
      route: "POST /:jobId/speakers",
      jobId: context.transcript.transcript_id,
      message: error.message,
    });
    throw new HttpError(500, "failed to create speaker");
  }

  return respondJson(201, { speaker: mapSpeakerRow(data as TranscriptSpeakerRow) });
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

function validateAddSpeakerPayload(value: unknown): {
  display_name: string;
  role?: Speaker["role"];
} {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "bad payload");
  }

  const payload = value as Record<string, unknown>;
  const displayName = typeof payload.display_name === "string" ? payload.display_name.trim() : "";
  const role = payload.role;

  if (!displayName) {
    throw new HttpError(400, "display_name is required");
  }

  if (
    role !== undefined
    && role !== "REPORTER"
    && role !== "WITNESS"
    && role !== "ATTORNEY"
    && role !== "INTERPRETER"
    && role !== "OTHER"
  ) {
    throw new HttpError(400, "bad payload");
  }

  return {
    display_name: displayName,
    role: role as Speaker["role"] | undefined,
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
  action: "assign_speaker" | "assign_line_type" | "ai_suggestion_accepted" | "ai_suggestion_rejected";
  old_text: string | null;
  new_text: string | null;
  before_text: string | null;
  after_text: string | null;
};

async function handlePatchAiSuggestion(
  context: RouteContext,
  wordId: string,
): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateAiSuggestionActionPayload(body);
  const transcriptId = context.transcript.transcript_id;

  const { data, error } = await context.supabase
    .from("transcript_words")
    .select("word_id, raw_text, text, working_text, ai_suggestion, ai_suggestion_status, utterance_id")
    .eq("transcript_id", transcriptId)
    .eq("word_id", wordId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "failed to load ai suggestion");
  }

  if (!data) {
    throw new HttpError(404, "unknown ai suggestion");
  }

  const row = data as {
    word_id: string;
    raw_text: string;
    text: string;
    working_text?: string | null;
    ai_suggestion?: string | null;
    ai_suggestion_status?: string | null;
    utterance_id: string;
  };

  if (!row.ai_suggestion) {
    throw new HttpError(404, "unknown ai suggestion");
  }

  if (payload.action === "accept") {
    const nextText = row.ai_suggestion;
    const updateResult = await context.supabase
      .from("transcript_words")
      .update({
        working_text: nextText === row.raw_text ? null : nextText,
        text: nextText,
        edited: nextText !== row.raw_text,
        ai_suggestion_status: "accepted",
      })
      .eq("transcript_id", transcriptId)
      .eq("word_id", wordId);

    if (updateResult.error) {
      throw new HttpError(500, "failed to accept ai suggestion");
    }

    await appendAuditRows(context, [{
      utterance_id: row.utterance_id,
      word_id: row.word_id,
      source: "ai_review",
      action: "ai_suggestion_accepted",
      old_text: row.working_text ?? row.raw_text,
      new_text: nextText,
      before_text: row.working_text ?? row.raw_text,
      after_text: nextText,
    }]);

    return respondJson(200, { ok: true });
  }

  const rejectResult = await context.supabase
    .from("transcript_words")
    .update({ ai_suggestion_status: "rejected" })
    .eq("transcript_id", transcriptId)
    .eq("word_id", wordId);

  if (rejectResult.error) {
    throw new HttpError(500, "failed to reject ai suggestion");
  }

  await appendAuditRows(context, [{
    utterance_id: row.utterance_id,
    word_id: row.word_id,
    source: "ai_review",
    action: "ai_suggestion_rejected",
    old_text: row.working_text ?? row.raw_text,
    new_text: row.ai_suggestion,
    before_text: row.working_text ?? row.raw_text,
    after_text: row.ai_suggestion,
  }]);

  return respondJson(200, { ok: true });
}

type PendingAISuggestionRow = {
  word_id: string;
  utterance_id: string;
  raw_text: string;
  ai_suggestion: string | null;
  ai_suggestion_reason: string | null;
  ai_confidence: number | null;
};

async function handleGetAiSuggestions(context: RouteContext): Promise<Response> {
  const transcriptId = context.transcript.transcript_id;
  const [wordsResult, utterancesResult] = await Promise.all([
    context.supabase
      .from("transcript_words")
      .select("word_id, utterance_id, raw_text, ai_suggestion, ai_suggestion_reason, ai_confidence")
      .eq("transcript_id", transcriptId)
      .eq("ai_suggestion_status", "pending")
      .order("ai_confidence", { ascending: false }),
    context.supabase
      .from("transcript_utterances")
      .select("utterance_id, text")
      .eq("transcript_id", transcriptId),
  ]);

  if (wordsResult.error || utterancesResult.error) {
    throw new HttpError(500, "failed to load ai suggestions");
  }

  const utteranceTextById = new Map(
    ((utterancesResult.data ?? []) as Array<{ utterance_id: string; text?: string | null }>).map((row) => [
      row.utterance_id,
      row.text ?? "",
    ]),
  );

  const suggestions = ((wordsResult.data ?? []) as PendingAISuggestionRow[]).map((row) => ({
    word_id: row.word_id,
    utterance_id: row.utterance_id,
    raw_text: row.raw_text,
    ai_suggestion: row.ai_suggestion ?? "",
    ai_suggestion_reason: row.ai_suggestion_reason ?? "",
    ai_confidence: row.ai_confidence ?? 0,
    utterance_raw_text: utteranceTextById.get(row.utterance_id) ?? "",
  }));

  return respondJson(200, suggestions);
}

async function handleAcceptAllAiSuggestions(context: RouteContext): Promise<Response> {
  const transcriptId = context.transcript.transcript_id;
  const { data, error } = await context.supabase
    .from("transcript_words")
    .select("word_id, utterance_id, raw_text, ai_suggestion")
    .eq("transcript_id", transcriptId)
    .eq("ai_suggestion_status", "pending");

  if (error) {
    throw new HttpError(500, "failed to load ai suggestions");
  }

  const rows = (data ?? []) as Array<{
    word_id: string;
    utterance_id: string;
    raw_text: string;
    ai_suggestion: string | null;
  }>;

  if (rows.length === 0) {
    return respondJson(200, { accepted_count: 0 });
  }

  for (const row of rows) {
    const nextText = row.ai_suggestion ?? row.raw_text;
    const updateResult = await context.supabase
      .from("transcript_words")
      .update({
        working_text: nextText === row.raw_text ? null : nextText,
        text: nextText,
        edited: nextText !== row.raw_text,
        ai_suggestion_status: "accepted",
      })
      .eq("transcript_id", transcriptId)
      .eq("word_id", row.word_id);

    if (updateResult.error) {
      throw new HttpError(500, "failed to accept all ai suggestions");
    }
  }

  await appendAuditRows(context, [{
    utterance_id: null,
    word_id: null,
    source: "ai_review",
    action: "ai_suggestion_accepted",
    old_text: `${rows.length} pending ai suggestion(s)`,
    new_text: "accepted",
    before_text: `${rows.length} pending ai suggestion(s)`,
    after_text: "accepted",
  }]);

  return respondJson(200, { accepted_count: rows.length });
}

async function handleForceAiReview(context: RouteContext): Promise<Response> {
  const transcriptId = context.transcript.transcript_id;

  const { error: clearSuggestionsError } = await context.supabase
    .from("transcript_words")
    .update({
      ai_suggestion: null,
      ai_suggestion_reason: null,
      ai_confidence: null,
      ai_suggestion_status: null,
    })
    .eq("transcript_id", transcriptId)
    .eq("ai_suggestion_status", "pending");

  if (clearSuggestionsError) {
    throw new HttpError(500, "failed to clear pending ai suggestions");
  }

  const { error: resetMetaError } = await context.supabase
    .from("transcripts")
    .update({ ai_review_meta: null })
    .eq("transcript_id", transcriptId);

  if (resetMetaError) {
    throw new HttpError(500, "failed to reset ai review meta");
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new HttpError(500, "server misconfigured");
  }

  const aiReviewUrl = `${supabaseUrl}/functions/v1/ai-review`;
  void fetch(aiReviewUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
    body: JSON.stringify({
      transcript_id: transcriptId,
      force_rerun: true,
    }),
  }).catch((error) => {
    console.error("[editor-api] force ai-review trigger failed", {
      transcriptId,
      message: error instanceof Error ? error.message : String(error),
    });
  });

  return respondJson(202, { status: "re-review triggered" });
}

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

function validateAiSuggestionActionPayload(value: unknown): {
  action: "accept" | "reject";
} {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "bad payload");
  }

  const payload = value as Record<string, unknown>;
  if (payload.action !== "accept" && payload.action !== "reject") {
    throw new HttpError(400, "bad payload");
  }

  return {
    action: payload.action,
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
  const [unreviewedCount, lowConfidenceUnreviewedCount, speakerRows] = await Promise.all([
    countUnreviewedWords(context.supabase, context.transcript.transcript_id),
    countLowConfidenceUnreviewedWords(context.supabase, context.transcript.transcript_id),
    loadSpeakers(context.supabase, context.transcript.transcript_id),
  ]);

  const checklist: CertifyChecklist = {
    review_complete: unreviewedCount === 0,
    speaker_mapping_complete: speakerRows.every((speaker) => {
      const isIdentified = resolveSpeakerDisplayName(speaker) !== UNIDENTIFIED_SPEAKER;
      return isIdentified && Boolean(normalizeSpeakerRole(speaker.speaker_role ?? speaker.role));
    }),
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

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "working") {
    return { kind: "working", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "review") {
    return { kind: "review", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 2
    && (request.method === "PUT" || request.method === "POST")
    && routeParts[1] === "speakers"
  ) {
    return { kind: "speakers", jobId: routeParts[0] };
  }

  if (routeParts.length === 2 && request.method === "PUT" && routeParts[1] === "structure") {
    return { kind: "structure", jobId: routeParts[0] };
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

  if (
    routeParts.length === 2
    && request.method === "GET"
    && routeParts[1] === "ai-suggestions"
  ) {
    return { kind: "aiSuggestions", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 3
    && request.method === "PATCH"
    && routeParts[1] === "ai-suggestions"
  ) {
    return {
      kind: "aiSuggestionAction",
      jobId: routeParts[0],
      wordId: routeParts[2],
    };
  }

  if (
    routeParts.length === 3
    && request.method === "POST"
    && routeParts[1] === "ai-suggestions"
    && routeParts[2] === "accept-all"
  ) {
    return {
      kind: "aiSuggestionAcceptAll",
      jobId: routeParts[0],
    };
  }

  if (
    routeParts.length === 2
    && request.method === "POST"
    && routeParts[1] === "ai-review"
  ) {
    return {
      kind: "aiReview",
      jobId: routeParts[0],
    };
  }

  if (routeParts.length === 2 && request.method === "GET" && routeParts[1] === "corrections") {
    return { kind: "corrections", jobId: routeParts[0] };
  }

  if (
    routeParts.length === 4
    && request.method === "POST"
    && routeParts[1] === "corrections"
    && routeParts[3] === "decide"
  ) {
    return { kind: "correctionDecide", jobId: routeParts[0], correctionId: routeParts[2] };
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

// ── ATIA CorrectionObject endpoints (§4.8 / §4.9) ──────────────────────────

type CorrectionRow = {
  id: string;
  transcript_id: string;
  case_id: string;
  specialty: string;
  prompt_version: string;
  context_hash: string | null;
  location: Record<string, unknown>;
  change: Record<string, unknown>;
  reason: string;
  reason_kind: string;
  confidence: number;
  confidence_source: string | null;
  provenance: Record<string, unknown>;
  supporting_evidence: unknown;
  review: Record<string, unknown>;
  downstream: Record<string, unknown>;
  owner_user_id: string | null;
  created_at: string;
};

const CORRECTION_COLUMNS =
  "id, transcript_id, case_id, specialty, prompt_version, context_hash, location, change, reason, reason_kind, confidence, confidence_source, provenance, supporting_evidence, review, downstream, owner_user_id, created_at";

async function handleGetCorrections(context: RouteContext): Promise<Response> {
  const url = new URL(context.request.url);
  const stateFilter = url.searchParams.get("state"); // optional: pending|accepted|...

  let query = context.supabase
    .from("corrections")
    .select(CORRECTION_COLUMNS)
    .eq("transcript_id", context.transcript.transcript_id)
    .order("created_at", { ascending: true });

  if (stateFilter) {
    query = query.eq("review->>state", stateFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw new HttpError(500, "failed to load corrections");
  }

  // Rows already carry the CorrectionObject shape (JSONB columns rehydrate to
  // objects); return them as-is so the panel consumes the same contract the
  // validator enforced on write.
  return respondJson(200, data ?? []);
}

type DecidePayload = {
  action: "accept" | "reject" | "edit";
  decision_note?: string | null;
  final_value?: Record<string, unknown> | null;
  context?: {
    time_to_decide_ms?: number | null;
    audio_played?: boolean | null;
    navigated_to_location?: boolean | null;
  };
};

function validateDecidePayload(value: unknown): DecidePayload {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "bad payload");
  }
  const payload = value as Record<string, unknown>;
  if (payload.action !== "accept" && payload.action !== "reject" && payload.action !== "edit") {
    throw new HttpError(400, "bad payload");
  }
  if (payload.action === "edit" && (!payload.final_value || typeof payload.final_value !== "object")) {
    throw new HttpError(400, "edit requires final_value");
  }
  const ctx = (payload.context && typeof payload.context === "object" ? payload.context : {}) as Record<string, unknown>;
  return {
    action: payload.action,
    decision_note: typeof payload.decision_note === "string" ? payload.decision_note : null,
    final_value: (payload.final_value && typeof payload.final_value === "object") ? payload.final_value as Record<string, unknown> : null,
    context: {
      time_to_decide_ms: typeof ctx.time_to_decide_ms === "number" ? ctx.time_to_decide_ms : null,
      audio_played: typeof ctx.audio_played === "boolean" ? ctx.audio_played : null,
      navigated_to_location: typeof ctx.navigated_to_location === "boolean" ? ctx.navigated_to_location : null,
    },
  };
}

const TEXT_CHANGE_TYPES = new Set(["proper_name_correction", "medical_term_correction", "contextual_number_flag"]);

async function handleDecideCorrection(context: RouteContext, correctionId: string): Promise<Response> {
  const body = await parseJsonBody(context.request);
  const payload = validateDecidePayload(body);
  const transcriptId = context.transcript.transcript_id;

  const { data, error } = await context.supabase
    .from("corrections")
    .select(CORRECTION_COLUMNS)
    .eq("transcript_id", transcriptId)
    .eq("id", correctionId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, "failed to load correction");
  }
  if (!data) {
    throw new HttpError(404, "unknown correction");
  }

  const correction = data as CorrectionRow;
  const fromState = typeof correction.review?.state === "string" ? String(correction.review.state) : "pending";
  const toState = payload.action === "accept" ? "accepted" : payload.action === "reject" ? "rejected" : "edited";
  const now = new Date().toISOString();
  const finalValue = payload.action === "edit" ? (payload.final_value ?? null) : null;

  // Apply accepted/edited corrections to the working transcript (best effort:
  // an apply failure is surfaced as applied=false, the decision still records).
  let applied = false;
  let applyError: string | null = null;
  let pendingReason: string | null = null;
  if (toState === "accepted" || toState === "edited") {
    try {
      const outcome = await applyCorrection(context, correction, finalValue);
      applied = outcome.applied;
      pendingReason = outcome.pendingReason ?? null;
    } catch (err) {
      applyError = err instanceof Error ? err.message : String(err);
    }
  }

  const newReview = {
    ...correction.review,
    state: toState,
    decided_at: now,
    decision_note: payload.decision_note ?? null,
    final_value: finalValue,
  };
  const newDownstream = {
    ...correction.downstream,
    applied_to_working_transcript: applied,
    applied_at: applied ? now : (correction.downstream?.applied_at ?? null),
    // Explicit deferral signal so the panel can show "accepted — will apply
    // when structural support ships" instead of looking like a silent no-op.
    pending_reason: applied ? null : pendingReason,
  };

  const updateResult = await context.supabase
    .from("corrections")
    .update({ review: newReview, downstream: newDownstream })
    .eq("transcript_id", transcriptId)
    .eq("id", correctionId);
  if (updateResult.error) {
    throw new HttpError(500, "failed to update correction");
  }

  const decisionInsert = await context.supabase
    .from("correction_decisions")
    .insert({
      correction_id: correctionId,
      transcript_id: transcriptId,
      case_id: context.transcript.case_id,
      from_state: fromState,
      to_state: toState,
      decision_note: payload.decision_note ?? null,
      final_value: finalValue,
      time_to_decide_ms: payload.context?.time_to_decide_ms ?? null,
      audio_played: payload.context?.audio_played ?? null,
      navigated_to_location: payload.context?.navigated_to_location ?? null,
      // Set explicitly (not via the auth.uid() column default) so the decision
      // records correctly under both a reporter JWT and a service-role caller.
      owner_user_id: correction.owner_user_id,
    });
  if (decisionInsert.error) {
    throw new HttpError(500, "failed to record correction decision");
  }

  return respondJson(200, { ok: true, state: toState, applied, pending_reason: newDownstream.pending_reason, apply_error: applyError });
}

// Deferred structural change types: accepted + recorded, but their canonical
// restructuring waits for the v2 apply engine. The panel reads pending_reason.
const STRUCTURAL_DEFER_REASON = "structural_apply_engine_v2";
const DEFERRED_STRUCTURAL_TYPES = new Set([
  "qa_split",
  "objection_split",
  "examination_section_change",
  "off_record_boundary_mark",
  "objection_attribution",
]);

// Applies the correction to the working transcript. `applied=false` with a
// `pendingReason` means "accepted, apply deferred" (not a failure).
async function applyCorrection(
  context: RouteContext,
  correction: CorrectionRow,
  finalValue: Record<string, unknown> | null,
): Promise<{ applied: boolean; pendingReason?: string }> {
  const change = correction.change ?? {};
  const changeType = String(change.type ?? "");

  if (TEXT_CHANGE_TYPES.has(changeType)) {
    const afterText = typeof finalValue?.after === "string"
      ? finalValue.after
      : (typeof change.after === "string" ? change.after : "");
    if (!afterText) return { applied: false };
    return { applied: await applyTextCorrectionWorking(context, correction.location, afterText) };
  }

  if (changeType === "speaker_reassignment") {
    const structural = (finalValue?.structural_change && typeof finalValue.structural_change === "object")
      ? finalValue.structural_change as Record<string, unknown>
      : (change.structural_change && typeof change.structural_change === "object" ? change.structural_change as Record<string, unknown> : null);
    if (!structural) return { applied: false };
    return { applied: await applySpeakerCorrection(context, correction.location, structural) };
  }

  if (DEFERRED_STRUCTURAL_TYPES.has(changeType)) {
    return { applied: false, pendingReason: STRUCTURAL_DEFER_REASON };
  }

  return { applied: false };
}

async function applyTextCorrectionWorking(
  context: RouteContext,
  location: Record<string, unknown>,
  afterText: string,
): Promise<boolean> {
  const transcriptId = context.transcript.transcript_id;
  const startId = String(location.start_word_id ?? "");
  const endId = String(location.end_word_id ?? "");
  if (!startId || !endId) return false;

  const endpointRes = await context.supabase
    .from("transcript_words")
    .select("word_id, word_index")
    .eq("transcript_id", transcriptId)
    .in("word_id", [startId, endId]);
  if (endpointRes.error) {
    throw new HttpError(500, "failed to resolve correction range");
  }
  const endpoints = (endpointRes.data ?? []) as Array<{ word_id: string; word_index: number }>;
  const startIdx = endpoints.find((w) => w.word_id === startId)?.word_index;
  const endIdx = endpoints.find((w) => w.word_id === endId)?.word_index;
  if (startIdx == null || endIdx == null) {
    throw new HttpError(422, "correction location words not found");
  }

  const rangeRes = await context.supabase
    .from("transcript_words")
    .select("word_id, raw_text, word_index")
    .eq("transcript_id", transcriptId)
    .gte("word_index", Math.min(startIdx, endIdx))
    .lte("word_index", Math.max(startIdx, endIdx))
    .order("word_index", { ascending: true });
  if (rangeRes.error) {
    throw new HttpError(500, "failed to load correction range");
  }
  const words = (rangeRes.data ?? []) as Array<{ word_id: string; raw_text: string }>;
  if (words.length === 0) return false;

  // Distribute the replacement across the word range (last word absorbs the
  // remainder), mirroring the working-text save path so multi-word names apply
  // cleanly without orphaning tokens.
  const tokens = afterText.trim().length > 0 ? afterText.trim().split(/\s+/) : [""];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const nextText = i < words.length - 1 ? (tokens[i] ?? "") : tokens.slice(i).join(" ");
    const workingText = nextText === word.raw_text ? null : nextText;
    const upd = await context.supabase
      .from("transcript_words")
      .update({ working_text: workingText, text: workingText ?? word.raw_text, edited: Boolean(workingText) })
      .eq("transcript_id", transcriptId)
      .eq("word_id", word.word_id);
    if (upd.error) {
      throw new HttpError(500, "failed to apply correction");
    }
  }
  return true;
}

async function applySpeakerCorrection(
  context: RouteContext,
  location: Record<string, unknown>,
  structural: Record<string, unknown>,
): Promise<boolean> {
  const transcriptId = context.transcript.transcript_id;
  const utteranceId = String(location.paragraph_id ?? "");
  if (!utteranceId) return false;

  const uttRes = await context.supabase
    .from("transcript_utterances")
    .select("speaker_id")
    .eq("transcript_id", transcriptId)
    .eq("utterance_id", utteranceId)
    .maybeSingle();
  if (uttRes.error || !uttRes.data) {
    throw new HttpError(422, "correction paragraph not found");
  }
  const speakerId = String((uttRes.data as { speaker_id: string }).speaker_id);

  const displayName = typeof structural.display_name === "string" ? structural.display_name.trim() : "";
  const roleRaw = typeof structural.new_speaker_role === "string" ? structural.new_speaker_role : "";
  const normalizedRole = normalizeSpeakerRoleForDatabase(
    (roleRaw.toUpperCase() as SpeakersPayload["speakers"][number]["role"]),
  );

  const update: Record<string, unknown> = {};
  if (displayName) {
    update.assigned_name = displayName;
    update.display_name = displayName;
    update.speaker_label = displayName;
  }
  if (normalizedRole) {
    update.role = normalizedRole;
    update.speaker_role = normalizedRole;
  }
  if (Object.keys(update).length === 0) return false;

  const speakerUpd = await context.supabase
    .from("transcript_speakers")
    .update(update)
    .eq("transcript_id", transcriptId)
    .eq("speaker_id", speakerId);
  if (speakerUpd.error) {
    throw new HttpError(500, "failed to apply speaker correction");
  }
  return true;
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
