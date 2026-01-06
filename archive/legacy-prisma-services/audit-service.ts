// =============================================================================
// AUDIT LOGGING SERVICE (COMPLIANCE-GRADE)
// =============================================================================
// Append-only, immutable audit trail for legal defensibility
// 
// RULES:
// - Audit logs are NEVER deleted or modified
// - All sensitive actions MUST be logged
// - No PII in metadata (use IDs only)
// - Queryable by firm for compliance
// =============================================================================

import { logger } from '@/lib/logger';

// =============================================================================
// AUDIT ACTIONS (Exhaustive List)
// =============================================================================

export const AuditAction = {
  // Authentication
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  USER_INVITED: 'USER_INVITED',
  
  // Job Actions
  JOB_CREATED: 'JOB_CREATED',
  JOB_UPDATED: 'JOB_UPDATED',
  JOB_DELETED: 'JOB_DELETED',
  JOB_STATUS_CHANGED: 'JOB_STATUS_CHANGED',
  JOB_ASSIGNED: 'JOB_ASSIGNED',
  JOB_UNASSIGNED: 'JOB_UNASSIGNED',
  
  // Transcript Actions
  TRANSCRIPT_CREATED: 'TRANSCRIPT_CREATED',
  TRANSCRIPT_VIEWED: 'TRANSCRIPT_VIEWED',
  TRANSCRIPT_EDITED: 'TRANSCRIPT_EDITED',
  TRANSCRIPT_EXPORTED: 'TRANSCRIPT_EXPORTED',
  TRANSCRIPT_DELETED: 'TRANSCRIPT_DELETED',
  
  // AI & Transcription
  TRANSCRIPTION_STARTED: 'TRANSCRIPTION_STARTED',
  TRANSCRIPTION_COMPLETED: 'TRANSCRIPTION_COMPLETED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  AI_CORRECTION_MADE: 'AI_CORRECTION_MADE',
  AI_CORRECTION_APPROVED: 'AI_CORRECTION_APPROVED',
  AI_CORRECTION_REJECTED: 'AI_CORRECTION_REJECTED',
  
  // Sharing & Access
  SHARE_CREATED: 'SHARE_CREATED',
  SHARE_REVOKED: 'SHARE_REVOKED',
  SHARE_ACCESSED: 'SHARE_ACCESSED',
  SHARE_EXPIRED: 'SHARE_EXPIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Annotations
  HIGHLIGHT_CREATED: 'HIGHLIGHT_CREATED',
  HIGHLIGHT_DELETED: 'HIGHLIGHT_DELETED',
  ANNOTATION_CREATED: 'ANNOTATION_CREATED',
  ANNOTATION_UPDATED: 'ANNOTATION_UPDATED',
  ANNOTATION_DELETED: 'ANNOTATION_DELETED',
  BOOKMARK_CREATED: 'BOOKMARK_CREATED',
  BOOKMARK_DELETED: 'BOOKMARK_DELETED',
  
  // Admin Actions
  ADMIN_ACCESS: 'ADMIN_ACCESS',
  FIRM_SETTINGS_CHANGED: 'FIRM_SETTINGS_CHANGED',
  SYSTEM_CONFIG_CHANGED: 'SYSTEM_CONFIG_CHANGED',
  DATA_EXPORT_REQUESTED: 'DATA_EXPORT_REQUESTED',
  DATA_DELETION_REQUESTED: 'DATA_DELETION_REQUESTED',
  
  // Security Events
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  PERMISSION_ESCALATION_ATTEMPT: 'PERMISSION_ESCALATION_ATTEMPT',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

// =============================================================================
// TARGET TYPES
// =============================================================================

export const AuditTargetType = {
  USER: 'User',
  JOB: 'Job',
  TRANSCRIPT: 'Transcript',
  TRANSCRIPT_SHARE: 'TranscriptShare',
  FIRM: 'Firm',
  EXHIBIT: 'Exhibit',
  CALENDAR_EVENT: 'CalendarEvent',
  HIGHLIGHT: 'Highlight',
  ANNOTATION: 'Annotation',
  BOOKMARK: 'Bookmark',
  SYSTEM: 'System',
} as const;

export type AuditTargetTypeValue = typeof AuditTargetType[keyof typeof AuditTargetType];

// =============================================================================
// AUDIT LOG INPUT
// =============================================================================

export interface AuditLogInput {
  actorUserId?: string | null;  // null for system actions
  firmId?: string | null;       // null for cross-firm admin actions
  action: AuditActionType;
  targetType: AuditTargetTypeValue;
  targetId: string;
  metadata?: AuditMetadata;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// METADATA TYPES (NO PII!)
// =============================================================================

export interface AuditMetadata {
  // Generic change tracking
  previousValue?: string;
  newValue?: string;
  changedFields?: string[];
  
  // Status changes
  fromStatus?: string;
  toStatus?: string;
  
  // Role changes
  fromRole?: string;
  toRole?: string;
  
  // Share details (IDs only, no emails)
  shareId?: string;
  accessLevel?: string;
  recipientType?: string;
  
  // Export details
  exportFormat?: string;
  
  // Error context
  errorCode?: string;
  errorMessage?: string;
  
  // Request context
  requestId?: string;
  endpoint?: string;
  method?: string;
  
  // Additional context (must not contain PII)
  [key: string]: unknown;
}

// =============================================================================
// CORE AUDIT FUNCTION
// =============================================================================

/**
 * Create an immutable audit log entry
 * This function is fire-and-forget to avoid blocking main operations
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  // Validate: No PII in metadata
  if (input.metadata) {
    validateNoPII(input.metadata);
  }
  
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        firmId: input.firmId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: sanitizeMetadata(input.metadata) as any,
        ipAddress: input.ipAddress,
        userAgent: truncateUserAgent(input.userAgent),
      },
    });
    
    logger.debug('Audit log created', {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
    });
  } catch (error) {
    // CRITICAL: Never fail silently, but don't throw
    logger.error('Failed to create audit log', error as Error, {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
    });
  }
}

// =============================================================================
// REQUEST-SCOPED AUDIT LOGGER
// =============================================================================

export interface AuditContext {
  actorUserId?: string;
  firmId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Create an audit logger bound to a request context
 */
export function createAuditLogger(context: AuditContext) {
  return {
    log: (
      action: AuditActionType,
      targetType: AuditTargetTypeValue,
      targetId: string,
      metadata?: AuditMetadata
    ) => {
      createAuditLog({
        actorUserId: context.actorUserId,
        firmId: context.firmId,
        action,
        targetType,
        targetId,
        metadata: {
          ...metadata,
          requestId: context.requestId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    },
    
    // Convenience methods
    logView: (targetType: AuditTargetTypeValue, targetId: string) => {
      createAuditLog({
        ...context,
        action: AuditAction.TRANSCRIPT_VIEWED,
        targetType,
        targetId,
      });
    },
    
    logCreate: (targetType: AuditTargetTypeValue, targetId: string, metadata?: AuditMetadata) => {
      const actionMap: Partial<Record<AuditTargetTypeValue, AuditActionType>> = {
        Job: AuditAction.JOB_CREATED,
        Transcript: AuditAction.TRANSCRIPT_CREATED,
        TranscriptShare: AuditAction.SHARE_CREATED,
        Highlight: AuditAction.HIGHLIGHT_CREATED,
        Annotation: AuditAction.ANNOTATION_CREATED,
        Bookmark: AuditAction.BOOKMARK_CREATED,
        User: AuditAction.USER_CREATED,
      };
      
      createAuditLog({
        ...context,
        action: actionMap[targetType] || AuditAction.JOB_CREATED,
        targetType,
        targetId,
        metadata,
      });
    },
    
    logDelete: (targetType: AuditTargetTypeValue, targetId: string) => {
      const actionMap: Partial<Record<AuditTargetTypeValue, AuditActionType>> = {
        Job: AuditAction.JOB_DELETED,
        Transcript: AuditAction.TRANSCRIPT_DELETED,
        TranscriptShare: AuditAction.SHARE_REVOKED,
        Highlight: AuditAction.HIGHLIGHT_DELETED,
        Annotation: AuditAction.ANNOTATION_DELETED,
        Bookmark: AuditAction.BOOKMARK_DELETED,
        User: AuditAction.USER_DELETED,
      };
      
      createAuditLog({
        ...context,
        action: actionMap[targetType] || AuditAction.JOB_DELETED,
        targetType,
        targetId,
      });
    },
    
    logSecurityEvent: (action: AuditActionType, details: AuditMetadata) => {
      createAuditLog({
        ...context,
        action,
        targetType: AuditTargetType.SYSTEM,
        targetId: 'security',
        metadata: details,
      });
    },
  };
}

// =============================================================================
// EXTRACT CONTEXT FROM REQUEST
// =============================================================================

export function extractAuditContext(
  request: Request,
  userId?: string,
  firmId?: string
): AuditContext {
  return {
    actorUserId: userId,
    firmId,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined,
    requestId: request.headers.get('x-request-id') || crypto.randomUUID(),
  };
}

function getClientIP(request: Request): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  );
}

// =============================================================================
// VALIDATION & SANITIZATION
// =============================================================================

const PII_PATTERNS = [
  /\b[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/gi,  // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,          // Phone
  /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,            // SSN
  /\b\d{16}\b/g,                              // Credit card (basic)
];

function validateNoPII(metadata: AuditMetadata): void {
  const jsonStr = JSON.stringify(metadata);
  
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(jsonStr)) {
      logger.warn('Potential PII detected in audit metadata', {
        pattern: pattern.source,
      });
      // In strict mode, you might throw here
    }
  }
}

function sanitizeMetadata(metadata?: AuditMetadata): Record<string, unknown> {
  if (!metadata) return {};
  
  // Remove any null/undefined values
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) {
      // Truncate long strings
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...[truncated]';
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

function truncateUserAgent(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  return userAgent.substring(0, 500);
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

export interface AuditLogQuery {
  firmId?: string;
  actorUserId?: string;
  targetType?: AuditTargetTypeValue;
  targetId?: string;
  action?: AuditActionType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query audit logs (firm-scoped by default)
 */
export async function queryAuditLogs(query: AuditLogQuery) {
  const {
    firmId,
    actorUserId,
    targetType,
    targetId,
    action,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = query;
  
  const where: Record<string, unknown> = {};
  
  if (firmId) where.firmId = firmId;
  if (actorUserId) where.actorUserId = actorUserId;
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  if (action) where.action = action;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total, limit, offset };
}

/**
 * Get audit history for a specific entity
 */
export async function getEntityAuditHistory(
  targetType: AuditTargetTypeValue,
  targetId: string,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/**
 * Get user activity audit
 */
export async function getUserActivityAudit(
  userId: string,
  firmId: string,
  limit = 100
) {
  return prisma.auditLog.findMany({
    where: {
      actorUserId: userId,
      firmId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
