// =============================================================================
// ⚠️ AUTHORITATIVE ENUM DEFINITIONS
// =============================================================================
// These enums MUST mirror Prisma schema enums EXACTLY.
// NEVER hardcode enum strings elsewhere in the codebase.
// ALWAYS import from this file.
// 
// Last synced with prisma/schema.prisma
// 
// NOTE: Calendar and Role enums are now imported from canonical sources
// See lib/enums/calendar.ts and lib/enums/roles.ts
// =============================================================================

// =============================================================================
// RE-EXPORT CANONICAL ENUMS
// =============================================================================

export {
  CalendarEventStatus,
  EventType,
  ConflictType,
  ConflictStatus,
  ConflictResolution,
  ExternalCalendarSyncMode,
  ExternalCalendarProvider,
  ExternalEventSyncStatus,
  SchedulingValidationType,
  ValidationSeverity,
  SchedulingSuggestionType,
  SuggestionConfidence,
} from './enums/calendar';

export { UserRole } from './enums/roles';

// =============================================================================
// USER & AUTHENTICATION ENUMS (Other roles not in canonical roles.ts)
// =============================================================================

// Note: UserRole is now imported from lib/enums/roles.ts above

// =============================================================================
// JOB & WORKFLOW ENUMS
// =============================================================================

export enum JobStatus {
  CREATED = "CREATED",
  FILES_UPLOADED = "FILES_UPLOADED",
  ENHANCING_AUDIO = "ENHANCING_AUDIO",
  TRANSCRIBING = "TRANSCRIBING",
  AI_REVIEWING = "AI_REVIEWING",
  READY_FOR_EDIT = "READY_FOR_EDIT",
  ASSIGNED = "ASSIGNED",
  IN_EDIT = "IN_EDIT",
  SUBMITTED_FOR_REVIEW = "SUBMITTED_FOR_REVIEW",
  IN_REVIEW = "IN_REVIEW",
  SCOPIST_COMPLETE = "SCOPIST_COMPLETE",
  REVIEW_COMPLETE = "REVIEW_COMPLETE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum Priority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

// =============================================================================
// TRANSCRIPT & SHARE ENUMS
// =============================================================================

export enum TranscriptStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  ERROR = "ERROR",
  CANCELLED = "CANCELLED",
}

/**
 * Access levels for transcript shares
 * 
 * ⚠️ MIGRATION NOTE: These replaced the following deprecated values:
 * - VIEW_DOWNLOAD → Use COMMENT (read-only with download, can add annotations)
 * - VIEW_ANNOTATE → Use COMMENT (can add annotations)
 * - FULL → Use EDIT (full edit access)
 */
export enum AccessLevel {
  VIEW = "VIEW",
  COMMENT = "COMMENT",
  EDIT = "EDIT",
}

/**
 * Share recipient types
 * 
 * ⚠️ MIGRATION NOTE: These replaced the following deprecated values:
 * - EMAIL → Use USER (share with specific user via email)
 * - CASE_ACCESS → Use ORGANIZATION (share with organization/case members)
 */
export enum ShareType {
  USER = "USER",
  ORGANIZATION = "ORGANIZATION",
  LINK = "LINK",
}

export enum ShareStatus {
  ACTIVE = "ACTIVE",
  REVOKED = "REVOKED",
  EXPIRED = "EXPIRED",
}

// =============================================================================
// ANNOTATION & HIGHLIGHT ENUMS
// =============================================================================

export enum HighlightColor {
  YELLOW = "YELLOW",
  GREEN = "GREEN",
  BLUE = "BLUE",
  PINK = "PINK",
  ORANGE = "ORANGE",
  PURPLE = "PURPLE",
}

export enum SpeakerType {
  QUESTION = "QUESTION",
  ANSWER = "ANSWER",
  COLLOQUY = "COLLOQUY",
  INSTRUCTION = "INSTRUCTION",
  PARENTHETICAL = "PARENTHETICAL",
}

// =============================================================================
// EXHIBIT ENUMS
// =============================================================================

export enum ExhibitStatus {
  MARKED = "MARKED",
  ADMITTED = "ADMITTED",
  REJECTED = "REJECTED",
  RESERVED = "RESERVED",
  WITHDRAWN = "WITHDRAWN",
}

// =============================================================================
// CALENDAR ENUMS
// =============================================================================
// NOTE: Calendar-related enums are now exported from lib/enums/calendar.ts
// See re-exports at the top of this file

// =============================================================================
// EXPORT ENUMS
// =============================================================================

export enum ExportFormat {
  DOCX = "DOCX",
  PDF = "PDF",
  ASCII = "ASCII",
  PTX = "PTX",
}

