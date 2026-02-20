import { UserRole } from '@/lib/enums/roles';

export function canSeeEventDetails(role: UserRole): boolean {
  return role !== UserRole.SCOPIST;
}

export function canSeeAssignments(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.AGENCY_OWNER ||
    role === UserRole.AGENCY_MANAGER ||
    role === UserRole.REPORTER
  );
}

export function canSeeConflicts(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.AGENCY_OWNER ||
    role === UserRole.AGENCY_MANAGER
  );
}

export function canCreateEvents(role: UserRole): boolean {
  return canSeeAssignments(role);
}

export function canEditEvents(role: UserRole): boolean {
  return canSeeAssignments(role);
}

export function canCancelEvents(role: UserRole): boolean {
  return canSeeConflicts(role);
}

export function canAssignReporters(role: UserRole): boolean {
  return canSeeConflicts(role);
}
