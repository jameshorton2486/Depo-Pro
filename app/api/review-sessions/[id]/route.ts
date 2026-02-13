// app/api/review-sessions/[id]/route.ts
// Feature 5: Review Session Duration Tracking - Update session
// Workflow Intelligence Plan - Phase A

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/review-sessions/[id]
 * Update review session metrics
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await context.params;
    const body = await req.json();
    const {
      activeDuration,
      totalDuration,
      wordsReviewed,
      wordsCorrected,
      audioReplays,
      filtersUsed,
      ended,
    } = body;

    const supabase = await createSupabaseServerClient();

    // Build update object
    const updates: any = {
      active_duration_seconds: activeDuration,
      total_duration_seconds: totalDuration,
      words_reviewed: wordsReviewed,
      words_corrected: wordsCorrected,
      audio_replays: audioReplays,
      filters_used: filtersUsed,
    };

    // If session is ending, set ended_at
    if (ended) {
      updates.ended_at = new Date().toISOString();

      // Calculate completion rate
      const { data: sessionData } = await supabase
        .from('review_sessions')
        .select('flagged_count')
        .eq('id', sessionId)
        .single();

      if (sessionData?.flagged_count && wordsReviewed) {
        updates.completion_rate = Math.min(
          100,
          (wordsReviewed / sessionData.flagged_count) * 100
        );
      }
    }

    // Update session
    const { error } = await supabase
      .from('review_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', session.user.id); // Ensure user owns this session

    if (error) {
      console.error('Failed to update review session:', error);
      return NextResponse.json(
        { error: 'Failed to update review session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating review session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
