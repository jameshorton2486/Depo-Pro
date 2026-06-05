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
import { api as mockApi } from "./client";
import { getSignedUrl } from "./fileService";
import {
  getLatestCompletedTranscriptJob,
  getTranscriptJobByJobId,
  listTranscriptJobs,
  loadTranscriptSnapshot,
  updateTranscriptJob,
} from "./transcriptRepository";
import { getSupabaseClient } from "../lib/supabase";

const USE_MOCK_WORKSPACE = import.meta.env.VITE_USE_MOCKS === "true";

export interface WorkspaceLoadResult {
  document: EditorDocument;
  updatedAt: string | null;
  speakerMapConfirmed: boolean;
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
}

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
  const wordIdsByUtterance = new Map<string, string[]>();
  for (const word of snapshot.words) {
    const ids = wordIdsByUtterance.get(word.utterance_id) ?? [];
    ids.push(word.word_id);
    wordIdsByUtterance.set(word.utterance_id, ids);
  }

  return {
    job_id: snapshot.job.job_id,
    media_url: mediaUrl,
    duration: snapshot.job.duration_seconds ?? snapshot.job.duration ?? 0,
    speakers: snapshot.speakers.map((speaker) => ({
      speaker_id: speaker.speaker_id,
      display_name: speaker.assigned_name || speaker.speaker_label || speaker.display_name,
      deepgram_speaker: speaker.speaker_index ?? speaker.deepgram_speaker,
      role: mapSpeakerRole(speaker.speaker_role || speaker.role),
    })),
    utterances: snapshot.utterances.map((utterance) => ({
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      start_time: utterance.start_time,
      end_time: utterance.end_time,
      word_ids: wordIdsByUtterance.get(utterance.utterance_id) ?? [],
    })),
    words: snapshot.words
      .filter((word) => !word.removed)
      .map((word) => ({
        word_id: word.word_id,
        text: word.working_text ?? word.raw_text,
        raw_text: word.raw_text,
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

async function loadWorkspaceDocument(caseId: string): Promise<WorkspaceLoadResult> {
  const latestJob = await getLatestCompletedTranscriptJob(caseId);
  if (!latestJob) {
    throw new Error("No transcript has been generated for this case yet.");
  }

  const snapshot = await loadTranscriptSnapshot(latestJob.job_id);
  if (!snapshot) {
    throw new Error(`Transcript job ${latestJob.job_id} could not be loaded.`);
  }

  const mediaUrl = snapshot.job.media_url
    ? await getSignedUrl(snapshot.job.media_url)
    : "";

  return {
    document: buildEditorDocumentFromSnapshot(snapshot, mediaUrl),
    updatedAt: snapshot.job.updated_at,
    speakerMapConfirmed: snapshot.job.speaker_map_confirmed,
  };
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
  jobId: string,
  lastKnownUpdatedAt?: string | null,
) {
  const job = await getTranscriptJobByJobId(jobId);
  if (!job) {
    throw new Error(`Transcript job ${jobId} was not found.`);
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
  jobId: string,
  payload: SaveWorkingPayload,
  options: WorkspaceMutationOptions = {},
): Promise<WorkspaceSaveResult> {
  const job = await requireFreshTranscript(jobId, options.lastKnownUpdatedAt);
  const snapshot = await loadTranscriptSnapshot(jobId);
  if (!snapshot) {
    throw new Error(`Transcript job ${jobId} was not found.`);
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
          .eq("job_id", jobId)
          .eq("word_id", word.word_id);

        if (error) {
          throw error;
        }

        auditEntries.push({
          transcript_id: snapshot.job.transcript_id,
          case_id: snapshot.job.case_id,
          job_id: jobId,
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
        .eq("job_id", jobId)
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
        job_id: jobId,
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
  jobId: string,
  payload: ReviewPayload,
  options: WorkspaceMutationOptions = {},
): Promise<WorkspaceMutationResult> {
  const job = await requireFreshTranscript(jobId, options.lastKnownUpdatedAt);

  return withRetry(async () => {
    const client = await getSupabaseClient("persistReview");
    const snapshot = await loadTranscriptSnapshot(jobId);
    const wordMap = new Map((snapshot?.words ?? []).map((word) => [word.word_id, word]));

    if (payload.reviewed_word_ids.length > 0) {
      const { error } = await client
        .from("transcript_words")
        .update({ reviewed: true })
        .eq("job_id", jobId)
        .in("word_id", payload.reviewed_word_ids);
      if (error) {
        throw error;
      }
    }

    if (payload.unreviewed_word_ids.length > 0) {
      const { error } = await client
        .from("transcript_words")
        .update({ reviewed: false })
        .eq("job_id", jobId)
        .in("word_id", payload.unreviewed_word_ids);
      if (error) {
        throw error;
      }
    }

    await appendAuditEntries([
      ...payload.reviewed_word_ids.map((wordId) => ({
        transcript_id: job.transcript_id,
        case_id: job.case_id,
        job_id: jobId,
        action: "mark_reviewed" as const,
        word_id: wordId,
        utterance_id: wordMap.get(wordId)?.utterance_id ?? null,
        before_text: wordMap.get(wordId)?.reviewed ? "reviewed" : "unreviewed",
        after_text: "reviewed",
      })),
      ...payload.unreviewed_word_ids.map((wordId) => ({
        transcript_id: job.transcript_id,
        case_id: job.case_id,
        job_id: jobId,
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
  jobId: string,
  payload: SpeakersPayload,
  options: WorkspaceMutationOptions = {},
): Promise<WorkspaceMutationResult> {
  const job = await requireFreshTranscript(jobId, options.lastKnownUpdatedAt);

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
        .eq("job_id", jobId)
        .eq("speaker_id", speaker.speaker_id);

      if (error) {
        throw error;
      }

      auditEntries.push({
        transcript_id: job.transcript_id,
        case_id: job.case_id,
        job_id: jobId,
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
          .eq("job_id", jobId)
          .eq("utterance_id", assignment.utterance_id);

        if (utteranceError) {
          throw utteranceError;
        }

        const { error: wordError } = await client
          .from("transcript_words")
          .update({
            speaker_id: assignment.speaker_id,
          })
          .eq("job_id", jobId)
          .eq("utterance_id", assignment.utterance_id);

        if (wordError) {
          throw wordError;
        }

        auditEntries.push({
          transcript_id: job.transcript_id,
          case_id: job.case_id,
          job_id: jobId,
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
    };
  });
}

async function getTranscriptChecklist(jobId: string): Promise<CertifyChecklist> {
  const job = await getTranscriptJobByJobId(jobId);
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
    .eq("job_id", jobId)
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
  getDocument: async (caseId: string): Promise<WorkspaceLoadResult> => (
    USE_MOCK_WORKSPACE
      ? {
          document: await mockApi.getDocument(caseId),
          updatedAt: null,
          speakerMapConfirmed: false,
        }
      : loadWorkspaceDocument(caseId)
  ),
  saveWorking: async (jobId: string, payload: SaveWorkingPayload, options?: WorkspaceMutationOptions) => (
    USE_MOCK_WORKSPACE
      ? { ...(await mockApi.saveWorking(jobId, payload)), updatedAt: null }
      : naivePersistWorking(jobId, payload, options)
  ),
  saveReview: async (jobId: string, payload: ReviewPayload, options?: WorkspaceMutationOptions) => (
    USE_MOCK_WORKSPACE
      ? { ...(await mockApi.saveReview(jobId, payload)), updatedAt: null }
      : persistReview(jobId, payload, options)
  ),
  saveSpeakers: async (jobId: string, payload: SpeakersPayload, options?: WorkspaceMutationOptions) => (
    USE_MOCK_WORKSPACE
      ? { ...(await mockApi.saveSpeakers(jobId, payload)), updatedAt: null, speakerMapConfirmed: false }
      : persistSpeakers(jobId, payload, options)
  ),
  getSuggestions: async (jobId: string) => (
    USE_MOCK_WORKSPACE ? mockApi.getSuggestions(jobId) : []
  ),
  resolveSuggestion: async (jobId: string, id: string, body: Parameters<typeof mockApi.resolveSuggestion>[2]) => (
    USE_MOCK_WORKSPACE ? mockApi.resolveSuggestion(jobId, id, body) : { ok: true as const }
  ),
  getExhibits: async (jobId: string): Promise<Exhibit[]> => (
    USE_MOCK_WORKSPACE ? mockApi.getExhibits(jobId) : []
  ),
  getCertifyStatus: async (jobId: string) => (
    USE_MOCK_WORKSPACE ? mockApi.getCertifyStatus(jobId) : getTranscriptChecklist(jobId)
  ),
};
