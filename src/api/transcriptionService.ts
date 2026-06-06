import type { SupabaseClient } from "@supabase/supabase-js";

import { externalJsonRequest } from "./client";
import { computeChecksum, downloadCaseFile } from "./fileService";
import { getSupabaseClient } from "../lib/supabase";
import { loadCase } from "./caseService";
import type { CaseAudioRecord } from "./fileService";
import type { Database } from "../types/database";
import type { DeepgramKeyterm } from "../types/case";
import { createOfflineDeepgramFixture } from "../lib/transcript/offlineFixture";
import type { DeepgramResponse, TranscriptCapture } from "../lib/transcript/types";
import { normalizeTranscriptResponse } from "../lib/transcript/normalize";
import { buildDeepgramRequestFromStoredKeyterms } from "../lib/deepgram/buildDeepgramRequest";
import {
  insertNormalizedTranscript,
  type TranscriptJobRow,
  updateTranscriptJob,
} from "./transcriptRepository";

type TranscriptInsert = Omit<
  TranscriptJobRow,
  "id" | "created_at" | "updated_at" | "duration" | "deepgram_request_id" | "duration_seconds" | "word_count" | "utterance_count" | "speaker_count" | "avg_confidence" | "raw_storage_path" | "raw_checksum" | "last_error" | "speaker_map_confirmed"
> & {
  id?: string;
  duration?: number | null;
  deepgram_request_id?: string | null;
  duration_seconds?: number | null;
  word_count?: number;
  utterance_count?: number;
  speaker_count?: number;
  avg_confidence?: string | null;
  raw_storage_path?: string | null;
  raw_checksum?: string | null;
  last_error?: string | null;
  speaker_map_confirmed?: boolean;
};

type TranscriptUpdate = Partial<TranscriptInsert>;

type TranscriptDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      transcripts: {
        Row: TranscriptJobRow;
        Insert: TranscriptInsert;
        Update: TranscriptUpdate;
        Relationships: Database["public"]["Tables"]["transcripts"]["Relationships"];
      };
    };
  };
};

const CASE_FILES_BUCKET = "case-files";
const MAX_KEYTERMS = 100;

function getTranscriptClient(client: SupabaseClient<Database>): SupabaseClient<TranscriptDatabase> {
  return client as unknown as SupabaseClient<TranscriptDatabase>;
}

function createTranscriptJobId(now = Date.now(), random = Math.random()): string {
  const suffix = Math.floor(random * 36 ** 6).toString(36).padStart(6, "0");
  return `job_${now}_${suffix}`;
}

function createTranscriptId(jobId: string): string {
  return `tr_${jobId}`;
}

export function normalizeDeepgramKeyterms(keyterms: DeepgramKeyterm[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const keyterm of keyterms) {
    const normalized = keyterm.term.trim().replace(/\s+/g, " ");
    if (!normalized) {
      continue;
    }

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    result.push(normalized);

    if (result.length >= MAX_KEYTERMS) {
      break;
    }
  }

  return result;
}

function detectMediaKind(mimeType: string): "audio" | "video" {
  return mimeType.startsWith("video/") ? "video" : "audio";
}

function getDeepgramApiKey(): string | null {
  return import.meta.env.VITE_DEEPGRAM_API_KEY || null;
}

function resolveTranscriptionSource(): "deepgram" | "offline-fixture" {
  if (import.meta.env.VITE_TRANSCRIPTION_PROVIDER === "offline") {
    return "offline-fixture";
  }

  return getDeepgramApiKey() ? "deepgram" : "offline-fixture";
}

function buildRawStoragePath(caseId: string, jobId: string): string {
  return `cases/${caseId}/transcripts/${jobId}/raw.json`;
}

async function createTranscriptJob(
  caseId: string,
  audioRecord: CaseAudioRecord,
  transcriptionSource: "deepgram" | "offline-fixture",
): Promise<TranscriptJobRow> {
  const client = await getSupabaseClient("createTranscriptJob");
  const transcriptClient = getTranscriptClient(client);
  const jobId = createTranscriptJobId();
  const transcriptId = createTranscriptId(jobId);
  const mediaKind = detectMediaKind(audioRecord.mime_type || "");
  const insert: TranscriptInsert = {
    transcript_id: transcriptId,
    case_id: caseId,
    job_id: jobId,
    media_url: audioRecord.storage_path ?? null,
    based_on: audioRecord.audio_id,
    session_id: null,
    source_filename: audioRecord.original_filename,
    media_kind: mediaKind,
    status: "queued",
    engine: transcriptionSource === "deepgram" ? "deepgram-nova-3" : "offline-fixture",
    transcription_source: transcriptionSource,
    sequence_index: 0,
  };

  const { data, error } = await transcriptClient
    .from("transcripts")
    .insert(insert as never)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as TranscriptJobRow;
}

