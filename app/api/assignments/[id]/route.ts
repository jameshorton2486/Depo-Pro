// Migrated from Prisma to Supabase queries — PASS 2A
// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT API ROUTE - /api/assignments/[id]
// ═══════════════════════════════════════════════════════════════
// PATCH /api/assignments/[id] - Update assignment status
// DELETE /api/assignments/[id] - Remove assignment

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { getAssignmentById, getJobById, updateJobAssignment, deleteJobAssignment } from '@/lib/supabase/queries/jobs';
import { updateAssignmentSchema } from '@/lib/validations/job';
import { logger } from '@/lib/logger';
import { isAdminRole } from '@/lib/admin';

// ───────────────────────────────────────────────────────────────
// PATCH /api/assignments/[id] - Update assignment status
// ───────────────────────────────────────────────────────────────

const patchHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const id = params.id;

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

    // Security: Scopist can update their own assignments, reporter/admin can update any
    const canUpdate =
      isAdminRole(user.role) ||
      assignment.scopist_id === user.id ||
      job.created_by_id === user.id;

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

    logger.info(`Assignment updated: ${id} to ${validatedData.status} by user ${user.id}`);

    return NextResponse.json(updatedAssignment);

  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: err },
        { status: 400 },
      );
    }

    logger.error('PATCH /api/assignments/[id]', err as Error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 },
    );
  }
};

// ───────────────────────────────────────────────────────────────
// DELETE /api/assignments/[id] - Remove assignment
// ───────────────────────────────────────────────────────────────

const deleteHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const id = params.id;

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

    // Security: Only reporter or admin can delete assignments
    const canDelete =
      isAdminRole(user.role) ||
      job.created_by_id === user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteJobAssignment(supabase, id);

    logger.info(`Assignment deleted: ${id} by user ${user.id}`);

    return NextResponse.json({ success: true });

  } catch (err) {
    logger.error('DELETE /api/assignments/[id]', err as Error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 },
    );
  }
};

const ASSIGNMENT_ROLES = [
  UserRole.ADMIN,
  UserRole.COURT_REPORTER,
  UserRole.REPORTER,
  UserRole.SCOPIST,
  UserRole.AGENCY_OWNER,
  UserRole.AGENCY_MANAGER,
];

export const PATCH = withRouteProtection(
  { requireAuth: true, requireRole: ASSIGNMENT_ROLES, requireFirm: true },
  patchHandler,
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER], requireFirm: true },
  deleteHandler,
);
