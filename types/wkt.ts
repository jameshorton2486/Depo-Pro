/**
 * WKT (Written Knowledge Test) Quiz Module Types
 * TypeScript definitions for Texas CSR certification preparation
 */

// =============================================================================
// TYPE UNIONS
// =============================================================================

export type WKTCategory =
  | 'medical_terminology'
  | 'legal_terminology'
  | 'grammar_usage'
  | 'spelling'
  | 'texas_rules'
  | 'reporter_duties';

export type WKTQuestionType = 'multiple_choice' | 'fill_blank' | 'true_false';

export type WKTSessionType = 'practice' | 'review' | 'mock_exam' | 'flashcards';

// =============================================================================
// DATABASE INTERFACES (match database schema exactly)
// =============================================================================

export interface WKTQuestion {
  id: string;
  question_text: string;
  question_type: WKTQuestionType;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  category: WKTCategory;
  subcategory: string | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  source_reference: string | null;
  ai_generated: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface WKTUserProgress {
  id: string;
  user_id: string;
  question_id: string;
  attempts: number;
  correct_count: number;
  last_attempt: string | null;
  next_review: string | null;
  ease_factor: number;
  interval_days: number;
  created_at: string;
  updated_at: string;
}

export interface WKTMockExam {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  total_questions: number;
  correct_answers: number | null;
  score_percentage: number | null;
  time_spent_seconds: number | null;
  category_scores: Record<WKTCategory, { total: number; correct: number }> | null;
  question_ids: string[];
  answers: Record<string, string> | null;
  passed: boolean | null;
}

export interface WKTBookmark {
  id: string;
  user_id: string;
  question_id: string;
  notes: string | null;
  created_at: string;
}

export interface WKTStudySession {
  id: string;
  user_id: string;
  session_type: WKTSessionType;
  category: WKTCategory | null;
  questions_answered: number;
  correct_answers: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

// =============================================================================
// UI/DISPLAY INTERFACES
// =============================================================================

export interface CategoryStats {
  category: WKTCategory;
  total: number;
  attempted: number;
  correct: number;
  percentage: number;
  mastered: number;
}

export interface ExamResult {
  examId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  categoryBreakdown: CategoryStats[];
  weakestCategories: WKTCategory[];
  incorrectQuestions: WKTQuestion[];
}

export interface DailyReviewQueue {
  dueToday: number;
  dueThisWeek: number;
  questions: Array<WKTQuestion & { progress: WKTUserProgress }>;
}

export interface UserReadiness {
  overallScore: number;
  isReady: boolean;
  mockExamAverage: number;
  categoryReadiness: Record<WKTCategory, { score: number; ready: boolean }>;
  recommendation: string;
  daysStudied: number;
  totalQuestionsAttempted: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const CATEGORY_INFO: Record<
  WKTCategory,
  { label: string; icon: string; color: string; examWeight: number }
> = {
  medical_terminology: {
    label: 'Medical Terminology',
    icon: 'Stethoscope',
    color: 'red',
    examWeight: 20,
  },
  legal_terminology: {
    label: 'Legal Terminology',
    icon: 'Scale',
    color: 'blue',
    examWeight: 20,
  },
  grammar_usage: {
    label: 'Grammar & Usage',
    icon: 'BookOpen',
    color: 'green',
    examWeight: 15,
  },
  spelling: {
    label: 'Spelling',
    icon: 'SpellCheck',
    color: 'purple',
    examWeight: 15,
  },
  texas_rules: {
    label: 'Texas Rules & Procedures',
    icon: 'FileText',
    color: 'orange',
    examWeight: 20,
  },
  reporter_duties: {
    label: 'Reporter Duties',
    icon: 'Briefcase',
    color: 'teal',
    examWeight: 10,
  },
};

export const MOCK_EXAM_DISTRIBUTION: Record<WKTCategory, number> = {
  medical_terminology: 20,
  legal_terminology: 20,
  grammar_usage: 15,
  spelling: 15,
  texas_rules: 20,
  reporter_duties: 10,
};

// =============================================================================
// CONSTANTS FOR BUSINESS LOGIC
// =============================================================================

/** Passing score for mock exams (75%) */
export const MOCK_EXAM_PASSING_SCORE = 75;

/** Minimum readiness score to be considered "ready" (85%) */
export const READINESS_THRESHOLD = 85;

/** Minimum category score for readiness (70%) */
export const MIN_CATEGORY_SCORE = 70;

/** Minimum mock exam average for readiness (75%) */
export const MIN_MOCK_EXAM_AVERAGE = 75;

/** Minimum questions attempted for readiness */
export const MIN_QUESTIONS_ATTEMPTED = 300;

/** Mastery threshold: 80% correct rate with 3+ attempts */
export const MASTERY_THRESHOLD = 0.8;
export const MASTERY_MIN_ATTEMPTS = 3;
