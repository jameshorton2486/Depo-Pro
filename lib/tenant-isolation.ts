// =============================================================================
// MULTI-TENANT ISOLATION
// =============================================================================
// Ensures firm-level data isolation at the logic layer
// 
// RULES:
// - Every query MUST be scoped to firmId (except admin)
// - No cross-firm data access is possible
// - Admin access is explicit and audited
// =============================================================================

import { db as prisma } from '@/lib/db';
import { UserRole } from '@/lib/enums';
import { createAuditLog, AuditAction, AuditTargetType as _AuditTargetType } from './audit-service';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantContext {
  userId: string;
  firmId: string;
  role: UserRole;
  isAdmin: boolean;
}

export interface AdminContext {
  userId: string;
  role: UserRole.ADMIN;
  targetFirmId?: string;  // Optional: which firm admin is accessing
}

// =============================================================================
// CONTEXT VALIDATION
// =============================================================================

/**
 * Require a valid tenant context
 * Throws if context is invalid
 */
export function requireTenantContext(context: Partial<TenantContext>): TenantContext {
  if (!context.userId) {
    throw new TenantError('MISSING_USER', 'User ID is required');
  }
  
  if (!context.firmId) {
    throw new TenantError('MISSING_FIRM', 'Firm ID is required for this operation');
  }
  
  if (!context.role) {
    throw new TenantError('MISSING_ROLE', 'User role is required');
  }
  
  return {
    userId: context.userId,
    firmId: context.firmId,
    role: context.role,
    isAdmin: context.role === UserRole.ADMIN,
  };
}

/**
 * Require admin context for cross-firm operations
 */
export function requireAdminContext(context: Partial<TenantContext>): AdminContext {
  if (!context.userId) {
    throw new TenantError('MISSING_USER', 'User ID is required');
  }
  
  if (context.role !== UserRole.ADMIN) {
    throw new TenantError('ADMIN_REQUIRED', 'Admin role is required for this operation');
  }
  
  return {
    userId: context.userId,
    role: UserRole.ADMIN,
  };
}

// =============================================================================
// TENANT SCOPE HELPERS
// =============================================================================

/**
 * Add firm scope to a Prisma where clause
 */
export function withTenantScope<T extends Record<string, unknown>>(
  where: T,
  firmId: string
): T & { firmId: string } {
  return {
    ...where,
    firmId,
  };
}

/**
 * Create a tenant-scoped query builder
 */
export function createTenantQuery(firmId: string) {
  return {
    // Add firmId to any where clause
    where: <T extends Record<string, unknown>>(clause: T) => ({
      ...clause,
      firmId,
    }),
    
    // For relations, ensure the parent has correct firmId
    whereRelation: <T extends Record<string, unknown>>(clause: T, relationPath: string) => ({
      ...clause,
      [relationPath]: {
        firmId,
      },
    }),
  };
}

// =============================================================================
// ACCESS VALIDATION
// =============================================================================

/**
 * Validate user can access a job
 */
export async function validateJobAccess(
  context: TenantContext,
  jobId: string
): Promise<{ allowed: boolean; job?: any; reason?: string }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      firmId: true,
      createdById: true,
      scopistId: true,
      status: true,
    },
  });
  
  if (!job) {
    return { allowed: false, reason: 'Job not found' };
  }
  
  // Admin can access any job
  if (context.isAdmin) {
    await logAdminAccess(context.userId, 'Job', jobId, job.firmId || null);
    return { allowed: true, job };
  }
  
  // Must be in same firm
  if (job.firmId && job.firmId !== context.firmId) {
    await logCrossFirmAttempt(context, 'Job', jobId, job.firmId);
    return { allowed: false, reason: 'Access denied - different firm' };
  }
  
  // Check role-based access within firm
  const canAccess =
    job.createdById === context.userId ||
    job.scopistId === context.userId ||
    [UserRole.REPORTER, UserRole.AGENCY].includes(context.role);
  
  if (!canAccess) {
    return { allowed: false, reason: 'Insufficient permissions' };
  }
  
  return { allowed: true, job };
}

/**
 * Validate user can access a transcript
 */
