// =============================================================================
// DEPOSITION NOTE API - Phase 6A
// GET    /api/jobs/[id]/notes/[noteId] - Get single note
// PATCH  /api/jobs/[id]/notes/[noteId] - Update note
// DELETE /api/jobs/[id]/notes/[noteId] - Delete note
// =============================================================================

import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth/session';
import { requireRole, requireAnyRole, assertEditableBeforeFinal } from '@/lib/auth/permissions';
import type { UserRole, DepositionNoteType } from '@/types/database';
import { handleApiError, success, error } from '@/lib/api-response';

// GET /api/jobs/[id]/notes/[noteId] - Get single note
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return error('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const { id: jobId, noteId } = await params;

    // Only REPORTER and SCOPIST can read notes
    if (!requireAnyRole(user.role, [UserRole.REPORTER, UserRole.SCOPIST])) {
      return error('FORBIDDEN', 'Attorneys cannot access deposition notes', 403);
    }

    const supabase = await createSupabaseServerClient();
    
    // Get note with job info
    const { data: note, error: noteError } = await supabase
      .from('deposition_notes')
      .select('id, job_id, reporter_id, content, type, audio_timestamp, note_category, is_locked, created_at')
      .eq('id', noteId)
      .eq('job_id', jobId)
      .single();

    if (noteError || !note) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Get job to check access
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, created_by_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Check assignments for scopist
    if (user.role === UserRole.SCOPIST) {
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('scopist_id')
        .eq('job_id', jobId)
        .eq('scopist_id', user.id);
      
      if (!assignments || assignments.length === 0) {
        return error('FORBIDDEN', 'You are not assigned to this job', 403);
      }
    } else if (user.role === UserRole.REPORTER && job.created_by_id !== user.id) {
      return error('FORBIDDEN', 'You can only access notes for your own jobs', 403);
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
        job: {
          id: job.id,
          status: job.status,
          createdById: job.created_by_id,
        },
        reporter,
      }
    });
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/jobs/[id]/notes/[noteId] - Update note
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { id: jobId, noteId } = await params;

    // Only reporters can edit notes
    requireRole(user.role, [UserRole.REPORTER, UserRole.ADMIN]);

    const supabase = await createSupabaseServerClient();
    
    // Get note
    const { data: note, error: noteError } = await supabase
      .from('deposition_notes')
      .select('id, job_id, reporter_id, is_locked')
      .eq('id', noteId)
      .eq('job_id', jobId)
      .single();

    if (noteError || !note) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Get job status
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Only note creator can edit (or admin)
    if (note.reporter_id !== user.id && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You can only edit your own notes', 403);
    }

    // Check if note is already locked
    if (note.is_locked) {
      return error('FORBIDDEN', 'This note is locked', 403);
    }

    // Assert transcript is not finalized
    assertEditableBeforeFinal(job.status);

    const body = await req.json();
    const { content, type, audioTimestamp, noteCategory } = body;

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return error('VALIDATION_ERROR', 'Content cannot be empty', 400);
      }
    }

    const updateData: any = {};
    if (content !== undefined) updateData.content = content.trim();
    if (type !== undefined && ['PROPER_NOUN', 'GENERAL_NOTE'].includes(type)) {
      updateData.type = type as DepositionNoteType;
    }
    if (audioTimestamp !== undefined) {
      updateData.audio_timestamp = audioTimestamp ? parseFloat(audioTimestamp) : null;
    }
    if (noteCategory !== undefined) {
      updateData.note_category = noteCategory || null;
    }

    const { data: updatedNote, error: updateError } = await supabase
      .from('deposition_notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) {
      console.error('Note update error:', updateError);
      return error('UPDATE_ERROR', 'Failed to update note', 500);
    }

    // Get reporter info
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = getSupabaseAdminClient();
    const { data: reporterData } = await adminClient.auth.admin.getUserById(updatedNote.reporter_id);
    
    const reporter = reporterData?.user ? {
      id: reporterData.user.id,
      firstName: reporterData.user.user_metadata?.firstName || '',
      lastName: reporterData.user.user_metadata?.lastName || '',
      email: reporterData.user.email || '',
    } : null;

    return success({
      note: {
        ...updatedNote,
        jobId: updatedNote.job_id,
        reporterId: updatedNote.reporter_id,
        audioTimestamp: updatedNote.audio_timestamp,
        noteCategory: updatedNote.note_category,
        isLocked: updatedNote.is_locked,
        createdAt: updatedNote.created_at,
        reporter,
      },
      message: 'Note updated successfully',
    });
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

// DELETE /api/jobs/[id]/notes/[noteId] - Delete note
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { id: jobId, noteId } = await params;

    // Only reporters can delete notes
    requireRole(user.role, [UserRole.REPORTER, UserRole.ADMIN]);

    const supabase = await createSupabaseServerClient();
    
    // Get note
    const { data: note, error: noteError } = await supabase
      .from('deposition_notes')
      .select('id, job_id, reporter_id, is_locked')
      .eq('id', noteId)
      .eq('job_id', jobId)
      .single();

    if (noteError || !note) {
      return error('NOT_FOUND', 'Note not found', 404);
    }

    // Get job status
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return error('NOT_FOUND', 'Job not found', 404);
    }

    // Only note creator can delete (or admin)
    if (note.reporter_id !== user.id && user.role !== UserRole.ADMIN) {
      return error('FORBIDDEN', 'You can only delete your own notes', 403);
    }

    // Check if note is locked
    if (note.is_locked) {
      return error('FORBIDDEN', 'This note is locked', 403);
    }

    // Assert transcript is not finalized
    assertEditableBeforeFinal(job.status);

    const { error: deleteError } = await supabase
      .from('deposition_notes')
      .delete()
      .eq('id', noteId);

    if (deleteError) {
      console.error('Note delete error:', deleteError);
      return error('DELETE_ERROR', 'Failed to delete note', 500);
    }

    return success({ message: 'Note deleted successfully' });
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
