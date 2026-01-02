// =============================================================================
// ROUTE ACCESS REGISTRY
// lib/permissions/route-access.ts
//
// Single source of truth for all route permissions
// Used by: middleware, navigation, API guards, audit scripts
// =============================================================================

import { UserRole } from '@prisma/client';

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

export const PUBLIC_ROUTES: string[] = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
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
  '/admin/sitemap': ['ADMIN'],

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTER ROUTES
  // ─────────────────────────────────────────────────────────────────────────
  '/reporter': ['ADMIN', 'REPORTER'],
  '/jobs': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/jobs/new': ['ADMIN', 'REPORTER'],
  '/calendar': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/calendar/availability': ['ADMIN', 'REPORTER'],
  '/transcripts': ['ADMIN', 'REPORTER', 'SCOPIST'],

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

  // Calendar
  '/api/calendar': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/api/calendar/availability': ['ADMIN', 'REPORTER'],
  '/api/calendar/events': ['ADMIN', 'REPORTER', 'SCOPIST'],

  // Transcripts
  '/api/transcripts': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/api/transcripts/edit': ['ADMIN', 'REPORTER', 'SCOPIST'],

  // Cases
  '/api/cases': ['ADMIN', 'REPORTER', 'ATTORNEY'],

  // Admin
  '/api/admin': ['ADMIN'],
  '/api/admin/users': ['ADMIN'],

  // Attorney
  '/api/attorney': ['ADMIN', 'ATTORNEY'],
};

// =============================================================================
// HELPER FUNCTIONS
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
