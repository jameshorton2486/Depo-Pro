// app/api/jobs/[id]/exhibits/[exhibitId]/route.ts
// API routes for individual exhibit operations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
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

    // Fetch exhibit with job for permission check
    const exhibit = await db.exhibit.findUnique({
      where: { id: exhibitId },
      include: {
        job: {
          select: {
            id: true,
            createdById: true,
            firmId: true,
            assignments: {
              select: { scopistId: true },
            },
          },
        },
      },
    });

    if (!exhibit || exhibit.jobId !== jobId) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Check permissions
    const hasAccess =
      (exhibit.job?.createdById === user.id) ||
      (exhibit.job?.assignments.some(a => a.scopistId === user.id)) ||
      user.role === 'ADMIN';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Remove job relation from response
    const { job: _job, ...exhibitData } = exhibit;

    return NextResponse.json({ exhibit: exhibitData });
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

    // Fetch exhibit with job for permission check
    const exhibit = await db.exhibit.findUnique({
      where: { id: exhibitId },
      include: {
        job: {
          select: {
            id: true,
            createdById: true,
            firmId: true,
          },
        },
      },
    });

    if (!exhibit || exhibit.jobId !== jobId) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Check permissions (only reporter who created job, or admin can edit)
    const canEdit =
      exhibit.job?.createdById === user.id ||
      user.role === 'ADMIN';

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update exhibit
    const updatedExhibit = await db.exhibit.update({
      where: { id: exhibitId },
      data: { description },
    });

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

    // Fetch exhibit with job for permission check
    const exhibit = await db.exhibit.findUnique({
      where: { id: exhibitId },
      include: {
        job: {
          select: {
            id: true,
            createdById: true,
            firmId: true,
          },
        },
      },
    });

    if (!exhibit || exhibit.jobId !== jobId) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Check permissions (only reporter who created job, admin, or creator can delete)
    const canDelete =
      exhibit.job?.createdById === user.id ||
      exhibit.createdById === user.id ||
      user.role === 'ADMIN';

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract paths from URLs for deletion
    const pathsToDelete: string[] = [];

    // Extract path from originalFileUrl (Supabase storage path)
    if (exhibit.originalFileUrl) {
      // Extract path from Supabase URL format: https://.../storage/v1/object/public/bucket/path
      const urlMatch = exhibit.originalFileUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      if (urlMatch) {
        pathsToDelete.push(urlMatch[1]);
      }
    }

    // Extract path from stampedFileUrl if exists
    if (exhibit.stampedFileUrl) {
      const urlMatch = exhibit.stampedFileUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
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
    await db.exhibit.delete({
      where: { id: exhibitId },
    });

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
