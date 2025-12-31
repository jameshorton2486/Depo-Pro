// =============================================================================
// DEPOSITION NOTES API - Phase 6A
// GET  /api/depositions/[jobId]/notes - List notes
// POST /api/depositions/[jobId]/notes - Create note
// =============================================================================

import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth/session';
import { requireRole, requireAnyRole, assertEditableBeforeFinal } from '@/lib/auth/permissions';
import { UserRole } from '@prisma/client';
import { handleApiError, success, error } from '@/lib/api-response';

// GET /api/depositions/[jobId]/notes - Read notes
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return error('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const { jobId } = await params;

    // Only REPORTER and SCOPIST can read notes
    // Attorneys are explicitly blocked
    if (!requireAnyRole(user.role, [UserRole.REPORTER, UserRole.SCOPIST])) {
      return error('FORBIDDEN', 'Attorneys cannot access deposition notes', 403);
    }

    // Fetch job to check access and status
    const job = await prisma.job.findUnique({
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
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Reporter can always read their own notes
    // Scopist can only read if assigned and job is post-deposition
    if (user.role === UserRole.SCOPIST) {
      const isAssigned = job.assignments.some(a => a.scopistId === user.id);
      if (!isAssigned) {
        return error('FORBIDDEN', 'You are not assigned to this job', 403);
      }
    } else if (user.role === UserRole.REPORTER && job.createdById !== user.id) {
      // Non-admin reporters can only read their own notes
      return error('FORBIDDEN', 'You can only access notes for your own jobs', 403);
    }

    const notes = await prisma.depositionNote.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
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

    return success(notes);
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/depositions/[jobId]/notes - Create note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { jobId } = await params;

    // Only reporters can create notes
    requireRole(user.role, [UserRole.REPORTER, UserRole.ADMIN]);

    // Check if transcript is finalized (via Job status)
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        createdById: true,
        transcripts: {
          select: {
            id: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Verify job access
    if (job.createdById !== user.id && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You can only create notes for your own jobs', 403);
    }

    // Assert transcript is not finalized
    assertEditableBeforeFinal(job.status);

    const body = await req.json();
    const { content, audioTimestamp, noteCategory } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return error('VALIDATION_ERROR', 'Content is required', 400);
    }

    const note = await prisma.depositionNote.create({
      data: {
        jobId,
        reporterId: user.id,
        content: content.trim(),
        audioTimestamp: audioTimestamp ? parseFloat(audioTimestamp) : null,
        noteCategory: noteCategory || null,
        isLocked: false,
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

    return success(note, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'FORBIDDEN') {
        return error('FORBIDDEN', 'You do not have permission to create notes', 403);
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