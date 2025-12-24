// ═══════════════════════════════════════════════════════════════
// CONSTANTS & ENUMS
// ═══════════════════════════════════════════════════════════════
// TypeScript representations of Prisma enums with UI metadata

/**
 * User roles for access control
 */
export const Role = {
  ADMIN: 'ADMIN',
  COURT_REPORTER: 'COURT_REPORTER',
  SCOPIST: 'SCOPIST',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/**
 * Firm types
 */
export const FirmType = {
  AGENCY: 'AGENCY',
  INDEPENDENT: 'INDEPENDENT',
} as const;

export type FirmType = (typeof FirmType)[keyof typeof FirmType];

/**
 * Job status lifecycle - matches Prisma JobStatus enum
 */
export const JobStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  AI_COMPLETE: 'AI_COMPLETE',
  WITH_SCOPIST: 'WITH_SCOPIST',
  SCOPIST_COMPLETE: 'SCOPIST_COMPLETE',
  WITH_COURT_REPORTER: 'WITH_COURT_REPORTER',
  COMPLETED: 'COMPLETED',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/**
 * Assignment status for scopist assignments
 */
export const AssignmentStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;

export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

/**
 * File types for uploaded files
 */
export const FileType = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  TRANSCRIPT: 'TRANSCRIPT',
  EXHIBIT: 'EXHIBIT',
  WORDLIST: 'WORDLIST',
  OTHER: 'OTHER',
} as const;

export type FileType = (typeof FileType)[keyof typeof FileType];

/**
 * Transcript status
 */
export const TranscriptStatus = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  FINAL: 'FINAL',
} as const;

export type TranscriptStatus = (typeof TranscriptStatus)[keyof typeof TranscriptStatus];

/**
 * Transcript source
 */
export const TranscriptSource = {
  MANUAL: 'MANUAL',
  DEEPGRAM: 'DEEPGRAM',
  IMPORTED: 'IMPORTED',
} as const;

export type TranscriptSource = (typeof TranscriptSource)[keyof typeof TranscriptSource];

/**
 * Dictionary term categories
 */
export const TermCategory = {
  NAME: 'NAME',
  PLACE: 'PLACE',
  TECHNICAL: 'TECHNICAL',
  MEDICAL: 'MEDICAL',
  LEGAL: 'LEGAL',
  OTHER: 'OTHER',
} as const;

export type TermCategory = (typeof TermCategory)[keyof typeof TermCategory];

// ═══════════════════════════════════════════════════════════════
// UI METADATA
// ═══════════════════════════════════════════════════════════════

/**
 * Status colors for badges (Tailwind CSS classes) - matches Prisma JobStatus enum
 */
export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-800 border-gray-300',
  PROCESSING: 'bg-blue-100 text-blue-800 border-blue-300',
  AI_COMPLETE: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  WITH_SCOPIST: 'bg-purple-100 text-purple-800 border-purple-300',
  SCOPIST_COMPLETE: 'bg-pink-100 text-pink-800 border-pink-300',
  WITH_COURT_REPORTER: 'bg-orange-100 text-orange-800 border-orange-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  FAILED: 'bg-red-100 text-red-800 border-red-300',
  ARCHIVED: 'bg-slate-100 text-slate-800 border-slate-300',
};

/**
 * Assignment status colors
 */
export const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-800 border-gray-300',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * Role display names
 */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  COURT_REPORTER: 'Court Reporter',
  SCOPIST: 'Scopist',
};

/**
 * Role colors for badges
 */
export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-300',
  COURT_REPORTER: 'bg-blue-100 text-blue-800 border-blue-300',
  SCOPIST: 'bg-green-100 text-green-800 border-green-300',
};

/**
 * File type icons (can be replaced with actual icon components)
 */
export const FILE_TYPE_ICONS: Record<FileType, string> = {
  AUDIO: '🎵',
  VIDEO: '🎥',
  TRANSCRIPT: '📄',
  EXHIBIT: '📎',
  WORDLIST: '📝',
  OTHER: '📁',
};

/**
 * Readable labels for job status - matches Prisma JobStatus enum
 */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  AI_COMPLETE: 'AI Complete',
  WITH_SCOPIST: 'With Scopist',
  SCOPIST_COMPLETE: 'Scopist Complete',
  WITH_COURT_REPORTER: 'With Court Reporter',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  ARCHIVED: 'Archived',
};

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
