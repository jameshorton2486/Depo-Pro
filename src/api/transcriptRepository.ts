import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";
import type { NormalizedTranscriptData } from "../lib/transcript/normalize";
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
  status: "queued" | "preprocessing" | "transcribing" | "assembling" | "completed" | "failed";
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
  deepgram_speaker: number;
  role: string | null;
  job_id: string;
  speaker_index: number;
  speaker_label: string;
  assigned_name: string | null;
  speaker_role: string | null;
  word_count: number;
};

type TranscriptSpeakerInsert = Omit<TranscriptSpeakerRow, "id"> & { id?: string };

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

const WORD_CHUNK_SIZE = 500;

function getTranscriptClient(client: SupabaseClient<Database>): SupabaseClient<TranscriptDatabase> {
  return client as unknown as SupabaseClient<TranscriptDatabase>;
}

function toAuditChangeId(jobId: string): string {
  return `chg_ingest_${jobId}`;
}

function formatNumericConfidence(value: number | null): string | null {
  return value == null ? null : value.toFixed(4);
}

function chunk<T>(values: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
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

export async function listCompletedTranscriptJobsBySequence(caseId: string): Promise<TranscriptJobRow[]> {
  const client = await getSupabaseClient("listCompletedTranscriptJobsBySequence");
  const transcriptClient = getTranscriptClient(client);
  const { data, error } = await transcriptClient
    .from("transcripts")
    .select("*")
    .eq("case_id", caseId)
    .eq("status", "completed")
    .order("sequence_index", { ascending: true })
    .order("updated_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as TranscriptJobRow[];
}

export async function loadTranscriptSnapshot(jobId: string): Promise<{
  job: TranscriptJobRow;
  speakers: TranscriptSpeakerRow[];
  utterances: TranscriptUtteranceRow[];
  words: TranscriptWordRow[];
} | null> {
  const job = await getTranscriptJobByJobId(jobId);
  if (!job) {
    return null;
  }

  const client = await getSupabaseClient("loadTranscriptSnapshot");
  const transcriptClient = getTranscriptClient(client);
  const [speakersResult, utterancesResult, wordsResult] = await Promise.all([
    transcriptClient
      .from("transcript_speakers")
      .select("*")
      .eq("job_id", jobId)
      .order("speaker_index", { ascending: true }),
    transcriptClient
      .from("transcript_utterances")
      .select("*")
      .eq("job_id", jobId)
      .order("utterance_index", { ascending: true }),
    transcriptClient
      .from("transcript_words")
      .select("*")
      .eq("job_id", jobId)
      .order("word_index", { ascending: true }),
  ]);

  if (speakersResult.error) {
    throw speakersResult.error;
  }
  if (utterancesResult.error) {
    throw utterancesResult.error;
  }
  if (wordsResult.error) {
    throw wordsResult.error;
  }

  return {
    job,
    speakers: (speakersResult.data ?? []) as unknown as TranscriptSpeakerRow[],
    utterances: (utterancesResult.data ?? []) as unknown as TranscriptUtteranceRow[],
    words: (wordsResult.data ?? []) as unknown as TranscriptWordRow[],
  };
}

export async function insertNormalizedTranscript(
  job: Pick<TranscriptJobRow, "transcript_id" | "case_id" | "job_id">,
  normalized: NormalizedTranscriptData,
): Promise<void> {
  const client = await getSupabaseClient("insertNormalizedTranscript");
  const transcriptClient = getTranscriptClient(client);

  const speakers: TranscriptSpeakerInsert[] = normalized.speakers.map((speaker) => ({
    transcript_id: job.transcript_id,
    speaker_id: speaker.speaker_id,
    display_name: speaker.speaker_label,
    deepgram_speaker: speaker.speaker_index,
    role: null,
    job_id: job.job_id,
    speaker_index: speaker.speaker_index,
    speaker_label: speaker.speaker_label,
    assigned_name: speaker.assigned_name,
    speaker_role: speaker.speaker_role,
    word_count: speaker.word_count,
  }));

  const utterances: TranscriptUtteranceInsert[] = normalized.utterances.map((utterance) => ({
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
    avg_confidence: formatNumericConfidence(utterance.avg_confidence),
  }));

  const words: TranscriptWordInsert[] = normalized.words.map((word) => ({
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
    reviewed: word.reviewed,
    edited: word.edited,
    job_id: job.job_id,
    word_index: word.word_index,
    working_text: word.working_text,
    speaker_index: word.speaker_index,
    is_filler: word.is_filler,
    removed: false,
  }));

  const audit: TranscriptAuditInsert = {
    transcript_id: job.transcript_id,
    change_id: toAuditChangeId(job.job_id),
    utterance_id: null,
    word_id: null,
    old_text: null,
    new_text: null,
    source: "system",
    suggestion_id: null,
    reviewer_user_id: null,
    case_id: job.case_id,
    job_id: job.job_id,
    actor: null,
    action: "ingest",
    before_text: null,
    after_text: null,
  };

  try {
    if (speakers.length > 0) {
      const { error } = await transcriptClient.from("transcript_speakers").insert(speakers as never);
      if (error) {
        throw error;
      }
    }

    if (utterances.length > 0) {
      const { error } = await transcriptClient.from("transcript_utterances").insert(utterances as never);
      if (error) {
        throw error;
      }
    }

    for (const wordChunk of chunk(words, WORD_CHUNK_SIZE)) {
      const { error } = await transcriptClient.from("transcript_words").insert(wordChunk as never);
      if (error) {
        throw error;
      }
    }

    const { error: auditError } = await transcriptClient.from("transcript_audit_log").insert(audit as never);
    if (auditError) {
      throw auditError;
    }
  } catch (error) {
    await cleanupTranscriptJobData(job.transcript_id);
    throw error;
  }
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
