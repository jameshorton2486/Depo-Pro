// ═══════════════════════════════════════════════════════════════
// ATTORNEY EXHIBIT API (Single)
// ═══════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
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

    const exhibit = await db.exhibit.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            caseName: true,
            depositionDate: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            caseStyle: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        annotationLinks: {
          include: {
            annotation: {
              select: {
                id: true,
                issueLabel: true,
                pageStart: true,
                lineStart: true,
              },
            },
          },
        },
      },
    });

    if (!exhibit) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
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

    // Get exhibit to check ownership
    const exhibit = await db.exhibit.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        uploadedByRole: true,
        originalFileUrl: true,
        stampedFileUrl: true,
      },
    });

    if (!exhibit) {
      return NextResponse.json({ error: 'Exhibit not found' }, { status: 404 });
    }

    // Only allow deletion if:
    // 1. User is admin, OR
    // 2. User uploaded it (createdById matches) AND it's an attorney upload
    const canDelete =
      session.user.role === Role.ADMIN ||
      (exhibit.createdById === session.user.id && exhibit.uploadedByRole === 'ATTORNEY');

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Cannot delete exhibits uploaded by court reporters' },
        { status: 403 },
      );
    }

    // TODO: Delete files from storage
    // await deleteExhibitFiles(exhibit.originalFileUrl, exhibit.stampedFileUrl);

    // Delete exhibit record
    await db.exhibit.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to delete exhibit' },
      { status: 500 },
    );
  }
}

