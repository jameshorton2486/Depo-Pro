import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient, supabase } from "../lib/supabase";
import { createOfflineDeepgramFixture } from "../lib/transcript/offlineFixture";
import { isMockMode } from "../lib/runtime/mode";
import type { Database } from "../types/database";
import type { DeepgramKeyterm } from "../types/case";
import type { DeepgramResponse } from "../lib/transcript/types";
import type { TranscriptionJobAutoSeedAudit, TranscriptionJobRecord } from "../lib/transcriptionJobs";

type TranscriptionJobInsert = Omit<TranscriptionJobRecord, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type TranscriptionDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      transcription_jobs: {
        Row: TranscriptionJobRecord;
        Insert: TranscriptionJobInsert;
        Update: Partial<TranscriptionJobInsert>;
        Relationships: [];
      };
    };
  };
};

type MockJobState = {
  timer: number | null;
  job: TranscriptionJobRecord;
  fixture: DeepgramResponse;
};

const MAX_KEYTERMS = 100;
const MOCK_LATENCY_MS = 1800;
const mockJobs = new Map<string, MockJobState>();

function getTranscriptionClient(client: SupabaseClient<Database>): SupabaseClient<TranscriptionDatabase> {
  return client as unknown as SupabaseClient<TranscriptionDatabase>;
}

function createMockJobId(now = Date.now(), random = Math.random()): string {
  const suffix = Math.floor(random * 36 ** 6).toString(36).padStart(6, "0");
  return `mock_tx_${now}_${suffix}`;
}

function createMockTranscriptId(now = Date.now(), random = Math.random()): string {
  const suffix = Math.floor(random * 36 ** 6).toString(36).padStart(6, "0");
  return `mock_tr_${now}_${suffix}`;
}

function createMockJob(caseId: string): TranscriptionJobRecord {
  const now = new Date().toISOString();
  return {
    id: createMockJobId(),
    case_id: caseId,
    transcript_id: createMockTranscriptId(),
    owner_user_id: "mock-owner",
    status: "queued",
    callback_token_hash: "mock",
    source_audio_id: null,
    source_index: 0,
    request_path: null,
    response_path: null,
    error: null,
    auto_seed_audit: null,
    finalize_started_at: null,
    finalize_attempts: 0,
    created_at: now,
    updated_at: now,
  };
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

function scheduleMockCompletion(caseId: string) {
  const state = mockJobs.get(caseId);
  if (!state || state.timer !== null) {
    return;
  }

  state.timer = window.setTimeout(() => {
    const current = mockJobs.get(caseId);
    if (!current) {
      return;
    }

    const completedAt = new Date().toISOString();
    mockJobs.set(caseId, {
      ...current,
      timer: null,
      job: {
        ...current.job,
        status: "complete",
        updated_at: completedAt,
      },
    });
  }, MOCK_LATENCY_MS);
}

export async function startTranscription(
  caseId: string,
  options: {
    sourceTranscriptId?: string | null;
  } = {},
): Promise<TranscriptionJobRecord> {
  if (isMockMode()) {
    const existing = mockJobs.get(caseId)?.job ?? null;
    if (existing && (existing.status === "queued" || existing.status === "processing" || existing.status === "finalizing")) {
      return existing;
    }

    const job = createMockJob(caseId);
    mockJobs.set(caseId, {
      timer: null,
      job: {
        ...job,
        status: "processing",
      },
      fixture: createOfflineDeepgramFixture(caseId),
    });
    scheduleMockCompletion(caseId);
    return mockJobs.get(caseId)!.job;
  }

  const client = await getSupabaseClient("startTranscription");
  const { data, error } = await client.functions.invoke("transcribe-start", {
    body: {
      case_id: caseId,
      source_transcript_id: options.sourceTranscriptId ?? null,
    },
  });

  if (error) {
    throw error;
  }

  const job = readJobFromFunctionPayload(data);
  if (!job) {
    throw new Error("transcribe-start returned no job payload.");
  }

  return job;
}

export async function getJob(caseId: string): Promise<TranscriptionJobRecord | null> {
  if (isMockMode()) {
    return mockJobs.get(caseId)?.job ?? null;
  }

  const client = await getSupabaseClient("getTranscriptionJob");
  const transcriptionClient = getTranscriptionClient(client);
  const { data, error } = await transcriptionClient
    .from("transcription_jobs")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as TranscriptionJobRecord | null) ?? null;
}

