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
import { api as contractApi } from "./client";
import { getSignedUrl } from "./fileService";
import { isRealApiMode } from "../lib/runtime/mode";
import {
  getTranscriptJobByJobId,
  getTranscriptJobByTranscriptId,
  listCompletedTranscriptJobsBySequence,
  listTranscriptJobs,
  loadTranscriptSnapshot,
  updateTranscriptJob,
  type SpeakerResolutionCurrentRow,
  type TranscriptSpeakerRow,
  type TranscriptJobRow,
} from "./transcriptRepository";
import { getSupabaseClient } from "../lib/supabase";
import { resolveSegmentWorkspaceSelection } from "../lib/transcript/segmentWorkspace";
import {
  buildParticipantId,
  buildResolvedSpeakerViews,
  isResolvedSpeakerMappingComplete,
  type ResolvedSpeakerView,
} from "../lib/transcript/resolvedSpeakers";
import { buildUnresolvedSpeakerLabel } from "../lib/transcript/speakerIdentity";
import { normalizeTranscriptResponse } from "../lib/transcript/normalize";
import type { DeepgramResponse } from "../lib/transcript/types";
import {
  buildNormalizedTranscriptMetrics,
  buildReassemblyPreviewToken,
  buildStoredTranscriptMetrics,
  CURRENT_ASSEMBLY_VERSION,
  evaluateReassemblyEligibility,
  LATEST_ASSEMBLY_VERSION,
  type HumanWorkSignal,
  type HumanWorkSummary,
  type TranscriptReassemblyApplyResult,
  type TranscriptReassemblyPreview,
  type TranscriptReassemblyRestoreResult,
  type TranscriptReassemblyUndoSnapshot,
} from "../lib/transcript/reassembly";
import type { Database } from "../types/database";

const USE_MOCK_WORKSPACE = import.meta.env.VITE_USE_MOCKS === "true";

type SpeakerResolutionHistoryRow =
  Database["public"]["Tables"]["speaker_resolution_history"]["Row"];

export interface WorkspaceLoadResult {
  document: EditorDocument;
  resolvedSpeakers: ResolvedSpeakerView[];
  updatedAt: string | null;
  speakerMapConfirmed: boolean;
  audioSegments: WorkspaceAudioSegment[];
  segmentTargets: WorkspaceSegmentTarget[];
  currentSegmentIndex: number;
  currentTranscriptId: string;
  previousTranscriptId: string | null;
  nextTranscriptId: string | null;
}

export interface WorkspaceAudioSegment {
  sourceIndex: number;
  sourceFilename: string;
  startOffsetSeconds: number;
  durationSeconds: number;
  mediaUrl: string;
}

export interface WorkspaceSegmentTarget {
  transcriptId: string;
  sequenceIndex: number;
  sourceFilename: string | null;
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
  resolvedSpeakers?: ResolvedSpeakerView[];
}

export type { ResolvedSpeakerView } from "../lib/transcript/resolvedSpeakers";

