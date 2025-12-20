// app/api/jobs/[id]/status/route.ts
// API route for updating job status

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status is a valid JobStatus enum value
    const validStatuses: JobStatus[] = [
      'CREATED',
      'FILES_UPLOADED',
      'ENHANCING_AUDIO',
      'TRANSCRIBING',
      'AI_REVIEWING',
      'READY_FOR_EDIT',
      'ASSIGNED',
      'IN_EDIT',
      'SUBMITTED_FOR_REVIEW',
      'IN_REVIEW',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status as JobStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    // Get job to check permissions
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        assignments: {
          where: {
            scopistId: session.user.id,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = job.createdById === session.user.id;
    const isAssignedScopist = job.assignments.length > 0;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAssignedScopist && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update job status
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: status as JobStatus,
        updatedAt: new Date(),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (error) {
    console.error('Job status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 },
    );
  }
}

