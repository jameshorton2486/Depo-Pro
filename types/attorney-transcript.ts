// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPT TYPES
// ═══════════════════════════════════════════════════════════════
// Data model for immutable transcripts indexed by Page:Line
// (NOT time-based like Depo-Pro transcription)

/**
 * Transcript line - represents a single line of dialogue
 * Indexed by page and line number (NOT timestamp)
 */
export interface TranscriptLine {
  /** Page number (1-indexed) */
  page: number;
  /** Line number within the page (1-indexed) */
  line: number;
  /** Speaker label (e.g., "Q", "A", "Mr. Smith", "Attorney") */
  speaker: string;
  /** Text content of the line */
  text: string;
}

/**
 * Transcript page - represents a single page of transcript
 */
export interface TranscriptPage {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** All lines on this page */
  lines: TranscriptLine[];
}

/**
 * Transcript - complete immutable transcript document
 * Used for attorney review and issue coding
 */
export interface AttorneyTranscript {
  /** Unique transcript ID */
  id: string;
  /** Transcript name/title */
  name: string;
  /** Deponent name */
  deponent: string;
  /** Case name */
  caseName?: string;
  /** Date of deposition */
  depositionDate?: Date | string;
  /** Upload date */
  uploadedAt: Date | string;
  /** Review status */
  status: 'Not Reviewed' | 'In Progress' | 'Complete';
  /** All pages in the transcript */
  pages: TranscriptPage[];
  /** Total number of pages */
  totalPages: number;
  /** Total number of lines */
  totalLines: number;
}

/**
 * @deprecated Use IssueCode from @/types/issue-code instead
 * Kept for backward compatibility
 */
export type IssueType =
  | 'Perjury'
  | 'Contradiction'
  | 'Inconsistency'
  | 'Evasion'
  | 'Refusal'
  | 'Other';

/**
 * @deprecated Use TranscriptAnnotation from @/types/issue-code instead
 * Kept for backward compatibility
 */
export interface TranscriptIssue {
  /** Unique issue ID */
  id: string;
  /** Transcript ID */
  transcriptId: string;
  /** Issue type */
  issueType: IssueType;
  /** Page number */
  page: number;
  /** Line number */
  line: number;
  /** Description/notes */
  description?: string;
  /** Created date */
  createdAt: Date | string;
  /** Created by user ID */
  createdById: string;
}