export interface SpeakerMapConfirmationResult {
  jobId: string;
  transcriptId: string | null;
  caseId: string | null;
  confirmed: boolean;
  message?: string;
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
    job_id: snapshot.job.transcript_id,
    media_url: mediaUrl,
    duration: snapshot.job.duration_seconds ?? snapshot.job.duration ?? 0,
    speakers: buildRawDocumentSpeakers(snapshot.speakers),
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

function buildRawDocumentSpeakers(
  speakers: TranscriptSpeakerRow[],
): EditorDocument["speakers"] {
  return speakers.map((speaker) => ({
    speaker_id: speaker.speaker_id,
    display_name: speaker.assigned_name || speaker.speaker_label || speaker.display_name,
    deepgram_speaker: speaker.speaker_index ?? speaker.deepgram_speaker,
    role: mapSpeakerRole(speaker.speaker_role || speaker.role),
  }));
}

async function resolveWorkspaceTarget(value: string): Promise<{
  target: TranscriptJobRow | null;
  orderedSegments: TranscriptJobRow[];
  currentIndex: number;
  previousTranscriptId: string | null;
  nextTranscriptId: string | null;
}> {
  const byTranscriptId = await getTranscriptJobByTranscriptId(value);
  if (byTranscriptId) {
    const orderedSegments = await listCompletedTranscriptJobsBySequence(byTranscriptId.case_id);
    const selection = resolveSegmentWorkspaceSelection(orderedSegments, byTranscriptId.transcript_id);
    return {
      target: byTranscriptId,
      orderedSegments: selection.ordered,
      currentIndex: selection.currentIndex,
      previousTranscriptId: selection.previous?.transcript_id ?? null,
      nextTranscriptId: selection.next?.transcript_id ?? null,
    };
  }

  const byJobId = await getTranscriptJobByJobId(value);
  if (byJobId) {
    const orderedSegments = await listCompletedTranscriptJobsBySequence(byJobId.case_id);
    const selection = resolveSegmentWorkspaceSelection(orderedSegments, byJobId.transcript_id);
    return {
      target: byJobId,
      orderedSegments: selection.ordered,
      currentIndex: selection.currentIndex,
      previousTranscriptId: selection.previous?.transcript_id ?? null,
      nextTranscriptId: selection.next?.transcript_id ?? null,
    };
  }

  const orderedSegments = await listCompletedTranscriptJobsBySequence(value);
  const selection = resolveSegmentWorkspaceSelection(orderedSegments);
  return {
    target: selection.selected,
    orderedSegments: selection.ordered,
    currentIndex: selection.currentIndex,
    previousTranscriptId: selection.previous?.transcript_id ?? null,
    nextTranscriptId: selection.next?.transcript_id ?? null,
  };
}

async function loadWorkspaceDocument(caseId: string): Promise<WorkspaceLoadResult> {
  const resolved = await resolveWorkspaceTarget(caseId);
  const target = resolved.target;
  if (!target) {
    throw new Error("No transcript has been generated for this case yet.");
  }

  const snapshot = await loadTranscriptSnapshot(target.job_id);
  if (!snapshot) {
    throw new Error(`Transcript job ${target.job_id} could not be loaded.`);
  }

  const mediaUrl = snapshot.job.media_url
    ? await getSignedUrl(snapshot.job.media_url)
    : "";

  return {
    document: buildEditorDocumentFromSnapshot(snapshot, mediaUrl),
    resolvedSpeakers: buildResolvedSpeakerViews(snapshot.speakers, snapshot.speakerResolutionOverlay),
    updatedAt: snapshot.job.updated_at,
    speakerMapConfirmed: snapshot.job.speaker_map_confirmed,
    audioSegments: await loadAudioSegments(snapshot.job, mediaUrl),
    segmentTargets: resolved.orderedSegments.map((segment) => ({
      transcriptId: segment.transcript_id,
      sequenceIndex: segment.sequence_index,
      sourceFilename: segment.source_filename,
    })),
    currentSegmentIndex: resolved.currentIndex,
    currentTranscriptId: target.transcript_id,
    previousTranscriptId: resolved.previousTranscriptId,
    nextTranscriptId: resolved.nextTranscriptId,
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
  const resolved = await resolveWorkspaceTarget(key);
  const job = resolved.target;
  if (!job) {
    throw new Error(`Transcript ${key} was not found.`);
  }

  if (lastKnownUpdatedAt && job.updated_at !== lastKnownUpdatedAt) {
    throw new Error("Transcript changed elsewhere — reload.");
  }

  return job;
}

export async function requireConfirmedSpeakerMap(key: string): Promise<SpeakerMapConfirmationResult> {
  try {
    if (USE_MOCK_WORKSPACE) {
      return {
        jobId: key,
        transcriptId: key,
        caseId: null,
        confirmed: false,
        message: "Speaker mapping is unavailable in fixture mode.",
      };
    }

    const resolved = await resolveWorkspaceTarget(key);
    const target = resolved.target;
    if (!target) {
      return {
        jobId: key,
        transcriptId: null,
        caseId: null,
        confirmed: false,
        message: "No transcript has been generated for this case yet.",
      };
    }

    const confirmedSegments = resolved.orderedSegments.length > 0 ? resolved.orderedSegments : [target];
    const firstUnconfirmedSegment = confirmedSegments.find((segment) => !segment.speaker_map_confirmed) ?? null;
    const resolutionTarget = firstUnconfirmedSegment ?? target;
    const confirmed = firstUnconfirmedSegment === null;

    return {
      jobId: resolutionTarget.job_id,
      transcriptId: resolutionTarget.transcript_id,
      caseId: resolutionTarget.case_id,
      confirmed,
      message: confirmed
        ? undefined
        : "Speaker mapping not confirmed. Complete speaker mapping before exporting a certified transcript.",
    };
  } catch (error) {
    return {
      jobId: key,
      transcriptId: null,
      caseId: null,
      confirmed: false,
      message: error instanceof Error
        ? `Could not verify speaker mapping status. ${error.message}`
        : "Could not verify speaker mapping status.",
    };
  }
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

function buildFallbackResolvedSpeakers(speakers: EditorDocument["speakers"]): ResolvedSpeakerView[] {
  return speakers.map((speaker) => ({
    ...speaker,
    participantId: `raw:${speaker.speaker_id}`,
    rawSpeakerIds: [speaker.speaker_id],
    speakerIndices: [speaker.deepgram_speaker],
  }));
}

async function requireCurrentUserId(client: Awaited<ReturnType<typeof getSupabaseClient>>): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error) {
    throw error;
  }

  const userId = data.user?.id ?? null;
  if (!userId) {
    throw new Error("Authenticated user id is required for speaker resolution writes.");
  }

  return userId;
}

async function loadCurrentSpeakerResolutionRows(
  client: Awaited<ReturnType<typeof getSupabaseClient>>,
  transcriptId: string,
  rawSpeakerIds: string[],
): Promise<SpeakerResolutionCurrentRow[]> {
  if (rawSpeakerIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("speaker_resolution_current")
    .select("*")
    .eq("transcript_id", transcriptId)
    .in("raw_speaker_id", rawSpeakerIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as SpeakerResolutionCurrentRow[];
}

async function loadLatestSpeakerResolutionHistoryRows(
  client: Awaited<ReturnType<typeof getSupabaseClient>>,
  transcriptId: string,
  rawSpeakerIds: string[],
): Promise<Map<string, SpeakerResolutionHistoryRow>> {
  const latest = new Map<string, SpeakerResolutionHistoryRow>();
  if (rawSpeakerIds.length === 0) {
    return latest;
  }

  const { data, error } = await client
    .from("speaker_resolution_history")
    .select("*")
    .eq("transcript_id", transcriptId)
    .in("raw_speaker_id", rawSpeakerIds)
    .order("resolved_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const row of (data ?? []) as SpeakerResolutionHistoryRow[]) {
    if (!latest.has(row.raw_speaker_id)) {
      latest.set(row.raw_speaker_id, row);
    }
  }

  return latest;
}

async function loadRawDeepgramResponse(
  client: Awaited<ReturnType<typeof getSupabaseClient>>,
  rawStoragePath: string | null,
): Promise<DeepgramResponse> {
  if (!rawStoragePath || !rawStoragePath.endsWith(".json") || rawStoragePath.endsWith("_multifile_manifest.json")) {
    throw new Error("Transcript rebuild requires a preserved raw Deepgram JSON response.");
  }

  const { data, error } = await client.storage
    .from("case-files")
    .download(rawStoragePath);

  if (error) {
    throw error;
  }

  return JSON.parse(await data.text()) as DeepgramResponse;
}

async function loadTranscriptReassemblyLifecycleCounts(
  client: Awaited<ReturnType<typeof getSupabaseClient>>,
  transcriptId: string,
  caseId: string,
): Promise<{
  reviewStateCount: number;
  suggestionCount: number;
  certificationCount: number;
  exportCount: number;
}> {
  const [
    reviewStateResult,
    suggestionResult,
    certificationResult,
    exportResult,
  ] = await Promise.all([
    client
      .from("transcript_review_state")
      .select("id", { count: "exact", head: true })
      .eq("transcript_id", transcriptId),
    client
      .from("transcript_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("transcript_id", transcriptId),
    client
      .from("case_certifications")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId),
    client
      .from("exports")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId),
  ]);

  if (reviewStateResult.error) {
    throw reviewStateResult.error;
  }
  if (suggestionResult.error) {
    throw suggestionResult.error;
  }
  if (certificationResult.error) {
    throw certificationResult.error;
  }
  if (exportResult.error) {
    throw exportResult.error;
  }

  return {
    reviewStateCount: reviewStateResult.count ?? 0,
    suggestionCount: suggestionResult.count ?? 0,
    certificationCount: certificationResult.count ?? 0,
    exportCount: exportResult.count ?? 0,
  };
}

async function countWorkspaceAuditEvents(
  client: Awaited<ReturnType<typeof getSupabaseClient>>,
  transcriptId: string,
): Promise<number> {
  const { count, error } = await client
    .from("transcript_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("transcript_id", transcriptId)
    .eq("source", "workspace")
    .in("action", ["edit_word", "mark_reviewed", "assign_speaker"]);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

function buildHumanWorkSummary(
  snapshot: NonNullable<Awaited<ReturnType<typeof loadTranscriptSnapshot>>>,
  lifecycleCounts: Awaited<ReturnType<typeof loadTranscriptReassemblyLifecycleCounts>>,
  workspaceAuditCount: number,
): HumanWorkSummary {
  const signals: HumanWorkSignal[] = [];

  if (snapshot.words.some((word) => word.working_text != null || word.edited)) {
    signals.push("edited-words");
  }

  if (snapshot.words.some((word) => word.reviewed) || lifecycleCounts.reviewStateCount > 0) {
    signals.push("review-progress");
  }

  if (snapshot.speakerResolutionOverlay.length > 0) {
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
  snapshot: NonNullable<Awaited<ReturnType<typeof loadTranscriptSnapshot>>>,
): TranscriptReassemblyUndoSnapshot {
  return {
    transcriptId: snapshot.job.transcript_id,
    durationSeconds: snapshot.job.duration_seconds ?? snapshot.job.duration,
    wordCount: snapshot.job.word_count,
    utteranceCount: snapshot.job.utterance_count,
    speakerCount: snapshot.job.speaker_count,
    avgConfidence: snapshot.job.avg_confidence,
    speakerMapConfirmed: snapshot.job.speaker_map_confirmed,
    speakers: snapshot.speakers.map((speaker) => ({
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
    utterances: snapshot.utterances.map((utterance) => ({
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
    words: snapshot.words.map((word) => ({
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
      is_filler: word.is_filler,
      removed: word.removed,
    })),
  };
}

async function buildTranscriptReassemblyPreview(
  key: string,
  options: WorkspaceMutationOptions = {},
): Promise<TranscriptReassemblyPreview> {
  const job = await requireFreshTranscript(key, options.lastKnownUpdatedAt);
  const snapshot = await loadTranscriptSnapshot(job.job_id);
  if (!snapshot) {
    throw new Error(`Transcript job ${job.job_id} was not found.`);
  }

  const client = await getSupabaseClient("buildTranscriptReassemblyPreview");
  const lifecycleCounts = await loadTranscriptReassemblyLifecycleCounts(client, job.transcript_id, job.case_id);
  const workspaceAuditCount = await countWorkspaceAuditEvents(client, job.transcript_id);
  const eligibility = evaluateReassemblyEligibility(lifecycleCounts);
  const rawResponse = await loadRawDeepgramResponse(client, job.raw_storage_path);
  const normalized = normalizeTranscriptResponse(rawResponse);
  const currentMetrics = buildStoredTranscriptMetrics(snapshot.speakers, snapshot.utterances, snapshot.words);
  const candidateMetrics = buildNormalizedTranscriptMetrics(normalized);

  return {
    currentAssemblyVersion: CURRENT_ASSEMBLY_VERSION,
    latestAssemblyVersion: LATEST_ASSEMBLY_VERSION,
    canApply: eligibility.canApply,
    blockedReasons: eligibility.blockedReasons,
    currentMetrics,
    candidateMetrics,
    impacts: eligibility.impacts,
    humanWorkSummary: buildHumanWorkSummary(snapshot, lifecycleCounts, workspaceAuditCount),
    previewToken: buildReassemblyPreviewToken({
      transcriptId: job.transcript_id,
      updatedAt: job.updated_at,
      rawStoragePath: job.raw_storage_path,
      currentMetrics,
      candidateMetrics,
    }),
  };
}

async function replaceTranscriptDerivedRows(
  client: Awaited<ReturnType<typeof getSupabaseClient>>,
  job: TranscriptJobRow,
  normalized: ReturnType<typeof normalizeTranscriptResponse>,
): Promise<void> {
  const { error: deleteWordsError } = await client
    .from("transcript_words")
    .delete()
    .eq("transcript_id", job.transcript_id);

  if (deleteWordsError) {
    throw deleteWordsError;
  }

  const { error: deleteUtterancesError } = await client
    .from("transcript_utterances")
    .delete()
    .eq("transcript_id", job.transcript_id);

  if (deleteUtterancesError) {
    throw deleteUtterancesError;
  }

  const { error: deleteSpeakersError } = await client
    .from("transcript_speakers")
    .delete()
    .eq("transcript_id", job.transcript_id);

  if (deleteSpeakersError) {
    throw deleteSpeakersError;
  }

  const speakerRows = normalized.speakers.map((speaker) => ({
    transcript_id: job.transcript_id,
    speaker_id: speaker.speaker_id,
    display_name: speaker.speaker_label,
    deepgram_speaker: speaker.speaker_index,
    role: null,
    job_id: job.job_id,
    speaker_index: speaker.speaker_index,
    speaker_label: speaker.speaker_label,
    assigned_name: null,
    speaker_role: null,
    word_count: speaker.word_count,
  }));

  const utteranceRows = normalized.utterances.map((utterance) => ({
    transcript_id: job.transcript_id,
    utterance_id: utterance.utterance_id,
    speaker_id: utterance.speaker_id,
    start_time: utterance.start_time,
    end_time: utterance.end_time,
    ordinal: utterance.utterance_index,
    job_id: job.job_id,
    utterance_index: utterance.utterance_index,
    speaker_index: utterance.speaker_index,
    speaker_label: utterance.speaker_label,
    text: utterance.text,
    avg_confidence: utterance.avg_confidence.toFixed(4),
  }));

  const wordRows = normalized.words.map((word) => ({
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
    reviewed: false,
    edited: false,
    job_id: job.job_id,
    word_index: word.word_index,
    working_text: null,
    speaker_index: word.speaker_index,
    is_filler: word.is_filler,
    removed: false,
  }));

  if (speakerRows.length > 0) {
    const { error } = await client.from("transcript_speakers").insert(speakerRows);
    if (error) {
      throw error;
    }
  }

  if (utteranceRows.length > 0) {
    const { error } = await client.from("transcript_utterances").insert(utteranceRows);
    if (error) {
      throw error;
    }
  }

  const wordChunkSize = 500;
  for (let index = 0; index < wordRows.length; index += wordChunkSize) {
    const chunk = wordRows.slice(index, index + wordChunkSize);
    const { error } = await client.from("transcript_words").insert(chunk);
    if (error) {
      throw error;
    }
  }
}

async function applyTranscriptReassembly(
  key: string,
  previewToken: string,
  options: WorkspaceMutationOptions = {},
): Promise<TranscriptReassemblyApplyResult> {
  const preview = await buildTranscriptReassemblyPreview(key, options);
  if (preview.previewToken !== previewToken) {
    throw new Error("Transcript rebuild preview is stale. Refresh preview before applying.");
  }

  if (!preview.canApply) {
    throw new Error(preview.blockedReasons[0] ?? "Transcript rebuild is blocked.");
  }

  const job = await requireFreshTranscript(key, options.lastKnownUpdatedAt);
  const client = await getSupabaseClient("applyTranscriptReassembly");
  const snapshot = await loadTranscriptSnapshot(job.job_id);
  if (!snapshot) {
    throw new Error(`Transcript job ${job.job_id} was not found.`);
  }
  const rawResponse = await loadRawDeepgramResponse(client, job.raw_storage_path);
  const normalized = normalizeTranscriptResponse(rawResponse);

  await replaceTranscriptDerivedRows(client, job, normalized);
  await appendAuditEntries([{
    transcript_id: job.transcript_id,
    case_id: job.case_id,
    job_id: job.job_id,
    action: "bulk_save",
    before_text: `reassembly ${preview.currentMetrics.mixedCanonicalUtterances}`,
    after_text: `reassembly ${preview.candidateMetrics.mixedCanonicalUtterances}`,
  }]);

  const updatedJob = await updateTranscriptJob(job.transcript_id, {
    duration_seconds: normalized.durationSeconds,
    word_count: normalized.words.length,
    utterance_count: normalized.utterances.length,
    speaker_count: normalized.speakers.length,
    avg_confidence: normalized.avgConfidence == null ? null : normalized.avgConfidence.toFixed(4),
  });

  return {
    ok: true,
    updatedAt: updatedJob.updated_at,
    currentMetrics: preview.currentMetrics,
    candidateMetrics: preview.candidateMetrics,
    undoSnapshot: buildUndoSnapshot(snapshot),
  };
}

async function restoreTranscriptDerivedRows(
  client: Awaited<ReturnType<typeof getSupabaseClient>>,
  job: TranscriptJobRow,
  snapshot: TranscriptReassemblyUndoSnapshot,
): Promise<void> {
  const { error: deleteWordsError } = await client
    .from("transcript_words")
    .delete()
    .eq("transcript_id", job.transcript_id);

  if (deleteWordsError) {
    throw deleteWordsError;
  }

  const { error: deleteUtterancesError } = await client
    .from("transcript_utterances")
    .delete()
    .eq("transcript_id", job.transcript_id);

  if (deleteUtterancesError) {
    throw deleteUtterancesError;
  }

  const { error: deleteSpeakersError } = await client
    .from("transcript_speakers")
    .delete()
    .eq("transcript_id", job.transcript_id);

  if (deleteSpeakersError) {
    throw deleteSpeakersError;
  }

  if (snapshot.speakers.length > 0) {
    const { error } = await client.from("transcript_speakers").insert(
      snapshot.speakers.map((speaker) => ({
        transcript_id: job.transcript_id,
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
    if (error) {
      throw error;
    }
  }

  if (snapshot.utterances.length > 0) {
    const { error } = await client.from("transcript_utterances").insert(
      snapshot.utterances.map((utterance) => ({
        transcript_id: job.transcript_id,
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
    if (error) {
      throw error;
    }
  }

  const wordChunkSize = 500;
  for (let index = 0; index < snapshot.words.length; index += wordChunkSize) {
    const chunk = snapshot.words.slice(index, index + wordChunkSize);
    const { error } = await client.from("transcript_words").insert(
      chunk.map((word) => ({
        transcript_id: job.transcript_id,
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
        is_filler: word.is_filler,
        removed: word.removed,
      })),
    );
    if (error) {
      throw error;
    }
  }
}

async function restoreTranscriptReassembly(
  key: string,
  snapshot: TranscriptReassemblyUndoSnapshot,
  options: WorkspaceMutationOptions = {},
): Promise<TranscriptReassemblyRestoreResult> {
  const job = await requireFreshTranscript(key, options.lastKnownUpdatedAt);
  if (snapshot.transcriptId !== job.transcript_id) {
    throw new Error("Refine undo snapshot does not match the current transcript.");
  }

  const client = await getSupabaseClient("restoreTranscriptReassembly");
  await restoreTranscriptDerivedRows(client, job, snapshot);
  await appendAuditEntries([{
    transcript_id: job.transcript_id,
    case_id: job.case_id,
    job_id: job.job_id,
    action: "bulk_save",
    before_text: "reassembly_apply",
    after_text: "reassembly_undo",
  }]);

  const updatedJob = await updateTranscriptJob(job.transcript_id, {
    duration_seconds: snapshot.durationSeconds,
    word_count: snapshot.wordCount,
    utterance_count: snapshot.utteranceCount,
    speaker_count: snapshot.speakerCount,
    avg_confidence: snapshot.avgConfidence,
    speaker_map_confirmed: snapshot.speakerMapConfirmed,
  });

  return {
    ok: true,
    updatedAt: updatedJob.updated_at,
  };
}

async function persistSpeakers(
  key: string,
  payload: SpeakersPayload,
  options: WorkspaceMutationOptions = {},
): Promise<WorkspaceMutationResult> {
  const job = await requireFreshTranscript(key, options.lastKnownUpdatedAt);

  return withRetry(async () => {
    const client = await getSupabaseClient("persistSpeakers");
    const snapshot = await loadTranscriptSnapshot(job.job_id);
    if (!snapshot) {
      throw new Error(`Transcript job ${job.job_id} was not found.`);
    }

    const userId = await requireCurrentUserId(client);
    const rawSpeakerById = new Map(snapshot.speakers.map((speaker) => [speaker.speaker_id, speaker]));
    const rawSpeakerIds = payload.speakers.map((speaker) => speaker.speaker_id);
    const currentRows = await loadCurrentSpeakerResolutionRows(client, job.transcript_id, rawSpeakerIds);
    const currentRowBySpeakerId = new Map(currentRows.map((row) => [row.raw_speaker_id, row]));
    const latestHistoryBySpeakerId = await loadLatestSpeakerResolutionHistoryRows(client, job.transcript_id, rawSpeakerIds);
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

    const now = new Date().toISOString();
    const changedCurrentRows: Database["public"]["Tables"]["speaker_resolution_current"]["Insert"][] = [];
    const changedHistoryRows: Database["public"]["Tables"]["speaker_resolution_history"]["Insert"][] = [];

    for (const speaker of payload.speakers) {
      const rawSpeaker = rawSpeakerById.get(speaker.speaker_id);
      if (!rawSpeaker) {
        throw new Error(`Unknown raw speaker ${speaker.speaker_id} for transcript ${job.transcript_id}.`);
      }

      const resolvedLabel = speaker.display_name.trim();
      const resolvedRole = speaker.role ? speaker.role.toLowerCase() : null;
      const participantId = buildParticipantId(speaker.role, resolvedLabel);
      const currentRow = currentRowBySpeakerId.get(speaker.speaker_id) ?? null;
      const changed = !currentRow
        || currentRow.participant_id !== participantId
        || currentRow.resolved_label !== resolvedLabel
        || currentRow.resolved_role !== resolvedRole;

      if (changed) {
        changedCurrentRows.push({
          transcript_id: job.transcript_id,
          raw_speaker_id: rawSpeaker.speaker_id,
          raw_speaker_index: rawSpeaker.speaker_index,
          participant_id: participantId,
          resolved_role: resolvedRole,
          resolved_label: resolvedLabel,
          resolved_by: userId,
          resolved_at: now,
          owner_user_id: userId,
        });

        changedHistoryRows.push({
          transcript_id: job.transcript_id,
          raw_speaker_id: rawSpeaker.speaker_id,
          raw_speaker_index: rawSpeaker.speaker_index,
          participant_id: participantId,
          resolved_role: resolvedRole,
          resolved_label: resolvedLabel,
          resolved_by: userId,
          resolved_at: now,
          supersedes_resolution_id: latestHistoryBySpeakerId.get(rawSpeaker.speaker_id)?.resolution_id ?? null,
          owner_user_id: userId,
        });

        auditEntries.push({
          transcript_id: job.transcript_id,
          case_id: job.case_id,
          job_id: job.job_id,
          action: "assign_speaker",
          before_text: rawSpeaker.speaker_id,
          after_text: `${resolvedLabel}${speaker.role ? ` (${speaker.role})` : ""}`,
        });
      }
    }

    if (changedCurrentRows.length > 0) {
      const { error } = await client
        .from("speaker_resolution_current")
        .upsert(changedCurrentRows, { onConflict: "transcript_id,raw_speaker_id" });

      if (error) {
        throw error;
      }
    }

    if (changedHistoryRows.length > 0) {
      const { error } = await client
        .from("speaker_resolution_history")
        .insert(changedHistoryRows);

      if (error) {
        throw error;
      }
    }

    if (payload.utterance_speaker_map) {
      for (const assignment of payload.utterance_speaker_map) {
        const speaker = payload.speakers.find((item) => item.speaker_id === assignment.speaker_id);
        const rawSpeaker = rawSpeakerById.get(assignment.speaker_id);
        const { error: utteranceError } = await client
          .from("transcript_utterances")
          .update({
            speaker_id: assignment.speaker_id,
            speaker_label: speaker?.display_name
              ?? buildUnresolvedSpeakerLabel(rawSpeaker?.speaker_index ?? 0),
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

    const refreshedSnapshot = await loadTranscriptSnapshot(job.job_id);
    if (!refreshedSnapshot) {
      throw new Error(`Transcript job ${job.job_id} was not found after speaker resolution save.`);
    }
    const resolvedSpeakers = buildResolvedSpeakerViews(
      refreshedSnapshot.speakers,
      refreshedSnapshot.speakerResolutionOverlay,
    );

    const updatedJob = await updateTranscriptJob(job.transcript_id, {
      status: job.status,
      speaker_map_confirmed: isResolvedSpeakerMappingComplete(resolvedSpeakers),
    });

    return {
      ok: true,
      updatedAt: updatedJob.updated_at,
      speakerMapConfirmed: updatedJob.speaker_map_confirmed,
      resolvedSpeakers,
    };
  });
}

async function getTranscriptChecklist(key: string): Promise<CertifyChecklist> {
  const resolved = await resolveWorkspaceTarget(key);
  const job = resolved.target;
  if (!job) {
    return {
      review_complete: false,
      speaker_mapping_complete: false,
      confidence_review_complete: false,
    };
  }

  const client = await getSupabaseClient("getTranscriptChecklist");
  const snapshot = await loadTranscriptSnapshot(job.job_id);
  const { count, error } = await client
    .from("transcript_words")
    .select("word_id", { count: "exact", head: true })
    .eq("job_id", job.job_id)
    .eq("reviewed", false);

  if (error) {
    throw error;
  }

  const reviewComplete = (count ?? 0) === 0;
  const resolvedSpeakers = snapshot
    ? buildResolvedSpeakerViews(snapshot.speakers, snapshot.speakerResolutionOverlay)
    : [];

  return {
    review_complete: reviewComplete,
    speaker_mapping_complete: isResolvedSpeakerMappingComplete(resolvedSpeakers),
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
      const document = await contractApi.getDocument(caseId);
      return {
        document,
        resolvedSpeakers: buildFallbackResolvedSpeakers(document.speakers),
        updatedAt: null,
        speakerMapConfirmed: false,
        audioSegments: [],
        segmentTargets: [],
        currentSegmentIndex: 0,
        currentTranscriptId: caseId,
        previousTranscriptId: null,
        nextTranscriptId: null,
      };
    }

    if (isRealApiMode()) {
      const resolved = await resolveWorkspaceTarget(caseId);
      const target = resolved.target;
      if (!target) {
        throw new Error("No transcript has been generated for this case yet.");
      }

      const document = await contractApi.getDocument(target.transcript_id);
      const resolvedSpeakers = await contractApi.getResolvedSpeakers(target.transcript_id);
      return {
        document,
        resolvedSpeakers,
        updatedAt: target.updated_at,
        speakerMapConfirmed: target.speaker_map_confirmed,
        audioSegments: await loadAudioSegments(target, document.media_url),
        segmentTargets: resolved.orderedSegments.map((segment) => ({
          transcriptId: segment.transcript_id,
          sequenceIndex: segment.sequence_index,
          sourceFilename: segment.source_filename,
        })),
        currentSegmentIndex: resolved.currentIndex,
        currentTranscriptId: target.transcript_id,
        previousTranscriptId: resolved.previousTranscriptId,
        nextTranscriptId: resolved.nextTranscriptId,
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
      return { ...result, updatedAt: result.updatedAt ?? target.updated_at };
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
      return { ...result, updatedAt: result.updatedAt ?? target.updated_at };
    }

    return persistReview(jobId, payload, options);
  },
  saveSpeakers: async (jobId: string, payload: SpeakersPayload, options?: WorkspaceMutationOptions) => {
    if (USE_MOCK_WORKSPACE) {
      const document = await contractApi.getDocument(jobId);
      return {
        ...(await contractApi.saveSpeakers(jobId, payload)),
        updatedAt: null,
        speakerMapConfirmed: false,
        resolvedSpeakers: buildFallbackResolvedSpeakers(document.speakers),
      };
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId, options?.lastKnownUpdatedAt);
      const result = await contractApi.saveSpeakers(target.transcript_id, payload);
      const resolvedSpeakers = await contractApi.getResolvedSpeakers(target.transcript_id);
      return {
        ok: true,
        updatedAt: result.updatedAt ?? target.updated_at,
        speakerMapConfirmed: isResolvedSpeakerMappingComplete(resolvedSpeakers),
        resolvedSpeakers,
      };
    }

    return persistSpeakers(jobId, payload, options);
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
  getTranscriptReassemblyPreview: async (jobId: string, options?: WorkspaceMutationOptions) => {
    if (USE_MOCK_WORKSPACE) {
      throw new Error("Transcript rebuild preview is unavailable in fixture mode.");
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId, options?.lastKnownUpdatedAt);
      return contractApi.getTranscriptReassemblyPreview(target.transcript_id);
    }

    return buildTranscriptReassemblyPreview(jobId, options);
  },
  applyTranscriptReassembly: async (
    jobId: string,
    previewToken: string,
    options?: WorkspaceMutationOptions,
  ) => {
    if (USE_MOCK_WORKSPACE) {
      throw new Error("Transcript rebuild apply is unavailable in fixture mode.");
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId, options?.lastKnownUpdatedAt);
      return contractApi.applyTranscriptReassembly(target.transcript_id, previewToken);
    }

    return applyTranscriptReassembly(jobId, previewToken, options);
  },
  restoreTranscriptReassembly: async (
    jobId: string,
    snapshot: TranscriptReassemblyUndoSnapshot,
    options?: WorkspaceMutationOptions,
  ) => {
    if (USE_MOCK_WORKSPACE) {
      throw new Error("Transcript rebuild restore is unavailable in fixture mode.");
    }

    if (isRealApiMode()) {
      const target = await requireFreshTranscript(jobId, options?.lastKnownUpdatedAt);
      return contractApi.restoreTranscriptReassembly(target.transcript_id, snapshot);
    }

    return restoreTranscriptReassembly(jobId, snapshot, options);
  },
};
