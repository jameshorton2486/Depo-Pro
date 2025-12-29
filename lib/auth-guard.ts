// =============================================================================
// AUTHENTICATION & AUTHORIZATION GUARDS
// Server-side only - never trust client for auth decisions
// =============================================================================

import { auth } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { unauthorized, forbidden } from './api-response';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  firmId: string | null;
}

export interface AuthResult {
  success: true;
  user: AuthenticatedUser;
}

export interface AuthError {
  success: false;
  response: Response;
}

export type AuthCheck = AuthResult | AuthError;

// =============================================================================
// CORE AUTH FUNCTIONS
// =============================================================================

export async function requireAuth(): Promise<AuthCheck> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      response: unauthorized(),
    };
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name ?? null,
      role: session.user.role as UserRole,
      firmId: session.user.firmId ?? null,
    },
  };
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthCheck> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      success: false,
      response: forbidden(`This action requires one of these roles: ${allowedRoles.join(', ')}`),
    };
  }

  return authResult;
}

export async function requireAdmin(): Promise<AuthCheck> {
  return requireRole([UserRole.ADMIN]);
}

export async function requireSameFirm(firmId: string): Promise<AuthCheck> {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user.role === UserRole.ADMIN) {
    return authResult;
  }

  if (authResult.user.firmId !== firmId) {
    return {
      success: false,
      response: forbidden('You do not have access to this firm'),
    };
  }

  return authResult;
}

// =============================================================================
// RESOURCE-SPECIFIC GUARDS
// =============================================================================

export async function canAccessJob(
  user: AuthenticatedUser,
  jobId: string
): Promise<{ allowed: boolean; job?: any }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      firmId: true,
      caseName: true,
      status: true,
      createdBy: {
        select: { id: true }
      },
      assignments: {
        select: { scopistId: true }
      }
    },
  });

  if (!job) {
    return { allowed: false };
  }

  if (user.role === UserRole.ADMIN) {
    return { allowed: true, job };
  }

  if (job.firmId && user.firmId !== job.firmId) {
    return { allowed: false };
  }

  const isCreator = job.createdBy?.id === user.id;
  const isAssignedScopist = job.assignments?.some(a => a.scopistId === user.id);
  const isAgencyOrReporter = ([UserRole.REPORTER, UserRole.AGENCY] as UserRole[]).includes(user.role);

  const canAccess = isCreator || isAssignedScopist || isAgencyOrReporter;

  return { allowed: canAccess, job };
}

export async function canAccessTranscript(
  user: AuthenticatedUser,
  transcriptId: string
): Promise<{ allowed: boolean; accessLevel?: string; transcript?: any }> {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
    select: {
      id: true,
      job: {
        select: {
          id: true,
          firmId: true,
          createdBy: {
            select: { id: true }
          },
          assignments: {
            select: { scopistId: true }
          }
        },
      },
    },
  });

  if (!transcript) {
    return { allowed: false };
  }

  if (user.role === UserRole.ADMIN) {
    return { allowed: true, accessLevel: 'EDIT', transcript };
  }

  const job = transcript.job;
  if (job) {
    const isCreator = job.createdBy?.id === user.id;
    const isAssignedScopist = job.assignments?.some(a => a.scopistId === user.id);
    const isSameFirm = job.firmId && user.firmId === job.firmId;

    if (isSameFirm && (isCreator || isAssignedScopist)) {
      return { allowed: true, accessLevel: 'EDIT', transcript };
    }
  }

  // Check direct access grants
  const access = await prisma.transcriptAccess.findFirst({
    where: {
      transcriptId,
      userId: user.id,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      accessLevel: true,
    },
  });

  if (access) {
    return { allowed: true, accessLevel: access.accessLevel, transcript };
  }

  // Check external shares
  const share = await prisma.transcriptShare.findFirst({
    where: {
      transcriptId,
      recipientEmail: user.email,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      accessLevel: true,
    },
  });

  if (share) {
    return { allowed: true, accessLevel: share.accessLevel, transcript };
  }

  return { allowed: false };
}

export async function canModifyTranscript(
  user: AuthenticatedUser,
  transcriptId: string
): Promise<boolean> {
  const access = await canAccessTranscript(user, transcriptId);
  return access.allowed && access.accessLevel === 'EDIT';
}

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

export function withAuth<T>(
  handler: (user: AuthenticatedUser) => Promise<T>
): () => Promise<T | Response> {
  return async () => {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }
    return handler(authResult.user);
  };
}

export function withRole<T>(
  roles: UserRole[],
  handler: (user: AuthenticatedUser) => Promise<T>
): () => Promise<T | Response> {
  return async () => {
    const authResult = await requireRole(roles);
    if (!authResult.success) {
      return authResult.response;
    }
    return handler(authResult.user);
  };
}
