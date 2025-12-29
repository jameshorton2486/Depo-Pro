// =============================================================================
// WEBHOOK TYPES & EVENTS
// =============================================================================
// Type definitions for webhook payloads and events
// =============================================================================

// =============================================================================
// WEBHOOK EVENTS
// =============================================================================

export const WebhookEvents = {
  // Job events
  JOB_CREATED: 'job.created',
  JOB_UPDATED: 'job.updated',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  
  // Transcription events
  TRANSCRIPTION_STARTED: 'job.transcription.started',
  TRANSCRIPTION_COMPLETED: 'job.transcription.completed',
  TRANSCRIPTION_FAILED: 'job.transcription.failed',
  
  // Share events
  SHARE_CREATED: 'share.created',
  SHARE_REVOKED: 'share.revoked',
  SHARE_ACCESSED: 'share.accessed',
  
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  
  // Export events
  EXPORT_COMPLETED: 'export.completed',
  EXPORT_FAILED: 'export.failed',
} as const;

export type WebhookEvent = typeof WebhookEvents[keyof typeof WebhookEvents];

// =============================================================================
// WEBHOOK PAYLOADS
// =============================================================================

export interface WebhookPayloadBase {
  event: WebhookEvent;
  timestamp: string;
  version: string;
  firmId?: string;
}

export interface JobCreatedPayload extends WebhookPayloadBase {
  event: typeof WebhookEvents.JOB_CREATED;
  data: {
    jobId: string;
    caseName: string;
    createdById: string;
    firmId: string;
  };
}

export interface JobCompletedPayload extends WebhookPayloadBase {
  event: typeof WebhookEvents.JOB_COMPLETED;
  data: {
    jobId: string;
    caseName: string;
    firmId: string;
    completedAt: string;
  };
}

export interface TranscriptionCompletedPayload extends WebhookPayloadBase {
  event: typeof WebhookEvents.TRANSCRIPTION_COMPLETED;
  data: {
    jobId: string;
    transcriptId: string;
    wordCount: number;
    confidence: number;
    firmId: string;
  };
}

export interface ShareCreatedPayload extends WebhookPayloadBase {
  event: typeof WebhookEvents.SHARE_CREATED;
  data: {
    shareId: string;
    transcriptId: string;
    sharedById: string;
    recipientEmail?: string;
    recipientId?: string;
    accessLevel: string;
    expiresAt?: string;
  };
}

export interface ShareRevokedPayload extends WebhookPayloadBase {
  event: typeof WebhookEvents.SHARE_REVOKED;
  data: {
    shareId: string;
    transcriptId: string;
    revokedById: string;
  };
}

export interface ExportCompletedPayload extends WebhookPayloadBase {
  event: typeof WebhookEvents.EXPORT_COMPLETED;
  data: {
    jobId: string;
    format: string;
    downloadUrl: string;
    expiresAt: string;
  };
}

// Union type for all payloads
export type WebhookPayload =
  | JobCreatedPayload
  | JobCompletedPayload
  | TranscriptionCompletedPayload
  | ShareCreatedPayload
  | ShareRevokedPayload
  | ExportCompletedPayload;

// =============================================================================
// WEBHOOK CONFIGURATION
// =============================================================================

export interface WebhookConfig {
  id: string;
  firmId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  createdAt: Date;
}

// =============================================================================
// WEBHOOK DELIVERY
// =============================================================================

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: string;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
  createdAt: Date;
}

// =============================================================================
// WEBHOOK CONSTANTS
// =============================================================================

export const WEBHOOK_VERSION = '1.0';
export const WEBHOOK_MAX_RETRIES = 3;
export const WEBHOOK_TIMEOUT_MS = 30000;
