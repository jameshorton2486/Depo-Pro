import { UserRole } from '@/lib/enums/roles';

export const ROLE_GROUPS = {
  AGENCY_ADMIN: [
    UserRole.AGENCY_OWNER,
    UserRole.AGENCY_MANAGER,
    UserRole.ADMIN,
  ],
  AGENCY_STAFF: [
    UserRole.REPORTER,
    UserRole.SCOPIST,
    UserRole.VIDEOGRAPHER,
    UserRole.INTERPRETER,
    UserRole.COURT_REPORTER,
  ],
  FIRM_ADMIN: [
    UserRole.FIRM_OWNER,
    UserRole.FIRM_MANAGER,
  ],
  FIRM_STAFF: [
    UserRole.ATTORNEY,
    UserRole.PARALEGAL,
  ],
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

export function isAgencyAdmin(role: string): boolean {
  return (ROLE_GROUPS.AGENCY_ADMIN as readonly string[]).includes(role);
}

export function isAgencyStaff(role: string): boolean {
  return (ROLE_GROUPS.AGENCY_STAFF as readonly string[]).includes(role);
}

export function isFirmAdmin(role: string): boolean {
  return (ROLE_GROUPS.FIRM_ADMIN as readonly string[]).includes(role);
}

export function isFirmStaff(role: string): boolean {
  return (ROLE_GROUPS.FIRM_STAFF as readonly string[]).includes(role);
}

export function isAnyAgency(role: string): boolean {
  return (ALL_AGENCY as readonly string[]).includes(role);
}

export function isAnyFirm(role: string): boolean {
  return (ALL_FIRM as readonly string[]).includes(role);
}

/** Can this role manage an organization? (owner or manager on either side) */
export function canManageOrg(role: string): boolean {
  return isAgencyAdmin(role) || isFirmAdmin(role);
}

/** Is this the platform super admin? */
export function isSuperAdmin(role: string): boolean {
  return role === UserRole.SUPER_ADMIN;
}

/** Can this role create/manage invoices? (owners only for beta) */
export function canManageBilling(role: string): boolean {
  return (
    role === UserRole.AGENCY_OWNER ||
    role === UserRole.FIRM_OWNER ||
    role === UserRole.ADMIN
  );
}
