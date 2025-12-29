// ═══════════════════════════════════════════════════════════════
// CONSTANTS & ENUMS
// ═══════════════════════════════════════════════════════════════
// TypeScript representations of Prisma enums with UI metadata

/**
 * User roles for access control
 */
export const Role = {
  ADMIN: 'ADMIN',
  REPORTER: 'REPORTER',
  SCOPIST: 'SCOPIST',
  ATTORNEY: 'ATTORNEY',
  AGENCY: 'AGENCY',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/**
 * Job status lifecycle - matches Prisma JobStatus enum
 */
export const JobStatus = {
  CREATED: 'CREATED',
  FILES_UPLOADED: 'FILES_UPLOADED',
  ENHANCING_AUDIO: 'ENHANCING_AUDIO',
  TRANSCRIBING: 'TRANSCRIBING',
  AI_REVIEWING: 'AI_REVIEWING',
  READY_FOR_EDIT: 'READY_FOR_EDIT',
  ASSIGNED: 'ASSIGNED',
  IN_EDIT: 'IN_EDIT',
  SUBMITTED_FOR_REVIEW: 'SUBMITTED_FOR_REVIEW',
  IN_REVIEW: 'IN_REVIEW',
  SCOPIST_COMPLETE: 'SCOPIST_COMPLETE',
  REVIEW_COMPLETE: 'REVIEW_COMPLETE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/**
 * Assignment status for scopist assignments
 * Matches Prisma AssignmentStatus enum
 */
export const AssignmentStatus = {
  INVITED: 'INVITED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EXPIRED: 'EXPIRED',
  RELEASED: 'RELEASED',
} as const;

export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

/**
 * File types for uploaded files
 * Matches Prisma FileType enum
 */
export const FileType = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  NOTICE: 'NOTICE',
  COURT_ORDER: 'COURT_ORDER',
  ROUGH_TRANSCRIPT: 'ROUGH_TRANSCRIPT',
  EXHIBIT: 'EXHIBIT',
  FINAL_TRANSCRIPT: 'FINAL_TRANSCRIPT',
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
 * Calendar event status - matches Prisma CalendarEventStatus enum
 */
export const CalendarEventStatus = {
  REQUESTED: 'REQUESTED',
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  RESCHEDULED: 'RESCHEDULED',
} as const;

export type CalendarEventStatus = (typeof CalendarEventStatus)[keyof typeof CalendarEventStatus];

/**
 * Event type - matches Prisma EventType enum
 */
export const EventType = {
  DEPOSITION: 'DEPOSITION',
  HEARING: 'HEARING',
  ARBITRATION: 'ARBITRATION',
  MEDIATION: 'MEDIATION',
  EUO: 'EUO',
  STATEMENT: 'STATEMENT',
  OTHER: 'OTHER',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

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
  CREATED: 'bg-gray-100 text-gray-800 border-gray-300',
  FILES_UPLOADED: 'bg-blue-100 text-blue-800 border-blue-300',
  ENHANCING_AUDIO: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  TRANSCRIBING: 'bg-purple-100 text-purple-800 border-purple-300',
  AI_REVIEWING: 'bg-pink-100 text-pink-800 border-pink-300',
  READY_FOR_EDIT: 'bg-green-100 text-green-800 border-green-300',
  ASSIGNED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  IN_EDIT: 'bg-orange-100 text-orange-800 border-orange-300',
  SUBMITTED_FOR_REVIEW: 'bg-teal-100 text-teal-800 border-teal-300',
  IN_REVIEW: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  SCOPIST_COMPLETE: 'bg-purple-100 text-purple-800 border-purple-300',
  REVIEW_COMPLETE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * Assignment status colors
 */
export const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  INVITED: 'bg-gray-100 text-gray-800 border-gray-300',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-300',
  DECLINED: 'bg-red-100 text-red-800 border-red-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  SUBMITTED: 'bg-green-100 text-green-800 border-green-300',
  EXPIRED: 'bg-orange-100 text-orange-800 border-orange-300',
  RELEASED: 'bg-purple-100 text-purple-800 border-purple-300',
};

/**
 * Role display names
 */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  REPORTER: 'Court Reporter',
  SCOPIST: 'Scopist',
  ATTORNEY: 'Attorney',
  AGENCY: 'Agency',
};

/**
 * Role colors for badges
 */
export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-300',
  REPORTER: 'bg-blue-100 text-blue-800 border-blue-300',
  SCOPIST: 'bg-green-100 text-green-800 border-green-300',
  ATTORNEY: 'bg-purple-100 text-purple-800 border-purple-300',
  AGENCY: 'bg-orange-100 text-orange-800 border-orange-300',
};

/**
 * File type icons (can be replaced with actual icon components)
 */
export const FILE_TYPE_ICONS: Record<FileType, string> = {
  AUDIO: '🎵',
  VIDEO: '🎥',
  NOTICE: '📋',
  COURT_ORDER: '⚖️',
  ROUGH_TRANSCRIPT: '📝',
  EXHIBIT: '📎',
  FINAL_TRANSCRIPT: '📄',
};

/**
 * Readable labels for job status - matches Prisma JobStatus enum
 */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  CREATED: 'Created',
  FILES_UPLOADED: 'Files Uploaded',
  ENHANCING_AUDIO: 'Enhancing Audio',
  TRANSCRIBING: 'Transcribing',
  AI_REVIEWING: 'AI Reviewing',
  READY_FOR_EDIT: 'Ready for Edit',
  ASSIGNED: 'Assigned',
  IN_EDIT: 'In Edit',
  SUBMITTED_FOR_REVIEW: 'Submitted for Review',
  IN_REVIEW: 'In Review',
  SCOPIST_COMPLETE: 'Scopist Review Complete',
  REVIEW_COMPLETE: 'Review Complete',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/**
 * Transcript access levels
 */
export const TranscriptAccessLevel = {
  VIEW: 'VIEW',
  COMMENT: 'COMMENT',
  EDIT: 'EDIT',
} as const;

export type TranscriptAccessLevel = (typeof TranscriptAccessLevel)[keyof typeof TranscriptAccessLevel];

/**
 * Share types for transcripts
 */
export const ShareType = {
  USER: 'USER',
  LINK: 'LINK',
  ORGANIZATION: 'ORGANIZATION',
} as const;

export type ShareType = (typeof ShareType)[keyof typeof ShareType];

/**
 * Highlight colors
 */
export const HighlightColor = {
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  BLUE: 'BLUE',
  PINK: 'PINK',
  ORANGE: 'ORANGE',
  PURPLE: 'PURPLE',
} as const;

export type HighlightColor = (typeof HighlightColor)[keyof typeof HighlightColor];

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
