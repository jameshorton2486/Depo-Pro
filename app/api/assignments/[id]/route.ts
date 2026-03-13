// Migrated from Prisma to Supabase queries — PASS 2A
// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT API ROUTE - /api/assignments/[id]
// ═══════════════════════════════════════════════════════════════
// PATCH /api/assignments/[id] - Update assignment status
// DELETE /api/assignments/[id] - Remove assignment

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAssignmentById, getJobById, updateJobAssignment, deleteJobAssignment } from '@/lib/supabase/queries/jobs';
import { updateAssignmentSchema } from '@/lib/validations/job';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

// ───────────────────────────────────────────────────────────────
// PATCH /api/assignments/[id] - Update assignment status
// ───────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    // Get assignment
    const assignment = await getAssignmentById(supabase, id);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get job to check permissions
    const job = await getJobById(supabase, assignment.job_id, {
      includeCreatedBy: false,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Scopist can update their own assignments, reporter/admin can update any
    const canUpdate =
      isAdminRole(currentUser.role) ||
      assignment.scopist_id === currentUser.id ||
      job.created_by_id === currentUser.id;

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAssignmentSchema.parse(body);

    // Update assignment with timestamps
    const updateData: Record<string, unknown> = {
      status: validatedData.status,
      notes: validatedData.notes || null,
    };

    if (validatedData.status === 'ACCEPTED' && !assignment.responded_at) {
      updateData.responded_at = new Date().toISOString();
    }

    if (validatedData.status === 'SUBMITTED' && !assignment.submitted_at) {
      updateData.submitted_at = new Date().toISOString();
    }

    const updatedAssignment = await updateJobAssignment(supabase, id, updateData);

    logger.info(`Assignment updated: ${id} to ${validatedData.status} by user ${currentUser.id}`);

    return NextResponse.json(updatedAssignment);

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 },
      );
    }

    logger.error('PATCH /api/assignments/[id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 },
    );
  }
}

// ───────────────────────────────────────────────────────────────
// DELETE /api/assignments/[id] - Remove assignment
// ───────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    // Get assignment
    const assignment = await getAssignmentById(supabase, id);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get job to check permissions
    const job = await getJobById(supabase, assignment.job_id, {
      includeCreatedBy: false,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can delete assignments
    const canDelete =
      isAdminRole(currentUser.role) ||
      job.created_by_id === currentUser.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteJobAssignment(supabase, id);

    logger.info(`Assignment deleted: ${id} by user ${currentUser.id}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('DELETE /api/assignments/[id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 },
    );
  }
}
