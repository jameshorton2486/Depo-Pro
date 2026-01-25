// ═══════════════════════════════════════════════════════════════
// WKT EXAM READINESS CALCULATOR
// ═══════════════════════════════════════════════════════════════
// Conservative calculation of user's readiness for the actual exam

import type { WKTMockExam } from '@/types/wkt';

export interface CategoryStat {
  category: string;
  total: number;
  correct: number;
  attempted: number;
}

export interface ReadinessResult {
  overallScore: number; // 0-100
  isReady: boolean; // true only if >= 85 and all criteria met
  recommendation: string;
}

/**
 * Calculate exam readiness score
 * Conservative calculation requiring strong performance across all areas
 */
export function calculateReadiness(
  categoryStats: CategoryStat[],
  recentExams: WKTMockExam[],
  totalAttempted: number,
  totalQuestions: number
): ReadinessResult {
  // 1. Category average (40% weight) - all categories must be >= 70%
  let categoryScore = 0;
  let allCategoriesPassing = true;
  let weakestCategory = '';
  let weakestScore = 100;

  for (const stat of categoryStats) {
    if (stat.attempted === 0) {
      allCategoriesPassing = false;
      weakestCategory = stat.category;
      weakestScore = 0;
      continue;
    }

    const categoryPercentage = (stat.correct / stat.attempted) * 100;
    categoryScore += categoryPercentage;

    if (categoryPercentage < 70) {
      allCategoriesPassing = false;
    }

    if (categoryPercentage < weakestScore) {
      weakestScore = categoryPercentage;
      weakestCategory = stat.category;
    }
  }

  const categoryAverage = categoryStats.length > 0 ? categoryScore / categoryStats.length : 0;
  const categoryWeighted = categoryAverage * 0.4;

  // 2. Mock exam average of last 3 (40% weight) - must be >= 75%
  const lastThreeExams = recentExams
    .filter((e) => e.completed_at && e.score_percentage !== null)
    .slice(0, 3);

  let examAverage = 0;
  let examWeighted = 0;
  let examsPassing = false;

  if (lastThreeExams.length > 0) {
    const examScores = lastThreeExams.map((e) => e.score_percentage!);
    examAverage = examScores.reduce((a, b) => a + b, 0) / examScores.length;
    examWeighted = examAverage * 0.4;
    examsPassing = examAverage >= 75;
  }

  // 3. Coverage (20% weight) - attempted / total questions
  const coverage = totalQuestions > 0 ? (totalAttempted / totalQuestions) * 100 : 0;
  const coverageWeighted = Math.min(coverage, 100) * 0.2; // Cap at 100%

  // Overall score
  const overallScore = Math.round(categoryWeighted + examWeighted + coverageWeighted);

  // Generate recommendation
  let recommendation = '';
  if (overallScore >= 85 && allCategoriesPassing && examsPassing && totalAttempted >= 300) {
    recommendation = 'You are ready for the exam! Continue practicing to maintain your skills.';
  } else if (!allCategoriesPassing) {
    recommendation = `Focus on improving ${weakestCategory}. Your score there is ${Math.round(weakestScore)}%.`;
  } else if (!examsPassing && lastThreeExams.length > 0) {
    recommendation = `Your mock exam average is ${Math.round(examAverage)}%. Aim for 75% or higher.`;
  } else if (totalAttempted < 300) {
    recommendation = `You've attempted ${totalAttempted} questions. Try to reach at least 300 for better coverage.`;
  } else {
    recommendation = 'Keep practicing across all categories to improve your readiness score.';
  }

  // isReady = true ONLY if:
  // - Overall score >= 85
  // - All categories >= 70%
  // - Mock exam average >= 75% (if any exams taken)
  // - At least 300 questions attempted
  const isReady =
    overallScore >= 85 &&
    allCategoriesPassing &&
    (lastThreeExams.length === 0 || examsPassing) &&
    totalAttempted >= 300;

  return {
    overallScore,
    isReady,
    recommendation,
  };
}
