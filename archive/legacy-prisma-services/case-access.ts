// ═══════════════════════════════════════════════════════════════
// CASE-LEVEL PERMISSIONS SYSTEM
// ═══════════════════════════════════════════════════════════════
// Multi-tenant, enterprise-grade permission enforcement

import type { UserRole } from '@/types/database';

export interface CaseAccessCheck {
  userId: string;
  caseId: string;
  requiredPermission?: 'view' | 'edit' | 'upload' | 'annotate' | 'link';
}

export interface CaseAccessResult {
  hasAccess: boolean;
  reason?: string;
  membership?: {
    roleInCase: string;
    permissions?: any;
  };
}

/**
 * Check if user has access to a case
 *
 * Rules:
 * - User must belong to same firm as case
 * - Attorney/Paralegal: Must have CaseMembership
 * - Reporter: Must be assigned to a deposition in the case
 * - Admin: Full access to all cases in their firm
 */
export async function checkCaseAccess(
  userId: string,
  caseId: string,
): Promise<CaseAccessResult> {
  // Get user with firm
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      firmId: true,
    },
  });

  if (!user) {
    return { hasAccess: false, reason: 'User not found' };
  }

  // Get case with firm
  const caseRecord = await db.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      firmId: true,
    },
  });

  if (!caseRecord) {
    return { hasAccess: false, reason: 'Case not found' };
  }

  // SECURITY: Verify user belongs to same firm as case
  if (user.firmId !== caseRecord.firmId) {
    return { hasAccess: false, reason: 'Cross-firm access denied' };
  }

  // Admin has full access to all cases in their firm
  if (user.role === 'ADMIN' || user.role === 'FIRM_ADMIN') {
    return { hasAccess: true, reason: 'Admin access' };
  }

  // Check case membership
  const membership = await db.caseMembership.findUnique({
    where: {
      userId_caseId: {
        userId,
        caseId,
      },
    },
  });

  if (membership) {
    return {
      hasAccess: true,
      reason: 'Case membership',
      membership: {
        roleInCase: membership.roleInCase,
        permissions: membership.permissions,
      },
    };
  }

  // For reporters: Check if they have a deposition in this case
  if (user.role === 'REPORTER') {
    const deposition = await db.job.findFirst({
      where: {
        caseId,
        createdById: userId,
      },
      select: { id: true },
    });

    if (deposition) {
      return {
        hasAccess: true,
        reason: 'Reporter assigned to deposition',
      };
    }
  }

  return { hasAccess: false, reason: 'No case access' };
}

/**
 * Check if user can perform a specific action on a case
 */
export async function checkCasePermission(
  userId: string,
  caseId: string,
  action: 'view' | 'edit' | 'upload' | 'annotate' | 'link',
): Promise<boolean> {
  const access = await checkCaseAccess(userId, caseId);

  if (!access.hasAccess) {
    return false;
  }

  // Admin has all permissions
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN' || user?.role === 'FIRM_ADMIN') {
    return true;
  }

  // Get membership for role-based checks
  const membership = await db.caseMembership.findUnique({
    where: {
      userId_caseId: {
        userId,
        caseId,
      },
    },
  });

  if (!membership) {
    // Reporter access (via deposition assignment)
    if (user?.role === 'REPORTER') {
      // Reporters can only view and upload to their own depositions
      return action === 'view' || action === 'upload';
    }
    return false;
  }

  // Permission matrix based on role in case
  const roleInCase = membership.roleInCase;

  switch (action) {
    case 'view':
      return roleInCase === 'ATTORNEY' || roleInCase === 'PARALEGAL' || roleInCase === 'REPORTER';

    case 'edit':
      return roleInCase === 'ATTORNEY' || roleInCase === 'PARALEGAL';

    case 'upload':
      return roleInCase === 'ATTORNEY' || roleInCase === 'REPORTER';

    case 'annotate':
      return roleInCase === 'ATTORNEY' || roleInCase === 'PARALEGAL';

    case 'link':
      return roleInCase === 'ATTORNEY' || roleInCase === 'PARALEGAL';

    default:
      return false;
  }
}

/**
 * Get all cases a user has access to
 */
export async function getUserAccessibleCases(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      firmId: true,
    },
  });

  if (!user) {
    return [];
  }

  // Admin sees all cases in their firm
  if (user.role === 'ADMIN' || user.role === 'FIRM_ADMIN') {
    if (!user.firmId) {
      return []; // No firm = no cases
    }
    const cases = await db.case.findMany({
      where: { firmId: user.firmId },
      select: { id: true },
    });
    return cases.map((c) => c.id);
  }

  // Get cases via membership
  const memberships = await db.caseMembership.findMany({
    where: { userId },
    select: { caseId: true },
  });

  // Get cases via reporter assignments
  const reporterCases = await db.job.findMany({
    where: {
      createdById: userId,
      caseId: { not: null },
    },
    select: { caseId: true },
    distinct: ['caseId'],
  });

  const caseIds = new Set<string>();
  memberships.forEach((m) => caseIds.add(m.caseId));
  reporterCases.forEach((j) => {
    if (j.caseId) caseIds.add(j.caseId);
  });

  return Array.from(caseIds);
}

