// =============================================================================
// JOB QUEUE TYPES
// =============================================================================
// Type definitions for background job processing
// =============================================================================

// =============================================================================
// JOB STATUS
// =============================================================================

export enum QueueJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

// =============================================================================
// JOB TYPES
// =============================================================================

export enum JobType {
  // Transcription
  TRANSCRIPTION_PROCESS = 'transcription:process',
  TRANSCRIPTION_RETRY = 'transcription:retry',
  
  // Notifications
  NOTIFICATION_EMAIL = 'notification:email',
  NOTIFICATION_WEBHOOK = 'notification:webhook',
  
  // Reports
  REPORT_GENERATE = 'report:generate',
  REPORT_EXPORT = 'report:export',
  
  // Calendar
  CALENDAR_SYNC = 'calendar:sync',
  CALENDAR_REMINDER = 'calendar:reminder',
  
  // Cleanup
  CLEANUP_EXPIRED_SHARES = 'cleanup:expired-shares',
  CLEANUP_OLD_LOGS = 'cleanup:old-logs',
  
  // Webhooks
  WEBHOOK_DISPATCH = 'webhook:dispatch',
}

// =============================================================================
// JOB PAYLOADS
// =============================================================================

export interface TranscriptionJobPayload {
  jobId: string;
  audioFileUrl: string;
  firmId: string;
  userId: string;
  options?: {
    language?: string;
    diarize?: boolean;
    punctuate?: boolean;
    modelPreference?: 'nova-3' | 'nova-2' | 'nova-2-medical';
  };
}

export interface NotificationEmailPayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  userId?: string;
}

export interface NotificationWebhookPayload {
  webhookUrl: string;
  event: string;
  payload: Record<string, unknown>;
  firmId: string;
}

export interface ReportGeneratePayload {
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom';
  firmId: string;
  userId: string;
  dateRange: {
    start: string;
    end: string;
  };
  format: 'pdf' | 'xlsx' | 'csv';
}

export interface CalendarSyncPayload {
  userId: string;
  firmId: string;
  syncType: 'full' | 'incremental';
}

export interface CalendarReminderPayload {
  eventId: string;
  userId: string;
  reminderType: 'email' | 'push';
}

export interface WebhookDispatchPayload {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  attempt: number;
}

// =============================================================================
// JOB DEFINITION
// =============================================================================

export interface QueueJob<T = unknown> {
  id: string;
  type: JobType;
  payload: T;
  status: QueueJobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  scheduledFor?: Date;
  idempotencyKey?: string;
}

// =============================================================================
// JOB OPTIONS
// =============================================================================

export interface JobOptions {
  priority?: number;
  maxAttempts?: number;
  delay?: number;
  scheduledFor?: Date;
  idempotencyKey?: string;
}

export const DEFAULT_JOB_OPTIONS: Required<Omit<JobOptions, 'scheduledFor' | 'idempotencyKey'>> = {
  priority: 0,
  maxAttempts: 3,
  delay: 0,
};

// =============================================================================
// JOB HANDLER
// =============================================================================

export interface JobHandler<T = unknown> {
  type: JobType;
  handle: (job: QueueJob<T>) => Promise<void>;
  onError?: (job: QueueJob<T>, error: Error) => Promise<void>;
  shouldRetry?: (job: QueueJob<T>, error: Error) => boolean;
}

// =============================================================================
// JOB RESULT
// =============================================================================

export interface JobResult {
  success: boolean;
  jobId: string;
  duration: number;
  error?: string;
}
