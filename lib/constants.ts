/**
 * Constants & UI Metadata for Depo-Pro v1.3
 *
 * Re-exports schema enums and adds UI-specific metadata
 */

// ═══════════════════════════════════════════════════════════════
// SCHEMA ENUMS (re-exported from types/schema-enums.ts)
// ═══════════════════════════════════════════════════════════════

export {
  UserRole,
  JobStatus,
  TranscriptionStatus,
  FlaggedWordStatus,
  ChunkStatus,
  EditType,
  SilentSegmentType,
  TranscriptionSource,
  AuditAction,
  ShareAccessLevel,
  AudioFormat,
  PipelineStage,
} from '@/types/schema-enums';

// ═══════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY ALIASES
// ═══════════════════════════════════════════════════════════════

/**
 * Legacy Role type (for old code that uses 'Role' instead of 'UserRole')
 */
export type Role = 'ADMIN' | 'COURT_REPORTER' | 'SCOPIST' | 'ATTORNEY';

/**
 * Legacy Role constant object
 */
export const Role = {
  ADMIN: 'ADMIN' as const,
  COURT_REPORTER: 'COURT_REPORTER' as const,
  SCOPIST: 'SCOPIST' as const,
  ATTORNEY: 'ATTORNEY' as const,
} as const;

// ═══════════════════════════════════════════════════════════════
// UI METADATA
// ═══════════════════════════════════════════════════════════════

import {
  UserRole,
  JobStatus,
  TranscriptionStatus,
  FlaggedWordStatus,
} from '@/types/schema-enums';

/**
 * Role display names
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.COURT_REPORTER]: 'Court Reporter',
  [UserRole.SCOPIST]: 'Scopist',
  [UserRole.ATTORNEY]: 'Attorney',
};

/**
 * Legacy alias for USER_ROLE_LABELS
 */
export const ROLE_LABELS = USER_ROLE_LABELS;

/**
 * Role colors for badges
 */
export const USER_ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'bg-red-100 text-red-800 border-red-300',
  [UserRole.COURT_REPORTER]: 'bg-blue-100 text-blue-800 border-blue-300',
  [UserRole.SCOPIST]: 'bg-green-100 text-green-800 border-green-300',
  [UserRole.ATTORNEY]: 'bg-purple-100 text-purple-800 border-purple-300',
};

/**
 * Job status display labels
 */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'Draft',
  [JobStatus.PENDING]: 'Pending',
  [JobStatus.PROCESSING]: 'Processing',
  [JobStatus.AI_COMPLETE]: 'AI Complete',
  [JobStatus.ASSIGNED_TO_SCOPIST]: 'Assigned to Scopist',
  [JobStatus.IN_REVIEW]: 'In Review',
  [JobStatus.SCOPIST_IN_REVIEW]: 'Scopist Reviewing',
  [JobStatus.SCOPIST_COMPLETE]: 'Scopist Complete',
  [JobStatus.REPORTER_REVIEW]: 'Reporter Review',
  [JobStatus.FINAL_REVIEW]: 'Final Review',
  [JobStatus.COMPLETED]: 'Completed',
  [JobStatus.ARCHIVED]: 'Archived',
  [JobStatus.FAILED]: 'Failed',
};

/**
 * Job status colors for badges
 */
export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'bg-gray-100 text-gray-800 border-gray-300',
  [JobStatus.PENDING]: 'bg-blue-100 text-blue-800 border-blue-300',
  [JobStatus.PROCESSING]: 'bg-purple-100 text-purple-800 border-purple-300',
  [JobStatus.AI_COMPLETE]: 'bg-green-100 text-green-800 border-green-300',
  [JobStatus.ASSIGNED_TO_SCOPIST]: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  [JobStatus.IN_REVIEW]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [JobStatus.SCOPIST_IN_REVIEW]: 'bg-amber-100 text-amber-800 border-amber-300',
  [JobStatus.SCOPIST_COMPLETE]: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  [JobStatus.REPORTER_REVIEW]: 'bg-lime-100 text-lime-800 border-lime-300',
  [JobStatus.FINAL_REVIEW]: 'bg-orange-100 text-orange-800 border-orange-300',
  [JobStatus.COMPLETED]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  [JobStatus.ARCHIVED]: 'bg-slate-100 text-slate-800 border-slate-300',
  [JobStatus.FAILED]: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * Transcription status display labels
 */
