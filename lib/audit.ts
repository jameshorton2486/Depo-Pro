// =============================================================================
// AUDIT LOGGING SERVICE
// Track important actions for compliance and debugging
// =============================================================================

import { db as prisma } from './db';
import { logger } from './observability';
import { AuditAction, AuditEntityType } from './enums';

// =============================================================================
// TYPES
// =============================================================================

export interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// AUDIT LOGGING FUNCTION
// =============================================================================

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: (input.details as any) || {},
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    logger.debug('Audit log created', {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  } catch (error) {
    logger.error('Failed to create audit log', error as Error, {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }
}

export function createAuditLogger(userId: string | undefined, request?: Request) {
  const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request?.headers.get('x-real-ip') ||
                    undefined;
  const userAgent = request?.headers.get('user-agent')?.substring(0, 255);

  return {
    log: (
      action: AuditAction,
      entityType: AuditEntityType,
      entityId: string,
      details?: Record<string, unknown>
    ) => {
      logAudit({
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
        userAgent,
      });
    },
  };
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

export async function getEntityAuditLogs(
  entityType: AuditEntityType,
  entityId: string,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
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
  });
}

export async function getUserAuditLogs(
  userId: string,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getRecentAuditLogs(
  filters?: {
    action?: AuditAction;
    entityType?: AuditEntityType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit = 100
) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters?.action && { action: filters.action }),
      ...(filters?.entityType && { entityType: filters.entityType }),
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
      ...(filters?.endDate && { createdAt: { lte: filters.endDate } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
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
  });
}
