// ═══════════════════════════════════════════════════════════════
// ATTORNEY EXHIBIT API (Single)
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getExhibitById, deleteExhibit } from '@/lib/supabase/queries/exhibits';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getCaseById } from '@/lib/supabase/queries/cases';
import { getUserById } from '@/lib/supabase/queries/users';
import { Role } from '@/lib/constants';
import { deleteExhibitFiles } from '@/lib/exhibits/storage';
import { getFileUrl, extractStoragePath } from '@/lib/storage/url';

/**
 * GET /api/attorney/exhibits/[id]
 * Get a single exhibit with full details
 */
export async function GET(
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

    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    const exhibit = await getExhibitById(supabase, id);

    if (!exhibit) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Get related data
    const job = exhibit.job_id ? await getJobById(supabase, exhibit.job_id) : null;
    const caseData = await getCaseById(supabase, exhibit.case_id, currentUser.id);
    const createdBy = await getUserById(supabase, exhibit.created_by_id);

    // Get annotation links
    const { data: annotationLinks } = await supabase
      .from('exhibit_annotation_links')
      .select('*, transcript_annotations(id, issue_label, page_start, line_start)')
      .eq('exhibit_id', id);

    // Regenerate fresh signed URLs at read time (DB stores paths, not URLs)
    const originalUrl = exhibit.original_file_url
      ? await getFileUrl(extractStoragePath(exhibit.original_file_url), 'depo-files').catch(() => exhibit.original_file_url)
      : null;
    const stampedUrl = exhibit.stamped_file_url
      ? await getFileUrl(extractStoragePath(exhibit.stamped_file_url), 'depo-files').catch(() => exhibit.stamped_file_url)
      : null;

    const enrichedExhibit = {
      ...exhibit,
      original_file_url: originalUrl,
      stamped_file_url: stampedUrl,
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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== Role.ATTORNEY && currentUser.role !== Role.ADMIN) {
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
      currentUser.role === Role.ADMIN ||
      (exhibit.created_by_id === currentUser.id && exhibit.uploaded_by_role === 'ATTORNEY');

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Cannot delete exhibits uploaded by court reporters' },
        { status: 403 },
      );
    }

    // extractStoragePath handles both legacy rows (full URLs) and new rows (paths)
    const pathsToDelete: string[] = [];
    const originalFileUrl = exhibit.original_file_url || (exhibit as any).originalFileUrl;
    if (originalFileUrl) {
      pathsToDelete.push(extractStoragePath(originalFileUrl));
    }

    const stampedFileUrl = exhibit.stamped_file_url || (exhibit as any).stampedFileUrl;
    if (stampedFileUrl) {
      pathsToDelete.push(extractStoragePath(stampedFileUrl));
    }

    if (pathsToDelete.length > 0) {
      try {
        await deleteExhibitFiles(pathsToDelete);
      } catch (storageError) {
        console.error('Failed to delete exhibit files from storage:', storageError);
      }
    }

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
