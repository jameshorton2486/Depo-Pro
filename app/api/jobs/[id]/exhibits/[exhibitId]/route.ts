// app/api/jobs/[id]/exhibits/[exhibitId]/route.ts
// API routes for individual exhibit operations

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withRouteProtection, type ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { UserRole } from '@/lib/enums/roles';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { deleteExhibitFiles } from '@/lib/exhibits/storage';
import { extractStoragePath } from '@/lib/storage/url';
import { isAdminRole } from '@/lib/admin';

// GET /api/jobs/[id]/exhibits/[exhibitId] - Get single exhibit
const getHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const exhibitId = params.exhibitId;

    // Fetch exhibit
    const { data: exhibit, error: exhibitError } = await supabase
      .from('exhibits')
      .select('*')
      .eq('id', exhibitId)
      .eq('job_id', jobId)
      .single();

    if (exhibitError || !exhibit) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Get job for permission check
    const job = await getJobById(supabase, jobId, {
      includeAssignments: true,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions
    const hasAccess =
      (job as any).created_by_id === user.id ||
      ((job as any).assignments && (job as any).assignments.some((a: any) => a.scopist_id === user.id)) ||
      isAdminRole(user.role);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ exhibit });
  } catch (err) {
    console.error('Error fetching exhibit:', err);
    return NextResponse.json(
      { error: 'Failed to fetch exhibit' },
      { status: 500 },
    );
  }
};

// PATCH /api/jobs/[id]/exhibits/[exhibitId] - Update exhibit description
const patchHandler = async (request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const exhibitId = params.exhibitId;

    // Parse request body
    const body = await request.json();
    const { description } = body;

    if (typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description must be a string' },
        { status: 400 },
      );
    }

    // Fetch exhibit
    const { data: exhibit, error: exhibitError } = await supabase
      .from('exhibits')
      .select('*')
      .eq('id', exhibitId)
      .eq('job_id', jobId)
      .single();

    if (exhibitError || !exhibit) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Get job for permission check
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions (only reporter who created job, or admin can edit)
    const canEdit =
      (job as any).created_by_id === user.id ||
      isAdminRole(user.role);

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update exhibit
    const { data: updatedExhibit, error: updateError } = await supabase
      .from('exhibits')
      .update({ description })
      .eq('id', exhibitId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ exhibit: updatedExhibit });
  } catch (err) {
    console.error('Error updating exhibit:', err);
    return NextResponse.json(
      { error: 'Failed to update exhibit' },
      { status: 500 },
    );
  }
};

// DELETE /api/jobs/[id]/exhibits/[exhibitId] - Delete exhibit
const deleteHandler = async (_request: NextRequest, { user, supabase, params }: ProtectedContext) => {
  try {
    const jobId = params.id;
    const exhibitId = params.exhibitId;

    // Fetch exhibit
    const { data: exhibit, error: exhibitError } = await supabase
      .from('exhibits')
      .select('*')
      .eq('id', exhibitId)
      .eq('job_id', jobId)
      .single();

    if (exhibitError || !exhibit) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Get job for permission check
    const job = await getJobById(supabase, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check permissions (only reporter who created job, admin, or creator can delete)
    const canDelete =
      (job as any).created_by_id === user.id ||
      exhibit.created_by_id === user.id ||
      isAdminRole(user.role);

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract storage paths for deletion (handles both legacy full URLs and new path-only values)
    const pathsToDelete: string[] = [];

    const originalFileUrl = exhibit.original_file_url || exhibit.originalFileUrl;
    if (originalFileUrl) {
      pathsToDelete.push(extractStoragePath(originalFileUrl));
    }

    const stampedFileUrl = exhibit.stamped_file_url || exhibit.stampedFileUrl;
    if (stampedFileUrl) {
      pathsToDelete.push(extractStoragePath(stampedFileUrl));
    }

    // Delete from storage
    if (pathsToDelete.length > 0) {
      try {
        await deleteExhibitFiles(pathsToDelete);
      } catch (storageError) {
        console.error('Failed to delete files from storage:', storageError);
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('exhibits')
      .delete()
      .eq('id', exhibitId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Exhibit deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting exhibit:', err);
    return NextResponse.json(
      { error: 'Failed to delete exhibit' },
      { status: 500 },
    );
  }
};

const JOB_ROLES = [
  UserRole.ADMIN,
  UserRole.COURT_REPORTER,
  UserRole.REPORTER,
  UserRole.SCOPIST,
  UserRole.ATTORNEY,
  UserRole.AGENCY_OWNER,
  UserRole.AGENCY_MANAGER,
];

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: JOB_ROLES, requireFirm: true },
  getHandler,
);

export const PATCH = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER], requireFirm: true },
  patchHandler,
);

export const DELETE = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.AGENCY_OWNER, UserRole.AGENCY_MANAGER], requireFirm: true },
  deleteHandler,
);
