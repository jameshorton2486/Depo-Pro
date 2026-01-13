/**
 * Audit Logging Helper
 * Tracks who did what, when, and from where — without slowing the app
 */

import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type AuditAction =
  | 'USER_LOGIN' | 'USER_LOGOUT' | 'USER_LOGIN_FAILED'
  | 'JOB_CREATED' | 'JOB_UPDATED' | 'JOB_DELETED' | 'JOB_ASSIGNED'
  | 'TRANSCRIPTION_STARTED' | 'TRANSCRIPTION_COMPLETED' | 'TRANSCRIPTION_FAILED'
  | 'FILE_UPLOADED' | 'FILE_DOWNLOADED' | 'FILE_DELETED'
  | 'TRANSCRIPT_EXPORTED' | 'TRANSCRIPT_VIEWED' | 'TRANSCRIPT_EDITED' | 'TRANSCRIPT_DELETED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT' | 'RATE_LIMIT_EXCEEDED'
  | 'CASE_CREATED' | 'CASE_UPDATED' | 'CASE_DELETED'
  | 'CALENDAR_EVENT_CREATED' | 'CALENDAR_EVENT_UPDATED' | 'CALENDAR_EVENT_DELETED';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogOptions {
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create comprehensive audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Use admin client for audit logs (bypasses RLS)
    const supabase = getSupabaseAdmin();

    // Get user's firm_id if userId is provided
    let firmId: string | undefined;
    if (entry.userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', entry.userId)
        .single();
      firmId = profile?.firm_id;
    }

    // Insert audit log (non-blocking)
    void Promise.resolve(
      supabase
        .from('audit_logs')
        .insert({
          user_id: entry.userId || null,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId || null,
          old_value: entry.oldValue || null,
          new_value: entry.newValue || null,
          metadata: entry.metadata || {},
          ip_address: entry.ipAddress || null,
          user_agent: entry.userAgent || null,
          firm_id: firmId || null,
          created_at: new Date().toISOString(),
        })
    ).catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[audit] Failed to log action', { action: entry.action, error: errorMessage });
    });
  } catch (error) {
    console.warn('[audit] Audit logging error', { action: entry.action, error });
  }
}

/**
 * Log an audit event (non-blocking, fire-and-forget)
 * Backward compatible wrapper
 */
export async function auditLog(
  action: string,
  options?: AuditLogOptions
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Silently fail if no user (might be system task)
      return;
    }

    // Insert audit log (non-blocking - don't await errors)
    // Use void to explicitly mark as fire-and-forget
    void Promise.resolve(
      supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action,
          entity: options?.entity,
          entity_id: options?.entityId,
          metadata: options?.metadata || {},
          ip_address: options?.ipAddress || null,
          user_agent: options?.userAgent || null,
        })
    ).catch((error: unknown) => {
        // Log error but don't throw (audit failures shouldn't break the app)
        const errorMessage = error instanceof Error ? error.message : String(error);
         
        console.warn('[audit] Failed to log action', { action, error: errorMessage });
      });
  } catch (error) {
    // Silently fail - audit logging should never break the app
     
    console.warn('[audit] Audit logging error', { action, error });
  }
}

/**
 * Convenience helpers for common actions
 */
export const audit = {
  caseCreated: (caseId: string, metadata?: Record<string, unknown>) =>
    auditLog('case.created', { entity: 'case', entityId: caseId, metadata }),
  
  caseUpdated: (caseId: string, metadata?: Record<string, unknown>) =>
    auditLog('case.updated', { entity: 'case', entityId: caseId, metadata }),
  
  jobCreated: (jobId: string, metadata?: Record<string, unknown>) =>
    auditLog('job.created', { entity: 'job', entityId: jobId, metadata }),
  
  jobUpdated: (jobId: string, metadata?: Record<string, unknown>) =>
    auditLog('job.updated', { entity: 'job', entityId: jobId, metadata }),
  
  calendarEventCreated: (eventId: string, metadata?: Record<string, unknown>) =>
    auditLog('calendar_event.created', { entity: 'calendar_event', entityId: eventId, metadata }),
  
  calendarEventUpdated: (eventId: string, metadata?: Record<string, unknown>) =>
    auditLog('calendar_event.updated', { entity: 'calendar_event', entityId: eventId, metadata }),
  
  calendarEventDeleted: (eventId: string, metadata?: Record<string, unknown>) =>
    auditLog('calendar_event.deleted', { entity: 'calendar_event', entityId: eventId, metadata }),
  
  fileUploaded: (fileId: string, metadata?: Record<string, unknown>) =>
    auditLog('file.uploaded', { entity: 'file', entityId: fileId, metadata }),
  
  fileDeleted: (fileId: string, metadata?: Record<string, unknown>) =>
    auditLog('file.deleted', { entity: 'file', entityId: fileId, metadata }),
  
  // HIPAA-compliant access logging
  transcriptViewed: (transcriptId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcript.viewed', { entity: 'transcript', entityId: transcriptId, metadata }),
  
  transcriptExported: (transcriptId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcript.exported', { entity: 'transcript', entityId: transcriptId, metadata }),
  
  transcriptEdited: (transcriptId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcript.edited', { entity: 'transcript', entityId: transcriptId, metadata }),
  
  transcriptDeleted: (transcriptId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcript.deleted', { entity: 'transcript', entityId: transcriptId, metadata }),
  
  aiReviewRequested: (transcriptId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcript.ai_review_requested', { entity: 'transcript', entityId: transcriptId, metadata }),
  
  revisionCreated: (revisionId: string, transcriptId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcript_revision.created', { entity: 'transcript_revision', entityId: revisionId, metadata: { ...metadata, transcriptId } }),
  
  revisionApplied: (revisionId: string, transcriptId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcript_revision.applied', { entity: 'transcript_revision', entityId: revisionId, metadata: { ...metadata, transcriptId } }),
  
  transcriptionCompleted: (transcriptId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcription.completed', { entity: 'transcription', entityId: transcriptId, metadata }),
  
  transcriptionFailed: (jobId: string, metadata?: Record<string, unknown>) =>
    auditLog('transcription.failed', { entity: 'job', entityId: jobId, metadata }),
};

/**
 * Backward compatibility: logAudit function
 * Supports both old format (from audit-service) and new format
 */
export async function logAudit(
  params:
    | {
        userId?: string;
        action: string;
        entityType?: string;
        entityId?: string;
        details?: Record<string, unknown>;
      }
    | string,
  entity?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Handle object format (from audit-service)
  if (typeof params === 'object') {
    return auditLog(params.action, {
      entity: params.entityType,
      entityId: params.entityId,
      metadata: params.details || {},
    });
  }
  
  // Handle string format (legacy)
  return auditLog(params, { entity, entityId, metadata });
}
