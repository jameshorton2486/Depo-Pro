/**
 * Audit Logging Helper
 * Tracks who did what, when, and from where — without slowing the app
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AuditLogOptions {
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event (non-blocking, fire-and-forget)
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
        })
    )      .catch((error: unknown) => {
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
