// ═══════════════════════════════════════════════════════════════
// JOB API ROUTES - /api/jobs/[id]
// ═══════════════════════════════════════════════════════════════
// GET    /api/jobs/[id] - Get single job (🔒 firmId filtered)
// PUT    /api/jobs/[id] - Update job (🔒 firmId filtered)
// DELETE /api/jobs/[id] - Delete job (🔒 firmId filtered)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createJobSchema } from '@/lib/validations/job';
import { logger } from '@/lib/logger';

// ───────────────────────────────────────────────────────────────
// GET /api/jobs/[id] - Get single job
// ───────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const job = await db.job.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        firm: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            scopist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        files: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        transcripts: {
          where: {
            isCurrent: true,
          },
          orderBy: {
            version: 'desc',
          },
        },
        dictionaryTerms: {
          orderBy: {
            term: 'asc',
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Verify access rights
    const hasAccess =
      session.user.role === 'ADMIN' ||
      job.reporterId === session.user.id ||
      (session.user.firmId && job.firmId === session.user.firmId) ||
      job.assignments.some((a) => a.scopistId === session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(job);

  } catch (error) {
    logger.apiError('GET /api/jobs/[id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────────────────────
// PUT /api/jobs/[id] - Update job
// ───────────────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if job exists and user has access
    const existingJob = await db.job.findUnique({
      where: { id },
      select: {
        reporterId: true,
        firmId: true,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can update
    const canUpdate =
      session.user.role === 'ADMIN' ||
      existingJob.reporterId === session.user.id ||
      (session.user.firmId && existingJob.firmId === session.user.firmId);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createJobSchema.parse(body);

    const job = await db.job.update({
      where: { id },
      data: validatedData,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        firm: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Job updated: ${job.id} by user ${session.user.id}`);

    return NextResponse.json(job);

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 }
      );
    }

    logger.apiError('PUT /api/jobs/[id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────────────────────
// DELETE /api/jobs/[id] - Delete job
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

    // Check if job exists and user has access
    const existingJob = await db.job.findUnique({
      where: { id },
      select: {
        reporterId: true,
        firmId: true,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter or admin can delete
    const canDelete =
      session.user.role === 'ADMIN' ||
      existingJob.reporterId === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.job.delete({
      where: { id },
    });

    logger.info(`Job deleted: ${id} by user ${session.user.id}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.apiError('DELETE /api/jobs/[id]', error as Error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
