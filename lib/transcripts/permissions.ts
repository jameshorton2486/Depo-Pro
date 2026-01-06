// =============================================================================
// TRANSCRIPT EDITOR PERMISSIONS
// lib/transcripts/permissions.ts
//
// Phase 3B-2: Role-based editor permissions
// =============================================================================

import type { UserRole } from '@/types/database';

// Stub for canEditTranscript (replaces _future/transcripts/lock-service)
async function canEditTranscript(_transcriptId: string, _userId: string): Promise<{ canEdit: boolean; reason?: string }> {
  // TODO: Implement transcript locking with Supabase
  // For now, allow editing (will be implemented later)
  return { canEdit: true };
}

export interface EditorPermissions {
  canEdit: boolean;
  canComment: boolean;
  canFinalize: boolean;
  canUnlock: boolean;
  lockReason?: string;
}

/**
 * Get editor permissions for a user role and transcript
 * Phase 3B-2: No role checks in UI - server determines permissions
 */
export async function getEditorPermissions(
  transcriptId: string,
  userId: string,
  userRole: UserRole
): Promise<EditorPermissions> {
  // Check lock status first
  const lockCheck = await canEditTranscript(transcriptId, userId);

  // Base permissions by role
  const rolePermissions: Record<UserRole, Omit<EditorPermissions, 'canEdit' | 'lockReason'>> = {
    REPORTER: {
      canComment: true,
      canFinalize: true,
      canUnlock: false,
    },
    SCOPIST: {
      canComment: true,
      canFinalize: false, // Scopists cannot finalize
      canUnlock: false,
    },
    ATTORNEY: {
      canComment: false,
      canFinalize: false,
      canUnlock: false,
    },
    ADMIN: {
      canComment: true,
      canFinalize: true,
      canUnlock: true, // Admin can unlock finalized transcripts
    },
    PARALEGAL: {
      canComment: false,
      canFinalize: false,
      canUnlock: false,
    },
    AGENCY: {
      canComment: true,
      canFinalize: true,
      canUnlock: false,
    },
    AGENCY_ADMIN: {
      canComment: true,
      canFinalize: true,
      canUnlock: false,
    },
    FIRM_ADMIN: {
      canComment: true,
      canFinalize: true,
      canUnlock: false,
    },
  };

  const permissions = rolePermissions[userRole] || {
    canComment: false,
    canFinalize: false,
    canUnlock: false,
  };

  return {
    canEdit: lockCheck.canEdit,
    lockReason: lockCheck.reason,
    ...permissions,
  };
}
