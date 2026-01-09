// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPTS API
// ═══════════════════════════════════════════════════════════════
// API routes for attorney transcript management

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Role } from '@/lib/constants';

/**
 * GET /api/attorney/transcripts
 * List all transcripts for the current attorney
 */
export async function GET() {
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

    // Get transcripts
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('attorney_transcripts')
      .select('*')
      .eq('uploaded_by_id', session.user.id)
      .order('uploaded_at', { ascending: false });

    if (transcriptsError) {
      throw transcriptsError;
    }

    // Get annotations for each transcript
    const transcriptsWithAnnotations = await Promise.all(
      (transcripts || []).map(async (transcript) => {
        const { data: annotations } = await supabase
          .from('transcript_annotations')
          .select('*')
          .eq('transcription_id', transcript.id)
          .order('created_at', { ascending: false });

        return {
          ...transcript,
          annotations: annotations || [],
        };
      })
    );

    return NextResponse.json({ transcripts: transcriptsWithAnnotations });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
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
    console.error('Error creating transcript:', error);
    return NextResponse.json(
      { error: 'Failed to create transcript' },
      { status: 500 },
    );
  }
}
