export type TranscriptionJobStatus = "queued" | "processing" | "finalizing" | "complete" | "failed";

export interface TranscriptionJobAutoSeedAudit {
  source: "case_record";
  added_terms: string[];
  already_present_terms: string[];
  dropped_for_cap_terms: string[];
  final_auto_seeded_terms: string[];
}

export interface TranscriptionJobRecord {
  id: string;
  case_id: string;
  transcript_id: string;
  owner_user_id: string;
  status: TranscriptionJobStatus;
  callback_token_hash: string;
  source_audio_id: string | null;
  source_index: number | null;
  request_path: string | null;
  response_path: string | null;
  error: string | null;
  auto_seed_audit: TranscriptionJobAutoSeedAudit | null;
  /** When the finalize worker most recently began; watchdog staleness anchor. */
  finalize_started_at: string | null;
  /** Finalize re-invocation counter; caps retries before surfacing failure. */
  finalize_attempts: number;
  created_at: string;
  updated_at: string;
}

export const TRANSCRIPTION_ARTIFACT_CATEGORY = "transcription";
export const TRANSCRIPTION_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60;

export function createTranscriptBusinessId(now = Date.now(), random = Math.random()): string {
  const suffix = Math.floor(random * 36 ** 6).toString(36).padStart(6, "0");
  return `tr_${now}_${suffix}`;
}

export function createCallbackToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function buildTranscriptionArtifactPath(
  ownerUserId: string,
  caseId: string,
  fileName: string,
): string {
  return `${ownerUserId}/${caseId}/${TRANSCRIPTION_ARTIFACT_CATEGORY}/${fileName}`;
}

function padSourceIndex(sourceIndex: number): string {
  return String(sourceIndex).padStart(3, "0");
}

export function buildDeepgramRequestFileName(jobId: string, sourceIndex: number, totalSources: number): string {
  if (totalSources <= 1) {
    return `${jobId}_deepgram_request.json`;
  }

  return `${jobId}_file_${padSourceIndex(sourceIndex)}_deepgram_request.json`;
}

export function buildDeepgramResponseFileName(jobId: string, sourceIndex: number, totalSources: number): string {
  if (totalSources <= 1) {
    return `${jobId}_deepgram_response.json`;
  }

  return `${jobId}_file_${padSourceIndex(sourceIndex)}_deepgram_response.json`;
}

export function buildRetranscriptionAuditFileName(jobId: string): string {
  return `${jobId}_retranscription_audit.json`;
}
