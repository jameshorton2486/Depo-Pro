// ═══════════════════════════════════════════════════════════════
// WKT DATABASE QUERIES
// ═══════════════════════════════════════════════════════════════
// Supabase query functions for WKT module

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CATEGORY_INFO } from '@/types/wkt';
import type {
  CategoryStats,
  WKTBookmark,
  WKTCategory,
  WKTMockExam,
  WKTQuestion,
  WKTUserProgress,
} from '@/types/wkt';

interface QuestionFilters {
  category?: WKTCategory;
  difficulty?: number;
  limit?: number;
  offset?: number;
}

interface SRSUpdate {
  easeFactor: number;
  intervalDays: number;
  nextReview: Date | string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
}

/**
 * Get questions with optional filters
 */
export async function getQuestions(
  filters: QuestionFilters = {}
): Promise<WKTQuestion[]> {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.from('wkt_questions').select('*');

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (typeof filters.difficulty === 'number') {
      query = query.eq('difficulty', filters.difficulty);
    }

    if (typeof filters.limit === 'number') {
      query = query.limit(filters.limit);
    }

    if (typeof filters.offset === 'number') {
      const limit = typeof filters.limit === 'number' ? filters.limit : 20;
      query = query.range(filters.offset, filters.offset + limit - 1);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as WKTQuestion[];
  } catch (error) {
    throw new Error(`Failed to fetch questions: ${getErrorMessage(error)}`);
  }
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(id: string): Promise<WKTQuestion | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('wkt_questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (data as WKTQuestion) || null;
  } catch (error) {
    throw new Error(`Failed to fetch question: ${getErrorMessage(error)}`);
  }
}

/**
 * Get random questions for practice
 */
export async function getRandomQuestions(
  count: number,
  category?: WKTCategory
): Promise<WKTQuestion[]> {
  try {
    if (count <= 0) {
      return [];
    }

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('wkt_questions').select('*');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return [];
    }

    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count) as WKTQuestion[];
  } catch (error) {
    throw new Error(`Failed to fetch random questions: ${getErrorMessage(error)}`);
  }
}

/**
 * Get user's progress for a question or all questions
 */
