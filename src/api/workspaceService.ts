import type {
  CertifyChecklist,
  EditorDocument,
  Exhibit,
  ReviewPayload,
  SaveWorkingPayload,
  SaveWorkingResponse,
  Speaker,
  SpeakersPayload,
} from "./types";
import { api as contractApi, type PendingAISuggestion } from "./client";
import { getSignedUrl } from "./fileService";
import { isRealApiMode } from "../lib/runtime/mode";
import {
  getLatestCompletedTranscriptJob,
  getTranscriptJobByJobId,
  getTranscriptJobByTranscriptId,
  listTranscriptJobs,
  loadTranscriptSnapshot,
  updateTranscriptJob,
  type TranscriptJobRow,
} from "./transcriptRepository";
import { getSupabaseClient } from "../lib/supabase";
import type { TranscriptionJobRecord } from "../lib/transcriptionJobs";

const USE_MOCK_WORKSPACE = import.meta.env.VITE_USE_MOCKS === "true";

export interface WorkspaceLoadResult {
  document: EditorDocument;
  updatedAt: string | null;
  speakerMapConfirmed: boolean;
  pipelineState: string | null;
  audioSegments: WorkspaceAudioSegment[];
}

export interface WorkspaceAudioSegment {
  sourceIndex: number;
  sourceFilename: string;
  startOffsetSeconds: number;
  durationSeconds: number;
  mediaUrl: string;
}

export interface WorkspaceMutationOptions {
  lastKnownUpdatedAt?: string | null;
}

export interface WorkspaceSaveResult extends SaveWorkingResponse {
  updatedAt: string | null;
}

export interface WorkspaceMutationResult {
  ok: true;
  updatedAt: string | null;
  speakerMapConfirmed?: boolean;
  pipelineState?: string | null;
}

type CaseAudioLookupRow = {
  storage_path: string | null;
  media_url: string | null;
};

type TranscriptionJobLookupRow = Pick<TranscriptionJobRecord, "source_audio_id">;

function mapSpeakerRole(role: string | null | undefined): Speaker["role"] | undefined {
  switch (role) {
    case "court_reporter":
    case "reporter":
      return "REPORTER";
    case "witness":
      return "WITNESS";
    case "attorney":
    case "examining_attorney":
    case "defending_attorney":
      return "ATTORNEY";
    case "interpreter":
      return "INTERPRETER";
    case "other":
      return "OTHER";
    default:
      return undefined;
  }
}

function buildEditorDocumentFromSnapshot(
  snapshot: NonNullable<Awaited<ReturnType<typeof loadTranscriptSnapshot>>>,
  mediaUrl: string,
): EditorDocument {
  const speakerResolutionById = new Map(
    snapshot.speakerResolutions.map((resolution) => [resolution.speaker_id, resolution]),
  );
  const visibleUtterances = snapshot.utterances.filter((utterance) => !utterance.excluded_from_output);
  const visibleUtteranceIds = new Set(visibleUtterances.map((utterance) => utterance.utterance_id));
  const wordIdsByUtterance = new Map<string, string[]>();
  for (const word of snapshot.words) {
    if (word.removed || !visibleUtteranceIds.has(word.utterance_id)) {
      continue;
    }
    const ids = wordIdsByUtterance.get(word.utterance_id) ?? [];
    ids.push(word.word_id);
    wordIdsByUtterance.set(word.utterance_id, ids);
  }

  return {
    job_id: snapshot.job.transcript_id,
    media_url: mediaUrl,
    duration: snapshot.job.duration_seconds ?? snapshot.job.duration ?? 0,
    speakers: snapshot.speakers.map((speaker) => ({
      speaker_id: speaker.speaker_id,
      display_name: speaker.assigned_name || speaker.speaker_label || speaker.display_name,
      deepgram_speaker: speaker.speaker_index ?? speaker.deepgram_speaker ?? null,
      role: mapSpeakerRole(speaker.speaker_role || speaker.role),
      ai_suggested: speakerResolutionById.get(speaker.speaker_id)?.ai_suggested ?? false,
      ai_suggestion_reason: speakerResolutionById.get(speaker.speaker_id)?.evidence ?? "",
    })) as EditorDocument["speakers"],
    utterances: visibleUtterances.map((utterance) => ({
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      start_time: utterance.start_time,
      end_time: utterance.end_time,
      word_ids: wordIdsByUtterance.get(utterance.utterance_id) ?? [],
    })),
    words: snapshot.words
      .filter((word) => !word.removed && visibleUtteranceIds.has(word.utterance_id))
      .map((word) => ({
        word_id: word.word_id,
        text: word.working_text ?? word.raw_text,
        raw_text: word.raw_text,
        working_text: word.working_text,
        ai_suggestion: word.ai_suggestion ?? null,
        ai_suggestion_status: word.ai_suggestion_status ?? null,
        speaker_id: word.speaker_id,
        utterance_id: word.utterance_id,
        start_time: word.start_time,
        end_time: word.end_time,
        confidence: word.confidence,
        reviewed: word.reviewed,
        edited: Boolean(word.working_text && word.working_text !== word.raw_text),
      })),
  };
}

