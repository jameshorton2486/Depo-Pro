// ═══════════════════════════════════════════════════════════════
// CANONICAL ROLE ENUM — Single Source of Truth
// Depo-Pro Architecture Blueprint v2.2, Section 3: Role Model
//
// ALL code must import roles from this file.
// Do NOT define roles anywhere else.
// ═══════════════════════════════════════════════════════════════

export enum UserRole {
  AGENCY_OWNER = 'AGENCY_OWNER',
  AGENCY_MANAGER = 'AGENCY_MANAGER',
  REPORTER = 'REPORTER',
  SCOPIST = 'SCOPIST',
  VIDEOGRAPHER = 'VIDEOGRAPHER',
  INTERPRETER = 'INTERPRETER',
  FIRM_OWNER = 'FIRM_OWNER',
  FIRM_MANAGER = 'FIRM_MANAGER',
  ATTORNEY = 'ATTORNEY',
  PARALEGAL = 'PARALEGAL',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// Mapping from legacy role strings to new enum values.
// Use this during migration to translate old DB values.
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
};
