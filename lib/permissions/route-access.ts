// =============================================================================
// ROUTE ACCESS REGISTRY
// lib/permissions/route-access.ts
//
// Single source of truth for all route permissions
// Used by: middleware, navigation, API guards, audit scripts
// =============================================================================

import type { UserRole } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

export type Role = UserRole;

export interface RouteConfig {
  path: string;
  roles: Role[];
  description?: string;
}

// =============================================================================
// PUBLIC ROUTES (No auth required)
// =============================================================================
// NOTE: isPublicRoute() uses prefix matching
// This means /api/auth covers /api/auth/* (intentional for NextAuth handlers)
// Marketing pages like /about, /features, /pricing, /security, /contact
// are included here even if not yet implemented
// =============================================================================

export const PUBLIC_ROUTES: string[] = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/update-password',
  '/auth/callback',
  '/auth/confirm',
  '/about',
  '/features',
  '/pricing',
  '/security',
  '/contact',
  '/api/auth',
  '/api/health',
];

// =============================================================================
// PROTECTED ROUTE ACCESS
// Single source of truth for role-based route access
// =============================================================================

export const ROUTE_ACCESS: Record<string, Role[]> = {
  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD (Common)
  // ─────────────────────────────────────────────────────────────────────────
  '/dashboard': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],
  '/settings': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],
  '/settings/profile': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],
  '/unauthorized': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN ROUTES
  // ─────────────────────────────────────────────────────────────────────────
  '/admin': ['ADMIN'],
  '/admin/users': ['ADMIN'],
  '/admin/firms': ['ADMIN'],
  '/admin/rx-queue': ['ADMIN'],
  '/admin/settings': ['ADMIN'],
  '/admin/audit': ['ADMIN'],
  '/admin/permissions': ['ADMIN'],
  '/admin/features': ['ADMIN'],
  '/admin/sitemap': ['ADMIN'],
  '/admin/actions': ['ADMIN'],
  '/dashboard/admin': ['ADMIN'],
  '/dashboard/admin/calendar': ['ADMIN'],
  '/dashboard/admin/jobs': ['ADMIN'],

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTER ROUTES
  // ─────────────────────────────────────────────────────────────────────────
  '/reporter': ['ADMIN', 'REPORTER'],
  '/dashboard/reporter': ['ADMIN', 'REPORTER'],
  '/dashboard/reporter/calendar': ['ADMIN', 'REPORTER'],
  '/dashboard/reporter/jobs': ['ADMIN', 'REPORTER'],
  '/jobs': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/jobs/new': ['ADMIN', 'REPORTER'],
  '/calendar': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/calendar/availability': ['ADMIN', 'REPORTER'],
  '/transcripts': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/transcription/upload': ['ADMIN', 'REPORTER'],
  '/transcription/status': ['ADMIN', 'REPORTER', 'SCOPIST'],

  // ─────────────────────────────────────────────────────────────────────────
  // SCOPIST ROUTES
  // ─────────────────────────────────────────────────────────────────────────
  '/scopist': ['ADMIN', 'SCOPIST'],
  '/scopist/jobs': ['ADMIN', 'SCOPIST'],
  '/scopist/available': ['ADMIN', 'SCOPIST'],

  // ─────────────────────────────────────────────────────────────────────────
  // ATTORNEY ROUTES
  // ─────────────────────────────────────────────────────────────────────────
  '/attorney': ['ADMIN', 'ATTORNEY'],
  '/attorney-dashboard': ['ADMIN', 'ATTORNEY'],
  '/attorney/cases': ['ADMIN', 'ATTORNEY'],
  '/attorney/transcripts': ['ADMIN', 'ATTORNEY'],
  '/attorney/onboarding': ['ADMIN', 'ATTORNEY'],
  '/attorney/reports': ['ADMIN', 'ATTORNEY'],

  // ─────────────────────────────────────────────────────────────────────────
  // AGENCY ROUTES
  // ─────────────────────────────────────────────────────────────────────────
  '/agency': ['ADMIN', 'AGENCY'],
  '/agency/reporters': ['ADMIN', 'AGENCY'],
  '/agency/jobs': ['ADMIN', 'AGENCY'],
  '/billing': ['ADMIN', 'REPORTER', 'AGENCY'],

  // ─────────────────────────────────────────────────────────────────────────
  // SHARED ROUTES
  // ─────────────────────────────────────────────────────────────────────────
  '/cases': ['ADMIN', 'REPORTER', 'ATTORNEY'],
  '/cases/new': ['ADMIN', 'REPORTER', 'ATTORNEY'],
  '/exhibits': ['ADMIN', 'ATTORNEY'],
  '/issues': ['ADMIN', 'ATTORNEY'],
  '/reports': ['ADMIN', 'ATTORNEY', 'REPORTER'],
};

