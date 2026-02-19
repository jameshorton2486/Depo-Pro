// ═══════════════════════════════════════════════════════════════
// CANONICAL ROLE ENUM — Single Source of Truth
// Depo-Pro Architecture Blueprint v2.2, Section 3: Role Model
//
// ALL code must import roles from this file.
// Do NOT define roles anywhere else.
// ═══════════════════════════════════════════════════════════════

export enum UserRole {
  // ── v1.x Legacy roles (existing in DB — keep until migration) ─────────────
  ADMIN = 'ADMIN',
  COURT_REPORTER = 'COURT_REPORTER',
  SCOPIST = 'SCOPIST',
  ATTORNEY = 'ATTORNEY',
  AGENCY = 'AGENCY',
  AGENCY_ADMIN = 'AGENCY_ADMIN',  // old format
  FIRM_ADMIN = 'FIRM_ADMIN',      // old format
  WKT_STUDENT = 'WKT_STUDENT',

  // ── v2.2 multi-tenant roles ────────────────────────────────────────────────
  AGENCY_OWNER = 'AGENCY_OWNER',
  AGENCY_MANAGER = 'AGENCY_MANAGER',
  REPORTER = 'REPORTER',
  VIDEOGRAPHER = 'VIDEOGRAPHER',
  INTERPRETER = 'INTERPRETER',
  FIRM_OWNER = 'FIRM_OWNER',
  FIRM_MANAGER = 'FIRM_MANAGER',
  PARALEGAL = 'PARALEGAL',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// Mapping from legacy role strings to canonical v2.2 values.
// Use during login/session enrichment to normalize old DB values.
export const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  'ADMIN': UserRole.AGENCY_OWNER,
  'admin': UserRole.AGENCY_OWNER,
  'COURT_REPORTER': UserRole.REPORTER,
  'court_reporter': UserRole.REPORTER,
  'REPORTER': UserRole.REPORTER,
  'reporter': UserRole.REPORTER,
  'SCOPIST': UserRole.SCOPIST,
  'scopist': UserRole.SCOPIST,
  'ATTORNEY': UserRole.ATTORNEY,
  'attorney': UserRole.ATTORNEY,
  'FIRM_ADMIN': UserRole.FIRM_OWNER,
  'firm_admin': UserRole.FIRM_OWNER,
  'AGENCY': UserRole.AGENCY_OWNER,
  'agency': UserRole.AGENCY_OWNER,
  'AGENCY_ADMIN': UserRole.AGENCY_MANAGER,
  'agency_admin': UserRole.AGENCY_MANAGER,
};

/**
 * @deprecated Use UserRole.REPORTER instead
 */
export const COURT_REPORTER = UserRole.REPORTER;
