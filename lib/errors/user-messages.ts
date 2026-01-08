// ═══════════════════════════════════════════════════════════════════════════
// USER-FRIENDLY ERROR MESSAGES
// Maps error codes to actionable messages
// ═══════════════════════════════════════════════════════════════════════════

export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  AUTH_SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_UNAUTHORIZED: "You don't have permission to access this resource.",
  AUTH_ACCOUNT_LOCKED: 'Your account has been temporarily locked. Please try again later.',
  
  // Transcription
  TRANSCRIPTION_FAILED: 'Transcription failed. Please try again or contact support.',
  TRANSCRIPTION_IN_PROGRESS: 'A transcription is already in progress for this job.',
  TRANSCRIPTION_AUDIO_TOO_LONG: 'Audio file exceeds maximum length of 4 hours.',
  TRANSCRIPTION_INVALID_FORMAT: 'Unsupported audio format. Please use MP3, WAV, M4A, or FLAC.',
  TRANSCRIPTION_QUOTA_EXCEEDED: 'You have reached your transcription quota for this period.',
  
  // Jobs
  JOB_NOT_FOUND: 'Job not found. It may have been deleted.',
  JOB_ALREADY_ASSIGNED: 'This job has already been assigned to another scopist.',
  JOB_CANNOT_DELETE: 'This job cannot be deleted because it has active transcriptions.',
  JOB_INVALID_STATUS: 'This action is not available for jobs in this status.',
  
  // Files
  FILE_TOO_LARGE: 'File exceeds the maximum size limit of 500MB.',
  FILE_INVALID_TYPE: 'This file type is not supported.',
  FILE_UPLOAD_FAILED: 'File upload failed. Please check your connection and try again.',
  FILE_NOT_FOUND: 'File not found. It may have been deleted.',
  
  // Export
  EXPORT_FAILED: 'Document export failed. Please try again.',
  EXPORT_NO_TRANSCRIPT: 'No transcript available to export.',
  EXPORT_FORMAT_UNSUPPORTED: 'This export format is not supported.',
  
  // Calendar
  CALENDAR_CONFLICT: 'This time slot conflicts with another event.',
  CALENDAR_INVALID_TIME: 'End time must be after start time.',
  CALENDAR_EVENT_NOT_FOUND: 'Calendar event not found.',
  
  // Network
  NETWORK_ERROR: 'Connection error. Please check your internet and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  
  // Generic
  SERVER_ERROR: 'Something went wrong. Our team has been notified.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export function getUserMessage(errorCode: string, fallback?: string): string {
  return ERROR_MESSAGES[errorCode] || fallback || ERROR_MESSAGES.UNKNOWN_ERROR;
}

export function isRetryableError(errorCode: string): boolean {
  const retryable = [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
    'RATE_LIMITED',
    'TRANSCRIPTION_FAILED',
  ];
  return retryable.includes(errorCode);
}