export const TRANSCRIPTION_STATUS_LABELS: Record<TranscriptionStatus, string> = {
  [TranscriptionStatus.AWAITING_AUDIO]: 'Awaiting Audio',
  [TranscriptionStatus.VALIDATING]: 'Validating',
  [TranscriptionStatus.CHUNKING]: 'Chunking',
  [TranscriptionStatus.TRANSCRIBING]: 'Transcribing',
  [TranscriptionStatus.REASSEMBLING]: 'Reassembling',
  [TranscriptionStatus.EXTRACTING_FLAGS]: 'Extracting Flags',
  [TranscriptionStatus.COMPLETE]: 'Complete',
  [TranscriptionStatus.PIPELINE_FAILED]: 'Failed',
};

/**
 * Transcription status colors
 */
export const TRANSCRIPTION_STATUS_COLORS: Record<TranscriptionStatus, string> = {
  [TranscriptionStatus.AWAITING_AUDIO]: 'bg-gray-100 text-gray-800 border-gray-300',
  [TranscriptionStatus.VALIDATING]: 'bg-blue-100 text-blue-800 border-blue-300',
  [TranscriptionStatus.CHUNKING]: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  [TranscriptionStatus.TRANSCRIBING]: 'bg-purple-100 text-purple-800 border-purple-300',
  [TranscriptionStatus.REASSEMBLING]: 'bg-pink-100 text-pink-800 border-pink-300',
  [TranscriptionStatus.EXTRACTING_FLAGS]: 'bg-orange-100 text-orange-800 border-orange-300',
  [TranscriptionStatus.COMPLETE]: 'bg-green-100 text-green-800 border-green-300',
  [TranscriptionStatus.PIPELINE_FAILED]: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * Flagged word status display labels
 */
export const FLAGGED_WORD_STATUS_LABELS: Record<FlaggedWordStatus, string> = {
  [FlaggedWordStatus.PENDING]: 'Pending',
  [FlaggedWordStatus.CORRECTED]: 'Corrected',
  [FlaggedWordStatus.CONFIRMED]: 'Confirmed',
  [FlaggedWordStatus.SKIPPED]: 'Skipped',
};

/**
 * Flagged word status colors
 */
export const FLAGGED_WORD_STATUS_COLORS: Record<FlaggedWordStatus, string> = {
  [FlaggedWordStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [FlaggedWordStatus.CORRECTED]: 'bg-blue-100 text-blue-800 border-blue-300',
  [FlaggedWordStatus.CONFIRMED]: 'bg-green-100 text-green-800 border-green-300',
  [FlaggedWordStatus.SKIPPED]: 'bg-gray-100 text-gray-800 border-gray-300',
};

/**
 * Confidence thresholds for flagging words
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9, // Above this: high confidence
  MEDIUM: 0.7, // Between medium and high: medium confidence
  LOW: 0.5, // Between low and medium: low confidence
  FLAG: 0.7, // Below this: flagged for review
} as const;

/**
 * Confidence color coding
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'text-green-600';
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'text-yellow-600';
  } else {
    return 'text-red-600';
  }
}

/**
 * Confidence badge classes
 */
export function getConfidenceBadgeClasses(confidence: number): string {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'bg-green-100 text-green-800 border-green-300';
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  } else {
    return 'bg-red-100 text-red-800 border-red-300';
  }
}

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  FLAGGED_WORDS_PAGE_SIZE: 50,
  AUDIT_LOG_PAGE_SIZE: 50,
} as const;

/**
 * Audio validation limits
 */
export const AUDIO_LIMITS = {
  MAX_FILE_SIZE_MB: 2048, // 2GB
  MAX_DURATION_HOURS: 12,
  MIN_DURATION_SECONDS: 1,
  SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a', 'mp4', 'mov'],
} as const;

/**
 * Chunking configuration defaults
 */
export const DEFAULT_CHUNKING_CONFIG = {
  chunkDurationSeconds: 1800, // 30 minutes
  overlapSeconds: 5,
  outputFormat: 'mp3' as const,
  outputBitrate: '128k' as const,
} as const;

/**
 * Deepgram configuration defaults
 */
export const DEFAULT_DEEPGRAM_CONFIG = {
  model: 'nova-3',
  language: 'en',
  punctuate: true,
  diarize: true,
  smart_format: true,
  paragraphs: true,
  utterances: true,
} as const;

/**
 * Lock timeout defaults
 */
export const LOCK_TIMEOUTS = {
  DEFAULT_MINUTES: 120, // 2 hours
  MAX_MINUTES: 480, // 8 hours
  HEARTBEAT_INTERVAL_MINUTES: 30,
} as const;

/**
 * Export format types
 */
export const EXPORT_FORMATS = {
  DOCX: 'docx',
  TXT: 'txt',
  PDF: 'pdf',
} as const;

/**
 * Share expiration presets (in days)
 */
export const SHARE_EXPIRATION_PRESETS = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'Never', days: null },
] as const;
