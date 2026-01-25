/**
 * WKT Access Guard Functions
 * Role-checking utilities for WKT (Written Knowledge Test) module
 */

/**
 * Check if a user role is a WKT student
 * @param role - User role string (from user_metadata or enum)
 * @returns true if role is WKT_STUDENT
 */
export function isWKTUser(role: string | null | undefined): boolean {
  return role === 'WKT_STUDENT' || role === 'wkt_student';
}

/**
 * Require WKT access - throws error if user is not a WKT student
 * @param role - User role string
 * @throws Error if user is not a WKT student
 */
export function requireWKTAccess(role: string | null | undefined): void {
  if (!isWKTUser(role)) {
    throw new Error('WKT access required');
  }
}

/**
 * Check if user can access the main Depo-Pro application
 * WKT students should NOT have access to main app features
 * @param role - User role string
 * @returns true if user can access main app (not a WKT student)
 */
export function canAccessMainApp(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && !isWKTUser(role);
}

/**
 * Check if user can access WKT module
 * @param role - User role string
 * @returns true if user is a WKT student
 */
export function canAccessWKT(role: string | null | undefined): boolean {
  return isWKTUser(role);
}
