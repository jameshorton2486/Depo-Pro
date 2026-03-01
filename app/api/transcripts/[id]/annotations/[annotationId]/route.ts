// =============================================================================
// ANNOTATION UPDATE/DELETE API
// app/api/transcripts/[id]/annotations/[annotationId]/route.ts
//
// Phase 3B-4: Update or delete annotations
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptAnnotations, updateTranscriptAnnotation, deleteTranscriptAnnotation } from '@/lib/supabase/queries/transcripts';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

/**
 * PATCH /api/transcripts/[id]/annotations/[annotationId]
 * Update an annotation (e.g., mark as resolved)
 */
const PATCHHandler = async (
  request: NextRequest,
  { supabase, params }: ProtectedContext
) => {
  try {
    const transcriptId = params.id;
    const annotationId = params.annotationId;
    const body = await request.json();
    const { resolved: _resolved, content } = body;

    // Verify annotation exists and belongs to transcript
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
};

/**
 * DELETE /api/transcripts/[id]/annotations/[annotationId]
 * Delete an annotation
 */
const DELETEHandler = async (
  _request: NextRequest,
  { user, supabase, params }: ProtectedContext
) => {
  try {
    const transcriptId = params.id;
    const annotationId = params.annotationId;

    // Verify annotation exists and user has permission
    const annotations = await getTranscriptAnnotations(supabase, transcriptId);
    const annotation = annotations.find((a: any) => a.id === annotationId && a.created_by_id === user.id);

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
};

export const PATCH = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  PATCHHandler
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  DELETEHandler
);
