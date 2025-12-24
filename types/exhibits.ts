// ═══════════════════════════════════════════════════════════════
// EXHIBIT DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════
// Domain model for exhibits in Attorney Transcript Review
// Extends existing Depo-Pro exhibit system

/**
 * Source of exhibit upload
 */
export enum ExhibitSource {
  COURT_REPORTER = 'COURT_REPORTER',
  ATTORNEY = 'ATTORNEY',
}

/**
 * Exhibit file type
 */
export type ExhibitFileType = 'PDF' | 'IMAGE' | 'DOCX' | 'OTHER';

/**
 * Exhibit - represents a document or image used in deposition
 * Can belong to a Case (attorney-global) or a Deposition (reporter-specific)
 */
export interface Exhibit {
  /** Unique exhibit ID */
  id: string;
  /** Case ID (required - all exhibits belong to a case) */
  caseId: string;
  /** Deposition/Job ID (nullable - attorney can upload case-global exhibits) */
  depositionId: string | null;
  /** Source of upload */
  uploadedByRole: ExhibitSource;
  /** Exhibit label/number (e.g., "Exhibit 12") */
  exhibitLabel: string;
  /** Description of the exhibit */
  description: string;
  /** Original file URL */
  fileUrl: string;
  /** Stamped file URL (if applicable) */
  stampedFileUrl?: string;
  /** File type */
  fileType: ExhibitFileType;
  /** MIME type */
  mimeType: string;
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Whether exhibit has been stamped */
  stamped: boolean;
  /** User who uploaded the exhibit */
  createdById: string;
  /** Upload timestamp */
  createdAt: Date | string;
  /** Deposition name (if depositionId is set) */
  depositionName?: string;
  /** Uploader name */
  uploadedByName?: string;
}

/**
 * Exhibit Group - logical grouping of exhibits
 * Used for organizing exhibits in UI
 */
export interface ExhibitGroup {
  /** Group identifier */
  id: string;
  /** Group label */
  label: string;
  /** Exhibits in this group */
  exhibits: Exhibit[];
  /** Group type */
  type: 'DEPOSITION' | 'ATTORNEY_UPLOADS' | 'CUSTOM';
}

/**
 * Exhibit link to transcript annotation
 * Associates an exhibit with a specific transcript passage
 */
export interface ExhibitAnnotationLink {
  /** Unique link ID */
  id: string;
  /** Transcript annotation ID */
  annotationId: string;
  /** Exhibit ID */
  exhibitId: string;
  /** Created timestamp */
  createdAt: Date | string;
  /** Created by user ID */
  createdById: string;
}

/**
 * Exhibit metadata for reports
 */
export interface ExhibitReference {
  /** Exhibit ID */
  exhibitId: string;
  /** Exhibit label */
  label: string;
  /** Description */
  description: string;
  /** Deposition name (if applicable) */
  depositionName?: string;
}

