// ============================================
// Calendar Audit Logging
// ============================================

import { db } from '@/lib/db';
import { Prisma, CalendarAuditAction } from '@prisma/client';

interface AuditLogParams {
  eventId: string;
  action: CalendarAuditAction;
  performedById: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry for a calendar event
 */
export async function createAuditLog(
  params: AuditLogParams,
  tx?: Prisma.TransactionClient
) {
  const {
    eventId,
    action,
    performedById,
    previousValue,
    newValue,
    metadata,
    ipAddress,
    userAgent,
  } = params;

  const data: Prisma.CalendarAuditLogUncheckedCreateInput = {
    eventId,
    action,
    performedById,
    previousValue: previousValue ? (previousValue as Prisma.InputJsonValue) : Prisma.JsonNull,
    newValue: newValue ? (newValue as Prisma.InputJsonValue) : Prisma.JsonNull,
    metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
  };

  if (tx) {
    return tx.calendarAuditLog.create({ data });
  } else {
    return db.calendarAuditLog.create({ data });
  }
}

/**
 * Get audit history for an event
 */
export async function getAuditHistory(eventId: string, limit = 50) {
  return db.calendarAuditLog.findMany({
    where: { eventId },
    include: {
      performedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// Legacy function for backward compatibility
export async function logAuditAction(
  data: {
    eventId: string;
    action: CalendarAuditAction;
    performedById: string;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
  tx?: Prisma.TransactionClient
): Promise<void> {
  await createAuditLog(data, tx);
}

export async function getAuditLogs(
  eventId: string,
  limit = 50
) {
  return getAuditHistory(eventId, limit);
}

