// =============================================================================
// DEPOSITION NOTES API - Phase 6A (Updated for Proper Noun Capture)
// GET  /api/jobs/[id]/notes - List notes (with optional type filter)
// POST /api/jobs/[id]/notes - Create note
// =============================================================================

import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth/session';
import { requireRole, requireAnyRole, isTranscriptFinalized } from '@/lib/auth/permissions';
import type { UserRole, JobStatus, DepositionNoteType } from '@/types/database';
import { handleApiError, success, error } from '@/lib/api-response';

const LOCKED_STATUSES: JobStatus[] = [JobStatus.REVIEW_COMPLETE, JobStatus.COMPLETED];

async function checkReporterJobAccess(reporterId: string, jobId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: job } = await supabase
    .from('jobs')
    .select('id, created_by_id')
    .eq('id', jobId)
    .single();
  
  if (!job) return false;
  
  // Check calendar event assignment
  const { data: calendarEvent } = await supabase
    .from('calendar_events')
    .select('assigned_reporter_id')
    .eq('job_id', jobId)
    .single();
  
  return job.created_by_id === reporterId || calendarEvent?.assigned_reporter_id === reporterId;
}

async function canViewNotes(user: { id: string; role: UserRole }, job: any, assignments: any[]): Promise<boolean> {
  if (user.role === UserRole.ADMIN) return true;
  if (user.role === UserRole.REPORTER && job.created_by_id === user.id) return true;
  if (user.role === UserRole.REPORTER) return await checkReporterJobAccess(user.id, job.id);
  if (user.role === UserRole.SCOPIST) {
    return assignments.some((a: any) => a.scopist_id === user.id && a.status !== 'DECLINED');
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
    const supabase = await createSupabaseServerClient();
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, created_by_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Get assignments
    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('scopist_id, status')
      .eq('job_id', jobId);

    const hasAccess = await canViewNotes(user, job, assignments || []);
    if (!hasAccess) {
      return error('FORBIDDEN', 'You do not have permission to view notes', 403);
    }

    // Build query
    let notesQuery = supabase
      .from('deposition_notes')
      .select('*')
      .eq('job_id', jobId);
    
    // Scopists can ONLY see PROPER_NOUN type notes (for reference during review)
    // Even if they request GENERAL_NOTE or ALL, restrict to PROPER_NOUN
    if (user.role === UserRole.SCOPIST) {
      notesQuery = notesQuery.eq('type', DepositionNoteType.PROPER_NOUN);
    } else if (typeFilter && ['PROPER_NOUN', 'GENERAL_NOTE'].includes(typeFilter)) {
      // Reporters and Admins can filter by type if requested
      notesQuery = notesQuery.eq('type', typeFilter);
    }

    const { data: notes, error: notesError } = await notesQuery
      .order('created_at', { ascending: true });

    if (notesError) {
      console.error('Notes fetch error:', notesError);
      return error('FETCH_ERROR', 'Failed to fetch notes', 500);
    }

    // Get reporter info for each note
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = getSupabaseAdminClient();
    const notesWithReporter = await Promise.all((notes || []).map(async (note: any) => {
      const { data: reporterData } = await adminClient.auth.admin.getUserById(note.reporter_id);
      const reporter = reporterData?.user ? {
        id: reporterData.user.id,
        firstName: reporterData.user.user_metadata?.firstName || '',
        lastName: reporterData.user.user_metadata?.lastName || '',
        email: reporterData.user.email || '',
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

    const isJobFinalized = isTranscriptFinalized(job.status);

    // Return in expected format
    return success({
      notes: notesWithReporter.map(note => ({
        ...note,
        isLocked: note.isLocked || isJobFinalized,
      })),
      meta: {
        total: notesWithReporter.length,
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
    const supabase = await createSupabaseServerClient();
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, created_by_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Verify job access
    if (user.role === UserRole.REPORTER && job.created_by_id !== user.id) {
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

    const { data: note, error: noteError } = await supabase
      .from('deposition_notes')
      .insert({
        job_id: jobId,
        reporter_id: user.id,
        content: content.trim(),
        type: noteType,
        audio_timestamp: audioTimestamp ? parseFloat(audioTimestamp) : null,
        note_category: noteCategory?.trim() || null,
        is_locked: false,
      })
      .select()
      .single();

    if (noteError) {
      console.error('Note creation error:', noteError);
      return error('CREATE_ERROR', 'Failed to create note', 500);
    }

    // Get reporter info
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = getSupabaseAdminClient();
    const { data: reporterData } = await adminClient.auth.admin.getUserById(note.reporter_id);
    
    const reporter = reporterData?.user ? {
      id: reporterData.user.id,
      firstName: reporterData.user.user_metadata?.firstName || '',
      lastName: reporterData.user.user_metadata?.lastName || '',
      email: reporterData.user.email || '',
    } : null;

    return success({
      note: {
        ...note,
        jobId: note.job_id,
        reporterId: note.reporter_id,
        audioTimestamp: note.audio_timestamp,
        noteCategory: note.note_category,
        isLocked: note.is_locked,
        createdAt: note.created_at,
        reporter,
      },
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
