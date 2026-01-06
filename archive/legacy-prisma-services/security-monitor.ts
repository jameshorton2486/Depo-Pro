// =============================================================================
// SECURITY MONITORING
// lib/monitoring/security-monitor.ts
//
// Phase 5B-2: Detect and respond to suspicious activity
// =============================================================================

import { Prisma } from '@/types/database';
import { subMinutes, subHours, subDays } from 'date-fns';

export interface AccessPattern {
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ip: string;
  userAgent?: string;
}

/**
 * Check for suspicious access patterns
 * Phase 5B-2: Security anomaly detection
 */
export async function checkForAnomalies(pattern: AccessPattern): Promise<string[]> {
  const flags: string[] = [];

  // Rate limiting check
  const recentAttempts = await db.auditLog.count({
    where: {
      actorUserId: pattern.userId,
      createdAt: {
        gte: subMinutes(new Date(), 5),
      },
    },
  });

  if (recentAttempts > 10) {
    flags.push('rate_limit');
    await flagForReview('rate_limit', pattern);
  }

  // New IP check (simplified - would need IP history tracking)
  const recentIps = await db.auditLog.findMany({
    where: {
      actorUserId: pattern.userId,
      createdAt: {
        gte: subDays(new Date(), 30),
      },
      ipAddress: { not: null },
    },
    select: {
      ipAddress: true,
    },
  });

  const knownIps = new Set(recentIps.map(log => log.ipAddress || '').filter(Boolean));
  if (!knownIps.has(pattern.ip)) {
    flags.push('new_ip');
    await flagForReview('new_ip', pattern);
  }

  // Bulk export check
  if (pattern.action === 'TRANSCRIPT_EXPORTED') {
    const recentExports = await db.auditLog.count({
      where: {
        actorUserId: pattern.userId,
        action: 'TRANSCRIPT_EXPORTED',
        createdAt: {
          gte: subHours(new Date(), 24),
        },
      },
    });

    if (recentExports > 50) {
      flags.push('bulk_export');
      await flagForReview('bulk_export', { ...pattern, count: recentExports });
    }
  }

  // After-hours admin access
  if (pattern.action.includes('ADMIN') || pattern.action.includes('UNLOCK')) {
    const hour = pattern.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      flags.push('after_hours');
      await flagForReview('after_hours', pattern);
    }
  }

  return flags;
}

/**
 * Flag an access pattern for security review
 */
async function flagForReview(
  type: string,
  pattern: AccessPattern | Record<string, unknown>
) {
  // In production, this would create a security alert
  // For now, log to audit log
  await db.auditLog.create({
    data: {
      action: 'SECURITY_FLAG',
      targetType: 'Security',
      targetId: 'monitoring',
      actorUserId: (pattern as AccessPattern).userId || 'system',
      metadata: JSON.parse(JSON.stringify({
        flagType: type,
        pattern: pattern as Record<string, unknown>,
        flaggedAt: new Date().toISOString(),
      })) as Prisma.InputJsonValue,
    },
  }).catch(() => {
    // Fire and forget - don't block on logging
  });
}

/**
 * Check for export abuse
 * Phase 5B-2: Flag users exporting unusual amounts
 */
export async function checkExportAbuse(userId: string): Promise<boolean> {
  const recentExports = await db.auditLog.count({
    where: {
      actorUserId: userId,
      action: 'TRANSCRIPT_EXPORTED',
      createdAt: {
        gte: subHours(new Date(), 24),
      },
    },
  });

  if (recentExports > 50) {
    await flagForReview('export_abuse', {
      userId,
      count: recentExports,
      timestamp: new Date(),
    });
    return true;
  }

  return false;
}

/**
 * Log admin action with alerting
 * Phase 5B-2: Real-time alerts for sensitive admin actions
 */
const ALERT_ACTIONS = [
  'TRANSCRIPT_UNLOCKED',
  'USER_ROLE_CHANGED',
  'JOB_DELETED',
  'EXPORT_ALL_DATA',
  'PERMISSION_MODIFIED',
];

export async function logAdminAction(
  action: string,
  adminId: string,
  details: Record<string, unknown>
) {
  await db.auditLog.create({
    data: {
      action,
      targetType: details.targetType as string || 'System',
      targetId: details.targetId as string || 'unknown',
      actorUserId: adminId,
      metadata: details as unknown as Prisma.InputJsonValue,
    },
  });

  if (ALERT_ACTIONS.includes(action)) {
    // In production, send real-time alert (Slack, email, PagerDuty)
    await flagForReview('admin_action', {
      action,
      adminId,
      details,
      timestamp: new Date(),
    });
  }
}

