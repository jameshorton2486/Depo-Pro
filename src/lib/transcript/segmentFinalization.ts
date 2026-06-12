import type { NormalizedTranscriptData } from "./normalize";

export interface SegmentTranscriptJobContext {
  transcriptId: string;
  caseId: string;
  jobId: string;
  ownerUserId: string;
}

export interface SegmentTranscriptSource {
  sourceAudioId: string;
  sourceIndex: number;
  sourceFilename: string;
  mimeType: string;
  storagePath: string | null;
  mediaUrl: string | null;
  normalized: NormalizedTranscriptData;
  deepgramRequestId: string | null;
  rawStoragePath: string;
  rawChecksum: string | null;
}

export interface SegmentTranscriptRow {
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
  status: "completed";
  engine: string;
  transcription_source: "deepgram";
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
  owner_user_id: string;
}

export interface SegmentSpeakerRow {
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
  owner_user_id: string;
}

export interface SegmentUtteranceRow {
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
  owner_user_id: string;
}

export interface SegmentWordRow {
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
  owner_user_id: string;
}

export interface SegmentAuditRow {
  transcript_id: string;
  change_id: string;
  utterance_id: string | null;
  word_id: string | null;
  old_text: string | null;
  new_text: string | null;
  source: "system";
  suggestion_id: string | null;
  reviewer_user_id: string | null;
  case_id: string;
  job_id: string;
  actor: string | null;
  action: "ingest";
  before_text: string | null;
  after_text: string | null;
  owner_user_id: string;
}

export interface SegmentTranscriptBundle {
  transcript: SegmentTranscriptRow;
  speakers: SegmentSpeakerRow[];
  utterances: SegmentUtteranceRow[];
  words: SegmentWordRow[];
  audit: SegmentAuditRow;
}

export interface SegmentTranscriptStore {
  listCaseTranscriptIds(caseId: string): Promise<string[]>;
  deleteTranscriptData(transcriptId: string): Promise<void>;
  insertTranscriptBundle(bundle: SegmentTranscriptBundle): Promise<void>;
}

export function buildSegmentTranscriptId(baseTranscriptId: string, sourceIndex: number): string {
  return `${baseTranscriptId}_seg_${String(sourceIndex).padStart(3, "0")}`;
}

export function buildSegmentTranscriptJobId(baseJobId: string, sourceIndex: number): string {
  return `${baseJobId}_seg_${String(sourceIndex).padStart(3, "0")}`;
}

function formatConfidence(value: number | null): string | null {
  return value == null ? null : value.toFixed(4);
}

export function buildSegmentTranscriptBundle(
  job: SegmentTranscriptJobContext,
  source: SegmentTranscriptSource,
): SegmentTranscriptBundle {
  const transcriptId = buildSegmentTranscriptId(job.transcriptId, source.sourceIndex);
  const jobId = buildSegmentTranscriptJobId(job.jobId, source.sourceIndex);

  return {
    transcript: {
      transcript_id: transcriptId,
      case_id: job.caseId,
      job_id: jobId,
      media_url: source.storagePath ?? source.mediaUrl,
      duration: source.normalized.durationSeconds,
      based_on: source.sourceAudioId,
      deepgram_request_id: source.deepgramRequestId,
      session_id: null,
      source_filename: source.sourceFilename,
      media_kind: detectMediaKind(source.mimeType),
      status: "completed",
      engine: "deepgram-nova-3",
      transcription_source: "deepgram",
      sequence_index: source.sourceIndex,
      duration_seconds: source.normalized.durationSeconds,
      word_count: source.normalized.words.length,
      utterance_count: source.normalized.utterances.length,
      speaker_count: source.normalized.speakers.length,
      avg_confidence: formatConfidence(source.normalized.avgConfidence),
      raw_storage_path: source.rawStoragePath,
      raw_checksum: source.rawChecksum,
      last_error: null,
      speaker_map_confirmed: false,
      owner_user_id: job.ownerUserId,
    },
    speakers: source.normalized.speakers.map((speaker) => ({
      transcript_id: transcriptId,
      speaker_id: speaker.speaker_id,
      display_name: speaker.speaker_label,
      deepgram_speaker: speaker.speaker_index,
      role: null,
      job_id: jobId,
      speaker_index: speaker.speaker_index,
      speaker_label: speaker.speaker_label,
      assigned_name: null,
      speaker_role: null,
      word_count: speaker.word_count,
      owner_user_id: job.ownerUserId,
    })),
    utterances: source.normalized.utterances.map((utterance) => ({
      transcript_id: transcriptId,
      utterance_id: utterance.utterance_id,
      speaker_id: utterance.speaker_id,
      start_time: utterance.start_time,
      end_time: utterance.end_time,
      ordinal: utterance.utterance_index,
      job_id: jobId,
      utterance_index: utterance.utterance_index,
      speaker_index: utterance.speaker_index,
      speaker_label: utterance.speaker_label,
      text: utterance.text,
      avg_confidence: utterance.avg_confidence.toFixed(4),
      owner_user_id: job.ownerUserId,
    })),
    words: source.normalized.words.map((word) => ({
      transcript_id: transcriptId,
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
      job_id: jobId,
      word_index: word.word_index,
      working_text: word.working_text,
      speaker_index: word.speaker_index,
      is_filler: word.is_filler,
      removed: false,
      owner_user_id: job.ownerUserId,
    })),
    audit: {
      transcript_id: transcriptId,
      change_id: `chg_ingest_${jobId}`,
      utterance_id: null,
      word_id: null,
      old_text: null,
      new_text: null,
      source: "system",
      suggestion_id: null,
      reviewer_user_id: null,
      case_id: job.caseId,
      job_id: jobId,
      actor: null,
      action: "ingest",
      before_text: null,
      after_text: null,
      owner_user_id: job.ownerUserId,
    },
  };
}

export async function replaceCaseSegmentTranscripts(
  store: SegmentTranscriptStore,
  caseId: string,
  bundles: SegmentTranscriptBundle[],
): Promise<void> {
  const transcriptIds = await store.listCaseTranscriptIds(caseId);
  for (const transcriptId of transcriptIds) {
    await store.deleteTranscriptData(transcriptId);
  }

  for (const bundle of bundles) {
    await store.insertTranscriptBundle(bundle);
  }
}

function detectMediaKind(mimeType: string): "audio" | "video" {
  return mimeType.startsWith("video/") ? "video" : "audio";
}
