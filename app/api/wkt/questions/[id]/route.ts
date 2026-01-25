// ═══════════════════════════════════════════════════════════════
// WKT QUESTION BY ID API
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getQuestionById,
  getUserProgress,
  updateUserProgress,
} from '@/lib/wkt/queries';
import { calculateNextReview, getQualityFromAnswer } from '@/lib/wkt/srs';

/**
 * GET /api/wkt/questions/[id]
 * Get single question with user's progress if available
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const question = await getQuestionById(id);

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Get user's progress for this question
    const progress = await getUserProgress(user.id, id);

    return NextResponse.json({
      question,
      progress: progress && !Array.isArray(progress) ? progress : null,
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wkt/questions/[id]
 * Submit answer and update progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { answer } = body;

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json(
        { error: 'Answer is required' },
        { status: 400 }
      );
    }

    // Get question
    const question = await getQuestionById(id);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Check if answer is correct
    const isCorrect = answer.trim() === question.correct_answer.trim();

    // Get current progress to determine attempt number
    const currentProgress = await getUserProgress(user.id, id);
    const attemptNumber =
      currentProgress && !Array.isArray(currentProgress)
        ? currentProgress.attempts + 1
        : 1;

    // Calculate SRS values
    const currentEaseFactor =
      currentProgress && !Array.isArray(currentProgress)
        ? currentProgress.ease_factor
        : 2.5;
    const currentInterval =
      currentProgress && !Array.isArray(currentProgress)
        ? currentProgress.interval_days
        : 1;

    const quality = getQualityFromAnswer(isCorrect);
    const srsResult = calculateNextReview(
      currentEaseFactor,
      currentInterval,
      quality,
      attemptNumber
    );

    // Update progress
    await updateUserProgress(user.id, id, isCorrect, {
      easeFactor: srsResult.newEaseFactor,
      intervalDays: srsResult.newInterval,
      nextReview: srsResult.nextReview,
    });

    return NextResponse.json({
      correct: isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
