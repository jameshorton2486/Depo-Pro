// app/api/transcriptions/[id]/status/route.ts
// Get transcription pipeline status and progress

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id: transcriptionId } = await context.params;
    const supabase = await createClient();

    // Get transcription record
    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .select('job_id, status, chunk_count')
      .eq('id', transcriptionId)
      .single();

    if (error || !transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const totalChunks = transcription.chunk_count || 1;
    let currentChunk: number | null = null;
    let progress = 0;

    // Calculate progress based on completed chunks
    if (totalChunks > 1) {
      const { data: chunks } = await supabase
        .from('transcription_chunks')
        .select('chunk_index, status')
        .eq('transcription_id', transcriptionId)
        .order('chunk_index', { ascending: true });

      if (chunks) {
        const completedChunks = chunks.filter(c => c.status === 'COMPLETE').length;
        const processingChunk = chunks.find(c => c.status === 'PROCESSING');

        currentChunk = processingChunk ? processingChunk.chunk_index : completedChunks;
        progress = Math.round((completedChunks / totalChunks) * 100);
      }
    } else {
      // Single chunk
      progress = transcription.status === 'COMPLETE' ? 100 : 50;
    }

    return NextResponse.json({
      transcriptionId,
      jobId: transcription.job_id,
      status: transcription.status,
      progress,
      currentChunk,
      totalChunks,
    });
  } catch (error: any) {
    console.error('Error fetching transcription status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription status' },
      { status: 500 }
    );
  }
}
