// =============================================================================
// FEATURE FLAGS
// lib/feature-flags/index.ts
//
// Phase 3D-4: Lightweight feature flags
// =============================================================================

import { UserRole } from '@prisma/client';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  roles: UserRole[]; // Empty = all roles when enabled
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default feature flags
 * These can be overridden by database entries in the future
 */
export const DEFAULT_FLAGS: Record<string, Omit<FeatureFlag, 'createdAt' | 'updatedAt'>> = {
  CALENDAR_CONFLICTS: {
    id: 'calendar-conflicts',
    name: 'Calendar Conflict Detection',
    description: 'Show warnings for overlapping events',
    enabled: true,
    roles: ['ADMIN', 'REPORTER', 'SCOPIST'] as UserRole[],
  },
  EXPORT_ARCHIVE: {
    id: 'export-archive',
    name: 'Archive Export',
    description: 'Allow ZIP archive exports with all formats',
    enabled: true,
    roles: ['ADMIN', 'REPORTER'] as UserRole[],
  },
  TRANSCRIPT_COMMENTS: {
    id: 'transcript-comments',
    name: 'Transcript Comments',
    description: 'Allow inline comments on transcripts',
    enabled: false,
    roles: [] as UserRole[],
  },
  ADVANCED_EXPORT: {
    id: 'advanced-export',
    name: 'Advanced Export Options',
    description: 'Additional export customization options',
    enabled: true,
    roles: ['ADMIN', 'REPORTER'] as UserRole[],
  },
};

/**
 * Check if a feature is enabled for a role
 */
export function isFeatureEnabled(flagId: string, role?: UserRole): boolean {
  const flag = DEFAULT_FLAGS[flagId];
  if (!flag) {
    return false;
  }

  if (!flag.enabled) {
    return false;
  }

  // If no roles specified, feature is enabled for all roles
  if (flag.roles.length === 0) {
    return true;
  }

  // Check if role has access
  if (!role) {
    return false;
  }

  return flag.roles.includes(role);
}

/**
 * Get all enabled features for a role
 */
export function getEnabledFeatures(role: UserRole): string[] {
  return Object.entries(DEFAULT_FLAGS)
    .filter(([, flag]) => isFeatureEnabled(flag.id, role))
    .map(([key]) => key);
}