async function resolveWorkspaceTarget(value: string): Promise<TranscriptJobRow | null> {
  const byTranscriptId = await getTranscriptJobByTranscriptId(value);
  if (byTranscriptId) {
    return byTranscriptId;
  }

  const byJobId = await getTranscriptJobByJobId(value);
  if (byJobId) {
    return byJobId;
  }

  return getLatestCompletedTranscriptJob(value);
}

async function loadWorkspaceDocument(caseId: string): Promise<WorkspaceLoadResult> {
  const target = await resolveWorkspaceTarget(caseId);
  if (!target) {
    throw new Error("No transcript has been generated for this case yet.");
  }

  const snapshot = await loadTranscriptSnapshot(target.job_id);
  if (!snapshot) {
    throw new Error(`Transcript job ${target.job_id} could not be loaded.`);
  }

  const mediaUrl = snapshot.job.media_url
    ? await getSignedUrl(snapshot.job.media_url)
    : await resolveSourceAudioFallbackMediaUrl(snapshot.job);

  const audioSegments = await loadAudioSegments(snapshot.job, mediaUrl);

  return {
    document: buildEditorDocumentFromSnapshot(snapshot, mediaUrl),
    updatedAt: snapshot.job.updated_at,
    speakerMapConfirmed: snapshot.job.speaker_map_confirmed,
    pipelineState: snapshot.job.pipeline_state ?? null,
    audioSegments,
  };
}

async function loadAudioSegments(
  target: TranscriptJobRow,
  fallbackMediaUrl: string,
): Promise<WorkspaceAudioSegment[]> {
  if (target.raw_storage_path?.endsWith("_multifile_manifest.json")) {
    const client = await getSupabaseClient("loadAudioSegments");
    const { data, error } = await client.storage
      .from("case-files")
      .download(target.raw_storage_path);

    if (!error) {
      const manifest = JSON.parse(await data.text()) as {
        sources?: Array<{
          source_index: number;
          source_filename: string;
          start_offset_seconds: number;
          duration_seconds: number;
          storage_path: string | null;
        }>;
      };

      if (Array.isArray(manifest.sources) && manifest.sources.length > 0) {
        return Promise.all(
          manifest.sources.map(async (source) => ({
            sourceIndex: source.source_index,
            sourceFilename: source.source_filename,
            startOffsetSeconds: source.start_offset_seconds,
            durationSeconds: source.duration_seconds,
            mediaUrl: source.storage_path ? await getSignedUrl(source.storage_path) : "",
          })),
        );
      }
    }
  }

  return [{
    sourceIndex: 0,
    sourceFilename: target.source_filename ?? "Source 1",
    startOffsetSeconds: 0,
    durationSeconds: target.duration_seconds ?? target.duration ?? 0,
    mediaUrl: fallbackMediaUrl,
  }];
}

