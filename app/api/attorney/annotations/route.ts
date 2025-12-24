// ═══════════════════════════════════════════════════════════════
// ATTORNEY ANNOTATIONS API
// ═══════════════════════════════════════════════════════════════
// API routes for transcript annotations (issue codes)

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';
import { requireAuth, requireTranscriptAnnotation } from '@/lib/permissions/api-guards';

/**
 * GET /api/attorney/annotations
 * List all annotations (optionally filtered by transcript)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role !== Role.ATTORNEY && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcriptId');

    const where: any = {};
    if (transcriptId) {
      where.transcriptId = transcriptId;
    }

    const annotations = await db.transcriptAnnotation.findMany({
      where,
      include: {
        transcript: {
          select: {
            id: true,
            name: true,
            deponent: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/attorney/annotations
 * Create a new annotation
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role !== Role.ATTORNEY && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      transcriptId,
      issueCode,
      issueLabel,
      issueColor,
      pageStart,
      lineStart,
      pageEnd,
      lineEnd,
      note,
    } = body;

    // Validate required fields
    if (
      !transcriptId ||
      !issueCode ||
      !issueLabel ||
      !issueColor ||
      pageStart === undefined ||
      lineStart === undefined ||
      pageEnd === undefined ||
      lineEnd === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // SECURITY: Enforce transcript annotation permission
    const annotationCheck = await requireTranscriptAnnotation(user.id, transcriptId);
    if (annotationCheck instanceof NextResponse) return annotationCheck;

    // Verify transcript exists
    const transcript = await db.attorneyTranscript.findUnique({
      where: { id: transcriptId },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    if (transcript.uploadedById !== session.user.id && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const annotation = await db.transcriptAnnotation.create({
      data: {
        transcriptId,
        issueCode,
        issueLabel,
        issueColor,
        pageStart,
        lineStart,
        pageEnd,
        lineEnd,
        note: note || null,
        createdById: user.id,
      },
      include: {
        transcript: {
          select: {
            id: true,
            name: true,
            deponent: true,
          },
        },
      },
    });

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 },
    );
  }
}