export async function getUserProgress(
  userId: string,
  questionId?: string
): Promise<WKTUserProgress | WKTUserProgress[] | null> {
  try {
    const supabase = await createSupabaseServerClient();

    if (questionId) {
      const { data, error } = await supabase
        .from('wkt_user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('question_id', questionId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return (data as WKTUserProgress) || null;
    }

    const { data, error } = await supabase
      .from('wkt_user_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data as WKTUserProgress[];
  } catch (error) {
    throw new Error(`Failed to fetch user progress: ${getErrorMessage(error)}`);
  }
}

/**
 * Update user progress after answering
 */
export async function updateUserProgress(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  srsData: SRSUpdate
): Promise<WKTUserProgress> {
  try {
    const supabase = await createSupabaseServerClient();
    const existing = await getUserProgress(userId, questionId);
    const nowIso = new Date().toISOString();
    const nextReviewIso = toIsoString(srsData.nextReview);

    if (existing && !Array.isArray(existing)) {
      const { data, error } = await supabase
        .from('wkt_user_progress')
        .update({
          attempts: existing.attempts + 1,
          correct_count: isCorrect
            ? existing.correct_count + 1
            : existing.correct_count,
          last_attempt: nowIso,
          next_review: nextReviewIso,
          ease_factor: srsData.easeFactor,
          interval_days: srsData.intervalDays,
          updated_at: nowIso,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as WKTUserProgress;
    }

    const { data, error } = await supabase
      .from('wkt_user_progress')
      .insert({
        user_id: userId,
        question_id: questionId,
        attempts: 1,
        correct_count: isCorrect ? 1 : 0,
        last_attempt: nowIso,
        next_review: nextReviewIso,
        ease_factor: srsData.easeFactor,
        interval_days: srsData.intervalDays,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as WKTUserProgress;
  } catch (error) {
    throw new Error(`Failed to update progress: ${getErrorMessage(error)}`);
  }
}

/**
 * Get questions due for SRS review
 */
export async function getQuestionsForReview(
  userId: string,
  limit: number = 50
): Promise<WKTQuestion[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();

    const { data: progressData, error: progressError } = await supabase
      .from('wkt_user_progress')
      .select('question_id')
      .eq('user_id', userId)
      .lte('next_review', now)
      .order('next_review', { ascending: true })
      .limit(limit);

    if (progressError) {
      throw new Error(progressError.message);
    }

    if (!progressData || progressData.length === 0) {
      return [];
    }

    const questionIds = progressData.map((progress) => progress.question_id);
    const { data: questions, error: questionsError } = await supabase
      .from('wkt_questions')
      .select('*')
      .in('id', questionIds);

    if (questionsError) {
      throw new Error(questionsError.message);
    }

    return (questions || []) as WKTQuestion[];
  } catch (error) {
    throw new Error(`Failed to fetch review questions: ${getErrorMessage(error)}`);
  }
}

/**
 * Get user's mock exams
 */
export async function getUserExams(
  userId: string,
  limit: number = 10
): Promise<WKTMockExam[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('wkt_mock_exams')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as WKTMockExam[];
  } catch (error) {
    throw new Error(`Failed to fetch exams: ${getErrorMessage(error)}`);
  }
}

/**
 * Create a new mock exam
 */
export async function createMockExam(
  userId: string,
  questionIds: string[]
): Promise<WKTMockExam> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('wkt_mock_exams')
      .insert({
        user_id: userId,
        total_questions: questionIds.length,
        question_ids: questionIds,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as WKTMockExam;
  } catch (error) {
    throw new Error(`Failed to create exam: ${getErrorMessage(error)}`);
  }
}

/**
 * Submit mock exam results
 */
export async function submitExamResults(
  examId: string,
  answers: Record<string, string>,
  correctAnswers: number,
  timeSpent: number,
  categoryScores: Record<WKTCategory, { total: number; correct: number }>
): Promise<WKTMockExam> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: exam, error: examError } = await supabase
      .from('wkt_mock_exams')
      .select('total_questions')
      .eq('id', examId)
      .maybeSingle();

    if (examError) {
      throw new Error(examError.message);
    }

    const totalQuestions = exam?.total_questions ?? 0;
    const scorePercentage =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const { data, error } = await supabase
      .from('wkt_mock_exams')
      .update({
        completed_at: new Date().toISOString(),
        correct_answers: correctAnswers,
        score_percentage: scorePercentage,
        time_spent_seconds: timeSpent,
        category_scores: categoryScores,
        answers,
      })
      .eq('id', examId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as WKTMockExam;
  } catch (error) {
    throw new Error(`Failed to submit exam: ${getErrorMessage(error)}`);
  }
}

/**
 * Get user's bookmarks
 */
export async function getBookmarks(userId: string): Promise<WKTBookmark[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('wkt_bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as WKTBookmark[];
  } catch (error) {
    throw new Error(`Failed to fetch bookmarks: ${getErrorMessage(error)}`);
  }
}

/**
 * Add bookmark
 */
export async function addBookmark(
  userId: string,
  questionId: string,
  notes?: string
): Promise<WKTBookmark> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: existing, error: existingError } = await supabase
      .from('wkt_bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      const { data, error } = await supabase
        .from('wkt_bookmarks')
        .update({ notes: notes || null })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as WKTBookmark;
    }

    const { data, error } = await supabase
      .from('wkt_bookmarks')
      .insert({
        user_id: userId,
        question_id: questionId,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as WKTBookmark;
  } catch (error) {
    throw new Error(`Failed to add bookmark: ${getErrorMessage(error)}`);
  }
}

/**
 * Remove bookmark
 */
export async function removeBookmark(
  userId: string,
  questionId: string
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('wkt_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('question_id', questionId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    throw new Error(`Failed to remove bookmark: ${getErrorMessage(error)}`);
  }
}

/**
 * Get category stats for a user
 */
export async function getCategoryStats(userId: string): Promise<CategoryStats[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: questions, error: questionsError } = await supabase
      .from('wkt_questions')
      .select('id, category');

    if (questionsError) {
      throw new Error(questionsError.message);
    }

    const { data: progress, error: progressError } = await supabase
      .from('wkt_user_progress')
      .select('question_id, attempts, correct_count')
      .eq('user_id', userId);

    if (progressError) {
      throw new Error(progressError.message);
    }

    const categories = Object.keys(CATEGORY_INFO) as WKTCategory[];
    const questionsByCategory = new Map<WKTCategory, Set<string>>();

    for (const category of categories) {
      questionsByCategory.set(category, new Set());
    }

    (questions || []).forEach((question) => {
      const category = question.category as WKTCategory;
      if (!questionsByCategory.has(category)) {
        questionsByCategory.set(category, new Set());
      }
      questionsByCategory.get(category)?.add(question.id);
    });

    const progressByQuestion = new Map<string, { attempts: number; correct: number }>();
    (progress || []).forEach((item) => {
      progressByQuestion.set(item.question_id, {
        attempts: item.attempts,
        correct: item.correct_count,
      });
    });

    return categories.map((category) => {
      const questionIds = questionsByCategory.get(category) || new Set<string>();
      const progressForCategory = Array.from(questionIds)
        .map((id) => progressByQuestion.get(id))
        .filter((item): item is { attempts: number; correct: number } => Boolean(item));

      const attempted = progressForCategory.length;
      const correct = progressForCategory.reduce(
        (sum, item) => sum + item.correct,
        0
      );
      const total = questionIds.size;
      const percentage = attempted > 0 ? (correct / attempted) * 100 : 0;
      const mastered = progressForCategory.filter(
        (item) => item.attempts >= 3 && item.correct / item.attempts >= 0.8
      ).length;

      return {
        category,
        total,
        attempted,
        correct,
        percentage: Math.round(percentage * 100) / 100,
        mastered,
      };
    });
  } catch (error) {
    throw new Error(`Failed to fetch category stats: ${getErrorMessage(error)}`);
  }
}
