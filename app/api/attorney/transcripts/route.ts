// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPTS API
// ═══════════════════════════════════════════════════════════════
// API routes for attorney transcript management

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Role } from '@/lib/constants';
import { logger } from '@/lib/logger';

/**
 * GET /api/attorney/transcripts
 * List all transcripts for the current attorney
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only attorneys and admins can access
    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = (page - 1) * limit;
    const rangeTo = offset + limit - 1;

    // Get transcripts
    const { data: transcripts, error: transcriptsError, count } = await supabase
      .from('attorney_transcripts')
      .select('*', { count: 'exact' })
      .eq('uploaded_by_id', session.user.id)
      .order('uploaded_at', { ascending: false })
      .range(offset, rangeTo);

    if (transcriptsError) {
      throw transcriptsError;
    }

    const transcriptIds = (transcripts || []).map(t => t.id);
    let annotationsByTranscript = new Map<string, any[]>();

    if (transcriptIds.length > 0) {
      const { data: annotations } = await supabase
        .from('transcript_annotations')
        .select('*')
        .in('transcription_id', transcriptIds)
        .order('created_at', { ascending: false });

      annotationsByTranscript = (annotations || []).reduce((acc, annotation) => {
        const key = annotation.transcription_id as string;
        if (!acc.has(key)) {
          acc.set(key, []);
        }
        acc.get(key)!.push(annotation);
        return acc;
      }, new Map<string, any[]>());
    }

    const transcriptsWithAnnotations = (transcripts || []).map((transcript) => ({
      ...transcript,
      annotations: annotationsByTranscript.get(transcript.id) || [],
    }));

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      transcripts: transcriptsWithAnnotations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error('Error fetching transcripts', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/attorney/transcripts
 * Create a new transcript (upload)
 */
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, deponent, caseName, depositionDate, transcriptData, totalPages, totalLines } = body;

    // Validate required fields
    if (!name || !deponent || !transcriptData || !totalPages || !totalLines) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data: transcript, error: transcriptError } = await supabase
      .from('attorney_transcripts')
      .insert({
        name,
        deponent,
        case_name: caseName || null,
        deposition_date: depositionDate ? new Date(depositionDate).toISOString() : null,
        transcript_data: transcriptData,
        total_pages: totalPages,
        total_lines: totalLines,
        uploaded_by_id: session.user.id,
        status: 'NOT_REVIEWED',
      })
      .select()
      .single();

    if (transcriptError) {
      throw transcriptError;
    }

    return NextResponse.json({ transcript }, { status: 201 });
  } catch (error) {
    logger.error('Error creating transcript', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to create transcript' },
      { status: 500 },
    );
  }
}
