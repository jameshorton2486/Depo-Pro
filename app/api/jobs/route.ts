// ═══════════════════════════════════════════════════════════════
// JOB API ROUTES - /api/jobs
// ═══════════════════════════════════════════════════════════════
// GET  /api/jobs - List jobs with filters (🔒 firmId filtered)
// POST /api/jobs - Create new job (🔒 firmId injected)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createJobSchema } from '@/lib/validations/job';
import { logger } from '@/lib/logger';
import { JobStatus } from '@prisma/client';

// ───────────────────────────────────────────────────────────────
// GET /api/jobs - List jobs with filters
// ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as JobStatus | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // 🔒 Multi-tenant security: Build where clause based on role
    const where: Record<string, unknown> = {};
    
    if (session.user.role === 'REPORTER') {
      // Reporter sees only their jobs
      where.createdById = session.user.id;
    } else if (session.user.role === 'SCOPIST') {
      // Scopist sees jobs assigned to them
      where.assignments = {
        some: {
          scopistId: session.user.id,
        },
      };
    }

    // Add filters
    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { caseName: { contains: search, mode: 'insensitive' } },
        { caseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute query
    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignments: {
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
          },
          _count: {
            select: {
              files: true,
              transcripts: true,
            },
          },
        },
        orderBy: {
          depositionDate: 'desc',
        },
        skip,
        take: limit,
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    logger.error('GET /api/jobs', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// ───────────────────────────────────────────────────────────────
// POST /api/jobs - Create new job
// ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only reporters and admins can create jobs
    if (session.user.role === 'SCOPIST') {
      return NextResponse.json(
        { error: 'Scopists cannot create jobs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createJobSchema.parse(body);

    // 🔒 Security: Inject createdById
    const job = await db.job.create({
      data: {
        ...validatedData,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Job created: ${job.id} by user ${session.user.id}`);

    return NextResponse.json(job, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 }
      );
    }

    logger.error('POST /api/jobs', error as Error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
