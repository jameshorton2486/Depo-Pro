// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT API ROUTE - /api/assignments/[id]
// ═══════════════════════════════════════════════════════════════
// PATCH /api/assignments/[id] - Update assignment status
// DELETE /api/assignments/[id] - Remove assignment

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateAssignmentSchema } from '@/lib/validations/job';
import { logger } from '@/lib/logger';

// ───────────────────────────────────────────────────────────────
// PATCH /api/assignments/[id] - Update assignment status
// ───────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get assignment with job details
    const assignment = await db.jobAssignment.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // 🔒 Security: Scopist can update their own assignments, reporter/admin can update any
    const canUpdate =
      session.user.role === 'ADMIN' ||
      assignment.scopistId === session.user.id ||
      assignment.job.createdById === session.user.id;

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAssignmentSchema.parse(body);

    // Update assignment with timestamps
    const updateData: Record<string, unknown> = {
      status: validatedData.status,
      notes: validatedData.notes,
    };

    if (validatedData.status === 'ACCEPTED' && !assignment.respondedAt) {
      updateData.respondedAt = new Date();
    }

    if (validatedData.status === 'SUBMITTED' && !assignment.submittedAt) {
      updateData.submittedAt = new Date();
    }

    const updatedAssignment = await db.jobAssignment.update({
      where: { id },
      data: updateData,
      include: {
        scopist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    logger.info(`Assignment updated: ${id} to ${validatedData.status} by user ${session.user.id}`);

    return NextResponse.json(updatedAssignment);

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 }
      );
    }

    logger.apiError('PATCH /api/assignments/[id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────────────────────
// DELETE /api/assignments/[id] - Remove assignment
// ───────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get assignment with job details
    const assignment = await db.jobAssignment.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can delete assignments
    const canDelete =
      session.user.role === 'ADMIN' ||
      assignment.job.createdById === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.jobAssignment.delete({
      where: { id },
    });

    logger.info(`Assignment deleted: ${id} by user ${session.user.id}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.apiError('DELETE /api/assignments/[id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
