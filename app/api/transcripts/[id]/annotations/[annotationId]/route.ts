// =============================================================================
// ANNOTATION UPDATE/DELETE API
// app/api/transcripts/[id]/annotations/[annotationId]/route.ts
//
// Phase 3B-4: Update or delete annotations
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptAnnotations, updateTranscriptAnnotation, deleteTranscriptAnnotation } from '@/lib/supabase/queries/transcripts';

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
    const supabase = await createSupabaseServerClient();
    const annotations = await getTranscriptAnnotations(supabase, transcriptId);
    const annotation = annotations.find((a: any) => a.id === annotationId);

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Update annotation
    const updated = await updateTranscriptAnnotation(supabase, annotationId, {
      note: content || null,
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
    const supabase = await createSupabaseServerClient();
    const annotations = await getTranscriptAnnotations(supabase, transcriptId);
    const annotation = annotations.find((a: any) => a.id === annotationId && a.created_by_id === session.user.id);

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Delete annotation
    await deleteTranscriptAnnotation(supabase, annotationId);

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
