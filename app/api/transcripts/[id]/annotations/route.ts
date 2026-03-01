// =============================================================================
// TRANSCRIPT ANNOTATIONS API
// app/api/transcripts/[id]/annotations/route.ts
//
// Phase 3B-4: Inline review actions (comments, flags, resolve)
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
import type { ProtectedContext } from '@/lib/middleware/withRouteProtection';
import { getTranscriptById, getTranscriptAnnotations, createTranscriptAnnotation } from '@/lib/supabase/queries/transcripts';
import { z } from 'zod';

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COURT_REPORTER, UserRole.REPORTER, UserRole.SCOPIST];

const createAnnotationSchema = z.object({
  type: z.enum(['comment', 'flag', 'correction']),
  content: z.string().optional(),
  wordIndex: z.number().optional(),
  segmentStart: z.number().optional(),
  segmentEnd: z.number().optional(),
});

/**
 * POST /api/transcripts/[id]/annotations
 * Create a new annotation (comment, flag, or correction)
 */
const POSTHandler = async (
  request: NextRequest,
  { user, supabase, params }: ProtectedContext
) => {
  try {
    const transcriptId = params.id;
    const body = await request.json();
    const data = createAnnotationSchema.parse(body);

    // Verify transcript exists and user has access
    const transcript = await getTranscriptById(supabase, transcriptId);

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Create annotation
    const annotation = await createTranscriptAnnotation(supabase, {
      transcription_id: transcriptId,
      issue_code: data.type.toUpperCase(),
      issue_label: data.type === 'comment' ? 'Comment' : data.type === 'flag' ? 'Flag' : 'Correction',
      issue_color: data.type === 'comment' ? 'blue' : data.type === 'flag' ? 'red' : 'yellow',
      page_start: data.segmentStart || null,
      line_start: data.wordIndex || null,
      page_end: data.segmentEnd || data.segmentStart || null,
      line_end: data.wordIndex || null,
      note: data.content || null,
      created_by_id: user.id,
    });

    return NextResponse.json({
      message: 'Annotation created',
      annotation,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 }
    );
  }
};

/**
 * GET /api/transcripts/[id]/annotations
 * Get all annotations for a transcript
 */
const GETHandler = async (
  _request: NextRequest,
  { supabase, params }: ProtectedContext
) => {
  try {
    const transcriptId = params.id;

    // Get annotations
    const annotations = await getTranscriptAnnotations(supabase, transcriptId);

    return NextResponse.json({
      annotations,
    });
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotations' },
      { status: 500 }
    );
  }
};

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  POSTHandler
);

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: ALLOWED_ROLES },
  GETHandler
);
