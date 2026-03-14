// =============================================================================
// DEPOSITION NOTE API - Phase 6A
// GET    /api/jobs/[id]/notes/[noteId] - Get single note
// PATCH  /api/jobs/[id]/notes/[noteId] - Update note
// DELETE /api/jobs/[id]/notes/[noteId] - Delete note
// =============================================================================

import type { NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { requireAnyRole, assertEditableBeforeFinal } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/enums/roles';
import { handleApiError, success, error } from '@/lib/api-response';
import { getNoteById, updateNote, deleteNote } from '@/lib/supabase/queries/notes';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { getUserById } from '@/lib/supabase/queries/users';

// GET /api/jobs/[id]/notes/[noteId] - Get single note
const getHandler = async (_: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const noteId = params.noteId;

    // Only REPORTER and SCOPIST can read notes
    if (!requireAnyRole(user.role as UserRole, [UserRole.REPORTER, UserRole.SCOPIST])) {
      return error('FORBIDDEN', 'Attorneys cannot access deposition notes', 403);
    }

    // Get note using query module
    const note = await getNoteById(supabase, noteId, jobId);

    if (!note) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Get job to check access using query module
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Check assignments for scopist via query layer
    if (user.role === UserRole.SCOPIST) {
      const isAssigned = await isUserAssignedToJob(jobId, user.id);

      if (!isAssigned) {
        return error('FORBIDDEN', 'You are not assigned to this job', 403);
      }
    } else if (user.role === UserRole.REPORTER && (job as any).created_by_id !== user.id) {
      return error('FORBIDDEN', 'You can only access notes for your own jobs', 403);
    }

    // Get reporter info using query module
    const reporterUser = await getUserById(supabase, (note as any).reporter_id);

    const reporter = reporterUser ? {
      id: reporterUser.id,
      firstName: reporterUser.user_metadata?.firstName || '',
      lastName: reporterUser.user_metadata?.lastName || '',
      email: reporterUser.email || '',
    } : null;

    return success({
      note: {
        ...note,
        jobId: (note as any).job_id,
        reporterId: (note as any).reporter_id,
        audioTimestamp: (note as any).audio_timestamp,
        noteCategory: (note as any).note_category,
        isLocked: (note as any).is_locked,
        createdAt: (note as any).created_at,
        job: {
          id: (job as any).id,
          status: (job as any).status,
          createdById: (job as any).created_by_id,
        },
        reporter,
      }
    });
  } catch (err) {
    return handleApiError(err);
  }
};

// PATCH /api/jobs/[id]/notes/[noteId] - Update note
const patchHandler = async (req: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const noteId = params.noteId;

    // Only reporters can edit notes (stricter check inside handler)
    if (user.role !== UserRole.REPORTER && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You do not have permission to edit notes', 403);
    }

    // Get note using query module
    const note = await getNoteById(supabase, noteId, jobId);

    if (!note) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Get job status using query module
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Only note creator can edit (or admin)
    if ((note as any).reporter_id !== user.id && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You can only edit your own notes', 403);
    }

    // Check if note is already locked
    if ((note as any).is_locked) {
      return error('FORBIDDEN', 'This note is locked', 403);
    }

    // Assert transcript is not finalized
    assertEditableBeforeFinal((job as any).status);

    const body = await req.json();
    const { content, type, audioTimestamp, noteCategory } = body;

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return error('VALIDATION_ERROR', 'Content cannot be empty', 400);
      }
    }

    const updateData: {
      content?: string;
      type?: string;
      audio_timestamp?: number | null;
      note_category?: string | null;
    } = {};
    if (content !== undefined) updateData.content = content.trim();
    if (type !== undefined && ['PROPER_NOUN', 'GENERAL_NOTE'].includes(type)) {
      updateData.type = type as string;
    }
    if (audioTimestamp !== undefined) {
      updateData.audio_timestamp = audioTimestamp ? parseFloat(audioTimestamp) : null;
    }
    if (noteCategory !== undefined) {
      updateData.note_category = noteCategory || null;
    }

    // Update note using query module
    const updatedNote = await updateNote(supabase, noteId, jobId, updateData);

    // Get reporter info using query module
    const reporterUser = await getUserById(supabase, (updatedNote as any).reporter_id);

    const reporter = reporterUser ? {
      id: reporterUser.id,
      firstName: reporterUser.user_metadata?.firstName || '',
      lastName: reporterUser.user_metadata?.lastName || '',
      email: reporterUser.email || '',
    } : null;

    return success({
      note: {
        ...updatedNote,
        jobId: (updatedNote as any).job_id,
        reporterId: (updatedNote as any).reporter_id,
        audioTimestamp: (updatedNote as any).audio_timestamp,
        noteCategory: (updatedNote as any).note_category,
        isLocked: (updatedNote as any).is_locked || false,
        createdAt: (updatedNote as any).created_at,
        reporter,
      },
      message: 'Note updated successfully',
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'TRANSCRIPT_FINALIZED') {
        return error('FORBIDDEN', 'Notes are locked because the transcript is finalized', 403);
      }
    }
    return handleApiError(err);
  }
};

// DELETE /api/jobs/[id]/notes/[noteId] - Delete note
const deleteHandler = async (_: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const noteId = params.noteId;

    // Only reporters can delete notes (stricter check inside handler)
    if (user.role !== UserRole.REPORTER && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You do not have permission to delete notes', 403);
    }

    // Get note using query module
    const note = await getNoteById(supabase, noteId, jobId);

    if (!note) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Get job status using query module
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Only note creator can delete (or admin)
    if ((note as any).reporter_id !== user.id && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You can only delete your own notes', 403);
    }

    // Check if note is locked
    if ((note as any).is_locked) {
      return error('FORBIDDEN', 'This note is locked', 403);
    }

    // Assert transcript is not finalized
    assertEditableBeforeFinal((job as any).status);

    // Delete note using query module
    await deleteNote(supabase, noteId, jobId);

    return success({ message: 'Note deleted successfully' });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'TRANSCRIPT_FINALIZED') {
        return error('FORBIDDEN', 'Notes are locked because the transcript is finalized', 403);
      }
    }
    return handleApiError(err);
  }
};

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.REPORTER, UserRole.SCOPIST], requireFirm: true },
  getHandler,
);

export const PATCH = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.REPORTER], requireFirm: true },
  patchHandler,
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.REPORTER], requireFirm: true },
  deleteHandler,
);
