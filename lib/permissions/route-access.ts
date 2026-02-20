// =============================================================================
// ROUTE ACCESS REGISTRY
// lib/permissions/route-access.ts
//
// Single source of truth for all route permissions
// Used by: middleware, navigation, API guards, audit scripts
// =============================================================================

import { UserRole } from '@/lib/enums/roles';

// =============================================================================
// TYPES
// =============================================================================

export type Role = `${UserRole}`;

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
  '/dashboard': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/settings': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/settings/profile': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/unauthorized': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────────────────────────────────
  '/admin': [UserRole.ADMIN],
  '/admin/users': [UserRole.ADMIN],
  '/admin/firms': [UserRole.ADMIN],
  '/admin/rx-queue': [UserRole.ADMIN],
  '/admin/settings': [UserRole.ADMIN],
  '/admin/audit': [UserRole.ADMIN],
  '/admin/permissions': [UserRole.ADMIN],
  '/admin/features': [UserRole.ADMIN],
  '/admin/actions': [UserRole.ADMIN],
  '/admin/sitemap': [UserRole.ADMIN],

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTER (CANONICAL — DUPLICATES REMOVED)
  // ─────────────────────────────────────────────────────────────────────────
  '/reporter': [UserRole.ADMIN, UserRole.REPORTER],
  '/jobs': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],
  '/jobs/new': [UserRole.ADMIN, UserRole.REPORTER],
  '/calendar': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],
  '/calendar/availability': [UserRole.ADMIN, UserRole.REPORTER],
  '/transcripts': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],
  '/transcription/upload': [UserRole.ADMIN, UserRole.REPORTER],
  '/transcription/status': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],

  // ─────────────────────────────────────────────────────────────────────────
  // SCOPIST
  // ─────────────────────────────────────────────────────────────────────────
  '/scopist': [UserRole.ADMIN, UserRole.SCOPIST],
  '/scopist/jobs': [UserRole.ADMIN, UserRole.SCOPIST],
  '/scopist/available': [UserRole.ADMIN, UserRole.SCOPIST],

  // ─────────────────────────────────────────────────────────────────────────
  // ATTORNEY (CANONICAL)
  // ─────────────────────────────────────────────────────────────────────────
  '/attorney-dashboard': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/attorney/cases': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/attorney/transcripts': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/attorney/onboarding': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/attorney/reports': [UserRole.ADMIN, UserRole.ATTORNEY],

  // ─────────────────────────────────────────────────────────────────────────
  // AGENCY
  // ─────────────────────────────────────────────────────────────────────────
  '/agency': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/agency/reporters': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/agency/jobs': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  '/billing': [UserRole.ADMIN, UserRole.REPORTER, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],

  // ─────────────────────────────────────────────────────────────────────────
  // CASES & SHARED DATA
  // ─────────────────────────────────────────────────────────────────────────
  '/cases': [UserRole.ADMIN, UserRole.REPORTER, UserRole.ATTORNEY],
  '/cases/new': [UserRole.ADMIN, UserRole.REPORTER, UserRole.ATTORNEY],
  '/exhibits': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/issues': [UserRole.ADMIN, UserRole.ATTORNEY],
  '/reports': [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.REPORTER],
};

// =============================================================================
// API ROUTE ACCESS
// =============================================================================

export const API_ACCESS: Record<string, Role[]> = {
  // Jobs
  '/api/jobs': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],
  '/api/jobs/create': [UserRole.ADMIN, UserRole.REPORTER],
  '/api/jobs/[jobId]/status': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],
  '/api/jobs/[jobId]/upload': [UserRole.ADMIN, UserRole.REPORTER],

  // Calendar
  '/api/calendar': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],
  '/api/calendar/availability': [UserRole.ADMIN, UserRole.REPORTER],
  '/api/calendar/events': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],

  // Transcripts
  '/api/transcripts': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],
  '/api/transcripts/edit': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST],
  '/api/transcripts/[id]/finalize': [UserRole.ADMIN, UserRole.REPORTER],

  // Cases
  '/api/cases': [UserRole.ADMIN, UserRole.REPORTER, UserRole.ATTORNEY],

  // Contact
  '/api/contact': [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST, UserRole.ATTORNEY, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],

  // Admin
  '/api/admin': [UserRole.ADMIN],
  '/api/admin/users': [UserRole.ADMIN],
  '/api/admin/actions': [UserRole.ADMIN],
  '/api/admin/health': [UserRole.ADMIN],
  '/api/admin/users/[id]/role-history': [UserRole.ADMIN],

  // Attorney
  '/api/attorney': [UserRole.ADMIN, UserRole.ATTORNEY],
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
    '/admin': [UserRole.ADMIN],
    '/reporter': [UserRole.ADMIN, UserRole.REPORTER],
    '/scopist': [UserRole.ADMIN, UserRole.SCOPIST],
    '/attorney': [UserRole.ADMIN, UserRole.ATTORNEY],
    '/agency': [UserRole.ADMIN, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  };

  for (const [prefix, roles] of Object.entries(rolePrefixes)) {
    if (path.startsWith(prefix)) {
      return roles.includes(role);
    }
  }

  // Default DENY — unmapped routes are not accessible
  return false;
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

  // Default DENY — unmapped API routes are not accessible
  return false;
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
  UserRole.ADMIN,
  UserRole.REPORTER,
  UserRole.SCOPIST,
  UserRole.ATTORNEY,
  UserRole.PARALEGAL,
  UserRole.AGENCY_OWNER,
  UserRole.AGENCY_MANAGER,
  UserRole.VIDEOGRAPHER,
  UserRole.INTERPRETER,
  UserRole.FIRM_OWNER,
  UserRole.FIRM_MANAGER,
  UserRole.SUPER_ADMIN,
  UserRole.COURT_REPORTER,
];

