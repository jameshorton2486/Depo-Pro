import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProperNounCategory } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/[id]/proper-nouns
 * List all CSRProperNoun entries for a job
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const user = session.user as { id: string; role: string };

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        assignments: { 
          select: { 
            scopistId: true, 
            status: true 
          } 
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Permission: Reporter (own), Scopist (assigned), Admin
    const canAccess = checkAccess(user, job);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get CSRRecord with proper nouns
    const csrRecord = await db.cSRRecord.findUnique({
      where: { jobId },
      include: {
        properNouns: {
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    return NextResponse.json({
      properNouns: csrRecord?.properNouns || [],
    });
  } catch (error) {
    console.error('Error fetching proper nouns:', error);
    return NextResponse.json({ error: 'Failed to fetch proper nouns' }, { status: 500 });
  }
}

/**
 * POST /api/jobs/[id]/proper-nouns
 * Create a new CSRProperNoun entry
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const user = session.user as { id: string; role: string };
    const body = await request.json();

    // Only reporters and admins can create proper nouns
    if (user.role !== 'REPORTER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only reporters can add proper nouns' }, { status: 403 });
    }

    // Verify job access
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (user.role === 'REPORTER' && job.createdById !== user.id) {
      return NextResponse.json({ error: 'You can only add nouns to your own jobs' }, { status: 403 });
    }

    // Validate input
    const { value, category, phoneticHint, priority } = body;
    if (!value || typeof value !== 'string' || !value.trim()) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 });
    }

    if (!category || !Object.values(ProperNounCategory).includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Get or create CSRRecord
    let csrRecord = await db.cSRRecord.findUnique({
      where: { jobId },
    });

    if (!csrRecord) {
      // Create CSRRecord with minimal required fields
      const jobDetails = await db.job.findUnique({
        where: { id: jobId },
        select: { depositionDate: true, caseName: true },
      });

      csrRecord = await db.cSRRecord.create({
        data: {
          jobId,
          depositionDate: jobDetails?.depositionDate || new Date(),
          caseCaption: jobDetails?.caseName || 'Untitled Case',
        },
      });
    }

    // Check for duplicate
    const existing = await db.cSRProperNoun.findUnique({
      where: {
        csrRecordId_value: {
          csrRecordId: csrRecord.id,
          value: value.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'This proper noun already exists' }, { status: 409 });
    }

    // Create proper noun
    const properNoun = await db.cSRProperNoun.create({
      data: {
        csrRecordId: csrRecord.id,
        value: value.trim(),
        category: category as ProperNounCategory,
        phoneticHint: phoneticHint?.trim() || null,
        priority: priority || 0,
        useInTranscription: true,
      },
    });

    return NextResponse.json({ properNoun }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating proper noun:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This proper noun already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create proper noun' }, { status: 500 });
  }
}

function checkAccess(user: { id: string; role: string }, job: any): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'REPORTER' && job.createdById === user.id) return true;
  if (user.role === 'SCOPIST') {
    return job.assignments.some((a: any) => a.scopistId === user.id && a.status !== 'DECLINED');
  }
  return false;
}
