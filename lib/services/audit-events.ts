// lib/services/audit-events.ts
// Security Audit D.3 + D.4 - Comprehensive Audit Logging
// Legal defensibility: complete trail of who did what and when

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type AuditAction =
  // Word corrections
  | 'WORD_CORRECTED'
  | 'WORD_CONFIRMED'
  | 'WORD_SKIPPED'
  | 'BATCH_CORRECTIONS_APPLIED'
  // Transcripts
  | 'TRANSCRIPT_EXPORTED'
  | 'TRANSCRIPT_VIEWED'
  | 'TRANSCRIPT_FINALIZED'
  | 'TRANSCRIPT_STATUS_CHANGED'
  // Jobs
  | 'JOB_CREATED'
  | 'JOB_ASSIGNED'
  | 'JOB_STATUS_CHANGED'
  | 'JOB_DELETED'
  | 'JOB_UPDATED'
  | 'JOB_LOCK_ACQUIRED'
  | 'JOB_LOCK_RELEASED'
  // Medical (Phase 10)
  | 'MEDICAL_RECORD_UPLOADED'
  | 'MEDICAL_RECORD_EXTRACTED'
  | 'MEDICAL_RECORD_DELETED'
  | 'CHRONOLOGY_ENTRY_CREATED'
  | 'CHRONOLOGY_ENTRY_EDITED'
  | 'CHRONOLOGY_ENTRY_DELETED'
  | 'CHRONOLOGY_ENTRY_VERIFIED'
  | 'CHRONOLOGY_EXPORTED'
  // Sharing
  | 'TRANSCRIPT_SHARED'
  | 'SHARE_REVOKED'
  // Vocabulary
  | 'VOCABULARY_TERM_ADDED'
  | 'VOCABULARY_TERM_DELETED'
  // Auth
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  // Admin
  | 'USER_ROLE_CHANGED'
  | 'USER_CREATED'
  | 'USER_DELETED';

interface AuditEventInput {
  userId: string;
  firmId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Log a security-relevant action to audit_events table
 *
 * NEVER let audit logging failure break the request - errors are logged but swallowed
 *
 * @example
 * await logAuditEvent({
 *   userId: user.id,
 *   firmId: user.firm_id,
 *   action: 'WORD_CORRECTED',
 *   entityType: 'flagged_word',
 *   entityId: wordId,
 *   metadata: { old_word: 'teh', new_word: 'the' },
 *   ip: request.headers.get('x-forwarded-for') || undefined,
 *   userAgent: request.headers.get('user-agent') || undefined,
 * });
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from('audit_events').insert({
      user_id: input.userId,
      firm_id: input.firmId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      metadata: input.metadata || {},
      ip_address: input.ip || null,
      user_agent: input.userAgent || null,
    });

    if (error) {
      logger.error('[audit] Failed to log event', {
        action: input.action,
        error: error.message,
      });
    }
  } catch (error) {
    // Never let audit logging failure break the request
    logger.error('[audit] Exception logging event', {
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Log data access (Security Audit D.4)
 * Use for sensitive data views (transcripts, medical records)
 */
export async function logDataAccess(input: {
  userId: string;
  firmId: string;
  entityType: 'transcript' | 'medical_record' | 'chronology' | 'job';
  entityId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await logAuditEvent({
    ...input,
    action: input.entityType === 'transcript'
      ? 'TRANSCRIPT_VIEWED'
      : 'CHRONOLOGY_EXPORTED',
  });
}

/**
 * Log word correction with before/after values
 */
export async function logWordCorrection(input: {
  userId: string;
  firmId: string;
  wordId: string;
  originalWord: string;
  correctedWord: string;
  status: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await logAuditEvent({
    userId: input.userId,
    firmId: input.firmId,
    action: 'WORD_CORRECTED',
    entityType: 'flagged_word',
    entityId: input.wordId,
    metadata: {
      original_word: input.originalWord,
      corrected_word: input.correctedWord,
      status: input.status,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

/**
 * Log batch corrections
 */
export async function logBatchCorrections(input: {
  userId: string;
  firmId: string;
  transcriptionId: string;
  correctionCount: number;
  reviewedCount: number;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await logAuditEvent({
    userId: input.userId,
    firmId: input.firmId,
    action: 'BATCH_CORRECTIONS_APPLIED',
    entityType: 'transcription',
    entityId: input.transcriptionId,
    metadata: {
      corrections_applied: input.correctionCount,
      words_reviewed: input.reviewedCount,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

/**
 * Query audit events for a specific entity
 */
export async function getAuditTrail(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('audit_events')
      .select(`
        id,
        action,
        user_id,
        metadata,
        ip_address,
        created_at,
        profiles:user_id (full_name, email)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[audit] Failed to fetch audit trail', { error: error.message });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('[audit] Exception fetching audit trail', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get recent audit events for a firm (admin view)
 */
export async function getRecentAuditEvents(
  firmId: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('audit_events')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        user_id,
        metadata,
        ip_address,
        created_at,
        profiles:user_id (full_name, email, role)
      `)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[audit] Failed to fetch recent events', { error: error.message });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('[audit] Exception fetching recent events', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
