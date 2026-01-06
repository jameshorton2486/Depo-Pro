/**
 * Audit Service - Supabase Implementation
 * Provides comprehensive audit logging for security and compliance
 */

import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Audit action types as const object for runtime use
export const AuditAction = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  
  // Access control
  ACCESS_DENIED: 'ACCESS_DENIED',
  ADMIN_ACCESS: 'ADMIN_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  
  // Job operations
  JOB_CREATED: 'JOB_CREATED',
  JOB_UPDATED: 'JOB_UPDATED',
  JOB_DELETED: 'JOB_DELETED',
  JOB_STATUS_CHANGED: 'JOB_STATUS_CHANGED',
  JOB_ASSIGNED: 'JOB_ASSIGNED',
  JOB_UNASSIGNED: 'JOB_UNASSIGNED',
  
  // Transcript operations
  TRANSCRIPT_CREATED: 'TRANSCRIPT_CREATED',
  TRANSCRIPT_UPDATED: 'TRANSCRIPT_UPDATED',
  TRANSCRIPT_VIEWED: 'TRANSCRIPT_VIEWED',
  TRANSCRIPT_EXPORTED: 'TRANSCRIPT_EXPORTED',
  TRANSCRIPT_DELETED: 'TRANSCRIPT_DELETED',
  
  // Share operations
  SHARE_CREATED: 'SHARE_CREATED',
  SHARE_REVOKED: 'SHARE_REVOKED',
  
  // Calendar operations
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_UPDATED: 'EVENT_UPDATED',
  EVENT_DELETED: 'EVENT_DELETED',
  EVENT_RESCHEDULED: 'EVENT_RESCHEDULED',
  REPORTER_ASSIGNED: 'REPORTER_ASSIGNED',
  REPORTER_UNASSIGNED: 'REPORTER_UNASSIGNED',
  NOTE_ADDED: 'NOTE_ADDED',
  
  // Data operations
  DATA_EXPORT_REQUESTED: 'DATA_EXPORT_REQUESTED',
  DATA_IMPORTED: 'DATA_IMPORTED',
  
  // User operations
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  ROLE_CHANGED: 'ROLE_CHANGED',
} as const;

export type AuditAction = typeof AuditAction[keyof typeof AuditAction];

// Audit target types
export const AuditTargetType = {
  USER: 'USER',
  JOB: 'JOB',
  TRANSCRIPT: 'TRANSCRIPT',
  TRANSCRIPT_SHARE: 'TRANSCRIPT_SHARE',
  FILE: 'FILE',
  FIRM: 'FIRM',
  CALENDAR_EVENT: 'CALENDAR_EVENT',
  SYSTEM: 'SYSTEM',
  ASSIGNMENT: 'ASSIGNMENT',
} as const;

export type AuditTargetType = typeof AuditTargetType[keyof typeof AuditTargetType];

// Main params interface - accepts both userId and actorUserId for compatibility
export interface CreateAuditLogParams {
  // Accept either userId or actorUserId (actorUserId is preferred)
  userId?: string;
  actorUserId?: string;
  firmId?: string | null;
  action: AuditAction | string;
  targetType: AuditTargetType | string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const supabase = await createSupabaseServiceClient();
    
    // Accept either userId or actorUserId
    const userId = params.actorUserId || params.userId;
    
    const { error } = await supabase.from('audit_logs').insert({
      actor_user_id: userId || null,
      firm_id: params.firmId || null,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Audit] Failed to create audit log:', error);
    }
  } catch (err) {
    // Audit logging should never throw - just log the error
    console.error('[Audit] Error creating audit log:', err);
  }
}

// Query interface for audit logs
export interface AuditLogQuery {
  firmId?: string;
  userId?: string;
  actorUserId?: string;
  action?: AuditAction | string;
  targetType?: AuditTargetType | string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(query: AuditLogQuery = {}): Promise<{
  logs: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
}> {
  try {
    const supabase = await createSupabaseServiceClient();
    
    let dbQuery = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (query.firmId) dbQuery = dbQuery.eq('firm_id', query.firmId);
    if (query.userId || query.actorUserId) {
      dbQuery = dbQuery.eq('actor_user_id', query.actorUserId || query.userId);
    }
    if (query.action) dbQuery = dbQuery.eq('action', query.action);
    if (query.targetType) dbQuery = dbQuery.eq('target_type', query.targetType);
    if (query.targetId) dbQuery = dbQuery.eq('target_id', query.targetId);
    if (query.startDate) dbQuery = dbQuery.gte('created_at', query.startDate.toISOString());
    if (query.endDate) dbQuery = dbQuery.lte('created_at', query.endDate.toISOString());

    // Pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    dbQuery = dbQuery.range(offset, offset + limit - 1);
    dbQuery = dbQuery.order('created_at', { ascending: false });

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('[Audit] Query failed:', error);
      return { logs: [], total: 0, limit, offset };
    }

    return {
      logs: data || [],
      total: count || 0,
      limit,
      offset,
    };
  } catch (err) {
    console.error('[Audit] Error querying audit logs:', err);
    return { logs: [], total: 0, limit: query.limit || 50, offset: query.offset || 0 };
  }
}

/**
 * Get audit history for a specific entity
 */
export async function getEntityAuditHistory(
  targetType: AuditTargetType | string,
  targetId: string,
  limit = 50
): Promise<Array<Record<string, unknown>>> {
  const result = await queryAuditLogs({ targetType, targetId, limit });
  return result.logs;
}

// Re-export for backward compatibility
export { createAuditLog as logAuditEvent };
