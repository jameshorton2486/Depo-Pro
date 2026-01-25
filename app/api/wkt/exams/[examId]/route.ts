// ═══════════════════════════════════════════════════════════════
// WKT EXAM BY ID API
// ═══════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getUserExams,
  submitExamResults,
  getQuestionById,
  getUserProgress,
  updateUserProgress,
} from '@/lib/wkt/queries';
import { calculateExamScore } from '@/lib/wkt/exam-generator';
import { getQualityFromAnswer, calculateNextReview } from '@/lib/wkt/srs';

/**
 * GET /api/wkt/exams/[examId]
 * Get exam details with questions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId } = await params;
    const exams = await getUserExams(user.id, 100); // Get enough to find this one
    const exam = exams.find((e) => e.id === examId);

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Fetch question data
    const questions = await Promise.all(
      exam.question_ids.map((id) => getQuestionById(id))
    );

    const validQuestions = questions.filter(
      (q): q is NonNullable<typeof q> => q !== null
    );

    return NextResponse.json({
      exam,
      questions: validQuestions,
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wkt/exams/[examId]
 * Submit exam results
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId } = await params;
    const body = await request.json();
    const { answers, timeSpent } = body;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'Answers are required' },
        { status: 400 }
      );
    }

    if (typeof timeSpent !== 'number') {
      return NextResponse.json(
        { error: 'Time spent is required' },
        { status: 400 }
      );
    }

    // Get exam and questions
    const exams = await getUserExams(user.id, 100);
    const exam = exams.find((e) => e.id === examId);

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (exam.completed_at) {
      return NextResponse.json(
        { error: 'Exam already completed' },
        { status: 400 }
      );
    }

    // Fetch questions
    const questions = await Promise.all(
      exam.question_ids.map((id) => getQuestionById(id))
    );

    const validQuestions = questions.filter(
      (q): q is NonNullable<typeof q> => q !== null
    );

    // Calculate score
    const scoreResult = calculateExamScore(validQuestions, answers);

    // Submit exam results
    const updatedExam = await submitExamResults(
      examId,
      answers,
      timeSpent,
      scoreResult.correct,
      scoreResult.percentage,
      scoreResult.categoryScores,
      scoreResult.passed
    );

    // Update user progress for each question
    for (const question of validQuestions) {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correct_answer;

      // Get current progress
      const currentProgress = await getUserProgress(user.id, question.id);
      const attemptNumber =
        currentProgress && !Array.isArray(currentProgress)
          ? currentProgress.attempts + 1
          : 1;
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

      try {
        await updateUserProgress(
          user.id,
          question.id,
          isCorrect,
          srsResult.newEaseFactor,
          srsResult.newInterval,
          srsResult.nextReview
        );
      } catch (error) {
        // Log but don't fail the entire submission
        console.error(`Failed to update progress for question ${question.id}:`, error);
      }
    }

    return NextResponse.json({
      exam: updatedExam,
      score: scoreResult.percentage,
      passed: scoreResult.passed,
      correct: scoreResult.correct,
      total: scoreResult.total,
      categoryScores: scoreResult.categoryScores,
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json(
      { error: 'Failed to submit exam' },
      { status: 500 }
    );
  }
}
