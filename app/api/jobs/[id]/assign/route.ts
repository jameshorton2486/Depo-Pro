// ═══════════════════════════════════════════════════════════════
// JOB ASSIGNMENT API ROUTE - /api/jobs/[id]/assign
// ═══════════════════════════════════════════════════════════════
// POST /api/jobs/[id]/assign - Assign scopist to job

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assignScopistSchema } from '@/lib/validations/job';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // Check if job exists and user has access
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        createdById: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can assign scopists
    const canAssign =
      session.user.role === 'ADMIN' ||
      job.createdById === session.user.id;

    if (!canAssign) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = assignScopistSchema.parse(body);

    // Check if scopist exists
    const scopist = await db.user.findUnique({
      where: { id: validatedData.scopistId },
      select: {
        role: true,
      },
    });

    if (!scopist || scopist.role !== 'SCOPIST') {
      return NextResponse.json(
        { error: 'Invalid scopist' },
        { status: 400 },
      );
    }

    // Check if assignment already exists
    const existingAssignment = await db.jobAssignment.findFirst({
      where: {
        jobId,
        scopistId: validatedData.scopistId,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Scopist already assigned to this job' },
        { status: 400 },
      );
    }

    // Create assignment
    const assignment = await db.jobAssignment.create({
      data: {
        jobId,
        scopistId: validatedData.scopistId,
        status: 'INVITED',
        scopistNotes: validatedData.notes,
      },
      include: {
        scopist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Assignment created: ${assignment.id} for job ${jobId} by user ${session.user.id}`);

    return NextResponse.json(assignment, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 },
      );
    }

    logger.error('POST /api/jobs/[id]/assign', error as Error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 },
    );
  }
}