async function uploadRawPacket(
  caseId: string,
  jobId: string,
  response: DeepgramResponse,
): Promise<{ rawStoragePath: string; rawChecksum: string }> {
  const client = await getSupabaseClient("uploadTranscriptRawPacket");
  const rawStoragePath = buildRawStoragePath(caseId, jobId);
  const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
  const checksum = await computeChecksum(blob);

  const { error } = await client.storage
    .from(CASE_FILES_BUCKET)
    .upload(rawStoragePath, blob, {
      upsert: false,
      contentType: "application/json",
    });

  if (error) {
    throw error;
  }

  return {
    rawStoragePath,
    rawChecksum: checksum,
  };
}

async function fetchDeepgramResponseFromCase(
  caseId: string,
  audioRecord: CaseAudioRecord,
  keyterms: DeepgramKeyterm[],
): Promise<DeepgramResponse> {
  if (!audioRecord.storage_path) {
    throw new Error("Audio storage path missing. Re-upload the audio before starting transcription.");
  }

  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new Error("Deepgram API key missing. Set VITE_DEEPGRAM_API_KEY or use offline mode.");
  }

  const file = await downloadCaseFile(audioRecord.storage_path, audioRecord.original_filename, audioRecord.mime_type);
  const request = buildDeepgramRequestFromStoredKeyterms({ caseId, keyterms });
  return externalJsonRequest<DeepgramResponse>("POST", request.wireUrl, {
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
}

export async function startTranscription(caseId: string, audioRecord: CaseAudioRecord): Promise<TranscriptCapture> {
  const caseRecord = await loadCase(caseId);
  if (!caseRecord) {
    throw new Error(`Case ${caseId} was not found.`);
  }

  const transcriptionSource = resolveTranscriptionSource();
  const transcriptJob = await createTranscriptJob(caseId, audioRecord, transcriptionSource);

  try {
    await updateTranscriptJob(transcriptJob.transcript_id, {
      status: "preprocessing",
      media_url: audioRecord.storage_path ?? transcriptJob.media_url,
    });

    const response =
      transcriptionSource === "offline-fixture"
        ? createOfflineDeepgramFixture(caseId)
        : await fetchDeepgramResponseFromCase(caseId, audioRecord, caseRecord.deepgram.keyterms);

    const { rawStoragePath, rawChecksum } = await uploadRawPacket(caseId, transcriptJob.job_id, response);
    const normalized = normalizeTranscriptResponse(response);

    await insertNormalizedTranscript(
      {
        transcript_id: transcriptJob.transcript_id,
        case_id: transcriptJob.case_id,
        job_id: transcriptJob.job_id,
      },
      normalized,
    );

    await updateTranscriptJob(transcriptJob.transcript_id, {
      status: "completed",
      deepgram_request_id: response.metadata.request_id,
      duration: response.metadata.duration,
      duration_seconds: response.metadata.duration,
      raw_storage_path: rawStoragePath,
      raw_checksum: rawChecksum,
      transcription_source: transcriptionSource,
      engine: transcriptionSource === "deepgram" ? "deepgram-nova-3" : "offline-fixture",
      word_count: normalized.words.length,
      utterance_count: normalized.utterances.length,
      speaker_count: normalized.speakers.length,
      avg_confidence: normalized.avgConfidence != null ? normalized.avgConfidence.toFixed(4) : null,
      last_error: null,
    });

    return {
      caseId,
      jobId: transcriptJob.job_id,
      transcriptId: transcriptJob.transcript_id,
      response,
      rawStoragePath,
      rawChecksum,
      transcriptionSource,
    };
  } catch (error) {
    await updateTranscriptJob(transcriptJob.transcript_id, {
      status: "failed",
      last_error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
