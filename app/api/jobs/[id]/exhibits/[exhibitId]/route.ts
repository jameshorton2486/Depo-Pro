// app/api/jobs/[id]/exhibits/[exhibitId]/route.ts
// API routes for individual exhibit operations

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { deleteExhibitFiles } from '@/lib/exhibits/storage';

// GET /api/jobs/[id]/exhibits/[exhibitId] - Get single exhibit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exhibitId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, exhibitId } = await params;
    const user = session.user as { id: string; role: string };

    const supabase = await createSupabaseServerClient();

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
      user.role === 'ADMIN';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ exhibit });
  } catch (error) {
    console.error('Error fetching exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exhibit' },
      { status: 500 },
    );
  }
}

// PATCH /api/jobs/[id]/exhibits/[exhibitId] - Update exhibit description
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exhibitId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, exhibitId } = await params;
    const user = session.user as { id: string; role: string };

    // Parse request body
    const body = await request.json();
    const { description } = body;

    if (typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description must be a string' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

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
      user.role === 'ADMIN';

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
  } catch (error) {
    console.error('Error updating exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to update exhibit' },
      { status: 500 },
    );
  }
}

// DELETE /api/jobs/[id]/exhibits/[exhibitId] - Delete exhibit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exhibitId: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, exhibitId } = await params;
    const user = session.user as { id: string; role: string };

    const supabase = await createSupabaseServerClient();

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
      user.role === 'ADMIN';

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract paths from URLs for deletion
    const pathsToDelete: string[] = [];

    // Extract path from originalFileUrl (Supabase storage path)
    const originalFileUrl = exhibit.original_file_url || exhibit.originalFileUrl;
    if (originalFileUrl) {
      // Extract path from Supabase URL format: https://.../storage/v1/object/public/bucket/path
      const urlMatch = originalFileUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      if (urlMatch) {
        pathsToDelete.push(urlMatch[1]);
      }
    }

    // Extract path from stampedFileUrl if exists
    const stampedFileUrl = exhibit.stamped_file_url || exhibit.stampedFileUrl;
    if (stampedFileUrl) {
      const urlMatch = stampedFileUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      if (urlMatch) {
        pathsToDelete.push(urlMatch[1]);
      }
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
  } catch (error) {
    console.error('Error deleting exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to delete exhibit' },
      { status: 500 },
    );
  }
}
