// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION MATRIX SYSTEM
// Centralized role-based access control (RBAC) for Depo-Pro
// ═══════════════════════════════════════════════════════════════════════════

export type Role = 'ADMIN' | 'REPORTER' | 'SCOPIST' | 'ATTORNEY' | 'PARALEGAL' | 'AGENCY_ADMIN' | 'FIRM_ADMIN' | 'WKT_STUDENT';
export type Resource = 'jobs' | 'transcripts' | 'files' | 'calendar' | 'users' | 'firms' | 'billing' | 'reports' | 'audit' | 'settings' | 'admin' | 'wkt';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'assign' | 'export' | 'share' | 'approve' | 'practice' | 'mock_exam' | 'flashcards' | 'view_progress' | 'bookmarks';

export interface Permission {
  resource: Resource;
  action: Action;
  scope: 'own' | 'firm' | 'all';
  conditions?: string[];
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    { resource: 'jobs', action: 'create', scope: 'all' },
    { resource: 'jobs', action: 'read', scope: 'all' },
    { resource: 'jobs', action: 'update', scope: 'all' },
    { resource: 'jobs', action: 'delete', scope: 'all' },
    { resource: 'jobs', action: 'assign', scope: 'all' },
    { resource: 'transcripts', action: 'read', scope: 'all' },
    { resource: 'transcripts', action: 'update', scope: 'all' },
    { resource: 'transcripts', action: 'delete', scope: 'all' },
    { resource: 'transcripts', action: 'export', scope: 'all' },
    { resource: 'transcripts', action: 'approve', scope: 'all' },
    { resource: 'files', action: 'create', scope: 'all' },
    { resource: 'files', action: 'read', scope: 'all' },
    { resource: 'files', action: 'update', scope: 'all' },
    { resource: 'files', action: 'delete', scope: 'all' },
    { resource: 'calendar', action: 'create', scope: 'all' },
    { resource: 'calendar', action: 'read', scope: 'all' },
    { resource: 'calendar', action: 'update', scope: 'all' },
    { resource: 'calendar', action: 'delete', scope: 'all' },
    { resource: 'users', action: 'read', scope: 'all' },
    { resource: 'users', action: 'update', scope: 'all' },
    { resource: 'users', action: 'delete', scope: 'all' },
    { resource: 'firms', action: 'read', scope: 'all' },
    { resource: 'firms', action: 'update', scope: 'all' },
    { resource: 'billing', action: 'read', scope: 'all' },
    { resource: 'reports', action: 'read', scope: 'all' },
    { resource: 'audit', action: 'read', scope: 'all' },
    { resource: 'admin', action: 'read', scope: 'all' },
    { resource: 'settings', action: 'read', scope: 'all' },
    { resource: 'settings', action: 'update', scope: 'all' },
  ],
  REPORTER: [
    { resource: 'jobs', action: 'create', scope: 'own' },
    { resource: 'jobs', action: 'read', scope: 'own' },
    { resource: 'jobs', action: 'update', scope: 'own' },
    { resource: 'jobs', action: 'assign', scope: 'own' },
    { resource: 'transcripts', action: 'read', scope: 'own' },
    { resource: 'transcripts', action: 'update', scope: 'own' },
    { resource: 'transcripts', action: 'export', scope: 'own' },
    { resource: 'transcripts', action: 'approve', scope: 'own' },
    { resource: 'files', action: 'create', scope: 'own' },
    { resource: 'files', action: 'read', scope: 'own' },
    { resource: 'files', action: 'update', scope: 'own' },
    { resource: 'files', action: 'delete', scope: 'own' },
    { resource: 'calendar', action: 'create', scope: 'own' },
    { resource: 'calendar', action: 'read', scope: 'own' },
    { resource: 'calendar', action: 'update', scope: 'own' },
    { resource: 'calendar', action: 'delete', scope: 'own' },
  ],
  SCOPIST: [
    { resource: 'jobs', action: 'read', scope: 'own', conditions: ['assigned'] },
    { resource: 'transcripts', action: 'read', scope: 'own', conditions: ['assigned'] },
    { resource: 'transcripts', action: 'update', scope: 'own', conditions: ['assigned'] },
    { resource: 'files', action: 'read', scope: 'own', conditions: ['assigned'] },
    { resource: 'calendar', action: 'read', scope: 'own' },
  ],
  ATTORNEY: [
    { resource: 'jobs', action: 'read', scope: 'own', conditions: ['shared'] },
    { resource: 'transcripts', action: 'read', scope: 'own', conditions: ['shared'] },
    { resource: 'transcripts', action: 'export', scope: 'own', conditions: ['shared'] },
  ],
  PARALEGAL: [
    { resource: 'transcripts', action: 'read', scope: 'own', conditions: ['shared'] },
  ],
  AGENCY_ADMIN: [
    { resource: 'jobs', action: 'read', scope: 'firm' },
    { resource: 'jobs', action: 'update', scope: 'firm' },
    { resource: 'transcripts', action: 'read', scope: 'firm' },
    { resource: 'transcripts', action: 'export', scope: 'firm' },
    { resource: 'users', action: 'read', scope: 'firm' },
    { resource: 'users', action: 'update', scope: 'firm' },
    { resource: 'billing', action: 'read', scope: 'firm' },
    { resource: 'reports', action: 'read', scope: 'firm' },
  ],
  FIRM_ADMIN: [
    { resource: 'jobs', action: 'read', scope: 'firm' },
    { resource: 'transcripts', action: 'read', scope: 'firm' },
    { resource: 'transcripts', action: 'export', scope: 'firm' },
    { resource: 'users', action: 'read', scope: 'firm' },
    { resource: 'billing', action: 'read', scope: 'firm' },
  ],
  WKT_STUDENT: [
    { resource: 'wkt', action: 'practice', scope: 'own' },
    { resource: 'wkt', action: 'mock_exam', scope: 'own' },
    { resource: 'wkt', action: 'flashcards', scope: 'own' },
    { resource: 'wkt', action: 'view_progress', scope: 'own' },
    { resource: 'wkt', action: 'bookmarks', scope: 'own' },
  ],
};

/**
 * Check if a role has permission for a specific resource and action
 */
export function hasPermission(role: Role, resource: Resource, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(p => p.resource === resource && p.action === action);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has permission with specific scope
 */
export function hasPermissionWithScope(
  role: Role,
  resource: Resource,
  action: Action,
  scope: 'own' | 'firm' | 'all'
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(
    p => p.resource === resource && p.action === action && p.scope === scope
  );
}

/**
 * Check if a role has permission with conditions
 */
export function hasPermissionWithConditions(
  role: Role,
  resource: Resource,
  action: Action,
  conditions: string[]
): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(p => {
    if (p.resource !== resource || p.action !== action) return false;
    if (!p.conditions || p.conditions.length === 0) return true;
    return conditions.every(condition => p.conditions?.includes(condition));
  });
}
