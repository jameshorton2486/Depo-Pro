// =============================================================================
// PHASE 6A: PERMISSION GUARDS
// Server-side only - enforce permissions at API/service layer
// =============================================================================

import { UserRole, JobStatus, RemoteMeetingInfo } from '@prisma/client';
import { db } from '@/lib/db';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export type PermissionResult = 
  | { allowed: true }
  | { allowed: false; reason: string; statusCode: number };

// =============================================================================
// DEPOSITION NOTE PERMISSIONS
// =============================================================================

/**
 * Check if user can create/edit a deposition note
 * 
 * Rules:
 * - Only Court Reporters can create/edit notes
 * - Notes are locked when Job.status = COMPLETED or REVIEW_COMPLETE
 * - Attorneys can NEVER access notes
 */
export async function canCreateDepositionNote(
  user: AuthenticatedUser,
  jobId: string
): Promise<PermissionResult> {
  // Attorneys explicitly cannot access
  if (user.role === UserRole.ATTORNEY) {
    return {
      allowed: false,
      reason: 'Attorneys cannot access deposition notes',
      statusCode: 403,
    };
  }

  // Only reporters can create notes
  if (user.role !== UserRole.REPORTER && user.role !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'Only court reporters can create deposition notes',
      statusCode: 403,
    };
  }

  // Check if job exists and user has access
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      createdById: true,
    },
  });

  if (!job) {
    return {
      allowed: false,
      reason: 'Job not found',
      statusCode: 404,
    };
  }

  // Verify job access (creator or admin)
  if (job.createdById !== user.id && user.role !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'You do not have access to this job',
      statusCode: 403,
    };
  }

  // Check if transcript is finalized (notes are locked)
  if (job.status === JobStatus.COMPLETED || job.status === JobStatus.REVIEW_COMPLETE) {
    return {
      allowed: false,
      reason: 'Notes are locked because the transcript is finalized',
      statusCode: 403,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can edit an existing deposition note
 * 
 * Additional check: note must not already be locked
 */
export async function canEditDepositionNote(
  user: AuthenticatedUser,
  noteId: string
): Promise<PermissionResult> {
  const note = await db.depositionNote.findUnique({
    where: { id: noteId },
    include: {
      job: {
        select: {
          id: true,
          status: true,
          createdById: true,
        },
      },
    },
  });

  if (!note) {
    return {
      allowed: false,
      reason: 'Note not found',
      statusCode: 404,
    };
  }

  // Only the reporter who created the note can edit (or admin)
  if (note.reporterId !== user.id && user.role !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'You can only edit your own notes',
      statusCode: 403,
    };
  }

  // Check if note is locked
  if (note.isLocked) {
    return {
      allowed: false,
      reason: 'This note is locked',
      statusCode: 403,
    };
  }

  // Check if job is finalized
  if (note.job.status === JobStatus.COMPLETED || note.job.status === JobStatus.REVIEW_COMPLETE) {
    return {
      allowed: false,
      reason: 'Notes are locked because the transcript is finalized',
      statusCode: 403,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can read/view deposition notes
 * 
 * Rules:
 * - During deposition: Reporter only
 * - After deposition: Reporter + Scopist (if assigned)
 * - Never: Attorneys, paralegals, firms
 */
export async function canReadDepositionNotes(
  user: AuthenticatedUser,
  jobId: string
): Promise<PermissionResult> {
  // Attorneys explicitly cannot access
  if (user.role === UserRole.ATTORNEY) {
    return {
      allowed: false,
      reason: 'Attorneys cannot access deposition notes',
      statusCode: 403,
    };
  }

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      createdById: true,
      assignments: {
        select: {
          scopistId: true,
        },
      },
    },
  });

  if (!job) {
    return {
      allowed: false,
      reason: 'Job not found',
      statusCode: 404,
    };
  }

  // Reporters can always read their own notes
  if (user.role === UserRole.REPORTER || user.role === UserRole.ADMIN) {
    if (job.createdById === user.id || user.role === UserRole.ADMIN) {
      return { allowed: true };
    }
  }

  // Scopists can read after deposition (if assigned)
  if (user.role === UserRole.SCOPIST) {
    const isAssigned = job.assignments.some(a => a.scopistId === user.id);
    if (isAssigned) {
      // Check if deposition is complete (status indicates post-depo)
      const postDepoStatuses: JobStatus[] = [
        JobStatus.ASSIGNED,
        JobStatus.IN_EDIT,
        JobStatus.SUBMITTED_FOR_REVIEW,
        JobStatus.IN_REVIEW,
        JobStatus.SCOPIST_COMPLETE,
        JobStatus.REVIEW_COMPLETE,
        JobStatus.COMPLETED,
      ];
      const isPostDepo = postDepoStatuses.includes(job.status);

      if (isPostDepo) {
        return { allowed: true };
      }
    }
  }

  return {
    allowed: false,
    reason: 'You do not have permission to view deposition notes',
    statusCode: 403,
  };
}

// =============================================================================
// REMOTE MEETING INFO PERMISSIONS
// =============================================================================

/**
 * Check if user can view remote meeting info
 * 
 * Field-level rules:
 * - meetingUrl, meetingId, passcode: Reporter, Attorney, Videographer, Interpreter
 * - hostKey: Reporter only
 * - Entire record: Scopist cannot access
 */
export async function canViewRemoteMeetingInfo(
  user: AuthenticatedUser,
  jobId: string
): Promise<PermissionResult> {
  // Scopists explicitly cannot access meeting info
  if (user.role === UserRole.SCOPIST) {
    return {
      allowed: false,
      reason: 'Scopists cannot access meeting information',
      statusCode: 403,
    };
  }

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      createdById: true,
      firmId: true,
    },
  });

  if (!job) {
    return {
      allowed: false,
      reason: 'Job not found',
      statusCode: 404,
    };
  }

  // Admin can always access
  if (user.role === UserRole.ADMIN) {
    return { allowed: true };
  }

  // Reporters can access their own jobs
  if (user.role === UserRole.REPORTER && job.createdById === user.id) {
    return { allowed: true };
  }

  // Attorneys can access if same firm (simplified - may need calendar event participant check)
  if (user.role === UserRole.ATTORNEY) {
    // For now, allow if job exists (firm check would go here)
    return { allowed: true };
  }

  // Videographer/Interpreter would need participant check (future enhancement)
  // For now, allow reporters and attorneys

  return {
    allowed: false,
    reason: 'You do not have permission to view meeting information',
    statusCode: 403,
  };
}

