// =============================================================================
// SESSION HELPERS
// Wrapper around auth to match user's expected interface
// =============================================================================

import { getCurrentUser as getAuthUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string | null;
}

/**
 * Get current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getAuthUser();
  
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as UserRole,
    name: session.user.name || null,
  };
}

/**
 * Require authenticated user
 * Throws if not authenticated
 */
export async function requireCurrentUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  
  return user;
}