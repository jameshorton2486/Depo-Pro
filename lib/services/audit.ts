/**
 * Audit Service for Depo-Pro v1.3
 *
 * Centralized audit logging for all mutations
 * Static class pattern for easy imports
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AuditAction } from '@/types/schema-enums';
import type { Database } from '@/types/supabase-generated';

type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert'];

/**
 * AuditService - Static methods for audit logging
 */
export class AuditService {
  /**
   * Generic audit log entry
   */
  static async log(data: {
    action: AuditAction;
    entity_type: string;
    entity_id: string;
    user_id: string;
    metadata?: Record<string, any> | null;
    ip_address?: string | null;
  }) {
    const supabase = await createAdminClient();

    const logData: AuditLogInsert = {
      action: data.action,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      user_id: data.user_id,
      metadata: data.metadata || null,
      ip_address: data.ip_address || null,
      created_at: new Date().toISOString(),
    };

    return await supabase
      .from('audit_log')
      .insert(logData)
      .select()
      .single();
  }

  // ═══════════════════════════════════════════════════════════════
  // JOB AUDIT METHODS
  // ═══════════════════════════════════════════════════════════════

  static async logJobCreated(jobId: string, userId: string, metadata?: any) {
    return this.log({
      action: AuditAction.JOB_CREATED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
      metadata,
    });
  }

  static async logJobStatusChanged(
    jobId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    notes?: string
  ) {
    return this.log({
      action: AuditAction.JOB_STATUS_CHANGED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
      metadata: { old_status: oldStatus, new_status: newStatus, notes },
    });
  }

  static async logJobAssigned(
    jobId: string,
    userId: string,
    scopistId: string
  ) {
    return this.log({
      action: AuditAction.JOB_ASSIGNED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
      metadata: { scopist_id: scopistId },
    });
  }

  static async logJobDeleted(jobId: string, userId: string) {
    return this.log({
      action: AuditAction.JOB_DELETED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
    });
  }