/**
 * Check if user can view host key (reporter only)
 */
export function canViewHostKey(user: AuthenticatedUser): PermissionResult {
  if (user.role === UserRole.REPORTER || user.role === UserRole.ADMIN) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Host key is only visible to court reporters',
    statusCode: 403,
  };
}

/**
 * Check if user can edit remote meeting info
 * 
 * Only reporters (job creator) can edit
 */
export async function canEditRemoteMeetingInfo(
  user: AuthenticatedUser,
  jobId: string
): Promise<PermissionResult> {
  if (user.role !== UserRole.REPORTER && user.role !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'Only court reporters can edit meeting information',
      statusCode: 403,
    };
  }

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      createdById: true,
    },
  });

  if (!job) {
    return {
      allowed: false,
      reason: 'Job not found',
      statusCode: 404,
    };
  }

  if (job.createdById !== user.id && user.role !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'You can only edit meeting info for your own jobs',
      statusCode: 403,
    };
  }

  return { allowed: true };
}

/**
 * Filter remote meeting info fields based on user role
 * Removes sensitive fields (hostKey) for non-reporters
 */
export function filterRemoteMeetingInfoFields(
  meetingInfo: RemoteMeetingInfo | null,
  user: AuthenticatedUser
): Partial<RemoteMeetingInfo> | null {
  if (!meetingInfo) {
    return null;
  }

  // Reporters and admins can see everything
  if (user.role === UserRole.REPORTER || user.role === UserRole.ADMIN) {
    return meetingInfo;
  }

  // Others can see meeting details but NOT host key
  const { hostKey: _hostKey, coHostKey: _coHostKey, ...publicFields } = meetingInfo;
  return publicFields;
}

// =============================================================================
// DOCUMENT TEMPLATE PERMISSIONS
// =============================================================================

/**
 * Check if user can create/edit document templates
 * 
 * Rules:
 * - Only Admin and Agency Admin can create/edit
 */
export function canCreateEditDocumentTemplate(user: AuthenticatedUser): PermissionResult {
  const allowedRoles: UserRole[] = [
    UserRole.ADMIN,
    UserRole.AGENCY_ADMIN,
  ];

  if (!allowedRoles.includes(user.role)) {
    return {
      allowed: false,
      reason: 'Only administrators can create or edit document templates',
      statusCode: 403,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can select a template for a job
 * 
 * Rules:
 * - Reporters can select templates for their jobs
 */
export async function canSelectTemplateForJob(
  user: AuthenticatedUser,
  jobId: string
): Promise<PermissionResult> {
  if (user.role !== UserRole.REPORTER && user.role !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'Only court reporters can select templates for jobs',
      statusCode: 403,
    };
  }

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      createdById: true,
      status: true,
    },
  });

  if (!job) {
    return {
      allowed: false,
      reason: 'Job not found',
      statusCode: 404,
    };
  }

  if (job.createdById !== user.id && user.role !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'You can only select templates for your own jobs',
      statusCode: 403,
    };
  }

  // Cannot modify templates after transcript is created
  // This check should be done when actually creating snapshot
  // For now, just verify job access

  return { allowed: true };
}

/**
 * Check if user can view document templates
 * 
 * Rules:
 * - Everyone can view (job scoped)
 */
export function canViewDocumentTemplate(_user: AuthenticatedUser): PermissionResult {
  // Everyone authenticated can view templates
  return { allowed: true };
}

/**
 * Check if a template can be modified after transcript is created
 * 
 * Rules:
 * - Templates are forward-applying only
 * - Cannot modify templates that have been snapshotted
 */
export async function canModifyTemplateAfterTranscript(
  templateId: string
): Promise<boolean> {
  // Check if any snapshots exist for this template
  const snapshotCount = await db.documentTemplateSnapshot.count({
    where: { templateId },
  });

  // If snapshots exist, the template has been used and cannot be modified
  // (In practice, we might allow creating a new version, but not modifying existing)
  return snapshotCount === 0;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get allowed fields for RemoteMeetingInfo based on user role
 */
export function getAllowedMeetingFields(user: AuthenticatedUser): string[] {
  const baseFields = [
    'id',
    'jobId',
    'platform',
    'meetingUrl',
    'meetingId',
    'passcode',
    'dialInNumbers',
    'cloudRecordingUrl',
    'cloudRecordingPassword',
    'recordingDownloadedAt',
    'createdAt',
    'updatedAt',
  ];

  // Reporters and admins can see host keys
  if (user.role === UserRole.REPORTER || user.role === UserRole.ADMIN) {
    return [...baseFields, 'hostKey', 'coHostKey'];
  }

  // Others cannot see host keys
  return baseFields;
}