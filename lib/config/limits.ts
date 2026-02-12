// lib/config/limits.ts
// Security Audit D.8 - Transcript Size Guardrails
// Prevents memory exhaustion and runaway costs

/**
 * System-wide limits for Depo-Pro
 * Prevents abuse, memory exhaustion, and cost overruns
 */
export const LIMITS = {
  // ══════════════════════════════════════════════════════════════
  // AUDIO / TRANSCRIPTION
  // ══════════════════════════════════════════════════════════════

  /**
   * Maximum audio duration (hours)
   * Protects against: Memory exhaustion, Deepgram cost overruns
   */
  MAX_AUDIO_DURATION_HOURS: 8,

  /**
   * Maximum audio file size (MB)
   * Protects against: Upload attacks, storage abuse
   */
  MAX_AUDIO_FILE_SIZE_MB: 500,

  /**
   * Maximum words per transcript
   * Protects against: Memory exhaustion in frontend, database bloat
   */
  MAX_WORDS_PER_TRANSCRIPT: 100_000,

  /**
   * Maximum flagged words per transcript
   * Protects against: UI performance issues, excessive review time
   */
  MAX_FLAGGED_WORDS_PER_TRANSCRIPT: 5_000,

  // ══════════════════════════════════════════════════════════════
  // BATCH OPERATIONS
  // ══════════════════════════════════════════════════════════════

  /**
   * Maximum corrections per batch request
   * Protects against: Race conditions, optimistic locking failures
   */
  MAX_CORRECTIONS_PER_REQUEST: 50,

  /**
   * Maximum words reviewed per batch request
   * Protects against: Payload size attacks
   */
  MAX_REVIEWED_PER_REQUEST: 500,

  // ══════════════════════════════════════════════════════════════
  // MEDICAL CHRONOLOGY (Phase 10)
  // ══════════════════════════════════════════════════════════════

  /**
   * Maximum PDF file size for medical records (MB)
   * Protects against: Upload abuse, Anthropic extraction timeouts
   */
  MAX_MEDICAL_PDF_SIZE_MB: 50,

  /**
   * Maximum medical records per job
   * Protects against: Storage abuse, UI performance
   */
  MAX_MEDICAL_RECORDS_PER_JOB: 20,

  /**
   * Maximum chronology entries per job
   * Protects against: Database bloat, export timeouts
   */
  MAX_CHRONOLOGY_ENTRIES_PER_JOB: 1_000,

  /**
   * Maximum AI extractions per hour per firm
   * Protects against: Anthropic API quota exhaustion, cost overruns
   */
  MAX_EXTRACTIONS_PER_HOUR: 5,

  /**
   * Maximum pages per medical PDF
   * Protects against: Anthropic token limit (200k), extraction timeouts
   */
  MAX_PDF_PAGES: 100,

  // ══════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════

  /**
   * Maximum export requests per minute per user
   * Protects against: DOCX generation overload
   */
  MAX_EXPORT_REQUESTS_PER_MINUTE: 5,

  /**
   * Maximum export file size (MB)
   * Protects against: Memory exhaustion, browser crashes
   */
  MAX_EXPORT_FILE_SIZE_MB: 50,

  // ══════════════════════════════════════════════════════════════
  // VOCABULARY
  // ══════════════════════════════════════════════════════════════

  /**
   * Maximum vocabulary terms per batch
   * Protects against: Database write contention
   */
  MAX_VOCABULARY_TERMS_PER_BATCH: 100,

  /**
   * Maximum vocabulary terms per job
   * Protects against: Deepgram keyword limit
   */
  MAX_VOCABULARY_TERMS_PER_JOB: 500,

  // ══════════════════════════════════════════════════════════════
  // EXHIBITS
  // ══════════════════════════════════════════════════════════════

  /**
   * Maximum exhibits per job
   * Protects against: UI performance, storage abuse
   */
  MAX_EXHIBITS_PER_JOB: 200,

  /**
   * Maximum exhibit file size (MB)
   * Protects against: Storage abuse
   */
  MAX_EXHIBIT_FILE_SIZE_MB: 100,

  // ══════════════════════════════════════════════════════════════
  // TEXT FIELDS
  // ══════════════════════════════════════════════════════════════

  /**
   * Maximum length for various text fields
   */
  MAX_CASE_NAME_LENGTH: 500,
  MAX_DEPONENT_NAME_LENGTH: 200,
  MAX_NOTES_LENGTH: 5_000,
  MAX_SUMMARY_LENGTH: 2_000,
  MAX_DETAILS_LENGTH: 10_000,

  // ══════════════════════════════════════════════════════════════
  // RATE LIMITING (Requests per minute per user)
  // ══════════════════════════════════════════════════════════════

  /**
   * API request rate limits (requests per minute)
   */
  RATE_LIMIT_TRANSCRIBE: 5,       // Expensive: Deepgram API
  RATE_LIMIT_EXTRACT: 5,          // Expensive: Anthropic API
  RATE_LIMIT_EXPORT: 10,          // Expensive: DOCX generation
  RATE_LIMIT_UPLOAD: 20,          // Moderate: File uploads
  RATE_LIMIT_API_WRITE: 60,       // Standard: POST/PATCH/DELETE
  RATE_LIMIT_API_READ: 120,       // Standard: GET requests

} as const;

/**
 * Validate audio duration before transcription
 */
export function validateAudioDuration(durationSeconds: number): {
  valid: boolean;
  error?: string;
} {
  const hours = durationSeconds / 3600;
  if (hours > LIMITS.MAX_AUDIO_DURATION_HOURS) {
    return {
      valid: false,
      error: `Audio duration (${hours.toFixed(1)}h) exceeds maximum of ${LIMITS.MAX_AUDIO_DURATION_HOURS}h`,
    };
  }
  return { valid: true };
}

/**
 * Validate file size before upload
 */
export function validateFileSize(
  sizeBytes: number,
  maxSizeMB: number
): { valid: boolean; error?: string } {
  const sizeMB = sizeBytes / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File size (${sizeMB.toFixed(1)}MB) exceeds maximum of ${maxSizeMB}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate medical PDF
 */
export function validateMedicalPDF(input: {
  sizeBytes: number;
  pageCount?: number;
}): { valid: boolean; error?: string } {
  // Check file size
  const sizeValidation = validateFileSize(
    input.sizeBytes,
    LIMITS.MAX_MEDICAL_PDF_SIZE_MB
  );
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Check page count
  if (input.pageCount && input.pageCount > LIMITS.MAX_PDF_PAGES) {
    return {
      valid: false,
      error: `PDF has ${input.pageCount} pages, maximum is ${LIMITS.MAX_PDF_PAGES} pages`,
    };
  }

  return { valid: true };
}

/**
 * Check if transcript size is within limits
 */
export function validateTranscriptSize(input: {
  wordCount: number;
  flaggedWordCount: number;
}): { valid: boolean; error?: string } {
  if (input.wordCount > LIMITS.MAX_WORDS_PER_TRANSCRIPT) {
    return {
      valid: false,
      error: `Transcript has ${input.wordCount.toLocaleString()} words, maximum is ${LIMITS.MAX_WORDS_PER_TRANSCRIPT.toLocaleString()}`,
    };
  }

  if (input.flaggedWordCount > LIMITS.MAX_FLAGGED_WORDS_PER_TRANSCRIPT) {
    return {
      valid: false,
      error: `Too many flagged words (${input.flaggedWordCount.toLocaleString()}), maximum is ${LIMITS.MAX_FLAGGED_WORDS_PER_TRANSCRIPT.toLocaleString()}`,
    };
  }

  return { valid: true };
}
