// ═══════════════════════════════════════════════════════════════
// DICTIONARY API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { TermCategory } from '@prisma/client';
import { z } from 'zod';

const createTermSchema = z.object({
  term: z.string().min(1, 'Term is required').max(200),
  phonetic: z.string().optional(),
  notes: z.string().optional(),
  category: z.enum(['MEDICAL', 'LEGAL', 'TECHNICAL', 'NAME', 'PLACE', 'OTHER']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // 🔍 Fetch job with access check
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        firmId: true,
        reporterId: true,
        assignments: {
          select: {
            scopistId: true,
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 📖 Fetch dictionary terms with optional filtering
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category') as TermCategory | null;
    const search = searchParams.get('search');

    const terms = await db.jobDictionaryTerm.findMany({
      where: {
        jobId,
        ...(categoryParam && { category: categoryParam }),
        ...(search && {
          OR: [
            { term: { contains: search } },
            { notes: { contains: search } },
          ],
        }),
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        term: 'asc',
      },
    });

    return NextResponse.json({ terms }, { status: 200 });
  } catch (error) {
    console.error('Fetch dictionary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dictionary terms' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    // 🔍 Fetch job with access check
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        firmId: true,
        reporterId: true,
        assignments: {
          select: {
            scopistId: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 🔒 Security: Only reporter, assigned scopists, or admin can add terms
    const canAdd =
      session.user.role === 'ADMIN' ||
      job.reporterId === session.user.id ||
      job.assignments.some((a) => a.scopistId === session.user.id);

    if (!canAdd) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ✅ Validate request body
    const body = await request.json();
    const validation = createTermSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { term, phonetic, notes, category } = validation.data;

    // 📝 Create dictionary term
    const dictionaryTerm = await db.jobDictionaryTerm.create({
      data: {
        jobId,
        term,
        phonetic,
        notes,
        category,
        addedById: session.user.id,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ term: dictionaryTerm }, { status: 201 });
  } catch (error) {
    console.error('Create dictionary term error:', error);
    return NextResponse.json(
      { error: 'Failed to create dictionary term' },
      { status: 500 }
    );
  }
}