  static async logJobSealed(jobId: string, userId: string) {
    return this.log({
      action: AuditAction.JOB_SEALED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSCRIPTION AUDIT METHODS
  // ═══════════════════════════════════════════════════════════════

  static async logTranscriptionStarted(
    transcriptionId: string,
    userId: string,
    metadata?: any
  ) {
    return this.log({
      action: AuditAction.TRANSCRIPTION_STARTED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata,
    });
  }

  static async logTranscriptionCompleted(
    transcriptionId: string,
    userId: string,
    metadata?: any
  ) {
    return this.log({
      action: AuditAction.TRANSCRIPTION_COMPLETED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata,
    });
  }

  static async logTranscriptionFailed(
    transcriptionId: string,
    userId: string,
    error: string
  ) {
    return this.log({
      action: AuditAction.TRANSCRIPTION_FAILED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata: { error },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // EDIT AUDIT METHODS
  // ═══════════════════════════════════════════════════════════════

  static async logWordCorrected(
    transcriptionId: string,
    userId: string,
    wordIndex: number,
    originalWord: string,
    correctedWord: string
  ) {
    return this.log({
      action: AuditAction.WORD_CORRECTED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata: {
        word_index: wordIndex,
        original_word: originalWord,
        corrected_word: correctedWord,
      },
    });
  }

  static async logSegmentEdited(
    transcriptionId: string,
    userId: string,
    segmentIndex: number,
    originalText: string,
    newText: string
  ) {
    return this.log({
      action: AuditAction.SEGMENT_EDITED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata: {
        segment_index: segmentIndex,
        original_text: originalText,
        new_text: newText,
      },
    });
  }

  static async logSpeakerRelabeled(
    transcriptionId: string,
    userId: string,
    oldLabel: string,
    newLabel: string
  ) {
    return this.log({
      action: AuditAction.SPEAKER_RELABELED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata: {
        old_label: oldLabel,
        new_label: newLabel,
      },
    });
  }

  static async logBulkEditApplied(
    transcriptionId: string,
    userId: string,
    editCount: number,
    editType: string
  ) {
    return this.log({
      action: AuditAction.BULK_EDIT_APPLIED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata: {
        edit_count: editCount,
        edit_type: editType,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SILENT SEGMENT AUDIT METHODS
  // ═══════════════════════════════════════════════════════════════

  static async logSilentSegmentAdded(
    transcriptionId: string,
    userId: string,
    segmentType: string,
    startTime: number,
    endTime: number
  ) {
    return this.log({
      action: AuditAction.SILENT_SEGMENT_ADDED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata: {
        segment_type: segmentType,
        start_time: startTime,
        end_time: endTime,
      },
    });
  }

  static async logSilentSegmentEdited(
    transcriptionId: string,
    userId: string,
    segmentId: string,
    changes: any
  ) {
    return this.log({
      action: AuditAction.SILENT_SEGMENT_EDITED,
      entity_type: 'transcription',
      entity_id: transcriptionId,
      user_id: userId,
      metadata: {
        segment_id: segmentId,
        changes,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // REVIEW AUDIT METHODS
  // ═══════════════════════════════════════════════════════════════

  static async logReviewStarted(jobId: string, userId: string) {
    return this.log({
      action: AuditAction.REVIEW_STARTED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
    });
  }

  static async logReviewSubmitted(jobId: string, userId: string, metadata?: any) {
    return this.log({
      action: AuditAction.REVIEW_SUBMITTED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
      metadata,
    });
  }

  static async logReviewApproved(jobId: string, userId: string) {
    return this.log({
      action: AuditAction.REVIEW_APPROVED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSCRIPT OPERATION AUDIT METHODS
  // ═══════════════════════════════════════════════════════════════

  static async logTranscriptLocked(jobId: string, userId: string) {
    return this.log({
      action: AuditAction.TRANSCRIPT_LOCKED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
    });
  }

  static async logTranscriptUnlocked(jobId: string, userId: string) {
    return this.log({
      action: AuditAction.TRANSCRIPT_UNLOCKED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
    });
  }

  static async logTranscriptExported(
    jobId: string,
    userId: string,
    format: string
  ) {
    return this.log({
      action: AuditAction.TRANSCRIPT_EXPORTED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
      metadata: { format },
    });
  }

  static async logTranscriptShared(
    jobId: string,
    userId: string,
    attorneyId: string
  ) {
    return this.log({
      action: AuditAction.TRANSCRIPT_SHARED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
      metadata: { attorney_id: attorneyId },
    });
  }

  static async logShareRevoked(
    jobId: string,
    userId: string,
    shareId: string
  ) {
    return this.log({
      action: AuditAction.SHARE_REVOKED,
      entity_type: 'job',
      entity_id: jobId,
      user_id: userId,
      metadata: { share_id: shareId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // USER AUDIT METHODS
  // ═══════════════════════════════════════════════════════════════

  static async logUserLogin(userId: string, ipAddress?: string) {
    return this.log({
      action: AuditAction.USER_LOGIN,
      entity_type: 'user',
      entity_id: userId,
      user_id: userId,
      ip_address: ipAddress,
    });
  }

  static async logUserRoleChanged(
    userId: string,
    changedBy: string,
    oldRole: string,
    newRole: string
  ) {
    return this.log({
      action: AuditAction.USER_ROLE_CHANGED,
      entity_type: 'user',
      entity_id: userId,
      user_id: changedBy,
      metadata: {
        old_role: oldRole,
        new_role: newRole,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get audit log for an entity
   */
  static async getAuditLog(
    entityType: string,
    entityId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: AuditAction;
    }
  ) {
    const supabase = await createClient();

    let query = supabase
      .from('audit_log')
      .select(`
        *,
        user:profiles(id, full_name, email, role)
      `, { count: 'exact' })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (options?.action) {
      query = query.eq('action', options.action);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    return await query;
  }

  /**
   * Get recent audit log for a user
   */
  static async getUserActivity(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ) {
    const supabase = await createClient();

    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 50) - 1
      );
    }

    return await query;
  }

  /**
   * Get audit log statistics
   */
  static async getAuditStats(entityType: string, entityId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('audit_log')
      .select('action')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) return { data: null, error };

    const stats: Record<string, number> = {};
    data?.forEach((log: any) => {
      const action = log.action as string;
      stats[action] = (stats[action] || 0) + 1;
    });

    return { data: stats, error: null };
  }
}
