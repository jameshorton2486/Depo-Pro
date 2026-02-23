// app/api/review-sessions/route.ts
// Feature 5: Review Session Duration Tracking - Create session
// Workflow Intelligence Plan - Phase A

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/enums/roles';
import { createReviewSessionSchema } from '@/lib/api/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/review-sessions
 * Create a new review session
 */
export async function POST(req: NextRequest) {
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

    let parsed: z.infer<typeof createReviewSessionSchema>;
    try {
      const body = await req.json();
      parsed = createReviewSessionSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { transcriptionId, jobId, riskScore, flaggedCount } = parsed;

    const supabase = await createSupabaseServerClient();

    // Validate transcription belongs to the provided job
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('id, job_id')
      .eq('id', transcriptionId)
      .single();

    if (transcriptionError || !transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    if (transcription.job_id !== jobId) {
      return NextResponse.json({ error: 'Transcription does not belong to job' }, { status: 400 });
    }

    // Validate tenant/job access before creating a review session
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, firm_id, created_by_id, scopist_id')
      .eq('id', jobId)
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

    // Insert new review session
    const { data, error } = await supabase
      .from('review_sessions')
      .insert({
        transcription_id: transcriptionId,
        job_id: jobId,
        user_id: currentUser.id,
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

