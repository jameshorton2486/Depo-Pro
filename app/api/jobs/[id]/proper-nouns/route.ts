// ═══════════════════════════════════════════════════════════════
// PROPER NOUNS API ROUTE
// app/api/jobs/[id]/proper-nouns/route.ts
//
// Manages CSRProperNoun entries for a job's CSRRecord
// Used by the Live Notes Capture feature during depositions
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProperNounCategory } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ═══════════════════════════════════════════════════════════════
// GET - List all proper nouns for a job
// ═══════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;

    // Find the job and verify access
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        firmId: true,
        csrRecord: {
          select: {
            id: true,
            properNouns: {
              orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
              ],
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access: admin, job owner, or same firm
    const user = session.user as any;
    const hasAccess =
      user.role === 'ADMIN' ||
      job.createdById === user.id ||
      (job.firmId && job.firmId === user.firmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return proper nouns (or empty array if no CSRRecord)
    const properNouns = job.csrRecord?.properNouns || [];

    return NextResponse.json({
      properNouns,
      csrRecordId: job.csrRecord?.id || null,
      count: properNouns.length,
    });

  } catch (error) {
    console.error('Error fetching proper nouns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proper nouns' },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// POST - Create a new proper noun
// ═══════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body = await request.json();

    const {
      value,
      category = 'OTHER',
      phoneticHint,
      source,
      useInTranscription = true,
      priority = 0,
    } = body;

    // Validate required fields
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return NextResponse.json(
        { error: 'Value is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    // Validate category
    const validCategories: ProperNounCategory[] = [
      'PERSON_NAME',
      'COMPANY_NAME',
      'PLACE_NAME',
      'PRODUCT_NAME',
      'LEGAL_TERM',
      'MEDICAL_TERM',
      'TECHNICAL_TERM',
      'ACRONYM',
      'OTHER',
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 },
      );
    }

    // Find the job and verify access
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        firmId: true,
        csrRecord: {
          select: { id: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access
    const user = session.user as any;
    const hasAccess =
      user.role === 'ADMIN' ||
      job.createdById === user.id ||
      (job.firmId && job.firmId === user.firmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Ensure CSRRecord exists, create if not
    let csrRecordId = job.csrRecord?.id;

    if (!csrRecordId) {
      // Need to fetch more job data to create CSRRecord
      const fullJob = await db.job.findUnique({
        where: { id: jobId },
        select: {
          depositionDate: true,
          caseName: true,
          caseNumber: true,
          location: true,
        },
      });

      if (!fullJob) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      // Create a CSRRecord with required fields from job
      const newCsrRecord = await db.cSRRecord.create({
        data: {
          jobId: jobId,
          depositionDate: fullJob.depositionDate,
          caseCaption: fullJob.caseName || 'Untitled Case',
          causeNumber: fullJob.caseNumber,
          locationAddress: fullJob.location,
        },
      });
      csrRecordId = newCsrRecord.id;
    }

    // Check for duplicate
    const existing = await db.cSRProperNoun.findUnique({
      where: {
        csrRecordId_value: {
          csrRecordId,
          value: value.trim(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This term already exists for this job' },
        { status: 409 },
      );
    }

    // Create the proper noun
    const properNoun = await db.cSRProperNoun.create({
      data: {
        csrRecordId,
        value: value.trim(),
        category: category as ProperNounCategory,
        phoneticHint: phoneticHint?.trim() || null,
        source: source || 'manual_entry',
        useInTranscription,
        priority,
      },
    });

    return NextResponse.json({
      success: true,
      properNoun,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating proper noun:', error);
    return NextResponse.json(
      { error: 'Failed to create proper noun' },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// DELETE - Bulk delete proper nouns
// ═══════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'No IDs provided for deletion' },
        { status: 400 },
      );
    }

    // Find the job and verify access
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        firmId: true,
        csrRecord: {
          select: { id: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check access
    const user = session.user as any;
    const hasAccess =
      user.role === 'ADMIN' ||
      job.createdById === user.id ||
      (job.firmId && job.firmId === user.firmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!job.csrRecord) {
      return NextResponse.json({ error: 'No CSR record for this job' }, { status: 404 });
    }

    // Delete the proper nouns
    const result = await db.cSRProperNoun.deleteMany({
      where: {
        id: { in: ids },
        csrRecordId: job.csrRecord.id,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });

  } catch (error) {
    console.error('Error deleting proper nouns:', error);
    return NextResponse.json(
      { error: 'Failed to delete proper nouns' },
      { status: 500 },
    );
  }
}
