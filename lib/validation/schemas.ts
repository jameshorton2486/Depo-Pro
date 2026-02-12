// lib/validation/schemas.ts
// Security Audit D.2 - Zod Request Validation
// Prevents payload injection and data corruption

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════
// WORD CORRECTION SCHEMAS
// ══════════════════════════════════════════════════════════════

export const wordCorrectionSchema = z.object({
  corrected_word: z.string().min(1).max(200).trim(),
  status: z.enum(['CONFIRMED', 'CORRECTED', 'SKIPPED']),
});

export const batchCorrectionsSchema = z.object({
  corrections: z.array(wordCorrectionSchema).max(50),
  reviewed_indices: z.array(z.number().int().nonnegative()).max(500),
});

// ══════════════════════════════════════════════════════════════
// JOB SCHEMAS
// ══════════════════════════════════════════════════════════════

export const createJobSchema = z.object({
  case_name: z.string().min(1, 'Case name is required').max(500).trim(),
  case_number: z.string().max(100).optional(),
  deponent_name: z.string().min(1, 'Deponent name is required').max(200).trim(),
  deposition_date: z.string().datetime().optional(),
  deposition_location: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  attorney_firm: z.string().max(300).optional(),
  court_name: z.string().max(300).optional(),
});

export const updateJobSchema = z.object({
  case_name: z.string().min(1).max(500).trim().optional(),
  case_number: z.string().max(100).optional(),
  deponent_name: z.string().min(1).max(200).trim().optional(),
  deposition_date: z.string().datetime().optional(),
  deposition_location: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  attorney_firm: z.string().max(300).optional(),
  court_name: z.string().max(300).optional(),
  status: z.enum([
    'DRAFT',
    'SCHEDULED',
    'RECORDING',
    'TRANSCRIBING',
    'REVIEWING',
    'FINAL',
    'DELIVERED',
    'ARCHIVED',
  ]).optional(),
});

export const assignJobSchema = z.object({
  scopist_id: z.string().uuid('Invalid scopist ID'),
});

// ══════════════════════════════════════════════════════════════
// TRANSCRIPT SHARING SCHEMAS
// ══════════════════════════════════════════════════════════════

export const shareTranscriptSchema = z.object({
  shared_with_id: z.string().uuid('Invalid user ID'),
  permission_level: z.enum(['READ', 'COMMENT']).default('READ'),
  expires_at: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const revokeShareSchema = z.object({
  share_id: z.string().uuid('Invalid share ID'),
});

// ══════════════════════════════════════════════════════════════
// MEDICAL CHRONOLOGY SCHEMAS (Phase 10)
// ══════════════════════════════════════════════════════════════

export const chronologyEntrySchema = z.object({
  event_date: z.string().min(4, 'Event date required').max(10),
  event_date_end: z.string().max(10).optional(),
  date_precision: z.enum(['DAY', 'MONTH', 'YEAR']).default('DAY'),
  provider: z.string().max(500).optional(),
  category: z.enum([
    'Visit',
    'Surgery',
    'Imaging',
    'Lab',
    'Prescription',
    'Diagnosis',
    'Therapy',
    'Hospitalization',
    'Consultation',
    'Procedure',
    'Follow-Up',
    'Other',
  ]),
  summary: z.string().min(1, 'Summary is required').max(2000).trim(),
  details: z.string().max(10000).optional(),
  page_reference: z.string().max(100).optional(),
  medical_record_id: z.string().uuid().optional(),
  source_document_name: z.string().max(500).optional(),
});

export const updateChronologyEntrySchema = z.object({
  event_date: z.string().min(4).max(10).optional(),
  event_date_end: z.string().max(10).optional(),
  date_precision: z.enum(['DAY', 'MONTH', 'YEAR']).optional(),
  provider: z.string().max(500).optional(),
  category: z.enum([
    'Visit',
    'Surgery',
    'Imaging',
    'Lab',
    'Prescription',
    'Diagnosis',
    'Therapy',
    'Hospitalization',
    'Consultation',
    'Procedure',
    'Follow-Up',
    'Other',
  ]).optional(),
  summary: z.string().min(1).max(2000).trim().optional(),
  details: z.string().max(10000).optional(),
  page_reference: z.string().max(100).optional(),
  is_verified: z.boolean().optional(),
});

export const medicalRecordUploadSchema = z.object({
  file_name: z.string().min(1).max(500),
  file_size_bytes: z.number().int().positive().max(50 * 1024 * 1024), // 50MB
  mime_type: z.enum(['application/pdf']),
  page_count: z.number().int().positive().optional(),
});

// ══════════════════════════════════════════════════════════════
// VOCABULARY SCHEMAS
// ══════════════════════════════════════════════════════════════

export const vocabularyTermSchema = z.object({
  term: z.string().min(1, 'Term is required').max(200).trim(),
  pronunciation: z.string().max(500).optional(),
  context: z.string().max(1000).optional(),
  category: z.enum(['MEDICAL', 'LEGAL', 'TECHNICAL', 'NAME', 'PLACE', 'OTHER']).optional(),
});

export const batchVocabularySchema = z.object({
  terms: z.array(vocabularyTermSchema).min(1).max(100),
});

// ══════════════════════════════════════════════════════════════
// EXHIBIT SCHEMAS
// ══════════════════════════════════════════════════════════════

export const exhibitSchema = z.object({
  exhibit_number: z.string().min(1, 'Exhibit number required').max(50).trim(),
  description: z.string().max(1000).optional(),
  file_type: z.string().max(50).optional(),
  timestamp: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

// ══════════════════════════════════════════════════════════════
// PARAM VALIDATORS
// ══════════════════════════════════════════════════════════════

export const uuidParamSchema = z.string().uuid('Invalid ID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Validate request body and return typed result or error response
 * @example
 * const result = validateBody(createJobSchema, await request.json());
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * const data = result.data; // Fully typed!
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: `${firstError.path.join('.')}: ${firstError.message}`,
    };
  }
  return { success: true, data: result.data };
}

/**
 * Validate URL param (e.g., job ID)
 */
export function validateParam(
  paramName: string,
  paramValue: string
): { success: true; value: string } | { success: false; error: string } {
  const result = uuidParamSchema.safeParse(paramValue);
  if (!result.success) {
    return {
      success: false,
      error: `Invalid ${paramName}: must be a valid UUID`,
    };
  }
  return { success: true, value: result.data };
}

/**
 * Validate query params for pagination
 */
export function validatePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const result = paginationSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  });
  return result.success ? result.data : { page: 1, limit: 25 };
}
