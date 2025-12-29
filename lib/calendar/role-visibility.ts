// ============================================
// ROLE-BASED VISIBILITY HELPERS (DISPLAY ONLY)
// Determines what each role can see in calendar
// This is presentation logic only - NOT enforcement
// ============================================

/**
 * UserRole type matching Prisma UserRole enum
 */
export type UserRole = 
  | 'ADMIN' 
  | 'REPORTER' 
  | 'SCOPIST' 
  | 'ATTORNEY' 
  | 'PARALEGAL'
  | 'AGENCY'
  | 'AGENCY_ADMIN'
  | 'FIRM_ADMIN';

/**
 * Check if role can see event details
 * Role Matrix (from prompt):
 * - Attorney: ✅
 * - Law Firm Admin (FIRM_ADMIN): ✅
 * - CSR (REPORTER): ✅ (own only, filtered by API)
 * - Agency Admin: ✅
 * - Scopist: ❌ (unless assigned)
 * - Videographer: ✅ (assigned only)
 * - Interpreter: ✅ (assigned only)
 */
export function canSeeEventDetails(role: UserRole): boolean {
  // Most roles can see event details (filtering happens in API/backend)
  // Scopists are filtered out unless explicitly assigned (handled in API)
  // This is display logic only - actual filtering is done in the API
  const allowedRoles: UserRole[] = [
    'ADMIN',
    'REPORTER', 
    'ATTORNEY',
    'PARALEGAL',
    'AGENCY',
    'AGENCY_ADMIN',
    'FIRM_ADMIN',
  ];
  return allowedRoles.includes(role);
  // Note: SCOPIST visibility is handled by API (only see assigned events)
}

/**
 * Check if role can see reporter assignments
 * Role Matrix:
 * - Attorney: ❌
 * - Law Firm Admin: ❌
 * - CSR: ✅ (self only)
 * - Agency Admin: ✅
 */
export function canSeeAssignments(role: UserRole): boolean {
  const allowedRoles: UserRole[] = ['ADMIN', 'AGENCY_ADMIN', 'REPORTER'];
  return allowedRoles.includes(role);
}

/**
 * Check if role can see conflicts/availability
 * Role Matrix:
 * - Attorney: ❌
 * - Law Firm Admin: ❌
 * - CSR: ❌
 * - Agency Admin: ✅
 */
export function canSeeConflicts(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'AGENCY_ADMIN';
}

/**
 * Check if role can create events
 * Note: Phase 1 is read-only, but these helpers are provided for Phase 2+
 */
export function canCreateEvents(role: UserRole): boolean {
  const allowedRoles: UserRole[] = ['ADMIN', 'AGENCY_ADMIN', 'REPORTER'];
  return allowedRoles.includes(role);
}

/**
 * Check if role can edit events
 * Note: Phase 1 is read-only, but these helpers are provided for Phase 2+
 */
export function canEditEvents(role: UserRole): boolean {
  const allowedRoles: UserRole[] = ['ADMIN', 'AGENCY_ADMIN', 'REPORTER'];
  return allowedRoles.includes(role);
}

/**
 * Check if role can cancel events
 * Note: Phase 1 is read-only, but these helpers are provided for Phase 2+
 */
export function canCancelEvents(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'AGENCY_ADMIN';
}

/**
 * Check if role can assign reporters
 * Note: Phase 1 is read-only, but these helpers are provided for Phase 2+
 */
export function canAssignReporters(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'AGENCY_ADMIN';
}

