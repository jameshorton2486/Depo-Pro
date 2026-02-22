// app/api/review-sessions/[id]/route.ts
// Feature 5: Review Session Duration Tracking - Update session
// Workflow Intelligence Plan - Phase A

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/enums/roles';

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
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = new Set<string>([
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
      UserRole.REPORTER,
      UserRole.COURT_REPORTER,
      UserRole.SCOPIST,
    ]);

    if (!allowedRoles.has(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Ensure session exists and is owned by caller before updates
    const { data: reviewSession, error: reviewSessionError } = await supabase
      .from('review_sessions')
      .select('id, user_id, job_id')
      .eq('id', sessionId)
      .eq('user_id', currentUser.id)
      .single();

    if (reviewSessionError || !reviewSession) {
      return NextResponse.json({ error: 'Review session not found' }, { status: 404 });
    }

    // Validate tenant/job access for update as defense in depth
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, firm_id, created_by_id, scopist_id')
      .eq('id', reviewSession.job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const isPlatformAdmin =
      currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;
    const isJobOwner = job.created_by_id === currentUser.id;
    const isAssignedScopist = job.scopist_id === currentUser.id;
    const isSameFirm = !!currentUser.firmId && !!job.firm_id && currentUser.firmId === job.firm_id;

    if (!isPlatformAdmin && !isJobOwner && !isAssignedScopist && !isSameFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      .eq('user_id', currentUser.id); // Ensure user owns this session

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

