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

async function loadDocumentFromDatabase(caseId: string): Promise<EditorDocument> {
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

  return buildEditorDocumentFromSnapshot(snapshot, mediaUrl);
}

async function naivePersistWorking(jobId: string, payload: SaveWorkingPayload): Promise<SaveWorkingResponse> {
  const snapshot = await loadTranscriptSnapshot(jobId);
  if (!snapshot) {
    throw new Error(`Transcript job ${jobId} was not found.`);
  }

  const client = await getSupabaseClient("naivePersistWorking");
  let saved = 0;

  for (const change of payload.changes) {
    const utteranceWords = snapshot.words.filter((word) => word.utterance_id === change.utterance_id);
    if (utteranceWords.length === 0) {
      continue;
    }

    const tokens = change.working_text.trim().length > 0
      ? change.working_text.trim().split(/\s+/)
      : [""];

    for (let index = 0; index < utteranceWords.length; index += 1) {
      const word = utteranceWords[index];
      const nextText = index < utteranceWords.length - 1
        ? (tokens[index] ?? "")
        : tokens.slice(index).join(" ");
      const workingText = nextText === word.raw_text ? null : nextText;

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

  await updateTranscriptJob(snapshot.job.transcript_id, { status: snapshot.job.status });
  return { saved };
}

async function persistReview(jobId: string, payload: ReviewPayload): Promise<{ ok: true }> {
  const client = await getSupabaseClient("persistReview");

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

  return { ok: true };
}

function isSpeakerMapConfirmed(speakers: SpeakersPayload["speakers"]): boolean {
  return speakers.length > 0 && speakers.every((speaker) => {
    const displayName = speaker.display_name.trim();
    return displayName.length > 0 && speaker.role;
  });
}

async function persistSpeakers(jobId: string, payload: SpeakersPayload): Promise<{ ok: true }> {
  const client = await getSupabaseClient("persistSpeakers");

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
    }
  }

  const job = await getTranscriptJobByJobId(jobId);
  if (job) {
    await updateTranscriptJob(job.transcript_id, {
      speaker_map_confirmed: isSpeakerMapConfirmed(payload.speakers),
    });
  }

  return { ok: true };
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
  getDocument: async (caseId: string) => (
    USE_MOCK_WORKSPACE ? mockApi.getDocument(caseId) : loadDocumentFromDatabase(caseId)
  ),
  saveWorking: async (jobId: string, payload: SaveWorkingPayload) => (
    USE_MOCK_WORKSPACE ? mockApi.saveWorking(jobId, payload) : naivePersistWorking(jobId, payload)
  ),
  saveReview: async (jobId: string, payload: ReviewPayload) => (
    USE_MOCK_WORKSPACE ? mockApi.saveReview(jobId, payload) : persistReview(jobId, payload)
  ),
  saveSpeakers: async (jobId: string, payload: SpeakersPayload) => (
    USE_MOCK_WORKSPACE ? mockApi.saveSpeakers(jobId, payload) : persistSpeakers(jobId, payload)
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
