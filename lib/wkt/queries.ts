// ═══════════════════════════════════════════════════════════════
// WKT DATABASE QUERIES
// ═══════════════════════════════════════════════════════════════
// Supabase query functions for WKT module

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  WKTQuestion,
  WKTUserProgress,
  WKTMockExam,
  WKTBookmark,
  WKTCategory,
} from '@/types/wkt';

/**
 * Get questions with optional filters
 */
export async function getQuestions(filters?: {
  category?: WKTCategory;
  difficulty?: number;
  limit?: number;
  offset?: number;
}): Promise<WKTQuestion[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('wkt_questions').select('*');

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`);
  }

  return (data || []) as WKTQuestion[];
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(id: string): Promise<WKTQuestion | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wkt_questions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch question: ${error.message}`);
  }

  return data as WKTQuestion;
}

/**
 * Get random questions for practice
 */
export async function getRandomQuestions(
  count: number,
  category?: WKTCategory
): Promise<WKTQuestion[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('wkt_questions').select('*');

  if (category) {
    query = query.eq('category', category);
  }

  // Get all matching questions first, then shuffle in memory
  // This is simpler than trying to do random in SQL
  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Shuffle array and take first N
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count) as WKTQuestion[];
}

/**
 * Get user's progress for a question or all questions
 */
export async function getUserProgress(
  userId: string,
  questionId?: string
): Promise<WKTUserProgress | WKTUserProgress[] | null> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('wkt_user_progress')
    .select('*')
    .eq('user_id', userId);

  if (questionId) {
    query = query.eq('question_id', questionId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch user progress: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  if (questionId) {
    return (data[0] as WKTUserProgress) || null;
  }

  return data as WKTUserProgress[];
}

/**
 * Update user progress after answering
 */
export async function updateUserProgress(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  easeFactor: number,
  intervalDays: number,
  nextReview: Date
): Promise<WKTUserProgress> {
  const supabase = await createSupabaseServerClient();

  // Check if progress record exists
  const existing = await getUserProgress(userId, questionId);

  if (existing && !Array.isArray(existing)) {
    // Update existing record
    const { data, error } = await supabase
      .from('wkt_user_progress')
      .update({
        attempts: existing.attempts + 1,
        correct_count: isCorrect ? existing.correct_count + 1 : existing.correct_count,
        last_attempt: new Date().toISOString(),
        next_review: nextReview.toISOString(),
        ease_factor: easeFactor,
        interval_days: intervalDays,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }

    return data as WKTUserProgress;
  } else {
    // Create new record
    const { data, error } = await supabase
      .from('wkt_user_progress')
      .insert({
        user_id: userId,
        question_id: questionId,
        attempts: 1,
        correct_count: isCorrect ? 1 : 0,
        last_attempt: new Date().toISOString(),
        next_review: nextReview.toISOString(),
        ease_factor: easeFactor,
        interval_days: intervalDays,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create progress: ${error.message}`);
    }

    return data as WKTUserProgress;
  }
}

/**
 * Get questions due for SRS review
 */
export async function getQuestionsForReview(
  userId: string,
  limit: number = 50
): Promise<WKTQuestion[]> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  // Get progress records where next_review <= now
  const { data: progressData, error: progressError } = await supabase
    .from('wkt_user_progress')
    .select('question_id')
    .eq('user_id', userId)
    .lte('next_review', now)
    .order('next_review', { ascending: true })
    .limit(limit);

  if (progressError) {
    throw new Error(`Failed to fetch review queue: ${progressError.message}`);
  }

  if (!progressData || progressData.length === 0) {
    return [];
  }

  // Fetch the actual questions
  const questionIds = progressData.map((p) => p.question_id);
  const { data: questions, error: questionsError } = await supabase
    .from('wkt_questions')
    .select('*')
    .in('id', questionIds);

  if (questionsError) {
    throw new Error(`Failed to fetch questions: ${questionsError.message}`);
  }

  return (questions || []) as WKTQuestion[];
}

/**
 * Get user's mock exams
 */
export async function getUserExams(
  userId: string,
  limit: number = 10
): Promise<WKTMockExam[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wkt_mock_exams')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch exams: ${error.message}`);
  }

  return (data || []) as WKTMockExam[];
}

/**
 * Create a new mock exam
 */
export async function createMockExam(
  userId: string,
  questionIds: string[]
): Promise<WKTMockExam> {
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
    throw new Error(`Failed to create exam: ${error.message}`);
  }

  return data as WKTMockExam;
}

/**
 * Submit mock exam results
 */
export async function submitExamResults(
  examId: string,
  answers: Record<string, string>,
  timeSpent: number,
  correctAnswers: number,
  scorePercentage: number,
  categoryScores: Record<string, { total: number; correct: number }>,
  passed: boolean
): Promise<WKTMockExam> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wkt_mock_exams')
    .update({
      completed_at: new Date().toISOString(),
      correct_answers: correctAnswers,
      score_percentage: scorePercentage,
      time_spent_seconds: timeSpent,
      category_scores: categoryScores,
      answers,
      passed,
    })
    .eq('id', examId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit exam: ${error.message}`);
  }

  return data as WKTMockExam;
}

/**
 * Get user's bookmarks
 */
export async function getBookmarks(userId: string): Promise<WKTBookmark[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('wkt_bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch bookmarks: ${error.message}`);
  }

  return (data || []) as WKTBookmark[];
}

/**
 * Add bookmark
 */
export async function addBookmark(
  userId: string,
  questionId: string,
  notes?: string
): Promise<WKTBookmark> {
  const supabase = await createSupabaseServerClient();

  // Check if bookmark already exists
  const existing = await supabase
    .from('wkt_bookmarks')
    .select('*')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .single();

  if (existing.data) {
    // Update existing bookmark
    const { data, error } = await supabase
      .from('wkt_bookmarks')
      .update({ notes: notes || null })
      .eq('id', existing.data.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update bookmark: ${error.message}`);
    }

    return data as WKTBookmark;
  }

  // Create new bookmark
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
    throw new Error(`Failed to create bookmark: ${error.message}`);
  }

  return data as WKTBookmark;
}

/**
 * Remove bookmark
 */
export async function removeBookmark(
  userId: string,
  questionId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('wkt_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('question_id', questionId);

  if (error) {
    throw new Error(`Failed to remove bookmark: ${error.message}`);
  }
}
