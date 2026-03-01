import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// ═══════════════════════════════════════════════════════════════
// ATTORNEY ANNOTATION API (Single)
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { deleteTranscriptAnnotation } from '@/lib/supabase/queries/transcripts';
import { Role } from '@/lib/constants';
import { requireAuth, requireTranscriptAnnotation } from '@/lib/permissions/api-guards';

/**
 * DELETE /api/attorney/annotations/[id]
 * Delete an annotation
 */
async function DELETEHandler(
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

    const supabase = await createSupabaseServerClient();

    // Get annotation to check ownership and transcript access
    const { data: annotation, error: annotationError } = await supabase
      .from('transcript_annotations')
      .select('id, transcription_id, created_by_id')
      .eq('id', id)
      .maybeSingle();

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // SECURITY: Verify user has access to transcript
    const transcriptCheck = await requireTranscriptAnnotation(user.id, annotation.transcription_id);
    if (transcriptCheck instanceof NextResponse) return transcriptCheck;

    // Check ownership (only creator or admin can delete)
    if (annotation.created_by_id !== user.id && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteTranscriptAnnotation(supabase, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 },
    );
  }
}

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  DELETEHandler as any
);