async function resolveSourceAudioFallbackMediaUrl(target: TranscriptJobRow): Promise<string> {
  const sourceAudioId = await resolveSourceAudioId(target);
  if (!sourceAudioId) {
    return "";
  }

  const client = await getSupabaseClient("resolveSourceAudioFallbackMediaUrl");
  const { data, error } = await client
    .from("case_audio")
    .select("storage_path, media_url")
    .eq("case_id", target.case_id)
    .eq("audio_id", sourceAudioId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const audio = (data as CaseAudioLookupRow | null) ?? null;
  if (audio?.storage_path) {
    return getSignedUrl(audio.storage_path);
  }

  return audio?.media_url ?? "";
}

async function resolveSourceAudioId(target: TranscriptJobRow): Promise<string | null> {
  if (target.based_on) {
    return target.based_on;
  }

  const client = await getSupabaseClient("resolveSourceAudioId");
  const { data, error } = await client
    .from("transcription_jobs")
    .select("source_audio_id")
    .eq("id", target.job_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return ((data as TranscriptionJobLookupRow | null) ?? null)?.source_audio_id ?? null;
}

function isTransientWorkspaceError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("fetch failed") || message.includes("network") || message.includes("timeout");
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [0, 150, 350];
  let lastError: unknown = null;

  for (const delay of delays) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientWorkspaceError(error) || delay === delays[delays.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function requireFreshTranscript(
  key: string,
  lastKnownUpdatedAt?: string | null,
) {
  const job = await resolveWorkspaceTarget(key);
  if (!job) {
    throw new Error(`Transcript ${key} was not found.`);
  }

  if (lastKnownUpdatedAt && job.updated_at !== lastKnownUpdatedAt) {
    throw new Error("Transcript changed elsewhere — reload.");
  }

  return job;
}

async function appendAuditEntries(entries: Array<{
  transcript_id: string;
  case_id: string;
  job_id: string;
  action: "edit_word" | "mark_reviewed" | "assign_speaker" | "bulk_save";
  utterance_id?: string | null;
  word_id?: string | null;
  before_text?: string | null;
  after_text?: string | null;
}>): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  const client = await getSupabaseClient("appendTranscriptAuditEntries");
  const rows = entries.map((entry, index) => ({
    transcript_id: entry.transcript_id,
    change_id: `chg_${entry.job_id}_${Date.now()}_${index}`,
    utterance_id: entry.utterance_id ?? null,
    word_id: entry.word_id ?? null,
    old_text: entry.before_text ?? null,
    new_text: entry.after_text ?? null,
    source: "workspace",
    suggestion_id: null,
    reviewer_user_id: null,
    case_id: entry.case_id,
    job_id: entry.job_id,
    actor: null,
    action: entry.action,
    before_text: entry.before_text ?? null,
    after_text: entry.after_text ?? null,
  }));

  const { error } = await client.from("transcript_audit_log").insert(rows);
  if (error) {
    throw error;
  }
}

async function naivePersistWorking(
  key: string,
  payload: SaveWorkingPayload,
  options: WorkspaceMutationOptions = {},
): Promise<WorkspaceSaveResult> {
  const job = await requireFreshTranscript(key, options.lastKnownUpdatedAt);
  const snapshot = await loadTranscriptSnapshot(job.job_id);
  if (!snapshot) {
    throw new Error(`Transcript job ${job.job_id} was not found.`);
  }

  return withRetry(async () => {
    const client = await getSupabaseClient("naivePersistWorking");
    let saved = 0;
    const auditEntries: Array<{
      transcript_id: string;
      case_id: string;
      job_id: string;
      action: "edit_word" | "bulk_save";
      utterance_id?: string | null;
      word_id?: string | null;
      before_text?: string | null;
      after_text?: string | null;
    }> = [];

    for (const change of payload.changes) {
      const utteranceWords = snapshot.words
        .filter((word) => word.utterance_id === change.utterance_id && !word.removed);
      if (utteranceWords.length === 0) {
        continue;
      }

      const tokens = change.working_text.trim().length > 0
        ? change.working_text.trim().split(/\s+/)
        : [""];

      for (let index = 0; index < utteranceWords.length; index += 1) {
        const word = utteranceWords[index];
        const beforeText = word.working_text ?? word.raw_text;
        const nextText = index < utteranceWords.length - 1
          ? (tokens[index] ?? "")
          : tokens.slice(index).join(" ");
        const workingText = nextText === word.raw_text ? null : nextText;

        if (beforeText === nextText) {
          continue;
        }

        const { error } = await client
          .from("transcript_words")
          .update({
            working_text: workingText,
            text: workingText ?? word.raw_text,
            edited: Boolean(workingText),
          })
          .eq("job_id", job.job_id)
          .eq("word_id", word.word_id);

        if (error) {
          throw error;
        }

        auditEntries.push({
          transcript_id: snapshot.job.transcript_id,
          case_id: snapshot.job.case_id,
          job_id: job.job_id,
          action: "edit_word",
          utterance_id: change.utterance_id,
          word_id: word.word_id,
          before_text: beforeText,
          after_text: nextText,
        });
      }

      const { error: utteranceError } = await client
        .from("transcript_utterances")
        .update({ text: change.working_text })
        .eq("job_id", job.job_id)
        .eq("utterance_id", change.utterance_id);

      if (utteranceError) {
        throw utteranceError;
      }

      saved += 1;
    }

    if (saved > 0) {
      auditEntries.push({
        transcript_id: snapshot.job.transcript_id,
        case_id: snapshot.job.case_id,
        job_id: job.job_id,
        action: "bulk_save",
        before_text: `${saved} utterance change(s)`,
        after_text: "persisted",
      });
    }
    await appendAuditEntries(auditEntries);

    const updatedJob = await updateTranscriptJob(job.transcript_id, { status: job.status });
    return { saved, updatedAt: updatedJob.updated_at };
  });
}

async function persistReview(
  key: string,
  payload: ReviewPayload,
  options: WorkspaceMutationOptions = {},
): Promise<WorkspaceMutationResult> {
  const job = await requireFreshTranscript(key, options.lastKnownUpdatedAt);

  return withRetry(async () => {
    const client = await getSupabaseClient("persistReview");
    const snapshot = await loadTranscriptSnapshot(job.job_id);
    const wordMap = new Map((snapshot?.words ?? []).map((word) => [word.word_id, word]));

    if (payload.reviewed_word_ids.length > 0) {
      const { error } = await client
        .from("transcript_words")
        .update({ reviewed: true })
        .eq("job_id", job.job_id)
        .in("word_id", payload.reviewed_word_ids);
      if (error) {
        throw error;
      }
    }

    if (payload.unreviewed_word_ids.length > 0) {
      const { error } = await client
        .from("transcript_words")
        .update({ reviewed: false })
        .eq("job_id", job.job_id)
        .in("word_id", payload.unreviewed_word_ids);
      if (error) {
        throw error;
      }
    }

    await appendAuditEntries([
      ...payload.reviewed_word_ids.map((wordId) => ({
        transcript_id: job.transcript_id,
        case_id: job.case_id,
        job_id: job.job_id,
        action: "mark_reviewed" as const,
        word_id: wordId,
        utterance_id: wordMap.get(wordId)?.utterance_id ?? null,
        before_text: wordMap.get(wordId)?.reviewed ? "reviewed" : "unreviewed",
        after_text: "reviewed",
      })),
      ...payload.unreviewed_word_ids.map((wordId) => ({
        transcript_id: job.transcript_id,
        case_id: job.case_id,
        job_id: job.job_id,
        action: "mark_reviewed" as const,
        word_id: wordId,
        utterance_id: wordMap.get(wordId)?.utterance_id ?? null,
        before_text: wordMap.get(wordId)?.reviewed ? "reviewed" : "unreviewed",
        after_text: "unreviewed",
      })),
    ]);

    const updatedJob = await updateTranscriptJob(job.transcript_id, { status: job.status });
    return { ok: true, updatedAt: updatedJob.updated_at };
  });
}

function isSpeakerMapConfirmed(speakers: SpeakersPayload["speakers"]): boolean {
  return speakers.length > 0 && speakers.every((speaker) => {
    const displayName = speaker.display_name.trim();
    return displayName.length > 0 && speaker.role;
  });
}

async function persistSpeakers(
  key: string,
  payload: SpeakersPayload,
  options: WorkspaceMutationOptions = {},
): Promise<WorkspaceMutationResult> {
  const job = await requireFreshTranscript(key, options.lastKnownUpdatedAt);

  return withRetry(async () => {
    const client = await getSupabaseClient("persistSpeakers");
    const auditEntries: Array<{
      transcript_id: string;
      case_id: string;
      job_id: string;
      action: "assign_speaker";
      utterance_id?: string | null;
      word_id?: string | null;
      before_text?: string | null;
      after_text?: string | null;
    }> = [];

    for (const speaker of payload.speakers) {
      const { error } = await client
        .from("transcript_speakers")
        .update({
          assigned_name: speaker.display_name,
          speaker_label: speaker.display_name,
          display_name: speaker.display_name,
          speaker_role: speaker.role ? speaker.role.toLowerCase() : null,
          role: speaker.role ? speaker.role.toLowerCase() : null,
        })
        .eq("job_id", job.job_id)
        .eq("speaker_id", speaker.speaker_id);

      if (error) {
        throw error;
      }

      await client
        .from("speaker_resolution_current")
        .update({ ai_suggested: false, verified: true })
        .eq("transcript_id", job.transcript_id)
        .eq("speaker_id", speaker.speaker_id);

      auditEntries.push({
        transcript_id: job.transcript_id,
        case_id: job.case_id,
        job_id: job.job_id,
        action: "assign_speaker",
        before_text: speaker.speaker_id,
        after_text: `${speaker.display_name}${speaker.role ? ` (${speaker.role})` : ""}`,
      });
    }

    if (payload.utterance_speaker_map) {
      for (const assignment of payload.utterance_speaker_map) {
        const speaker = payload.speakers.find((item) => item.speaker_id === assignment.speaker_id);
        const { error: utteranceError } = await client
          .from("transcript_utterances")
          .update({
            speaker_id: assignment.speaker_id,
            speaker_label: speaker?.display_name ?? assignment.speaker_id,
          })
          .eq("job_id", job.job_id)
          .eq("utterance_id", assignment.utterance_id);

        if (utteranceError) {
          throw utteranceError;
        }

        const { error: wordError } = await client
          .from("transcript_words")
          .update({
            speaker_id: assignment.speaker_id,
          })
          .eq("job_id", job.job_id)
          .eq("utterance_id", assignment.utterance_id);

        if (wordError) {
          throw wordError;
        }

        auditEntries.push({
          transcript_id: job.transcript_id,
          case_id: job.case_id,
          job_id: job.job_id,
          action: "assign_speaker",
          utterance_id: assignment.utterance_id,
          before_text: "speaker reassignment",
          after_text: assignment.speaker_id,
        });
      }
    }

    await appendAuditEntries(auditEntries);

    const updatedJob = await updateTranscriptJob(job.transcript_id, {
      status: job.status,
      speaker_map_confirmed: isSpeakerMapConfirmed(payload.speakers),
    });

    return {
      ok: true,
      updatedAt: updatedJob.updated_at,
      speakerMapConfirmed: updatedJob.speaker_map_confirmed,
      pipelineState: updatedJob.pipeline_state ?? null,
    };
  });
}

async function getTranscriptChecklist(key: string): Promise<CertifyChecklist> {
  const job = await resolveWorkspaceTarget(key);
  if (!job) {
    return {
      review_complete: false,
      speaker_mapping_complete: false,
      confidence_review_complete: false,
    };
  }

  const client = await getSupabaseClient("getTranscriptChecklist");
  const { count, error } = await client
    .from("transcript_words")
    .select("word_id", { count: "exact", head: true })
    .eq("job_id", job.job_id)
    .eq("reviewed", false);

  if (error) {
    throw error;
  }

  const reviewComplete = (count ?? 0) === 0;

  return {
    review_complete: reviewComplete,
    speaker_mapping_complete: job.speaker_map_confirmed,
    confidence_review_complete: reviewComplete,
  };
}

export async function listWorkspaceTranscriptJobs(caseId: string) {
  if (USE_MOCK_WORKSPACE) {
    return [];
  }

  return listTranscriptJobs(caseId);
}

export const workspaceApi = {
  getDocument: async (caseId: string): Promise<WorkspaceLoadResult> => {
    if (USE_MOCK_WORKSPACE) {
      return {
        document: await contractApi.getDocument(caseId),
        updatedAt: null,
        speakerMapConfirmed: false,
        pipelineState: null,
        audioSegments: [],
      };
    }

  if (isRealApiMode()) {
      const target = await resolveWorkspaceTarget(caseId);
      if (!target) {
        throw new Error("No transcript has been generated for this case yet.");
      }

      const document = await contractApi.getDocument(target.transcript_id);
      const mediaUrl = document.media_url || await resolveSourceAudioFallbackMediaUrl(target);
      return {
        document: {
          ...document,
          media_url: mediaUrl,
        },
        updatedAt: target.updated_at,
        speakerMapConfirmed: target.speaker_map_confirmed,
        pipelineState: target.pipeline_state ?? null,
        audioSegments: await loadAudioSegments(target, mediaUrl),
      };
    }

    return loadWorkspaceDocument(caseId);
  },
  saveWorking: async (jobId: string, payload: SaveWorkingPayload, options?: WorkspaceMutationOptions) => {
    if (USE_MOCK_WORKSPACE) {
      return { ...(await contractApi.saveWorking(jobId, payload)), updatedAt: null };
    }

  if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId, options?.lastKnownUpdatedAt);
      const result = await contractApi.saveWorking(target.transcript_id, payload);
      // Post-save re-read: single-writer assumption; RPC-returned token is post-beta hardening.
      const refreshed = await getTranscriptJobByTranscriptId(target.transcript_id);
      return { ...result, updatedAt: refreshed?.updated_at ?? target.updated_at };
    }

    return naivePersistWorking(jobId, payload, options);
  },
  saveReview: async (jobId: string, payload: ReviewPayload, options?: WorkspaceMutationOptions) => {
    if (USE_MOCK_WORKSPACE) {
      return { ...(await contractApi.saveReview(jobId, payload)), updatedAt: null };
    }

  if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId, options?.lastKnownUpdatedAt);
      const result = await contractApi.saveReview(target.transcript_id, payload);
      // Post-save re-read: single-writer assumption; RPC-returned token is post-beta hardening.
      const refreshed = await getTranscriptJobByTranscriptId(target.transcript_id);
      return { ...result, updatedAt: refreshed?.updated_at ?? target.updated_at };
    }

    return persistReview(jobId, payload, options);
  },
  saveSpeakers: async (jobId: string, payload: SpeakersPayload, options?: WorkspaceMutationOptions) => {
    if (USE_MOCK_WORKSPACE) {
      return { ...(await contractApi.saveSpeakers(jobId, payload)), updatedAt: null, speakerMapConfirmed: false };
    }

  if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId, options?.lastKnownUpdatedAt);
      await contractApi.saveSpeakers(target.transcript_id, payload);
      // Post-save re-read: single-writer assumption; RPC-returned token is post-beta hardening.
      const refreshed = await getTranscriptJobByTranscriptId(target.transcript_id);
      return {
        ok: true,
        updatedAt: refreshed?.updated_at ?? target.updated_at,
        speakerMapConfirmed: refreshed?.speaker_map_confirmed ?? isSpeakerMapConfirmed(payload.speakers),
        pipelineState: refreshed?.pipeline_state ?? null,
      };
    }

    return persistSpeakers(jobId, payload, options);
  },
  addSpeaker: async (
    jobId: string,
    speaker: { display_name: string; role?: Speaker["role"] },
  ): Promise<Speaker> => {
    if (USE_MOCK_WORKSPACE) {
      const result = await contractApi.addSpeaker(jobId, speaker);
      return result.speaker;
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      const result = await contractApi.addSpeaker(target.transcript_id, speaker);
      return result.speaker;
    }

    throw new Error("addSpeaker is only available through the editor API.");
  },
  getSuggestions: async (jobId: string) => {
    if (USE_MOCK_WORKSPACE) {
      return contractApi.getSuggestions(jobId);
    }

  if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      return contractApi.getSuggestions(target.transcript_id);
    }

    return [];
  },
  resolveSuggestion: async (jobId: string, id: string, body: Parameters<typeof contractApi.resolveSuggestion>[2]) => {
    if (USE_MOCK_WORKSPACE) {
      return contractApi.resolveSuggestion(jobId, id, body);
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      return contractApi.resolveSuggestion(target.transcript_id, id, body);
    }

    return { ok: true as const };
  },
  resolveAISuggestion: async (
    jobId: string,
    wordId: string,
    body: Parameters<typeof contractApi.resolveAISuggestion>[2],
  ) => {
    if (USE_MOCK_WORKSPACE) {
      return contractApi.resolveAISuggestion(jobId, wordId, body);
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      return contractApi.resolveAISuggestion(target.transcript_id, wordId, body);
    }

    return contractApi.resolveAISuggestion(jobId, wordId, body);
  },
  getAISuggestions: async (jobId: string): Promise<PendingAISuggestion[]> => {
    if (USE_MOCK_WORKSPACE) {
      return contractApi.getAISuggestions(jobId);
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      return contractApi.getAISuggestions(target.transcript_id);
    }

    return contractApi.getAISuggestions(jobId);
  },
  acceptAllAISuggestions: async (jobId: string): Promise<{ accepted_count: number }> => {
    if (USE_MOCK_WORKSPACE) {
      return contractApi.acceptAllAISuggestions(jobId);
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      return contractApi.acceptAllAISuggestions(target.transcript_id);
    }

    return contractApi.acceptAllAISuggestions(jobId);
  },
  triggerAIReview: async (jobId: string): Promise<{ status: string }> => {
    if (USE_MOCK_WORKSPACE) {
      return contractApi.triggerAIReview(jobId, { force: true });
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      return contractApi.triggerAIReview(target.transcript_id, { force: true });
    }

    return contractApi.triggerAIReview(jobId, { force: true });
  },
  getExhibits: async (jobId: string): Promise<Exhibit[]> => {
    if (USE_MOCK_WORKSPACE) {
      return contractApi.getExhibits(jobId);
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      return contractApi.getExhibits(target.transcript_id);
    }

    return [];
  },
  getCertifyStatus: async (jobId: string) => {
    if (USE_MOCK_WORKSPACE) {
      return contractApi.getCertifyStatus(jobId);
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId);
      return contractApi.getCertifyStatus(target.transcript_id);
    }

    return getTranscriptChecklist(jobId);
  },
};
