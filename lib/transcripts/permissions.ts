// =============================================================================
// TRANSCRIPT EDITOR PERMISSIONS
// lib/transcripts/permissions.ts
//
// Phase 3B-2: Role-based editor permissions
// =============================================================================

import type { UserRole } from '@/lib/enums/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Stub for canEditTranscript (replaces _future/transcripts/lock-service)
async function canEditTranscript(transcriptId: string, userId: string): Promise<{ canEdit: boolean; reason?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('transcriptions')
    .select('locked_by, lock_reason')
    .eq('id', transcriptId)
    .maybeSingle();

  if (error || !data) {
    return { canEdit: true };
  }

  if (data.locked_by && data.locked_by !== userId) {
    return { canEdit: false, reason: data.lock_reason || 'Transcript is locked by another user' };
  }

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
  const rolePermissions: Partial<Record<UserRole, Omit<EditorPermissions, 'canEdit' | 'lockReason'>>> = {
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
    AGENCY_OWNER: {
      canComment: true,
      canFinalize: true,
      canUnlock: false,
    },
    AGENCY_MANAGER: {
      canComment: true,
      canFinalize: true,
      canUnlock: false,
    },
    FIRM_OWNER: {
      canComment: true,
      canFinalize: true,
      canUnlock: false,
    },
    FIRM_MANAGER: {
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
