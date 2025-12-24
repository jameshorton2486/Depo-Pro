// ═══════════════════════════════════════════════════════════════
// ATTORNEY ANNOTATION API (Single)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';
import { requireAuth, requireTranscriptAnnotation } from '@/lib/permissions/api-guards';

/**
 * DELETE /api/attorney/annotations/[id]
 * Delete an annotation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role !== Role.ATTORNEY && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get annotation to check ownership and transcript access
    const annotation = await db.transcriptAnnotation.findUnique({
      where: { id },
      include: {
        transcript: true,
      },
    });

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // SECURITY: Verify user has access to transcript
    const transcriptCheck = await requireTranscriptAnnotation(user.id, annotation.transcriptId);
    if (transcriptCheck instanceof NextResponse) return transcriptCheck;

    // Check ownership (only creator or admin can delete)
    if (annotation.createdById !== user.id && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.transcriptAnnotation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 },
    );
  }
}

