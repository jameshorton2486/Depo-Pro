// =============================================================================
// TRANSCRIPT ANNOTATIONS API
// app/api/transcripts/[id]/annotations/route.ts
//
// Phase 3B-4: Inline review actions (comments, flags, resolve)
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptById, getTranscriptAnnotations, createTranscriptAnnotation } from '@/lib/supabase/queries/transcripts';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;
    const body = await request.json();
    const data = createAnnotationSchema.parse(body);

    // Verify transcript exists and user has access
    const supabase = await createSupabaseServerClient();
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
      created_by_id: currentUser.id,
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
}

/**
 * GET /api/transcripts/[id]/annotations
 * Get all annotations for a transcript
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptId } = await context.params;

    // Get annotations
    const supabase = await createSupabaseServerClient();
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
}