export enum ConfidentialityLevel {
  NONE = "NONE",
  CONFIDENTIAL = "CONFIDENTIAL",
  HIGHLY_CONFIDENTIAL = "HIGHLY_CONFIDENTIAL",
  ATTORNEYS_EYES_ONLY = "ATTORNEYS_EYES_ONLY",
}

// =============================================================================
// AUDIT ENUMS
// =============================================================================

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  VIEW = "VIEW",
  EXPORT = "EXPORT",
  SHARE = "SHARE",
  UNSHARE = "UNSHARE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  FAILED_LOGIN = "FAILED_LOGIN",
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  ROLE_CHANGE = "ROLE_CHANGE",
  TRANSCRIPTION_START = "TRANSCRIPTION_START",
  TRANSCRIPTION_COMPLETE = "TRANSCRIPTION_COMPLETE",
  TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED",
  // Phase 3: Calendar Mutations
  CALENDAR_CONVERT_TO_JOB = "CALENDAR_CONVERT_TO_JOB",
  JOB_ASSIGN_REPORTER = "JOB_ASSIGN_REPORTER",
  JOB_UNASSIGN_REPORTER = "JOB_UNASSIGN_REPORTER",
  CALENDAR_RESCHEDULE = "CALENDAR_RESCHEDULE",
  // Phase 4: Drag-and-Drop Scheduling
  CALENDAR_DRAG_DROP = "CALENDAR_DRAG_DROP",
  CALENDAR_RESIZE = "CALENDAR_RESIZE",
  CALENDAR_CONFLICT_OVERRIDE = "CALENDAR_CONFLICT_OVERRIDE",
  CALENDAR_CONFLICT_DETECTED = "CALENDAR_CONFLICT_DETECTED",
  CALENDAR_UNDO_RESCHEDULE = "CALENDAR_UNDO_RESCHEDULE",
}

export enum AuditEntityType {
  User = "User",
  Job = "Job",
  Transcript = "Transcript",
  TranscriptShare = "TranscriptShare",
  Firm = "Firm",
  Exhibit = "Exhibit",
  CalendarEvent = "CalendarEvent",
}

// =============================================================================
// PHASE 5: EXTERNAL CALENDAR ENUMS
// =============================================================================

export enum ExternalCalendarSyncMode {
  READ_ONLY = "READ_ONLY",
  PUSH_INTERNAL = "PUSH_INTERNAL",
  BIDIRECTIONAL = "BIDIRECTIONAL",
}

export enum ExternalCalendarProvider {
  GOOGLE = "GOOGLE",
  OUTLOOK = "OUTLOOK",
  APPLE = "APPLE",
}

export enum ExternalEventSyncStatus {
  SYNCED = "SYNCED",
  PENDING = "PENDING",
  CONFLICT = "CONFLICT",
  FAILED = "FAILED",
  DELETED = "DELETED",
}

// =============================================================================
// PHASE 5: SCHEDULING VALIDATION ENUMS
// =============================================================================

export enum SchedulingValidationType {
  OVERLAP = "OVERLAP",
  DOUBLE_BOOKING = "DOUBLE_BOOKING",
  PAST_TIME = "PAST_TIME",
  TOO_SHORT_NOTICE = "TOO_SHORT_NOTICE",
  OUTSIDE_HOURS = "OUTSIDE_HOURS",
  EXTERNAL_CONFLICT = "EXTERNAL_CONFLICT",
  DURATION_MISMATCH = "DURATION_MISMATCH",
}

export enum ValidationSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

export function enumValues<T extends Record<string, string>>(enumObj: T): T[keyof T][] {
  return Object.values(enumObj) as T[keyof T][];
}

export function isValidEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObj).includes(value);
}

export function parseEnum<T extends Record<string, string>>(
  enumObj: T,
  value: unknown,
  defaultValue?: T[keyof T]
): T[keyof T] | undefined {
  if (isValidEnumValue(enumObj, value)) {
    return value;
  }
  return defaultValue;
}

// =============================================================================
// ROLE PERMISSION HELPERS
// =============================================================================

import { UserRole } from './enums/roles';

export const JOB_CREATOR_ROLES = [
  UserRole.ADMIN,
  UserRole.REPORTER,
  UserRole.AGENCY,
] as const;

export const SCOPIST_ASSIGNABLE_ROLES = [
  UserRole.SCOPIST,
] as const;

export const ADMIN_ROLES = [
  UserRole.ADMIN,
] as const;

export const ALL_ROLES = enumValues(UserRole);

export function canCreateJobs(role: UserRole): boolean {
  return (JOB_CREATOR_ROLES as readonly UserRole[]).includes(role);
}

export function isAdmin(role: UserRole): boolean {
  return (ADMIN_ROLES as readonly UserRole[]).includes(role);
}
