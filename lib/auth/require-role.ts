// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE AUTHORIZATION UTILITIES
// lib/auth/require-role.ts
//
// Layer 1: Route-level authorization (non-negotiable security gate)
// URLs never imply permission - every route enforces role access
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { UserRole } from '@/lib/enums/roles';

export type { UserRole };

export interface RoleConfig {
  allowed: UserRole[];
  redirectTo?: string;
  requireFirm?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE HIERARCHIES AND PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Role hierarchy - higher roles inherit lower role permissions.
 * Covers both legacy and v2.2 roles.
 */
export const ROLE_HIERARCHY: Partial<Record<UserRole, number>> = {
  // v2.2
  [UserRole.SUPER_ADMIN]: 110,
  [UserRole.AGENCY_OWNER]: 100,
  [UserRole.FIRM_OWNER]: 100,
  [UserRole.AGENCY_MANAGER]: 80,
  [UserRole.FIRM_MANAGER]: 80,
  [UserRole.REPORTER]: 60,
  [UserRole.ATTORNEY]: 50,
  [UserRole.SCOPIST]: 40,
  [UserRole.PARALEGAL]: 35,
  [UserRole.VIDEOGRAPHER]: 30,
  [UserRole.INTERPRETER]: 30,
  // Legacy
  [UserRole.ADMIN]: 100,
  [UserRole.COURT_REPORTER]: 60,
};

/**
 * Check if a role has at least the required level
 */
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a role checker function
 * Use in server components and API routes
 *
 * @example
 * const canAccess = requireRole([UserRole.ADMIN, 'AGENCY']);
 * if (!canAccess(currentUser.role)) redirect('/unauthorized');
 */
export function requireRole(allowed: UserRole[]) {
  return (role: UserRole): boolean => allowed.includes(role);
}

/**
 * Check if user can access a route based on role
 * Returns true if allowed, false if not
 */
export function canAccessRoute(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  // Admin can access everything
  if (userRole === UserRole.ADMIN) return true;
  
  return allowedRoles.includes(userRole);
}

/**
 * Higher-order function for server component protection
 * Use this in page.tsx files
 *
 * @example
 * export default async function AdminPage() {
 *   await protectRoute([UserRole.ADMIN]);
 *   // ... rest of component
 * }
 */
export async function protectRoute(
  allowedRoles: UserRole[],
  options: { redirectTo?: string; requireAuth?: boolean } = {}
): Promise<{ user: { id: string; role: UserRole; firmId?: string | null; name?: string | null; email?: string | null } }> {
  const { redirectTo = '/dashboard', requireAuth = true } = options;

  const currentUser = await getCurrentUser();

  // Not authenticated
  if (!currentUser) {
    if (requireAuth) {
      redirect('/login');
    }
    throw new Error('Not authenticated');
  }

  const userRole = currentUser.role as UserRole;

  // Check role access (admin always has access)
  if (userRole !== UserRole.ADMIN && !allowedRoles.includes(userRole)) {
    redirect(redirectTo);
  }

  return {
    user: {
      id: currentUser.id,
      role: userRole,
      firmId: currentUser.firmId,
      name: currentUser.name,
      email: currentUser.email,
    },
  };
}

/**
 * Get the default redirect path for a role
 */
export function getDefaultRedirectForRole(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return '/admin';
    case UserRole.REPORTER:
      return '/reporter';
    case UserRole.SCOPIST:
      return '/scopist';
    case UserRole.ATTORNEY:
      return '/attorney';
    case UserRole.AGENCY_OWNER:
    case UserRole.AGENCY_MANAGER:
      return '/admin';
    default:
      return '/dashboard';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE PERMISSION DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Define which roles can access each route pattern
 * This is the single source of truth for route permissions
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Admin routes
  '/admin': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/admin/users': [UserRole.ADMIN],
  '/admin/rx-queue': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/admin/firm': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/admin/security': [UserRole.ADMIN],
  '/admin/integrations': [UserRole.ADMIN],
  '/admin/reports': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],

  // Job routes
  '/jobs': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/jobs/new': [UserRole.ADMIN, UserRole.REPORTER, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/cases/new': [UserRole.ADMIN, UserRole.REPORTER, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],

  // Calendar routes
  '/calendar': [UserRole.ADMIN, UserRole.REPORTER, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/calendar/availability': [UserRole.REPORTER],
  '/calendar/requests': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],

  // Role-specific dashboards
  '/reporter': [UserRole.ADMIN, UserRole.REPORTER],
  '/scopist': [UserRole.ADMIN, UserRole.SCOPIST],
  '/attorney': [UserRole.ADMIN, UserRole.ATTORNEY],

  // Attorney-specific routes
  '/attorney/cases': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/attorney/transcripts': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/attorney/exhibits': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/attorney/issues': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/attorney/reports': [UserRole.ADMIN, UserRole.ATTORNEY],

  // Billing
  '/billing': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER, UserRole.REPORTER],

  // Settings
  '/settings': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/settings/profile': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
};

/**
 * Check if a specific route is allowed for a role
 */
export function isRouteAllowedForRole(route: string, role: UserRole): boolean {
  // Admin can access everything
  if (role === UserRole.ADMIN) return true;

  // Check exact match first
  if (ROUTE_PERMISSIONS[route]) {
    return ROUTE_PERMISSIONS[route].includes(role);
  }

  // Check pattern matches (for dynamic routes)
  for (const [pattern, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (route.startsWith(pattern + '/') || route === pattern) {
      return allowedRoles.includes(role);
    }
  }

  // Default DENY — routes not in the list are not accessible
  return false;
}

/**
 * Get all routes a role can access
 */
export function getRoutesForRole(role: UserRole): string[] {
  if (role === UserRole.ADMIN) {
    return Object.keys(ROUTE_PERMISSIONS);
  }

  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(role))
    .map(([route]) => route);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check role in API routes
 *
 * @example
 * export async function GET(req: Request) {
 *   const { authorized, user, error } = await checkApiRole([UserRole.ADMIN]);
 *   if (!authorized) return NextResponse.json({ error }, { status: 403 });
 *   // ... rest of handler
 * }
 */
export async function checkApiRole(
  allowedRoles: UserRole[]
): Promise<{ authorized: boolean; user?: any; error?: string }> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const userRole = currentUser.role as UserRole;

  if (userRole !== UserRole.ADMIN && !allowedRoles.includes(userRole)) {
    return { authorized: false, error: 'Insufficient permissions' };
  }

  return { authorized: true, user: currentUser };
}
