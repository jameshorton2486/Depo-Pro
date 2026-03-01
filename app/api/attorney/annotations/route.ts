import { UserRole } from '@/lib/enums/roles';
import { withRouteProtection } from '@/lib/middleware/withRouteProtection';
// ═══════════════════════════════════════════════════════════════
// ATTORNEY ANNOTATIONS API
// ═══════════════════════════════════════════════════════════════
// API routes for transcript annotations (issue codes)

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTranscriptAnnotations, createTranscriptAnnotation } from '@/lib/supabase/queries/transcripts';
import { getUserById } from '@/lib/supabase/queries/users';
import { Role } from '@/lib/constants';
import { requireAuth, requireTranscriptAnnotation } from '@/lib/permissions/api-guards';

/**
 * GET /api/attorney/annotations
 * List all annotations (optionally filtered by transcript)
 */
async function GETHandler(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    if (user && typeof user === "object" && "status" in user) return user;

    if (user.role !== Role.ATTORNEY && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcriptId');

    const supabase = await createSupabaseServerClient();
    
    let annotations;
    if (transcriptId) {
      annotations = await getTranscriptAnnotations(supabase, transcriptId);
    } else {
      // Get all annotations (would need a different query function)
      const { data, error } = await supabase
        .from('transcript_annotations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      annotations = data || [];
    }
    
    // Enrich with transcript and createdBy info
    const enrichedAnnotations = await Promise.all(
      annotations.map(async (annotation: any) => {
        const { data: transcript } = await supabase
          .from('attorney_transcripts')
          .select('id, name, deponent')
          .eq('id', annotation.transcription_id)
          .maybeSingle();
        
        const createdBy = await getUserById(supabase, annotation.created_by_id);
        
        return {
          ...annotation,
          transcript: transcript ? {
            id: transcript.id,
            name: transcript.name,
            deponent: transcript.deponent,
          } : null,
          createdBy: createdBy ? {
            id: createdBy.id,
            firstName: createdBy.user_metadata?.firstName || '',
            lastName: createdBy.user_metadata?.lastName || '',
          } : null,
        };
      })
    );

    return NextResponse.json({ annotations: enrichedAnnotations });
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
async function POSTHandler(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);
    if (user && typeof user === "object" && "status" in user) return user;

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
    if (annotationCheck && typeof annotationCheck === "object" && "status" in annotationCheck) return annotationCheck;

    const supabase = await createSupabaseServerClient();

    // Verify transcript exists
    const { data: transcript, error: transcriptError } = await supabase
      .from('attorney_transcripts')
      .select('id, uploaded_by_id')
      .eq('id', transcriptId)
      .maybeSingle();

    if (transcriptError || !transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    if (transcript.uploaded_by_id !== user.id && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const annotation = await createTranscriptAnnotation(supabase, {
      transcription_id: transcriptId,
      issue_code: issueCode,
      issue_label: issueLabel,
      issue_color: issueColor,
      page_start: pageStart,
      line_start: lineStart,
      page_end: pageEnd,
      line_end: lineEnd,
      note: note || null,
      created_by_id: user.id,
    });

    // Get transcript details for response
    const { data: transcriptDetails } = await supabase
      .from('attorney_transcripts')
      .select('id, name, deponent')
      .eq('id', transcriptId)
      .single();

    return NextResponse.json({ 
      annotation: {
        ...annotation,
        transcript: transcriptDetails ? {
          id: transcriptDetails.id,
          name: transcriptDetails.name,
          deponent: transcriptDetails.deponent,
        } : null,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json(
      { error: 'Failed to create annotation' },
      { status: 500 },
    );
  }
}

export const GET = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  GETHandler as any
);

export const POST = withRouteProtection(
  { requireAuth: true, requireRole: [UserRole.ADMIN, UserRole.ATTORNEY, UserRole.COURT_REPORTER] },
  POSTHandler as any
);

