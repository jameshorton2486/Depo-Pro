// ═══════════════════════════════════════════════════════════════
// ISSUE CODE SYSTEM
// ═══════════════════════════════════════════════════════════════
// Issue codes for tagging transcript lines
// Supports both default and custom codes

/**
 * Default issue codes with predefined colors
 */
export const DEFAULT_ISSUE_CODES = {
  PERJURY: {
    code: 'PERJURY',
    label: 'Perjury',
    color: '#ef4444', // red-500
    description: 'False statement under oath',
  },
  CONTRADICTION: {
    code: 'CONTRADICTION',
    label: 'Contradiction',
    color: '#eab308', // yellow-500
    description: 'Contradicts earlier testimony',
  },
  ADMISSION: {
    code: 'ADMISSION',
    label: 'Admission',
    color: '#22c55e', // green-500
    description: 'Admission against interest',
  },
  HEARSAY: {
    code: 'HEARSAY',
    label: 'Hearsay',
    color: '#3b82f6', // blue-500
    description: 'Hearsay statement',
  },
} as const;

/**
 * Issue code definition
 */
export interface IssueCode {
  /** Unique code identifier */
  code: string;
  /** Display label */
  label: string;
  /** Hex color for highlighting */
  color: string;
  /** Optional description */
  description?: string;
  /** Whether this is a custom code (not default) */
  isCustom?: boolean;
}

/**
 * Annotation/Issue on transcript text
 * Represents a range of lines tagged with an issue code
 */
export interface TranscriptAnnotation {
  /** Unique annotation ID */
  id: string;
  /** Transcript ID */
  transcriptId: string;
  /** Issue code */
  issueCode: IssueCode;
  /** Starting page */
  pageStart: number;
  /** Starting line */
  lineStart: number;
  /** Ending page */
  pageEnd: number;
  /** Ending line */
  lineEnd: number;
  /** Optional note/description */
  note?: string;
  /** Created by user ID */
  createdById: string;
  /** Created timestamp */
  createdAt: Date | string;
}

/**
 * Get all available issue codes (default + custom)
 */
export function getAllIssueCodes(customCodes: IssueCode[] = []): IssueCode[] {
  const defaults = Object.values(DEFAULT_ISSUE_CODES);
  return [...defaults, ...customCodes];
}

/**
 * Get issue code by code string
 */
export function getIssueCode(
  code: string,
  customCodes: IssueCode[] = [],
): IssueCode | undefined {
  const allCodes = getAllIssueCodes(customCodes);
  return allCodes.find((c) => c.code === code);
}

