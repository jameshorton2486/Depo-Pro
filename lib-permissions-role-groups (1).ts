// ═══════════════════════════════════════════════════════════════
// ROLE GROUPS — Prevents conditional explosion in permission checks
// Depo-Pro Architecture Blueprint v2.2, Section 3: Permission Groups
//
// Instead of: if (role === 'X' || role === 'Y' || role === 'Z')
// Use:        if (isAgencyAdmin(role))
// ═══════════════════════════════════════════════════════════════

import { UserRole } from '@/lib/enums/roles';

// ── Group Definitions ──────────────────────────────────────────

export const ROLE_GROUPS = {
  AGENCY_ADMIN: [UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER],
  AGENCY_STAFF: [UserRole.REPORTER, UserRole.SCOPIST, UserRole.VIDEOGRAPHER, UserRole.INTERPRETER],
  FIRM_ADMIN: [UserRole.FIRM_OWNER, UserRole.FIRM_MANAGER],
  FIRM_STAFF: [UserRole.ATTORNEY, UserRole.PARALEGAL],
} as const;

export const ALL_AGENCY = [
  ...ROLE_GROUPS.AGENCY_ADMIN,
  ...ROLE_GROUPS.AGENCY_STAFF,
] as const;

export const ALL_FIRM = [
  ...ROLE_GROUPS.FIRM_ADMIN,
  ...ROLE_GROUPS.FIRM_STAFF,
] as const;

export const ALL_ROLES = [
  ...ALL_AGENCY,
  ...ALL_FIRM,
  UserRole.SUPER_ADMIN,
] as const;

// ── Group Checkers ─────────────────────────────────────────────

export function isAgencyAdmin(role: UserRole): boolean {
  return (ROLE_GROUPS.AGENCY_ADMIN as readonly UserRole[]).includes(role);
}

export function isAgencyStaff(role: UserRole): boolean {
  return (ROLE_GROUPS.AGENCY_STAFF as readonly UserRole[]).includes(role);
}

export function isFirmAdmin(role: UserRole): boolean {
  return (ROLE_GROUPS.FIRM_ADMIN as readonly UserRole[]).includes(role);
}

export function isFirmStaff(role: UserRole): boolean {
  return (ROLE_GROUPS.FIRM_STAFF as readonly UserRole[]).includes(role);
}

export function isAnyAgency(role: UserRole): boolean {
  return (ALL_AGENCY as readonly UserRole[]).includes(role);
}

export function isAnyFirm(role: UserRole): boolean {
  return (ALL_FIRM as readonly UserRole[]).includes(role);
}

/** Can this role manage an organization? (owner or manager on either side) */
export function canManageOrg(role: UserRole): boolean {
  return isAgencyAdmin(role) || isFirmAdmin(role);
}

/** Is this the platform super admin? */
export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}

/** Can this role create/manage invoices? (owners only for beta) */
export function canManageBilling(role: UserRole): boolean {
  return role === UserRole.AGENCY_OWNER || role === UserRole.FIRM_OWNER;
}