export async function validateTranscriptAccess(
  context: TenantContext,
  transcriptId: string
): Promise<{ allowed: boolean; accessLevel?: string; transcript?: any; reason?: string }> {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
    select: {
      id: true,
      job: {
        select: {
          id: true,
          firmId: true,
          createdById: true,
          scopistId: true,
        },
      },
    },
  });
  
  if (!transcript) {
    return { allowed: false, reason: 'Transcript not found' };
  }
  
  // Admin can access any transcript
  if (context.isAdmin) {
    await logAdminAccess(context.userId, 'Transcript', transcriptId, transcript.job.firmId || null);
    return { allowed: true, accessLevel: 'EDIT', transcript };
  }
  
  const job = transcript.job;
  
  // Direct access (same firm, owner or assignee)
  if (job.firmId && job.firmId === context.firmId) {
    if (job.createdById === context.userId || job.scopistId === context.userId) {
      return { allowed: true, accessLevel: 'EDIT', transcript };
    }
  }
  
  // Check for share-based access
  // First, get user email for share lookup
  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    select: { email: true },
  });

  const share = await prisma.transcriptShare.findFirst({
    where: {
      transcriptId,
      recipientEmail: user?.email || undefined,
      status: 'ACTIVE',
      AND: [
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      ],
    },
    select: {
      accessLevel: true,
    },
  });
  
  if (share) {
    return { allowed: true, accessLevel: share.accessLevel, transcript };
  }
  
  // Cross-firm attempt
  if (job.firmId && job.firmId !== context.firmId) {
    await logCrossFirmAttempt(context, 'Transcript', transcriptId, job.firmId);
  }
  
  return { allowed: false, reason: 'Access denied' };
}

/**
 * Validate user can access a user record
 */
export async function validateUserAccess(
  context: TenantContext,
  targetUserId: string
): Promise<{ allowed: boolean; user?: any; reason?: string }> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      firmId: true,
      role: true,
    },
  });
  
  if (!targetUser) {
    return { allowed: false, reason: 'User not found' };
  }
  
  // Admin can access any user
  if (context.isAdmin) {
    await logAdminAccess(context.userId, 'User', targetUserId, targetUser.firmId || null);
    return { allowed: true, user: targetUser };
  }
  
  // Self-access always allowed
  if (targetUserId === context.userId) {
    return { allowed: true, user: targetUser };
  }
  
  // Same firm access
  if (targetUser.firmId && targetUser.firmId === context.firmId) {
    return { allowed: true, user: targetUser };
  }
  
  // Cross-firm attempt
  await logCrossFirmAttempt(context, 'User', targetUserId, targetUser.firmId || null);
  return { allowed: false, reason: 'Access denied - different firm' };
}

// =============================================================================
// SECURITY LOGGING
// =============================================================================

async function logAdminAccess(
  adminUserId: string,
  targetType: string,
  targetId: string,
  targetFirmId: string | null
): Promise<void> {
  await createAuditLog({
    actorUserId: adminUserId,
    firmId: targetFirmId || null,
    action: AuditAction.ADMIN_ACCESS,
    targetType: targetType as any,
    targetId,
    metadata: {
      accessType: 'cross-firm-admin',
      targetFirmId: targetFirmId || 'none',
    },
  }).catch(() => {}); // Fire and forget
}

async function logCrossFirmAttempt(
  context: TenantContext,
  targetType: string,
  targetId: string,
  targetFirmId: string | null
): Promise<void> {
  await createAuditLog({
    actorUserId: context.userId,
    firmId: context.firmId,
    action: AuditAction.ACCESS_DENIED,
    targetType: targetType as any,
    targetId,
    metadata: {
      attemptType: 'cross-firm',
      userFirmId: context.firmId,
      targetFirmId: targetFirmId || 'none',
    },
  }).catch(() => {}); // Fire and forget
}

// =============================================================================
// ROLE ESCALATION PROTECTION
// =============================================================================

/**
 * Validate a role change is allowed
 */
export function validateRoleChange(
  actorRole: UserRole,
  _currentRole: UserRole,
  _newRole: UserRole
): { allowed: boolean; reason?: string } {
  // Only admins can change roles
  if (actorRole !== UserRole.ADMIN) {
    return { allowed: false, reason: 'Only admins can change roles' };
  }
  
  // Cannot create super-admin (if such a role existed)
  // This is a placeholder for future role hierarchy
  
  // Log the role change attempt
  return { allowed: true };
}

/**
 * Validate a user cannot escalate their own privileges
 */
export function validateNoSelfEscalation(
  actorId: string,
  targetUserId: string,
  newRole: UserRole,
  actorRole: UserRole
): { allowed: boolean; reason?: string } {
  // Users cannot change their own role
  if (actorId === targetUserId) {
    return { allowed: false, reason: 'Cannot change own role' };
  }
  
  // Non-admins cannot grant admin
  if (newRole === UserRole.ADMIN && actorRole !== UserRole.ADMIN) {
    return { allowed: false, reason: 'Cannot grant admin role' };
  }
  
  return { allowed: true };
}

// =============================================================================
// TENANT ERROR
// =============================================================================

export class TenantError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 403
  ) {
    super(message);
    this.name = 'TenantError';
  }
}

// =============================================================================
// MIDDLEWARE HELPER
// =============================================================================

/**
 * Extract tenant context from session
 */
export function extractTenantContext(session: {
  user?: {
    id?: string;
    role?: string;
    firmId?: string;
  };
}): Partial<TenantContext> {
  return {
    userId: session.user?.id,
    firmId: session.user?.firmId || undefined,
    role: session.user?.role as UserRole | undefined,
    isAdmin: session.user?.role === UserRole.ADMIN,
  };
}
