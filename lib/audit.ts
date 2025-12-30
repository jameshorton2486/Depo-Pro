import { db } from '@/lib/db';
import { AuditAction, AuditEntityType } from '@/lib/enums';

interface AuditLogParams {
  actorUserId: string;
  action: AuditAction | string;
  targetType: 'CalendarEvent' | 'Job' | string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog({
  actorUserId,
  action,
  targetType,
  targetId,
  metadata,
}: AuditLogParams) {
  return db.auditLog.create({
    data: {
      actorUserId: actorUserId || null,
      action: action as string,
      targetType,
      targetId,
      metadata: metadata ? (metadata as any) : undefined,
    } as any, // Type assertion until Prisma client is regenerated
  });
}

/**
 * Simplified audit logging function for Phase 3
 * Wrapper around createAuditLog with a cleaner interface
 */
export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  details,
}: {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await createAuditLog({
    actorUserId: userId,
    action: action as string,
    targetType: entityType === AuditEntityType.CalendarEvent ? 'CalendarEvent' : 'Job',
    targetId: entityId,
    metadata: details,
  });
}
