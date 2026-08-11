import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";
import { getSupabaseClient } from "../lib/supabase";

export type TranscriptJobRow = {
  id: string;
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
  status: "queued" | "preprocessing" | "transcribing" | "assembling" | "completed" | "failed" | "needs_manual_review";
  engine: string | null;
  transcription_source: "deepgram" | "offline-fixture";
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
  pipeline_state?: string | null;
  speaker_map_verified?: boolean;
  ai_review_meta?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type TranscriptJobInsert = Omit<TranscriptJobRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

type TranscriptJobUpdate = Partial<TranscriptJobInsert>;

type TranscriptSpeakerRow = {
  id: string;
  transcript_id: string;
  speaker_id: string;
  display_name: string;
  deepgram_speaker: number | null;
  role: string | null;
  job_id: string;
  speaker_index: number;
  speaker_label: string;
  assigned_name: string | null;
  speaker_role: string | null;
  word_count: number;
};

type TranscriptSpeakerInsert = Omit<TranscriptSpeakerRow, "id"> & { id?: string };

type SpeakerResolutionRow = {
  id: string;
  transcript_id: string;
  speaker_id: string;
  proposed_display_name: string;
  proposed_role: string | null;
  confidence: string | number;
  evidence: string;
  authority: string;
  ai_suggested: boolean;
  verified: boolean;
};

type TranscriptUtteranceRow = {
  id: string;
  transcript_id: string;
  utterance_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  ordinal: number;
  job_id: string;
  utterance_index: number;
  speaker_index: number;
  speaker_label: string;
  text: string;
  avg_confidence: string | null;
  excluded_from_output?: boolean | null;
  exclusion_reason?: string | null;
  is_synthetic?: boolean | null;
  line_type?: string | null;
  ai_suggested_line_type?: string | null;
  manually_reassigned?: boolean | null;
};

type TranscriptUtteranceInsert = Omit<TranscriptUtteranceRow, "id"> & { id?: string };

type TranscriptWordRow = {
  id: string;
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
  ai_suggestion?: string | null;
  ai_suggestion_reason?: string | null;
  ai_confidence?: number | null;
  ai_suggestion_status?: string | null;
  speaker_index: number;
  is_filler: boolean;
  removed: boolean;
};

type TranscriptWordInsert = Omit<TranscriptWordRow, "id"> & { id?: string };

type TranscriptAuditRow = {
  id: string;
  transcript_id: string;
  change_id: string;
  utterance_id: string | null;
  word_id: string | null;
  old_text: string | null;
  new_text: string | null;
  source: string;
  suggestion_id: string | null;
  reviewer_user_id: string | null;
  created_at: string;
  case_id: string;
  job_id: string;
  actor: string | null;
  action: "ingest";
  before_text: string | null;
  after_text: string | null;
};

type TranscriptAuditInsert = Omit<TranscriptAuditRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

type TranscriptDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      transcripts: {
        Row: TranscriptJobRow;
        Insert: TranscriptJobInsert;
        Update: TranscriptJobUpdate;
        Relationships: Database["public"]["Tables"]["transcripts"]["Relationships"];
      };
      transcript_speakers: {
        Row: TranscriptSpeakerRow;
        Insert: TranscriptSpeakerInsert;
        Update: Partial<TranscriptSpeakerInsert>;
        Relationships: Database["public"]["Tables"]["transcript_speakers"]["Relationships"];
      };
      speaker_resolution_current: {
        Row: SpeakerResolutionRow;
        Insert: Partial<SpeakerResolutionRow>;
        Update: Partial<SpeakerResolutionRow>;
        Relationships: [];
      };
      transcript_utterances: {
        Row: TranscriptUtteranceRow;
        Insert: TranscriptUtteranceInsert;
        Update: Partial<TranscriptUtteranceInsert>;
        Relationships: Database["public"]["Tables"]["transcript_utterances"]["Relationships"];
      };
      transcript_words: {
        Row: TranscriptWordRow;
        Insert: TranscriptWordInsert;
        Update: Partial<TranscriptWordInsert>;
        Relationships: Database["public"]["Tables"]["transcript_words"]["Relationships"];
      };
      transcript_audit_log: {
        Row: TranscriptAuditRow;
        Insert: TranscriptAuditInsert;
        Update: Partial<TranscriptAuditInsert>;
        Relationships: Database["public"]["Tables"]["transcript_audit_log"]["Relationships"];
      };
    };
  };
};

function getTranscriptClient(client: SupabaseClient<Database>): SupabaseClient<TranscriptDatabase> {
  return client as unknown as SupabaseClient<TranscriptDatabase>;
}

