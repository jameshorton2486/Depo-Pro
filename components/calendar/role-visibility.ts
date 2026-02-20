// ============================================
// Role-Based Visibility (Display Only)
// ============================================

import { UserRole } from '@/lib/enums/roles';

/**
 * Check if role only sees their own events
 * Reporters see only their assigned events
 */
export function seesOnlyOwnEvents(role: string): boolean {
  return role === 'REPORTER';
}

/**
 * Check if role can see event details
 */
export function canSeeEventDetails(role: UserRole): boolean {
  // Most roles can see event details
  return role !== 'SCOPIST';
}

/**
 * Check if role can see reporter assignments
 */
export function canSeeAssignments(role: UserRole): boolean {
  const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER, UserRole.REPORTER];
  return allowedRoles.includes(role);
}

/**
 * Check if role can see conflicts
 */
export function canSeeConflicts(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.AGENCY_OWNER || role === UserRole.AGENCY_MANAGER;
}