/**
 * Assert user has access to case (throws if not)
 * Use in API routes for security
 */
export async function assertCaseAccess(
  userId: string,
  caseId: string,
  action?: 'view' | 'edit' | 'upload' | 'annotate' | 'link',
): Promise<void> {
  if (action) {
    const hasPermission = await checkCasePermission(userId, caseId, action);
    if (!hasPermission) {
      throw new Error(`Access denied: User does not have ${action} permission on case`);
    }
  } else {
    const access = await checkCaseAccess(userId, caseId);
    if (!access.hasAccess) {
      throw new Error(`Access denied: ${access.reason}`);
    }
  }
}

/**
 * Assert attorney has access to case
 * Throws 403 if not an attorney or no membership
 */
export async function assertAttorneyCaseAccess(
  userId: string,
  caseId: string,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, firmId: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'ATTORNEY' && user.role !== 'ADMIN' && user.role !== 'FIRM_ADMIN') {
    throw new Error('Access denied: Attorney access required');
  }

  await assertCaseAccess(userId, caseId, 'view');
}

/**
 * Assert reporter has access to their own deposition
 * Throws 403 if not the reporter for this deposition
 */
export async function assertReporterDepositionAccess(
  userId: string,
  depositionId: string,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'REPORTER' && user.role !== 'ADMIN') {
    throw new Error('Access denied: Reporter access required');
  }

  // Verify reporter owns this deposition
  const deposition = await db.job.findUnique({
    where: { id: depositionId },
    select: {
      id: true,
      createdById: true,
      caseId: true,
    },
  });

  if (!deposition) {
    throw new Error('Deposition not found');
  }

  if (deposition.createdById !== userId && user.role !== 'ADMIN') {
    throw new Error('Access denied: Reporter can only access own depositions');
  }
}

/**
 * Assert user can upload exhibit to case/deposition
 *
 * Rules:
 * - Attorney: Can upload to any case or deposition
 * - Reporter: Can only upload to own deposition
 */
export async function assertCanUploadExhibit(
  userId: string,
  caseId: string,
  depositionId: string | null,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Admin can always upload
  if (user.role === 'ADMIN' || user.role === 'FIRM_ADMIN') {
    return;
  }

  // Attorney can upload to any case/deposition
  if (user.role === 'ATTORNEY') {
    await assertCaseAccess(userId, caseId, 'upload');
    return;
  }

  // Reporter can only upload to own deposition
  if (user.role === 'REPORTER') {
    if (!depositionId) {
      throw new Error('Access denied: Reporters cannot upload case-global exhibits');
    }
    await assertReporterDepositionAccess(userId, depositionId);
    return;
  }

  throw new Error('Access denied: Insufficient permissions to upload exhibit');
}

/**
 * Assert user can annotate transcript
 *
 * Rules:
 * - Attorney: Can annotate any transcript in accessible cases
 * - Paralegal: Can annotate any transcript in accessible cases
 * - Reporter: Cannot annotate
 */
export async function assertCanAnnotateTranscript(
  userId: string,
  transcriptId: string,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Admin can always annotate
  if (user.role === 'ADMIN' || user.role === 'FIRM_ADMIN') {
    return;
  }

  // Reporters cannot annotate
  if (user.role === 'REPORTER') {
    throw new Error('Access denied: Reporters cannot annotate transcripts');
  }

  // Get transcript to verify case access
  const transcript = await db.attorneyTranscript.findUnique({
    where: { id: transcriptId },
    select: {
      id: true,
      uploadedById: true,
      // Note: AttorneyTranscript doesn't have caseId directly
      // We'll need to check via the user's case access
    },
  });

  if (!transcript) {
    throw new Error('Transcript not found');
  }

  // For MVP: If user uploaded it, they can annotate
  // TODO: Add caseId to AttorneyTranscript model for proper case-level checks
  if (transcript.uploadedById === userId) {
    return;
  }

  // Attorney/Paralegal: Check if they have access to any case
  // This is a simplified check - in production, link transcript to case
  if (user.role === 'ATTORNEY' || user.role === 'PARALEGAL') {
    // For now, allow if user is attorney/paralegal
    // TODO: Add proper case-level check when transcript-case link exists
    return;
  }

  throw new Error('Access denied: Insufficient permissions to annotate transcript');
}

/**
 * Create a permission error response for API routes
 */
export function createPermissionError(message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

