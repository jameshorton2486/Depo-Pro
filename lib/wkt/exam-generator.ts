// ═══════════════════════════════════════════════════════════════
// WKT MOCK EXAM GENERATOR
// ═══════════════════════════════════════════════════════════════

import { getQuestions, getUserProgress } from './queries';
import { MOCK_EXAM_DISTRIBUTION } from '@/types/wkt';
import type { WKTQuestion, WKTCategory } from '@/types/wkt';

/**
 * Generate 100 question IDs for a mock exam following the distribution
 * Prioritizes questions user hasn't seen, then wrong answers, then random
 */
export async function generateExamQuestions(
  userId: string
): Promise<string[]> {
  const questionIds: string[] = [];

  // Get user's progress to prioritize unseen/wrong questions
  const userProgress = await getUserProgress(userId);
  const progressMap = new Map<string, { attempts: number; correct_count: number }>();
  
  if (userProgress && !Array.isArray(userProgress)) {
    progressMap.set(userProgress.question_id, {
      attempts: userProgress.attempts,
      correct_count: userProgress.correct_count,
    });
  } else if (Array.isArray(userProgress)) {
    userProgress.forEach((p) => {
      progressMap.set(p.question_id, {
        attempts: p.attempts,
        correct_count: p.correct_count,
      });
    });
  }

  // For each category, get questions and prioritize
  for (const [category, count] of Object.entries(MOCK_EXAM_DISTRIBUTION)) {
    const allQuestions = await getQuestions({
      category: category as WKTCategory,
    });

    // Separate into: unseen, wrong, correct
    const unseen: WKTQuestion[] = [];
    const wrong: WKTQuestion[] = [];
    const correct: WKTQuestion[] = [];

    for (const question of allQuestions) {
      const progress = progressMap.get(question.id);
      if (!progress) {
        unseen.push(question);
      } else if (progress.correct_count === 0 || progress.correct_count / progress.attempts < 0.5) {
        wrong.push(question);
      } else {
        correct.push(question);
      }
    }

    // Shuffle each group
    const shuffle = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Prioritize: unseen first, then wrong, then correct
    const prioritized = [
      ...shuffle(unseen),
      ...shuffle(wrong),
      ...shuffle(correct),
    ];

    // Take the required count
    const selected = prioritized.slice(0, count);
    questionIds.push(...selected.map((q) => q.id));
  }

  // Shuffle the final array to mix categories
  const shuffled = [...questionIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Calculate exam score from questions and answers
 */
export function calculateExamScore(
  questions: WKTQuestion[],
  answers: Record<string, string>
): {
  total: number;
  correct: number;
  percentage: number;
  passed: boolean;
  categoryScores: Record<string, { total: number; correct: number }>;
} {
  let total = 0;
  let correct = 0;
  const categoryScores: Record<string, { total: number; correct: number }> = {};

  for (const question of questions) {
    total++;
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer === question.correct_answer;

    if (isCorrect) {
      correct++;
    }

    // Track by category
    if (!categoryScores[question.category]) {
      categoryScores[question.category] = { total: 0, correct: 0 };
    }
    categoryScores[question.category].total++;
    if (isCorrect) {
      categoryScores[question.category].correct++;
    }
  }

  const percentage = total > 0 ? Math.round((correct / total) * 100 * 100) / 100 : 0;
  const passed = percentage >= 75;

  return {
    total,
    correct,
    percentage,
    passed,
    categoryScores,
  };
}
