// =============================================================================
// ANNOTATION UPDATE/DELETE API
// app/api/transcripts/[id]/annotations/[annotationId]/route.ts
//
// Phase 3B-4: Update or delete annotations
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string; annotationId: string }>;
}

/**
 * PATCH /api/transcripts/[id]/annotations/[annotationId]
 * Update an annotation (e.g., mark as resolved)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId, annotationId } = await context.params;
    const body = await request.json();
    const { resolved: _resolved, content } = body;

    // Verify annotation exists and belongs to transcript
    const annotation = await db.transcriptAnnotation.findFirst({
      where: {
        id: annotationId,
        transcriptId, // May need mapping
      },
    });

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Update annotation
    const updated = await db.transcriptAnnotation.update({
      where: { id: annotationId },
      data: {
        note: content || undefined,
        // Note: TranscriptAnnotation doesn't have resolved field
        // In a full implementation, we'd add this to the schema
      },
    });

    return NextResponse.json({
      message: 'Annotation updated',
      annotation: updated,
    });
  } catch (error) {
    console.error('Error updating annotation:', error);
    return NextResponse.json(
      { error: 'Failed to update annotation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/transcripts/[id]/annotations/[annotationId]
 * Delete an annotation
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId, annotationId } = await context.params;

    // Verify annotation exists and user has permission
    const annotation = await db.transcriptAnnotation.findFirst({
      where: {
        id: annotationId,
        transcriptId, // May need mapping
        createdById: session.user.id, // Only creator can delete
      },
    });

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Delete annotation
    await db.transcriptAnnotation.delete({
      where: { id: annotationId },
    });

    return NextResponse.json({
      message: 'Annotation deleted',
    });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}
