/**
 * Medical Document & AI Chronology Type Definitions
 * Phase 10 — Depo-Pro
 *
 * Types for medical record upload, Claude AI extraction,
 * and chronology entry management.
 */

// ── Enums ──────────────────────────────────────────────────────

export type MedicalRecordStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'FAILED'
  | 'ARCHIVED';

export type ChronologySourceType =
  | 'AI_EXTRACTED'
  | 'MANUAL'
  | 'EDITED';

export type DatePrecision = 'DAY' | 'MONTH' | 'YEAR';

export type ChronologyCategory =
  | 'Visit'
  | 'Surgery'
  | 'Imaging'
  | 'Lab'
  | 'Prescription'
  | 'Diagnosis'
  | 'Therapy'
  | 'Hospitalization'
  | 'Consultation'
  | 'Procedure'
  | 'Follow-Up'
  | 'Other';

// ── Database Row Types ─────────────────────────────────────────

export interface MedicalRecordRow {
  id: string;
  job_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  page_count: number | null;
  status: MedicalRecordStatus;
  error_message: string | null;
  document_type: string | null;
  provider_name: string | null;
  facility_name: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  patient_name: string | null;
  extraction_summary: string | null;
  extraction_raw_json: Record<string, unknown> | null;
  uploaded_by_id: string;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface ChronologyEntryRow {
  id: string;
  job_id: string;
  medical_record_id: string | null;
  event_date: string;
  event_date_end: string | null;
  date_precision: DatePrecision;
  provider: string | null;
  category: string;
  summary: string;
  details: string | null;
  page_reference: string | null;
  source_type: ChronologySourceType;
  source_document_name: string | null;
  confidence: number;
  is_verified: boolean;
  verified_by_id: string | null;
  verified_at: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// ── Input Types ────────────────────────────────────────────────

export interface CreateMedicalRecordInput {
  job_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  mime_type?: string;
  page_count?: number;
  uploaded_by_id: string;
}

export interface UpdateMedicalRecordInput {
  status?: MedicalRecordStatus;
  error_message?: string | null;
  document_type?: string | null;
  provider_name?: string | null;
  facility_name?: string | null;
  date_range_start?: string | null;
  date_range_end?: string | null;
  patient_name?: string | null;
  extraction_summary?: string | null;
  extraction_raw_json?: Record<string, unknown> | null;
  page_count?: number | null;
  processed_at?: string | null;
}

export interface CreateChronologyEntryInput {
  job_id: string;
  medical_record_id?: string | null;
  event_date: string;
  event_date_end?: string | null;
  date_precision?: DatePrecision;
  provider?: string | null;
  category: string;
  summary: string;
  details?: string | null;
  page_reference?: string | null;
  source_type?: ChronologySourceType;
  source_document_name?: string | null;
  confidence?: number;
  created_by_id: string;
}

export interface UpdateChronologyEntryInput {
  event_date?: string;
  event_date_end?: string | null;
  date_precision?: DatePrecision;
  provider?: string | null;
  category?: string;
  summary?: string;
  details?: string | null;
  page_reference?: string | null;
  source_type?: ChronologySourceType;
  confidence?: number;
  is_verified?: boolean;
  verified_by_id?: string | null;
  verified_at?: string | null;
}

// ── Claude AI Extraction Types ─────────────────────────────────

/** Shape of the structured output we request from Claude */
export interface MedicalExtractionResult {
  document_type: string;
  provider_name: string | null;
  facility_name: string | null;
  patient_name: string | null;
  date_range_start: string | null;  // ISO date string
  date_range_end: string | null;    // ISO date string
  summary: string;
  entries: MedicalExtractionEntry[];
}

export interface MedicalExtractionEntry {
  event_date: string;               // ISO date string
  event_date_end?: string | null;   // ISO date string for ranges
  date_precision: DatePrecision;
  provider?: string | null;
  category: ChronologyCategory;
  summary: string;
  details?: string | null;
  page_reference?: string | null;
  confidence: number;               // 0.0 - 1.0
}

// ── UI Types ───────────────────────────────────────────────────

export interface MedicalRecordWithStats extends MedicalRecordRow {
  entry_count?: number;
  verified_count?: number;
}

export interface ChronologyFilters {
  category?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  sourceType?: ChronologySourceType;
  isVerified?: boolean;
  medicalRecordId?: string;
}

export interface ChronologySummary {
  total_entries: number;
  verified_entries: number;
  categories: { category: string; count: number }[];
  providers: { provider: string; count: number }[];
  date_range: { earliest: string; latest: string } | null;
  records_count: number;
  records_processed: number;
}
