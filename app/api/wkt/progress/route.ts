// ═══════════════════════════════════════════════════════════════
// WKT PROGRESS API
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getQuestions, getUserProgress, getUserExams } from '@/lib/wkt/queries';
import { calculateReadiness } from '@/lib/wkt/readiness';
import type { WKTCategory } from '@/types/wkt';
import { CATEGORY_INFO } from '@/types/wkt';

/**
 * GET /api/wkt/progress
 * Get comprehensive progress data
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all questions to calculate totals
    const allQuestions = await getQuestions();
    const totalQuestions = allQuestions.length;

    // Get user progress
    const userProgress = await getUserProgress(user.id);
    const progressArray = Array.isArray(userProgress) ? userProgress : userProgress ? [userProgress] : [];

    // Calculate stats
    const questionsAttempted = new Set(progressArray.map((p) => p.question_id)).size;
    
    // Mastered = 80%+ correct rate with 3+ attempts
    const mastered = progressArray.filter(
      (p) => p.attempts >= 3 && p.correct_count / p.attempts >= 0.8
    ).length;

    // Calculate current streak (consecutive days with activity)
    // This is simplified - in production, you'd track daily activity
    const currentStreak = 0; // TODO: Implement streak tracking

    // Calculate category stats
    const categoryStats = Object.keys(CATEGORY_INFO).map((category) => {
      const categoryQuestions = allQuestions.filter(
        (q) => q.category === category
      );
      const categoryProgress = progressArray.filter((p) => {
        const question = categoryQuestions.find((q) => q.id === p.question_id);
        return question !== undefined;
      });

      const attempted = categoryProgress.length;
      const correct = categoryProgress.reduce(
        (sum, p) => sum + p.correct_count,
        0
      );
      const total = categoryQuestions.length;
      const percentage = attempted > 0 ? (correct / attempted) * 100 : 0;

      return {
        category: category as WKTCategory,
        total,
        attempted,
        correct,
        percentage: Math.round(percentage * 100) / 100,
        mastered: categoryProgress.filter(
          (p) => p.attempts >= 3 && p.correct_count / p.attempts >= 0.8
        ).length,
      };
    });

    // Get recent exams for readiness calculation
    const recentExams = await getUserExams(user.id, 10);

    // Calculate readiness
    const readiness = calculateReadiness(
      categoryStats,
      recentExams,
      questionsAttempted,
      totalQuestions
    );

    return NextResponse.json({
      totalQuestions,
      questionsAttempted,
      questionsMastered: mastered,
      currentStreak,
      categoryStats,
      readiness: {
        overallScore: readiness.overallScore,
        isReady: readiness.isReady,
        recommendation: readiness.recommendation,
      },
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
