// =============================================================================
// ⚠️ AUTHORITATIVE ENUM DEFINITIONS
// =============================================================================
// These enums MUST mirror Prisma schema enums EXACTLY.
// NEVER hardcode enum strings elsewhere in the codebase.
// ALWAYS import from this file.
// 
// Last synced with prisma/schema.prisma
// =============================================================================

// =============================================================================
// USER & AUTHENTICATION ENUMS
// =============================================================================

export enum UserRole {
  ADMIN = "ADMIN",
  COURT_REPORTER = "COURT_REPORTER",
  SCOPIST = "SCOPIST",
  ATTORNEY = "ATTORNEY",
  AGENCY = "AGENCY",
}

// =============================================================================
// JOB & WORKFLOW ENUMS
// =============================================================================

export enum JobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  AI_COMPLETE = "AI_COMPLETE",
  SCOPIST_ASSIGNED = "SCOPIST_ASSIGNED",
  SCOPIST_REVIEW = "SCOPIST_REVIEW",
  SCOPIST_COMPLETE = "SCOPIST_COMPLETE",
  FINAL_REVIEW = "FINAL_REVIEW",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
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
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

/**
 * Access levels for transcript shares
 * 
 * ⚠️ MIGRATION NOTE: These replaced the following deprecated values:
 * - VIEW_DOWNLOAD → Use VIEW (read-only, can download)
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
 * - EMAIL → Use USER (share with specific user)
 * - CASE_ACCESS → Use ORGANIZATION (share with organization)
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

export enum EventType {
  DEPOSITION = "DEPOSITION",
  HEARING = "HEARING",
  TRIAL = "TRIAL",
  MEETING = "MEETING",
  DEADLINE = "DEADLINE",
  OTHER = "OTHER",
}

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

export const JOB_CREATOR_ROLES = [
  UserRole.ADMIN,
  UserRole.COURT_REPORTER,
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