export async function updateTranscriptJob(
  transcriptId: string,
  patch: TranscriptJobUpdate,
): Promise<TranscriptJobRow> {
  const client = await getSupabaseClient("updateTranscriptJob");
  const transcriptClient = getTranscriptClient(client);
  const { data, error } = await transcriptClient
    .from("transcripts")
    .update(patch as never)
    .eq("transcript_id", transcriptId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as TranscriptJobRow;
}

export async function listTranscriptJobs(caseId: string): Promise<TranscriptJobRow[]> {
  const client = await getSupabaseClient("listTranscriptJobs");
  const transcriptClient = getTranscriptClient(client);
  const { data, error } = await transcriptClient
    .from("transcripts")
    .select("*")
    .eq("case_id", caseId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as TranscriptJobRow[];
}

export async function getTranscriptJobByJobId(jobId: string): Promise<TranscriptJobRow | null> {
  const client = await getSupabaseClient("getTranscriptJobByJobId");
  const transcriptClient = getTranscriptClient(client);
  const { data, error } = await transcriptClient
    .from("transcripts")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as TranscriptJobRow | null) ?? null;
}

export async function getTranscriptJobByTranscriptId(transcriptId: string): Promise<TranscriptJobRow | null> {
  const client = await getSupabaseClient("getTranscriptJobByTranscriptId");
  const transcriptClient = getTranscriptClient(client);
  const { data, error } = await transcriptClient
    .from("transcripts")
    .select("*")
    .eq("transcript_id", transcriptId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as TranscriptJobRow | null) ?? null;
}

export async function getLatestCompletedTranscriptJob(caseId: string): Promise<TranscriptJobRow | null> {
  const client = await getSupabaseClient("getLatestCompletedTranscriptJob");
  const transcriptClient = getTranscriptClient(client);
  const { data, error } = await transcriptClient
    .from("transcripts")
    .select("*")
    .eq("case_id", caseId)
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as TranscriptJobRow | null) ?? null;
}

// PostgREST caps an unranged select at this many rows by default; we page in this size to
// retrieve the full set. Mirrors the editor-api loader's UTTERANCE/WORD_PAGE_SIZE.
export const TRANSCRIPT_ROW_PAGE_SIZE = 1000;

/**
 * Fetch every row of a query by paging with `.range(from, to)` until a short page arrives,
 * defeating PostgREST's default max-rows cap. Pure over the injected page runner: throws on
 * the first page error; returns the concatenated rows in query order.
 */
export async function fetchAllRowsPaginated(
  runPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  pageSize: number = TRANSCRIPT_ROW_PAGE_SIZE,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await runPage(from, to);
    if (error) {
      throw error;
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }
    from += pageSize;
  }
  return rows;
}

export async function loadTranscriptSnapshot(jobId: string): Promise<{
  job: TranscriptJobRow;
  speakers: TranscriptSpeakerRow[];
  speakerResolutions: SpeakerResolutionRow[];
  utterances: TranscriptUtteranceRow[];
  words: TranscriptWordRow[];
} | null> {
  const job = await getTranscriptJobByJobId(jobId);
  if (!job) {
    return null;
  }

  const client = await getSupabaseClient("loadTranscriptSnapshot");
  const transcriptClient = getTranscriptClient(client);
  const [speakersResult, speakerResolutionsResult] = await Promise.all([
    transcriptClient
      .from("transcript_speakers")
      .select("*")
      .eq("job_id", jobId)
      .order("speaker_index", { ascending: true }),
    transcriptClient
      .from("speaker_resolution_current")
      .select("*")
      .eq("transcript_id", job.transcript_id),
  ]);

  if (speakersResult.error) {
    throw speakersResult.error;
  }
  if (speakerResolutionsResult.error) {
    throw speakerResolutionsResult.error;
  }

  // Utterances and words are range-paginated (mirrors the editor-api loader): an unranged
  // select is capped at PostgREST's default max-rows, which silently truncated transcripts
  // with >1000 rows and stitched later words onto the wrong utterances. This loader is the
  // legacy/fallback path (production routes through the paginated editor-api), so pagination
  // here closes the residual truncation risk regardless of deployed configuration.
  const utterances = (await fetchAllRowsPaginated((from, to) =>
    transcriptClient
      .from("transcript_utterances")
      .select("*")
      .eq("job_id", jobId)
      .order("utterance_index", { ascending: true })
      .range(from, to),
  )) as unknown as TranscriptUtteranceRow[];
  const words = (await fetchAllRowsPaginated((from, to) =>
    transcriptClient
      .from("transcript_words")
      .select("*")
      .eq("job_id", jobId)
      .order("word_index", { ascending: true })
      .range(from, to),
  )) as unknown as TranscriptWordRow[];

  return {
    job,
    speakers: (speakersResult.data ?? []) as unknown as TranscriptSpeakerRow[],
    speakerResolutions: (speakerResolutionsResult.data ?? []) as unknown as SpeakerResolutionRow[],
    utterances,
    words,
  };
}

export async function cleanupTranscriptJobData(transcriptId: string): Promise<void> {
  const client = await getSupabaseClient("cleanupTranscriptJobData");
  const transcriptClient = getTranscriptClient(client);

  const { error: wordError } = await transcriptClient
    .from("transcript_words")
    .delete()
    .eq("transcript_id", transcriptId);
  if (wordError) {
    throw wordError;
  }

  const { error: utteranceError } = await transcriptClient
    .from("transcript_utterances")
    .delete()
    .eq("transcript_id", transcriptId);
  if (utteranceError) {
    throw utteranceError;
  }

  const { error: speakerError } = await transcriptClient
    .from("transcript_speakers")
    .delete()
    .eq("transcript_id", transcriptId);
  if (speakerError) {
    throw speakerError;
  }

  const { error: auditError } = await transcriptClient
    .from("transcript_audit_log")
    .delete()
    .eq("transcript_id", transcriptId);
  if (auditError) {
    throw auditError;
  }
}
