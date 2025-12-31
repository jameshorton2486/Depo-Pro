import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProperNounCategory } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string; nounId: string }>;
}

/**
 * PATCH /api/jobs/[id]/proper-nouns/[nounId]
 * Update a CSRProperNoun entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, nounId } = await params;
    const user = session.user as { id: string; role: string };
    const body = await request.json();

    // Only reporters and admins can update proper nouns
    if (user.role !== 'REPORTER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only reporters can update proper nouns' }, { status: 403 });
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
      return NextResponse.json({ error: 'You can only update nouns in your own jobs' }, { status: 403 });
    }

    // Verify proper noun exists and belongs to this job
    const properNoun = await db.cSRProperNoun.findUnique({
      where: { id: nounId },
      include: {
        csrRecord: {
          select: { jobId: true },
        },
      },
    });

    if (!properNoun || properNoun.csrRecord.jobId !== jobId) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Validate update fields
    const updateData: any = {};
    if (body.value !== undefined) {
      if (!body.value || typeof body.value !== 'string' || !body.value.trim()) {
        return NextResponse.json({ error: 'Value cannot be empty' }, { status: 400 });
      }
      updateData.value = body.value.trim();
    }

    if (body.category !== undefined) {
      if (!Object.values(ProperNounCategory).includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      updateData.category = body.category;
    }

    if (body.phoneticHint !== undefined) {
      updateData.phoneticHint = body.phoneticHint?.trim() || null;
    }

    if (body.priority !== undefined) {
      updateData.priority = parseInt(body.priority) || 0;
    }

    if (body.useInTranscription !== undefined) {
      updateData.useInTranscription = Boolean(body.useInTranscription);
    }

    // If value changed, check for duplicate
    if (updateData.value && updateData.value !== properNoun.value) {
      const existing = await db.cSRProperNoun.findUnique({
        where: {
          csrRecordId_value: {
            csrRecordId: properNoun.csrRecordId,
            value: updateData.value,
          },
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'A proper noun with this value already exists' }, { status: 409 });
      }
    }

    // Update proper noun
    const updated = await db.cSRProperNoun.update({
      where: { id: nounId },
      data: updateData,
    });

    return NextResponse.json({ properNoun: updated });
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
  { params }: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, nounId } = await params;
    const user = session.user as { id: string; role: string };

    // Only reporters and admins can delete proper nouns
    if (user.role !== 'REPORTER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only reporters can delete proper nouns' }, { status: 403 });
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
      return NextResponse.json({ error: 'You can only delete nouns from your own jobs' }, { status: 403 });
    }

    // Verify proper noun exists and belongs to this job
    const properNoun = await db.cSRProperNoun.findUnique({
      where: { id: nounId },
      include: {
        csrRecord: {
          select: { jobId: true },
        },
      },
    });

    if (!properNoun || properNoun.csrRecord.jobId !== jobId) {
      return NextResponse.json({ error: 'Proper noun not found' }, { status: 404 });
    }

    // Delete proper noun
    await db.cSRProperNoun.delete({
      where: { id: nounId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proper noun:', error);
    return NextResponse.json({ error: 'Failed to delete proper noun' }, { status: 500 });
  }
}
