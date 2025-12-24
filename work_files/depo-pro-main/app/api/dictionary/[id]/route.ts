// ═══════════════════════════════════════════════════════════════
// DICTIONARY TERM UPDATE/DELETE API ENDPOINT
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateTermSchema = z.object({
  term: z.string().min(1).max(200).optional(),
  phonetic: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  category: z.enum(['MEDICAL', 'LEGAL', 'TECHNICAL', 'NAME', 'PLACE', 'OTHER']).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: termId } = await params;

    // 🔍 Fetch term with job info
    const existingTerm = await db.jobDictionaryTerm.findUnique({
      where: { id: termId },
      include: {
        job: {
          select: {
            id: true,
            reporterId: true,
            assignments: {
              select: {
                scopistId: true,
              },
            },
          },
        },
      },
    });

    if (!existingTerm) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // 🔒 Security: Only creator, reporter, assigned scopists, or admin can update
    const canUpdate =
      session.user.role === 'ADMIN' ||
      existingTerm.addedById === session.user.id ||
      existingTerm.job.reporterId === session.user.id ||
      existingTerm.job.assignments.some((a) => a.scopistId === session.user.id);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ✅ Validate request body
    const body = await request.json();
    const validation = updateTermSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    // 📝 Update term
    const updatedTerm = await db.jobDictionaryTerm.update({
      where: { id: termId },
      data: validation.data,
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

    return NextResponse.json({ term: updatedTerm }, { status: 200 });
  } catch (error) {
    console.error('Update dictionary term error:', error);
    return NextResponse.json(
      { error: 'Failed to update term' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: termId } = await params;

    // 🔍 Fetch term with job info
    const term = await db.jobDictionaryTerm.findUnique({
      where: { id: termId },
      include: {
        job: {
          select: {
            id: true,
            reporterId: true,
          },
        },
      },
    });

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // 🔒 Security: Only creator, reporter, or admin can delete
    const canDelete =
      session.user.role === 'ADMIN' ||
      term.addedById === session.user.id ||
      term.job.reporterId === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 🗑️ Delete term
    await db.jobDictionaryTerm.delete({
      where: { id: termId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete dictionary term error:', error);
    return NextResponse.json(
      { error: 'Failed to delete term' },
      { status: 500 }
    );
  }
}