export async function getLatestAutoSeedAudit(caseId: string): Promise<TranscriptionJobAutoSeedAudit | null> {
  if (isMockMode()) {
    return mockJobs.get(caseId)?.job.auto_seed_audit ?? null;
  }

  const client = await getSupabaseClient("getLatestAutoSeedAudit");
  const transcriptionClient = getTranscriptionClient(client);
  const { data, error } = await transcriptionClient
    .from("transcription_jobs")
    .select("auto_seed_audit")
    .eq("case_id", caseId)
    .not("auto_seed_audit", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as { auto_seed_audit: TranscriptionJobAutoSeedAudit | null } | null)?.auto_seed_audit ?? null;
}

export async function listTranscriptionJobs(caseId: string): Promise<TranscriptionJobRecord[]> {
  if (isMockMode()) {
    const job = mockJobs.get(caseId)?.job ?? null;
    return job ? [job] : [];
  }

  const client = await getSupabaseClient("listTranscriptionJobs");
  const transcriptionClient = getTranscriptionClient(client);
  const { data, error } = await transcriptionClient
    .from("transcription_jobs")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as TranscriptionJobRecord[];
}

function readJobFromFunctionPayload(value: unknown): TranscriptionJobRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeJob = (value as { job?: unknown }).job;
  if (!maybeJob || typeof maybeJob !== "object") {
    return null;
  }

  const job = maybeJob as Partial<TranscriptionJobRecord>;
  if (
    typeof job.id !== "string"
    || typeof job.case_id !== "string"
    || typeof job.transcript_id !== "string"
    || typeof job.status !== "string"
  ) {
    return null;
  }

  return {
    id: job.id,
    case_id: job.case_id,
    transcript_id: job.transcript_id,
    owner_user_id: typeof job.owner_user_id === "string" ? job.owner_user_id : "",
    status: job.status === "queued" || job.status === "processing" || job.status === "finalizing" || job.status === "complete" || job.status === "failed"
      ? job.status
      : "queued",
    callback_token_hash: typeof job.callback_token_hash === "string" ? job.callback_token_hash : "",
    source_audio_id: typeof job.source_audio_id === "string" ? job.source_audio_id : null,
    source_index: typeof job.source_index === "number" ? job.source_index : null,
    request_path: typeof job.request_path === "string" ? job.request_path : null,
    response_path: typeof job.response_path === "string" ? job.response_path : null,
    error: typeof job.error === "string" ? job.error : null,
    auto_seed_audit: job.auto_seed_audit && typeof job.auto_seed_audit === "object"
      ? job.auto_seed_audit
      : null,
    finalize_started_at: typeof job.finalize_started_at === "string" ? job.finalize_started_at : null,
    finalize_attempts: typeof job.finalize_attempts === "number" ? job.finalize_attempts : 0,
    created_at: typeof job.created_at === "string" ? job.created_at : new Date().toISOString(),
    updated_at: typeof job.updated_at === "string" ? job.updated_at : new Date().toISOString(),
  };
}

export function clearMockTranscriptionJobs() {
  for (const state of mockJobs.values()) {
    if (state.timer !== null) {
      window.clearTimeout(state.timer);
    }
  }
  mockJobs.clear();
}

export async function invokeTranscriptionCallbackForTest(
  jobId: string,
  token: string,
  payload: string | Blob | ArrayBuffer | FormData | File | ReadableStream<Uint8Array> | Record<string, unknown>,
) {
  if (!supabase) {
    throw new Error("Supabase unavailable.");
  }

  const { data, error } = await supabase.functions.invoke(`transcribe-callback?job=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`, {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return data;
}
