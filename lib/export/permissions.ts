// =============================================================================
// EXPORT PERMISSIONS
// lib/export/permissions.ts
//
// Phase 3C-2: Role-aware export restrictions
// =============================================================================

import type { UserRole } from '@/types/database';

export type ExportFormat = 'docx' | 'pdf' | 'zip' | 'txt' | 'gdocs';

export interface ExportPermissions {
  formats: ExportFormat[];
  profiles: string[];
  restrictions: string[];
}

/**
 * Export permission matrix by role
 */
export const EXPORT_PERMISSIONS: Partial<Record<UserRole, ExportPermissions>> = {
  ADMIN: {
    formats: ['docx', 'pdf', 'zip', 'txt'],
    profiles: ['court-standard', 'attorney-review', 'rough-draft', 'archive'],
    restrictions: [],
  },
  REPORTER: {
    formats: ['docx', 'pdf', 'zip', 'txt'],
    profiles: ['court-standard', 'attorney-review', 'rough-draft', 'archive'],
    restrictions: [],
  },
  SCOPIST: {
    formats: ['pdf'],
    profiles: ['rough-draft'],
    restrictions: ['watermark-required', 'no-certificate'],
  },
  ATTORNEY: {
    formats: ['pdf'],
    profiles: ['attorney-review'],
    restrictions: ['read-only-watermark'],
  },
  AGENCY: {
    formats: ['docx', 'pdf'],
    profiles: ['court-standard', 'attorney-review'],
    restrictions: [],
  },
};

/**
 * Check if a role can export a specific format
 */
export function canExportFormat(role: UserRole, format: ExportFormat): boolean {
  const permissions = EXPORT_PERMISSIONS[role];
  if (!permissions) {
    return false; // Unknown role has no access
  }
  return permissions.formats.includes(format);
}

/**
 * Check if a role can use a specific export profile
 */
export function canUseProfile(role: UserRole, profileId: string): boolean {
  const permissions = EXPORT_PERMISSIONS[role];
  if (!permissions) {
    return false; // Unknown role has no access
  }
  return permissions.profiles.includes(profileId);
}

/**
 * Get export restrictions for a role
 */
export function getExportRestrictions(role: UserRole): string[] {
  return EXPORT_PERMISSIONS[role]?.restrictions ?? [];
}
