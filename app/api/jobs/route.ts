// =============================================================================
// JOBS API
// app/api/jobs/route.ts
//
// Create and list jobs
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/jobs
 * List jobs (filtered by user role)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    // Build where clause based on role
    const where: any = {};

    if (user.role === 'REPORTER') {
      where.createdById = user.id;
    } else if (user.role === 'SCOPIST') {
      where.scopistId = user.id;
    }
    // Admin can see all

    const jobs = await db.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        assignments: {
          where: { status: 'ACCEPTED' },
          include: {
            scopist: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs
 * Create a new job
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };

    // Only reporters and admins can create jobs
    if (user.role !== 'REPORTER' && user.role !== 'COURT_REPORTER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { caseName, title, depositionDate } = body;

    // Get user's firm ID (required for job creation)
    const userRecord = await db.user.findUnique({
      where: { id: user.id },
      select: { firmId: true },
    });

    if (!userRecord?.firmId) {
      return NextResponse.json(
        { error: 'User must be associated with a firm' },
        { status: 400 }
      );
    }

    // Use job creation service if available, otherwise create directly
    try {
      const { createJob } = await import('@/lib/services/job-creation-service');
      
      const result = await createJob({
        caseName: caseName || title,
        title: title || caseName,
        depositionDate: depositionDate ? new Date(depositionDate) : new Date(),
        firmId: userRecord.firmId,
        createdById: user.id,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      const job = await db.job.findUnique({
        where: { id: result.jobId! },
      });

      return NextResponse.json({
        id: job!.id,
        success: true,
        message: 'Job created successfully',
      });
    } catch (_err) {
      // Fallback to direct creation if service not available
      const job = await db.job.create({
        data: {
          caseName: caseName || title,
          title: title || caseName,
          depositionDate: depositionDate ? new Date(depositionDate) : new Date(),
          status: 'CREATED',
          createdById: user.id,
          firmId: userRecord.firmId,
        },
      });

      return NextResponse.json({
        id: job.id,
        success: true,
        message: 'Job created successfully',
      });
    }
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
