// =============================================================================
// EXPORT PROFILES
// lib/export/profiles.ts
//
// Phase 3C-1: Pre-configured export formats
// =============================================================================

export interface ExportProfile {
  id: string;
  name: string;
  description: string;
  format: 'docx' | 'pdf' | 'zip' | 'txt';
  options: {
    linesPerPage?: number;
    lineNumbers?: boolean;
    includeCertificate?: boolean;
    font?: string;
    fontSize?: number;
    margins?: { top: number; bottom: number; left: number; right: number };
    includeAnnotations?: boolean;
    includeComments?: boolean;
    watermark?: string;
    includeDocx?: boolean;
    includePdf?: boolean;
    includeAudio?: boolean;
    includeMetadata?: boolean;
  };
}

export const EXPORT_PROFILES: Record<string, ExportProfile> = {
  COURT_STANDARD: {
    id: 'court-standard',
    name: 'Court Standard',
    description: 'Official court format with line numbers',
    format: 'docx',
    options: {
      linesPerPage: 25,
      lineNumbers: true,
      includeCertificate: true,
      font: 'Courier New',
      fontSize: 12,
      margins: { top: 1, bottom: 1, left: 1.5, right: 1 },
    },
  },
  ATTORNEY_REVIEW: {
    id: 'attorney-review',
    name: 'Attorney Review',
    description: 'PDF with annotations visible',
    format: 'pdf',
    options: {
      includeAnnotations: true,
      includeComments: true,
      watermark: 'CONFIDENTIAL - ATTORNEY COPY',
    },
  },
  ROUGH_DRAFT: {
    id: 'rough-draft',
    name: 'Rough Draft',
    description: 'Quick export for review',
    format: 'docx',
    options: {
      lineNumbers: false,
      includeCertificate: false,
      watermark: 'DRAFT - NOT FOR DISTRIBUTION',
    },
  },
  ARCHIVE: {
    id: 'archive',
    name: 'Full Archive',
    description: 'Complete package with all formats',
    format: 'zip',
    options: {
      includeDocx: true,
      includePdf: true,
      includeAudio: true,
      includeMetadata: true,
    },
  },
};

/**
 * Get export profile by ID
 */
export function getExportProfile(profileId: string): ExportProfile | undefined {
  return Object.values(EXPORT_PROFILES).find((p) => p.id === profileId);
}

/**
 * Get all available export profiles
 */
export function getAllExportProfiles(): ExportProfile[] {
  return Object.values(EXPORT_PROFILES);
}