// =============================================================================
// API ROUTE ACCESS
// =============================================================================

export const API_ACCESS: Record<string, Role[]> = {
  // Jobs
  '/api/jobs': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/api/jobs/create': ['ADMIN', 'REPORTER'],
  '/api/jobs/[jobId]/status': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/api/jobs/[jobId]/upload': ['ADMIN', 'REPORTER'],

  // Calendar
  '/api/calendar': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/api/calendar/availability': ['ADMIN', 'REPORTER'],
  '/api/calendar/events': ['ADMIN', 'REPORTER', 'SCOPIST'],

  // Transcripts
  '/api/transcripts': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/api/transcripts/edit': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/api/transcripts/[id]/finalize': ['ADMIN', 'REPORTER'],
  
  // Contact
  '/api/contact': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],

  // Cases
  '/api/cases': ['ADMIN', 'REPORTER', 'ATTORNEY'],

  // Admin
  '/api/admin': ['ADMIN'],
  '/api/admin/users': ['ADMIN'],
  '/api/admin/health': ['ADMIN'],
  '/api/admin/users/[id]/role-history': ['ADMIN'],
  '/api/admin/actions': ['ADMIN'],

  // Attorney
  '/api/attorney': ['ADMIN', 'ATTORNEY'],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
// PERMISSION RESOLUTION ORDER
// =============================================================================
// The permission system resolves access in this order:
//
// 1. EXACT MATCH: Check if path exists exactly in ROUTE_ACCESS
//    Example: "/admin" matches ROUTE_ACCESS["/admin"]
//
// 2. PREFIX MATCH: Check if path starts with a registered route
//    Example: "/jobs/abc123" matches ROUTE_ACCESS["/jobs"]
//
// 3. ROLE PREFIX FALLBACK: Emergency guardrail for role-specific paths
//    Example: "/admin/anything" falls back to ADMIN-only
//
// This layered approach is intentionally defensive. Do NOT remove
// redundancy - it provides safety during active development.
// =============================================================================

/**
 * Check if a role has access to a route
 */
export function hasRouteAccess(path: string, role: Role): boolean {
  if (ROUTE_ACCESS[path]) {
    return ROUTE_ACCESS[path].includes(role);
  }

  for (const [route, roles] of Object.entries(ROUTE_ACCESS)) {
    if (path.startsWith(route + '/') || path === route) {
      return roles.includes(role);
    }
  }

  const rolePrefixes: Record<string, Role[]> = {
    '/admin': ['ADMIN'],
    '/reporter': ['ADMIN', 'REPORTER'],
    '/scopist': ['ADMIN', 'SCOPIST'],
    '/attorney': ['ADMIN', 'ATTORNEY'],
    '/agency': ['ADMIN', 'AGENCY'],
  };

  for (const [prefix, roles] of Object.entries(rolePrefixes)) {
    if (path.startsWith(prefix)) {
      return roles.includes(role);
    }
  }

  return true;
}

/**
 * Check if a role has access to an API route
 */
export function hasApiAccess(path: string, role: Role): boolean {
  if (API_ACCESS[path]) {
    return API_ACCESS[path].includes(role);
  }

  for (const [route, roles] of Object.entries(API_ACCESS)) {
    if (path.startsWith(route + '/') || path === route) {
      return roles.includes(role);
    }
  }

  return true;
}

/**
 * Get all routes accessible by a role
 */
export function getRoutesForRole(role: Role): string[] {
  return Object.entries(ROUTE_ACCESS)
    .filter(([, roles]) => roles.includes(role))
    .map(([path]) => path);
}

/**
 * Check if path is public
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(publicPath =>
    path === publicPath || path.startsWith(publicPath + '/')
  );
}

/**
 * Get required roles for a route
 */
export function getRequiredRoles(path: string): Role[] | null {
  if (ROUTE_ACCESS[path]) {
    return ROUTE_ACCESS[path];
  }

  for (const [route, roles] of Object.entries(ROUTE_ACCESS)) {
    if (path.startsWith(route + '/')) {
      return roles;
    }
  }

  return null;
}

// Valid roles from types/database.ts UserRole type
export const VALID_ROLES: Role[] = ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'PARALEGAL', 'AGENCY', 'AGENCY_ADMIN', 'FIRM_ADMIN'] as Role[];
