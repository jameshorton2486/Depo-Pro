// app/api/review-sessions/route.ts
// Feature 5: Review Session Duration Tracking - Create session
// Workflow Intelligence Plan - Phase A

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-compat';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/review-sessions
 * Create a new review session
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { transcriptionId, jobId, riskScore, flaggedCount } = body;

    if (!transcriptionId || !jobId) {
      return NextResponse.json(
        { error: 'transcriptionId and jobId are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Insert new review session
    const { data, error } = await supabase
      .from('review_sessions')
      .insert({
        transcription_id: transcriptionId,
        job_id: jobId,
        user_id: session.user.id,
        risk_score: riskScore,
        flagged_count: flaggedCount,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create review session:', error);
      return NextResponse.json(
        { error: 'Failed to create review session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId: data.id });
  } catch (error) {
    console.error('Error creating review session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
