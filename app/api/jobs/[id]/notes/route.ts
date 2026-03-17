// =============================================================================
// DEPOSITION NOTES API - Phase 6A (Updated for Proper Noun Capture)
// GET  /api/jobs/[id]/notes - List notes (with optional type filter)
// POST /api/jobs/[id]/notes - Create note
// =============================================================================

import type { NextRequest } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { requireAnyRole, isTranscriptFinalized } from '@/lib/auth/permissions';
import { UserRole } from '@/lib/enums/roles';
import { DepositionNoteType, JobStatus } from '@/types/database';
import { handleApiError, success, error } from '@/lib/api-response';
import { listNotesForJob, createNote } from '@/lib/supabase/queries/notes';
import { getJobById, isUserAssignedToJob } from '@/lib/supabase/queries/jobs';
import { getUserById } from '@/lib/supabase/queries/users';
import { getCalendarEventByJobId } from '@/lib/supabase/queries/calendar';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const LOCKED_STATUSES: JobStatus[] = [JobStatus.REVIEW_COMPLETE, JobStatus.COMPLETED];

async function checkReporterJobAccess(reporterId: string, jobId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const job = await getJobById(supabase, jobId);

  if (!job) return false;

  // Check calendar event assignment via query layer
  const calendarEvent = await getCalendarEventByJobId(jobId);

  return (job as any).created_by_id === reporterId || calendarEvent?.assigned_reporter_id === reporterId;
}

async function canViewNotes(user: { id: string; role: string }, job: any, assignments: any[]): Promise<boolean> {
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) return true;
  if (user.role === UserRole.REPORTER && job.created_by_id === user.id) return true;
  if (user.role === UserRole.REPORTER) return await checkReporterJobAccess(user.id, job.id);
  if (user.role === UserRole.SCOPIST) {
    return assignments.some((a: any) => a.scopist_id === user.id && a.status !== 'DECLINED');
  }
  return false; // ATTORNEY - NO ACCESS
}

// GET /api/jobs/[id]/notes - Read notes
const getHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');

    // ADMIN, SUPER_ADMIN, REPORTER, and SCOPIST can read notes
    // Attorneys are explicitly blocked
    if (!requireAnyRole(user.role as UserRole, [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.REPORTER, UserRole.SCOPIST])) {
      return error('FORBIDDEN', 'Attorneys cannot access deposition notes', 403);
    }

    // Fetch job to check access and status using query module
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Get assignments for access check via query layer
    const isAssigned = await isUserAssignedToJob(jobId, user.id);
    const assignments = isAssigned ? [{ scopist_id: user.id, status: 'ACCEPTED' }] : [];

    const hasAccess = await canViewNotes(user, job as any, assignments);
    if (!hasAccess) {
      return error('FORBIDDEN', 'You do not have permission to view notes', 403);
    }

    // Determine type filter
    let noteType: string | undefined;
    // Scopists can ONLY see PROPER_NOUN type notes (for reference during review)
    // Even if they request GENERAL_NOTE or ALL, restrict to PROPER_NOUN
    if (user.role === UserRole.SCOPIST) {
      noteType = DepositionNoteType.PROPER_NOUN;
    } else if (typeFilter && ['PROPER_NOUN', 'GENERAL_NOTE'].includes(typeFilter)) {
      // Reporters and Admins can filter by type if requested
      noteType = typeFilter;
    }

    // Fetch notes using query module
    const notes = await listNotesForJob(supabase, jobId, {
      type: noteType,
      orderBy: 'created_at',
      orderDirection: 'asc',
    });

    // Get reporter info for each note using query module
    const notesWithReporter = await Promise.all(notes.map(async (note: any) => {
      const reporterUser = await getUserById(supabase, note.reporter_id);
      const reporter = reporterUser ? {
        id: reporterUser.id,
        firstName: reporterUser.user_metadata?.firstName || '',
        lastName: reporterUser.user_metadata?.lastName || '',
        email: reporterUser.email || '',
      } : null;

      return {
        ...note,
        jobId: note.job_id,
        reporterId: note.reporter_id,
        audioTimestamp: note.audio_timestamp,
        noteCategory: note.note_category,
        isLocked: note.is_locked,
        createdAt: note.created_at,
        reporter,
      };
    }));

    const isJobFinalized = isTranscriptFinalized((job as any).status);

    // Return in expected format
    return success({
      notes: notesWithReporter.map((note: any) => ({
        ...note,
        isLocked: note.isLocked || isJobFinalized,
      })),
      meta: {
        total: notesWithReporter.length,
        jobStatus: (job as any).status,
        isJobFinalized,
        typeFilter: typeFilter || 'ALL',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
};

// POST /api/jobs/[id]/notes - Create note
const postHandler = async (req: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;

    // Only reporters can create notes (role already checked by withRouteProtection,
    // but we do a stricter check here)
    if (user.role !== UserRole.REPORTER && user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      return error('FORBIDDEN', 'You do not have permission to create notes', 403);
    }

    // Check if transcript is finalized (via Job status)
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Verify job access
    if (user.role === UserRole.REPORTER && (job as any).created_by_id !== user.id) {
      const hasAccess = await checkReporterJobAccess(user.id, jobId);
      if (!hasAccess) {
        return error('FORBIDDEN', 'No access to this job', 403);
      }
    }

    if (LOCKED_STATUSES.includes((job as any).status as JobStatus)) {
      return error('FORBIDDEN', 'Cannot add notes to finalized job', 403);
    }

    const body = await req.json();
    const { content, type, audioTimestamp, noteCategory } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return error('VALIDATION_ERROR', 'Content required', 400);
    }

    const noteType: string = ['PROPER_NOUN', 'GENERAL_NOTE'].includes(type)
      ? (type as string)
      : 'PROPER_NOUN';

    // Create note using query module
    const note = await createNote(supabase, {
      job_id: jobId,
      reporter_id: user.id,
      content: content.trim(),
      type: noteType,
      audio_timestamp: audioTimestamp ? parseFloat(audioTimestamp) : null,
      note_category: noteCategory?.trim() || null,
    });

    // Get reporter info using query module
    const reporterUser = await getUserById(supabase, note.reporter_id);

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
        isLocked: (note as any).is_locked || false,
        createdAt: (note as any).created_at,
        reporter,
      },
      message: 'Note created',
    });
  } catch (err) {
    return handleApiError(err);
  }
};

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.REPORTER, UserRole.SCOPIST], requireFirm: true },
  getHandler,
);

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.REPORTER], requireFirm: true },
  postHandler,
);
