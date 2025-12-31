// =============================================================================
// DEPOSITION NOTES API - Phase 6A (Updated for Proper Noun Capture)
// GET  /api/jobs/[id]/notes - List notes (with optional type filter)
// POST /api/jobs/[id]/notes - Create note
// =============================================================================

import { NextRequest } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth/session';
import { requireRole, requireAnyRole, isTranscriptFinalized } from '@/lib/auth/permissions';
import { UserRole, JobStatus, DepositionNoteType } from '@prisma/client';
import { handleApiError, success, error } from '@/lib/api-response';

const LOCKED_STATUSES: JobStatus[] = [JobStatus.REVIEW_COMPLETE, JobStatus.COMPLETED];

async function checkReporterJobAccess(reporterId: string, jobId: string): Promise<boolean> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      createdById: true,
      calendarEvent: {
        select: {
          assignedReporterId: true,
        },
      },
    },
  });
  if (!job) return false;
  return job.createdById === reporterId || job.calendarEvent?.assignedReporterId === reporterId;
}

async function canViewNotes(user: { id: string; role: UserRole }, job: any): Promise<boolean> {
  if (user.role === UserRole.ADMIN) return true;
  if (user.role === UserRole.REPORTER && job.createdById === user.id) return true;
  if (user.role === UserRole.REPORTER) return await checkReporterJobAccess(user.id, job.id);
  if (user.role === UserRole.SCOPIST) {
    return job.assignments.some((a: any) => a.scopistId === user.id && a.status !== 'DECLINED');
  }
  return false; // ATTORNEY - NO ACCESS
}

// GET /api/jobs/[id]/notes - Read notes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return error('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const { id: jobId } = await params;
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');

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
            status: true,
          },
        },
      },
    });

    if (!job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    const hasAccess = await canViewNotes(user, job);
    if (!hasAccess) {
      return error('FORBIDDEN', 'You do not have permission to view notes', 403);
    }

    const whereClause: any = { jobId };
    
    // Scopists can ONLY see PROPER_NOUN type notes (for reference during review)
    // Even if they request GENERAL_NOTE or ALL, restrict to PROPER_NOUN
    if (user.role === UserRole.SCOPIST) {
      whereClause.type = DepositionNoteType.PROPER_NOUN;
    } else if (typeFilter && ['PROPER_NOUN', 'GENERAL_NOTE'].includes(typeFilter)) {
      // Reporters and Admins can filter by type if requested
      whereClause.type = typeFilter as DepositionNoteType;
    }

    const notes = await prisma.depositionNote.findMany({
      where: whereClause,
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

    const isJobFinalized = isTranscriptFinalized(job.status);

    // Return in expected format
    return success({
      notes: notes.map(note => ({
        ...note,
        isLocked: note.isLocked || isJobFinalized,
      })),
      meta: {
        total: notes.length,
        jobStatus: job.status,
        isJobFinalized,
        typeFilter: typeFilter || 'ALL',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/jobs/[id]/notes - Create note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { id: jobId } = await params;

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
    if (user.role === UserRole.REPORTER && job.createdById !== user.id) {
      const hasAccess = await checkReporterJobAccess(user.id, jobId);
      if (!hasAccess) {
        return error('FORBIDDEN', 'No access to this job', 403);
      }
    }

    if (LOCKED_STATUSES.includes(job.status)) {
      return error('FORBIDDEN', 'Cannot add notes to finalized job', 403);
    }

    const body = await req.json();
    const { content, type, audioTimestamp, noteCategory } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return error('VALIDATION_ERROR', 'Content required', 400);
    }

    const noteType: DepositionNoteType = ['PROPER_NOUN', 'GENERAL_NOTE'].includes(type) 
      ? (type as DepositionNoteType) 
      : DepositionNoteType.PROPER_NOUN;

    const note = await prisma.depositionNote.create({
      data: {
        jobId,
        reporterId: user.id,
        content: content.trim(),
        type: noteType,
        audioTimestamp: audioTimestamp ? parseFloat(audioTimestamp) : null,
        noteCategory: noteCategory?.trim() || null,
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

    return success({
      note,
      message: 'Note created',
    });
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
