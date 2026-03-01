import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT ANNOTATION EXHIBIT LINKS API
// ═══════════════════════════════════════════════════════════════
// Link exhibits to transcript annotations

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getExhibitById } from '@/lib/supabase/queries/exhibits';
import { Role } from '@/lib/constants';

/**
 * POST /api/attorney/annotations/[id]/exhibits
 * Link one or more exhibits to a transcript annotation
 */
async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== Role.ATTORNEY && currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: annotationId } = await params;
    const body = await request.json();
    const { exhibitIds } = body;

    if (!exhibitIds || !Array.isArray(exhibitIds) || exhibitIds.length === 0) {
      return NextResponse.json(
        { error: 'exhibitIds array is required' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify annotation exists and user has access
    const { data: annotation, error: annotationError } = await supabase
      .from('transcript_annotations')
      .select('id, transcription_id')
      .eq('id', annotationId)
      .maybeSingle();

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Verify all exhibits exist
    const exhibits = await Promise.all(
      exhibitIds.map(async (exhibitId) => {
        const exhibit = await getExhibitById(supabase, exhibitId);
        return exhibit ? { id: exhibit.id, case_id: exhibit.case_id } : null;
      })
    );

    const validExhibits = exhibits.filter(e => e !== null);
    if (validExhibits.length !== exhibitIds.length) {
      return NextResponse.json(
        { error: 'One or more exhibits not found' },
        { status: 404 },
      );
    }

    // Create links (skip if already exists)
    const links = [];
    for (const exhibitId of exhibitIds) {
      try {
        const { data: link, error: linkError } = await supabase
          .from('exhibit_annotation_links')
          .insert({
            annotation_id: annotationId,
            exhibit_id: exhibitId,
            created_by_id: currentUser.id,
          })
          .select()
          .single();

        if (linkError) {
          // Skip if unique constraint violation (already linked)
          if (!linkError.message?.includes('duplicate') && !linkError.code?.includes('23505')) {
            throw linkError;
          }
        } else if (link) {
          links.push(link);
        }
      } catch (error: any) {
        // Skip if unique constraint violation (already linked)
        if (!error.message?.includes('duplicate') && !error.code?.includes('23505')) {
          throw error;
        }
      }
    }

    return NextResponse.json({ links }, { status: 201 });
  } catch (error) {
    console.error('Error linking exhibits:', error);
    return NextResponse.json(
      { error: 'Failed to link exhibits' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/attorney/annotations/[id]/exhibits
 * Unlink an exhibit from an annotation (exhibitId in request body)
 */
async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== Role.ATTORNEY && currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: annotationId } = await params;
    const body = await request.json();
    const { exhibitId } = body;

    if (!exhibitId) {
      return NextResponse.json(
        { error: 'exhibitId is required in request body' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify annotation exists
    const { data: annotation, error: annotationError } = await supabase
      .from('transcript_annotations')
      .select('id')
      .eq('id', annotationId)
      .maybeSingle();

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Delete link
    const { error: deleteError } = await supabase
      .from('exhibit_annotation_links')
      .delete()
      .eq('annotation_id', annotationId)
      .eq('exhibit_id', exhibitId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to unlink exhibit' },
      { status: 500 },
    );
  }
}

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  POSTHandler as any
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  DELETEHandler as any
);

