// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT API ROUTE - /api/assignments/[id]
// ═══════════════════════════════════════════════════════════════
// PATCH /api/assignments/[id] - Update assignment status
// DELETE /api/assignments/[id] - Remove assignment

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateAssignmentSchema } from '@/lib/validations/job';
import { logger } from '@/lib/logger';

// ───────────────────────────────────────────────────────────────
// PATCH /api/assignments/[id] - Update assignment status
// ───────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get assignment with job details
    const assignment = await db.assignment.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // 🔒 Security: Scopist can update their own assignments, reporter/admin can update any
    const job = assignment.job as any;
    const canUpdate =
      session.user.role === 'ADMIN' ||
      assignment.scopist_id === session.user.id ||
      (job?.created_by_id === session.user.id);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAssignmentSchema.parse(body);

    // Update assignment with timestamps
    const updateData: {
      status?: string;
      notes?: string | null;
      responded_at?: Date | null;
      submitted_at?: Date | null;
    } = {
      status: validatedData.status,
      notes: validatedData.notes || null,
      responded_at: assignment.responded_at,
      submitted_at: assignment.submitted_at,
    };

    if (validatedData.status === 'ACCEPTED' && !assignment.responded_at) {
      updateData.responded_at = new Date();
    }

    if (validatedData.status === 'SUBMITTED' && !assignment.submitted_at) {
      updateData.submitted_at = new Date();
    }

    const updatedAssignment = await db.assignment.update({
      where: { id },
      data: {
        status: validatedData.status,
        notes: validatedData.notes || null,
        responded_at: updateData.responded_at,
        submitted_at: updateData.submitted_at,
      },
    });

    logger.info(`Assignment updated: ${id} to ${validatedData.status} by user ${session.user.id}`);

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
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get assignment with job details
    const assignment = await db.assignment.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can delete assignments
    const job = assignment.job as any;
    const canDelete =
      session.user.role === 'ADMIN' ||
      (job?.created_by_id === session.user.id);

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.assignment.delete({ where: { id } });

    logger.info(`Assignment deleted: ${id} by user ${session.user.id}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('DELETE /api/assignments/[id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 },
    );
  }
}
