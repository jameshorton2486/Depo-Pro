/**
 * Audit Logging Service
 */

import { db } from './db';

export interface CreateAuditLogParams {
  userId: string;
  action: string;
  entityId?: string;
  entityType?: string;
  eventId?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

// Alias for backward compatibility
export type AuditLogParams = CreateAuditLogParams;

export enum AuditEntityType {
  User = 'USER',
  Job = 'JOB',
  Transcript = 'TRANSCRIPT',
  CalendarEvent = 'CALENDAR_EVENT',
  Case = 'CASE',
  Exhibit = 'EXHIBIT',
  Invoice = 'INVOICE',
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const {
    userId,
    action,
    entityId,
    entityType,
    eventId,
    details,
    metadata,
    ipAddress,
  } = params;

  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        entityId: entityId || eventId,
        entityType,
        details: details ? JSON.stringify(details) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error);
  }
}

/**
 * Alias for createAuditLog for backward compatibility
 */
export const logAudit = createAuditLog;

/**
 * Query audit logs
 */
export async function queryAuditLogs(options: {
  userId?: string;
  action?: string;
  entityId?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    userId,
    action,
    entityId,
    entityType,
    limit = 50,
    offset = 0,
  } = options;

  const where: Record<string, any> = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityId) where.entityId = entityId;
  if (entityType) where.entityType = entityType;

  return db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
