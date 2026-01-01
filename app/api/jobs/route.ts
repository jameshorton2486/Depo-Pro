// ═══════════════════════════════════════════════════════════════
// JOB API ROUTES - /api/jobs
// ═══════════════════════════════════════════════════════════════
// GET  /api/jobs - List jobs with filters (🔒 firmId filtered)
// POST /api/jobs - Create new job (🔒 firmId injected)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createJobSchema } from '@/lib/validations/job';
import { logger, withRequestLogging } from '@/lib/observability';
import { createPaginatedResponse } from '@/lib/pagination';
import { checkRateLimit } from '@/lib/security';
import { JobStatus } from '@prisma/client';
import { invalidateDashboardCache } from '@/lib/cache';
import { safePagination, SelectPatterns as _SelectPatterns } from '@/lib/query-optimization';
import { createPricingSnapshot } from '@/lib/services/pricing-snapshot-service';
import { BillingService } from '@/lib/services/billing-service';

// ───────────────────────────────────────────────────────────────
// GET /api/jobs - List jobs with filters
// ───────────────────────────────────────────────────────────────

async function getJobsHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as JobStatus | null;
    const search = searchParams.get('search');
    const pagination = safePagination({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

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

    // Execute query with optimized select
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
        skip: pagination.skip,
        take: pagination.take,
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json(createPaginatedResponse(jobs, total, { page: pagination.page, limit: pagination.limit, skip: pagination.skip }));

  } catch (error) {
    logger.error('GET /api/jobs', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 },
    );
  }
}

export const GET = withRequestLogging(getJobsHandler);

// ───────────────────────────────────────────────────────────────
// POST /api/jobs - Create new job
// ───────────────────────────────────────────────────────────────

async function postJobsHandler(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(session.user.id, 'API_GLOBAL');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Only reporters and admins can create jobs
    if (session.user.role === 'SCOPIST') {
      return NextResponse.json(
        { error: 'Scopists cannot create jobs' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = createJobSchema.parse(body);

    // Get user's firm ID
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { firmId: true },
    });

    if (!user?.firmId) {
      return NextResponse.json(
        { error: 'User must be associated with a firm' },
        { status: 400 },
      );
    }

    // Use job creation service (Phase 1: Domain Enforcement)
    const { createJob } = await import('@/lib/services/job-creation-service');
    
    const result = await createJob({
      ...validatedData,
      firmId: user.firmId,
      createdById: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    // Fetch the created job with relations
    const job = await db.job.findUnique({
      where: { id: result.jobId! },
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

    if (!job) {
      return NextResponse.json(
        { error: 'Job created but not found' },
        { status: 500 },
      );
    }

    logger.info(`Job created: ${job.id} by user ${session.user.id}`);

    // Invalidate dashboard cache after creating a job
    invalidateDashboardCache();

    return NextResponse.json(job, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error },
        { status: 400 },
      );
    }

    logger.error('POST /api/jobs', error as Error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 },
    );
  }
}

export const POST = withRequestLogging(postJobsHandler);
