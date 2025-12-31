// =============================================================================
// DEPOSITION NOTE API - Phase 6A
// GET    /api/depositions/[jobId]/notes/[noteId] - Get single note
// PATCH  /api/depositions/[jobId]/notes/[noteId] - Update note
// DELETE /api/depositions/[jobId]/notes/[noteId] - Delete note
// =============================================================================

import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth/session';
import { requireRole, requireAnyRole, assertEditableBeforeFinal } from '@/lib/auth/permissions';
import { UserRole } from '@prisma/client';
import { handleApiError, success, error } from '@/lib/api-response';

// GET /api/depositions/[jobId]/notes/[noteId] - Get single note
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ jobId: string; noteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return error('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const { jobId, noteId } = await params;

    // Only REPORTER and SCOPIST can read notes
    if (!requireAnyRole(user.role, [UserRole.REPORTER, UserRole.SCOPIST])) {
      return error('FORBIDDEN', 'Attorneys cannot access deposition notes', 403);
    }

    const note = await prisma.depositionNote.findUnique({
      where: { id: noteId },
      include: {
        job: {
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
        },
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!note || note.jobId !== jobId) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Verify access
    if (user.role === UserRole.SCOPIST) {
      const isAssigned = note.job.assignments.some(a => a.scopistId === user.id);
      if (!isAssigned) {
        return error('FORBIDDEN', 'You are not assigned to this job', 403);
      }
    } else if (user.role === UserRole.REPORTER && note.job.createdById !== user.id) {
      return error('FORBIDDEN', 'You can only access notes for your own jobs', 403);
    }

    return success(note);
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/depositions/[jobId]/notes/[noteId] - Update note
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; noteId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { jobId, noteId } = await params;

    // Only reporters can edit notes
    requireRole(user.role, [UserRole.REPORTER, UserRole.ADMIN]);

    const note = await prisma.depositionNote.findUnique({
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

    if (!note || note.jobId !== jobId) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Only note creator can edit (or admin)
    if (note.reporterId !== user.id && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You can only edit your own notes', 403);
    }

    // Check if note is already locked
    if (note.isLocked) {
      return error('FORBIDDEN', 'This note is locked', 403);
    }

    // Assert transcript is not finalized
    assertEditableBeforeFinal(note.job.status);

    const body = await req.json();
    const { content, audioTimestamp, noteCategory } = body;

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return error('VALIDATION_ERROR', 'Content cannot be empty', 400);
      }
    }

    const updatedNote = await prisma.depositionNote.update({
      where: { id: noteId },
      data: {
        ...(content !== undefined && { content: content.trim() }),
        ...(audioTimestamp !== undefined && {
          audioTimestamp: audioTimestamp ? parseFloat(audioTimestamp) : null,
        }),
        ...(noteCategory !== undefined && { noteCategory: noteCategory || null }),
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return success(updatedNote);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'FORBIDDEN') {
        return error('FORBIDDEN', 'You do not have permission to edit notes', 403);
      }
      if (err.message === 'TRANSCRIPT_FINALIZED') {
        return error('FORBIDDEN', 'Notes are locked because the transcript is finalized', 403);
      }
      if (err.message === 'UNAUTHENTICATED') {
        return error('UNAUTHENTICATED', 'Authentication required', 401);
      }
    }
    return handleApiError(err);
  }
}

// DELETE /api/depositions/[jobId]/notes/[noteId] - Delete note
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ jobId: string; noteId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { jobId, noteId } = await params;

    // Only reporters can delete notes
    requireRole(user.role, [UserRole.REPORTER, UserRole.ADMIN]);

    const note = await prisma.depositionNote.findUnique({
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

    if (!note || note.jobId !== jobId) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Only note creator can delete (or admin)
    if (note.reporterId !== user.id && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You can only delete your own notes', 403);
    }

    // Check if note is locked
    if (note.isLocked) {
      return error('FORBIDDEN', 'This note is locked', 403);
    }

    // Assert transcript is not finalized
    assertEditableBeforeFinal(note.job.status);

    await prisma.depositionNote.delete({
      where: { id: noteId },
    });

    return success({ deleted: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'FORBIDDEN') {
        return error('FORBIDDEN', 'You do not have permission to delete notes', 403);
      }
      if (err.message === 'TRANSCRIPT_FINALIZED') {
        return error('FORBIDDEN', 'Notes are locked because the transcript is finalized', 403);
      }
      if (err.message === 'UNAUTHENTICATED') {
        return error('UNAUTHENTICATED', 'Authentication required', 401);
      }
    }
    return handleApiError(err);
  }
}