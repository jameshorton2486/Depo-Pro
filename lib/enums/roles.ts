// =============================================================================
// CANONICAL USER ROLE ENUMS
// =============================================================================
// Single source of truth for user roles
// NOTE: COURT_REPORTER is removed - use REPORTER instead
// =============================================================================

export enum UserRole {
  ADMIN = "ADMIN",
  REPORTER = "REPORTER",
  SCOPIST = "SCOPIST",
  ATTORNEY = "ATTORNEY",
  PARALEGAL = "PARALEGAL",
  AGENCY = "AGENCY",
  AGENCY_ADMIN = "AGENCY_ADMIN",
  FIRM_ADMIN = "FIRM_ADMIN",
  VIDEOGRAPHER = "VIDEOGRAPHER",
  INTERPRETER = "INTERPRETER",
  WKT_STUDENT = "WKT_STUDENT",
}

// =============================================================================
// ROLE ALIASES (for backward compatibility during migration)
// =============================================================================

/**
 * @deprecated Use UserRole.REPORTER instead
 */
export const COURT_REPORTER = UserRole.REPORTER;

