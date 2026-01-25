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
// NOTE: Prefix matching is intentional
// =============================================================================

export const PUBLIC_ROUTES: string[] = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
  '/auth/invite',
  '/about',
  '/features',
  '/pricing',
  '/security',
  '/contact',
  '/api/health',
];

// =============================================================================
// PROTECTED ROUTE ACCESS
// Canonical application routes ONLY (no legacy /dashboard/* paths)
// =============================================================================

export const ROUTE_ACCESS: Record<string, Role[]> = {
  // ─────────────────────────────────────────────────────────────────────────
  // SHARED / CORE
  // ─────────────────────────────────────────────────────────────────────────
  '/dashboard': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],
  '/settings': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],
  '/settings/profile': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],
  '/unauthorized': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────────────────────────────────
  '/admin': ['ADMIN'],
  '/admin/users': ['ADMIN'],
  '/admin/firms': ['ADMIN'],
  '/admin/rx-queue': ['ADMIN'],
  '/admin/settings': ['ADMIN'],
  '/admin/audit': ['ADMIN'],
  '/admin/permissions': ['ADMIN'],
  '/admin/features': ['ADMIN'],
  '/admin/actions': ['ADMIN'],
  '/admin/sitemap': ['ADMIN'],

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTER (CANONICAL — DUPLICATES REMOVED)
  // ─────────────────────────────────────────────────────────────────────────
  '/reporter': ['ADMIN', 'REPORTER'],
  '/jobs': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/jobs/new': ['ADMIN', 'REPORTER'],
  '/calendar': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/calendar/availability': ['ADMIN', 'REPORTER'],
  '/transcripts': ['ADMIN', 'REPORTER', 'SCOPIST'],
  '/transcription/upload': ['ADMIN', 'REPORTER'],
  '/transcription/status': ['ADMIN', 'REPORTER', 'SCOPIST'],

  // ─────────────────────────────────────────────────────────────────────────
  // SCOPIST
  // ─────────────────────────────────────────────────────────────────────────
  '/scopist': ['ADMIN', 'SCOPIST'],
  '/scopist/jobs': ['ADMIN', 'SCOPIST'],
  '/scopist/available': ['ADMIN', 'SCOPIST'],

  // ─────────────────────────────────────────────────────────────────────────
  // ATTORNEY (CANONICAL)
  // ─────────────────────────────────────────────────────────────────────────
  '/attorney-dashboard': ['ADMIN', 'ATTORNEY'],
  '/attorney/cases': ['ADMIN', 'ATTORNEY'],
  '/attorney/transcripts': ['ADMIN', 'ATTORNEY'],
  '/attorney/onboarding': ['ADMIN', 'ATTORNEY'],
  '/attorney/reports': ['ADMIN', 'ATTORNEY'],

  // ─────────────────────────────────────────────────────────────────────────
  // AGENCY
  // ─────────────────────────────────────────────────────────────────────────
  '/agency': ['ADMIN', 'AGENCY'],
  '/agency/reporters': ['ADMIN', 'AGENCY'],
  '/agency/jobs': ['ADMIN', 'AGENCY'],
  '/billing': ['ADMIN', 'REPORTER', 'AGENCY'],

  // ─────────────────────────────────────────────────────────────────────────
  // CASES & SHARED DATA
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

  // Cases
  '/api/cases': ['ADMIN', 'REPORTER', 'ATTORNEY'],

  // Contact
  '/api/contact': ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'AGENCY'],

  // Admin
  '/api/admin': ['ADMIN'],
  '/api/admin/users': ['ADMIN'],
  '/api/admin/actions': ['ADMIN'],
  '/api/admin/health': ['ADMIN'],
  '/api/admin/users/[id]/role-history': ['ADMIN'],

  // Attorney
  '/api/attorney': ['ADMIN', 'ATTORNEY'],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function hasRouteAccess(path: string, role: Role): boolean {
  if (ROUTE_ACCESS[path]) {
    return ROUTE_ACCESS[path].includes(role);
  }

  for (const [route, roles] of Object.entries(ROUTE_ACCESS)) {
    if (path === route || path.startsWith(route + '/')) {
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

export function hasApiAccess(path: string, role: Role): boolean {
  if (API_ACCESS[path]) {
    return API_ACCESS[path].includes(role);
  }

  for (const [route, roles] of Object.entries(API_ACCESS)) {
    if (path === route || path.startsWith(route + '/')) {
      return roles.includes(role);
    }
  }

  return true;
}

export function getRoutesForRole(role: Role): string[] {
  return Object.entries(ROUTE_ACCESS)
    .filter(([, roles]) => roles.includes(role))
    .map(([path]) => path);
}

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(
    publicPath => path === publicPath || path.startsWith(publicPath + '/')
  );
}

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

// =============================================================================
// VALID ROLES
// =============================================================================

export const VALID_ROLES: Role[] = [
  'ADMIN',
  'REPORTER',
  'SCOPIST',
  'ATTORNEY',
  'PARALEGAL',
  'AGENCY',
  'AGENCY_ADMIN',
  'FIRM_ADMIN',
  'WKT_STUDENT',
];
