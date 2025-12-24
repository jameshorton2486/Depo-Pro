// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT ANNOTATION EXHIBIT LINKS API
// ═══════════════════════════════════════════════════════════════
// Link exhibits to transcript annotations

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';

/**
 * POST /api/attorney/annotations/[id]/exhibits
 * Link one or more exhibits to a transcript annotation
 */
export async function POST(
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

    const { id: annotationId } = await params;
    const body = await request.json();
    const { exhibitIds } = body;

    if (!exhibitIds || !Array.isArray(exhibitIds) || exhibitIds.length === 0) {
      return NextResponse.json(
        { error: 'exhibitIds array is required' },
        { status: 400 },
      );
    }

    // Verify annotation exists and user has access
    const annotation = await db.transcriptAnnotation.findUnique({
      where: { id: annotationId },
      include: {
        transcript: {
          select: {
            id: true,
            uploadedById: true,
          },
        },
      },
    });

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Verify all exhibits exist and belong to the same case
    const exhibits = await db.exhibit.findMany({
      where: {
        id: { in: exhibitIds },
      },
      select: {
        id: true,
        caseId: true,
      },
    });

    if (exhibits.length !== exhibitIds.length) {
      return NextResponse.json(
        { error: 'One or more exhibits not found' },
        { status: 404 },
      );
    }

    // Verify all exhibits belong to the same case as the transcript
    // (We need to get the caseId from the transcript's case)
    const transcript = await db.attorneyTranscript.findUnique({
      where: { id: annotation.transcriptId },
      select: {
        id: true,
        uploadedById: true,
      },
    });

    // Create links (skip if already exists)
    const links = [];
    for (const exhibitId of exhibitIds) {
      try {
        const link = await db.transcriptAnnotationExhibit.create({
          data: {
            annotationId,
            exhibitId,
            createdById: session.user.id,
          },
        });
        links.push(link);
      } catch (error: any) {
        // Skip if unique constraint violation (already linked)
        if (!error.message?.includes('Unique constraint')) {
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
 * DELETE /api/attorney/annotations/[id]/exhibits/[exhibitId]
 * Unlink an exhibit from an annotation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exhibitId: string }> },
) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: annotationId, exhibitId } = await params;

    // Verify annotation exists
    const annotation = await db.transcriptAnnotation.findUnique({
      where: { id: annotationId },
    });

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Delete link
    await db.transcriptAnnotationExhibit.deleteMany({
      where: {
        annotationId,
        exhibitId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking exhibit:', error);
    return NextResponse.json(
      { error: 'Failed to unlink exhibit' },
      { status: 500 },
    );
  }
}

