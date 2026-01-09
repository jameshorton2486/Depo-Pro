// ═══════════════════════════════════════════════════════════════
// ATTORNEY EXHIBIT API (Single)
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getExhibitById, deleteExhibit } from '@/lib/supabase/queries/exhibits';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getCaseById } from '@/lib/supabase/queries/cases';
import { getUserById } from '@/lib/supabase/queries/users';
import { Role } from '@/lib/constants';

/**
 * GET /api/attorney/exhibits/[id]
 * Get a single exhibit with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    const exhibit = await getExhibitById(supabase, id);

    if (!exhibit) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Get related data
    const job = exhibit.job_id ? await getJobById(supabase, exhibit.job_id) : null;
    const caseData = await getCaseById(supabase, exhibit.case_id, session.user.id);
    const createdBy = await getUserById(supabase, exhibit.created_by_id);

    // Get annotation links
    const { data: annotationLinks } = await supabase
      .from('exhibit_annotation_links')
      .select('*, transcript_annotations(id, issue_label, page_start, line_start)')
      .eq('exhibit_id', id);

    const enrichedExhibit = {
      ...exhibit,
      job: job ? {
        id: job.id,
        title: (job as any).title,
        caseName: (job as any).case_name,
        depositionDate: (job as any).deposition_date,
      } : null,
      case: caseData ? {
        id: caseData.id,
        caseNumber: (caseData as any).case_number,
        caseStyle: (caseData as any).case_style,
      } : null,
      createdBy: createdBy ? {
        id: createdBy.id,
        firstName: createdBy.user_metadata?.firstName || '',
        lastName: createdBy.user_metadata?.lastName || '',
        role: createdBy.user_metadata?.role || '',
      } : null,
      annotationLinks: annotationLinks || [],
    };

    return NextResponse.json({ exhibit: enrichedExhibit });
  } catch (error) {
    console.error('Error fetching exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exhibit' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/attorney/exhibits/[id]
 * Delete an exhibit (only if uploaded by attorney)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    // Get exhibit to check ownership
    const exhibit = await getExhibitById(supabase, id);

    if (!exhibit) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Only allow deletion if:
    // 1. User is admin, OR
    // 2. User uploaded it (createdById matches) AND it's an attorney upload
    const canDelete =
      session.user.role === Role.ADMIN ||
      (exhibit.created_by_id === session.user.id && exhibit.uploaded_by_role === 'ATTORNEY');

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Cannot delete exhibits uploaded by court reporters' },
        { status: 403 },
      );
    }

    // TODO: Delete files from storage
    // await deleteExhibitFiles(exhibit.original_file_url, exhibit.stamped_file_url);

    // Delete exhibit record
    await deleteExhibit(supabase, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to delete exhibit' },
      { status: 500 },
    );
  }
}
