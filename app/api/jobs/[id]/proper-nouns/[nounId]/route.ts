import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProperNounCategory } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string; nounId: string }>;
}

/**
 * GET /api/jobs/[id]/proper-nouns/[nounId]
 * Get a single proper noun
 */
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, nounId } = await context.params;

    // Find the proper noun with job verification
    const properNoun = await db.cSRProperNoun.findUnique({
      where: { id: nounId },
      include: {
        csrRecord: {
          select: {
            job: {
              select: {
                id: true,
                createdById: true,
                firmId: true,
              },
            },
          },
        },
      },
    });

    if (!properNoun || properNoun.csrRecord?.job?.id !== jobId) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Check access
    const user = session.user as any;
    const job = properNoun.csrRecord.job;
    const hasAccess =
      user.role === 'ADMIN' ||
      job?.createdById === user.id ||
      (job?.firmId && job.firmId === user.firmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ properNoun });

  } catch (error) {
    console.error('Error fetching proper noun:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proper noun' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/jobs/[id]/proper-nouns/[nounId]
 * Update a CSRProperNoun entry
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, nounId } = await context.params;
    const body = await request.json();

    const {
      value,
      category,
      phoneticHint,
      source,
      useInTranscription,
      priority,
    } = body;

    // Find the proper noun with job verification
    const existingNoun = await db.cSRProperNoun.findUnique({
      where: { id: nounId },
      include: {
        csrRecord: {
          select: {
            id: true,
            job: {
              select: {
                id: true,
                createdById: true,
                firmId: true,
              },
            },
          },
        },
      },
    });

    if (!existingNoun || existingNoun.csrRecord?.job?.id !== jobId) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Check access
    const user = session.user as any;
    const job = existingNoun.csrRecord.job;
    const hasAccess =
      user.role === 'ADMIN' ||
      job?.createdById === user.id ||
      (job?.firmId && job.firmId === user.firmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data
    const updateData: any = {};

    if (value !== undefined) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return NextResponse.json(
          { error: 'Value must be a non-empty string' },
          { status: 400 },
        );
      }
      updateData.value = value.trim();
    }

    if (category !== undefined) {
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
      updateData.category = category;
    }

    if (phoneticHint !== undefined) {
      updateData.phoneticHint = phoneticHint?.trim() || null;
    }

    if (source !== undefined) {
      updateData.source = source;
    }

    if (useInTranscription !== undefined) {
      updateData.useInTranscription = Boolean(useInTranscription);
    }

    if (priority !== undefined) {
      updateData.priority = Number(priority) || 0;
    }

    // Check for duplicate value if value is being changed
    if (updateData.value && updateData.value !== existingNoun.value) {
      const duplicate = await db.cSRProperNoun.findUnique({
        where: {
          csrRecordId_value: {
            csrRecordId: existingNoun.csrRecordId,
            value: updateData.value,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A term with this value already exists' },
          { status: 409 },
        );
      }
    }

    // Update the proper noun
    const updatedNoun = await db.cSRProperNoun.update({
      where: { id: nounId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      properNoun: updatedNoun,
    });
  } catch (error: any) {
    console.error('Error updating proper noun:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A proper noun with this value already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to update proper noun' }, { status: 500 });
  }
}

/**
 * DELETE /api/jobs/[id]/proper-nouns/[nounId]
 * Delete a CSRProperNoun entry
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, nounId } = await context.params;

    // Find the proper noun with job verification
    const existingNoun = await db.cSRProperNoun.findUnique({
      where: { id: nounId },
      include: {
        csrRecord: {
          select: {
            job: {
              select: {
                id: true,
                createdById: true,
                firmId: true,
              },
            },
          },
        },
      },
    });

    if (!existingNoun || existingNoun.csrRecord?.job?.id !== jobId) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Check access
    const user = session.user as any;
    const job = existingNoun.csrRecord.job;
    const hasAccess =
      user.role === 'ADMIN' ||
      job?.createdById === user.id ||
      (job?.firmId && job.firmId === user.firmId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the proper noun
    await db.cSRProperNoun.delete({
      where: { id: nounId },
    });

    return NextResponse.json({
      success: true,
      message: 'Proper noun deleted',
    });
  } catch (error) {
    console.error('Error deleting proper noun:', error);
    return NextResponse.json({ error: 'Failed to delete proper noun' }, { status: 500 });
  }
}
