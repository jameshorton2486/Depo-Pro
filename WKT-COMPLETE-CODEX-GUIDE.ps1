# ================================================================================
# WKT QUIZ MODULE - COMPLETE CODEX BUILD GUIDE
# ================================================================================
#
# PREREQUISITES COMPLETED:
# [x] You are on branch: feature/wkt-quiz-module
# [x] You created: data\wkt folder
# [x] Database tables created manually in Supabase Dashboard
#
# HOW TO USE THIS FILE:
# 1. Open this file in Notepad or VS Code (NOT PowerShell)
# 2. Copy ONE codex command at a time
# 3. Paste into PowerShell and press Enter
# 4. Wait for Codex to finish before running the next command
# 5. Run the git commands after each phase
#
# YOUR PROJECT PATH: C:\Users\james\depo-pro
# YOUR SUPABASE TOKEN: sbp_2d8b9b35d8fa82a288695aadc4dc400d6269b211
#
# ================================================================================


# ================================================================================
# PHASE 1: TYPESCRIPT TYPES AND ROLES
# ================================================================================

# ------------------------------------------------------------------------------
# PROMPT 1.1: Create TypeScript Types for WKT
# Copy everything from codex to the closing quote:
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro, a Next.js 14 App Router project with Supabase.

TASK: Create types/wkt.ts with all TypeScript definitions for the WKT Quiz Module.

The database already has these tables created:
- wkt_questions
- wkt_user_progress
- wkt_mock_exams
- wkt_bookmarks
- wkt_study_sessions

Create the following in types/wkt.ts:

INTERFACES (match the database exactly):

export interface WKTQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'fill_blank' | 'true_false';
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

TYPE UNIONS:

export type WKTCategory = 
  | 'medical_terminology'
  | 'legal_terminology'
  | 'grammar_usage'
  | 'spelling'
  | 'texas_rules'
  | 'reporter_duties';

export type WKTQuestionType = 'multiple_choice' | 'fill_blank' | 'true_false';

export type WKTSessionType = 'practice' | 'review' | 'mock_exam' | 'flashcards';

UI/DISPLAY INTERFACES:

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

CONSTANTS:

export const CATEGORY_INFO: Record<WKTCategory, { label: string; icon: string; color: string; examWeight: number }> = {
  medical_terminology: { label: 'Medical Terminology', icon: 'Stethoscope', color: 'red', examWeight: 20 },
  legal_terminology: { label: 'Legal Terminology', icon: 'Scale', color: 'blue', examWeight: 20 },
  grammar_usage: { label: 'Grammar & Usage', icon: 'BookOpen', color: 'green', examWeight: 15 },
  spelling: { label: 'Spelling', icon: 'SpellCheck', color: 'purple', examWeight: 15 },
  texas_rules: { label: 'Texas Rules & Procedures', icon: 'FileText', color: 'orange', examWeight: 20 },
  reporter_duties: { label: 'Reporter Duties', icon: 'Briefcase', color: 'teal', examWeight: 10 },
};

export const MOCK_EXAM_DISTRIBUTION: Record<WKTCategory, number> = {
  medical_terminology: 20,
  legal_terminology: 20,
  grammar_usage: 15,
  spelling: 15,
  texas_rules: 20,
  reporter_duties: 10,
};

Export everything."


# ------------------------------------------------------------------------------
# PROMPT 1.2: Add WKT Student Role
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Add the wkt_student role to the existing role system.

STEP 1 - Check if lib/enums/roles.ts exists. If it does, add 'wkt_student' to it. If not, create it with:
export type UserRole = 'admin' | 'reporter' | 'scopist' | 'attorney' | 'wkt_student';

STEP 2 - Check if lib/permissions/matrix.ts exists. If it does, add wkt_student with empty permissions for existing features, then add these new WKT permissions granted only to wkt_student:
- wkt:practice
- wkt:mock_exam
- wkt:flashcards
- wkt:view_progress
- wkt:bookmarks

If lib/permissions/matrix.ts does not exist, create a simple version.

STEP 3 - Create lib/auth/wkt-guard.ts with these functions:

export function isWKTUser(role: string | null | undefined): boolean {
  return role === 'wkt_student';
}

export function requireWKTAccess(role: string | null | undefined): void {
  if (!isWKTUser(role)) {
    throw new Error('WKT access required');
  }
}

export function canAccessMainApp(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && role !== 'wkt_student';
}

export function canAccessWKT(role: string | null | undefined): boolean {
  return role === 'wkt_student';
}

IMPORTANT: Do NOT break any existing code. Only add new things."


# ------------------------------------------------------------------------------
# After Phase 1, run these commands:
# ------------------------------------------------------------------------------

npm run typecheck
git add -A
git commit -m "WKT: Add TypeScript types and wkt_student role"
git push origin feature/wkt-quiz-module


# ================================================================================
# PHASE 2: WKT LAYOUT AND PAGES
# ================================================================================

# ------------------------------------------------------------------------------
# PROMPT 2.1: Create WKT Layout and Dashboard
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create the WKT route group with its own layout, completely separate from main Depo-Pro.

CREATE: app/(wkt)/layout.tsx

Requirements:
- Add 'use client' at the top
- Check if user is authenticated using existing Supabase auth patterns from lib/supabase/
- If not authenticated, redirect to /login
- Do NOT use any components from app/(dashboard)/
- Create a clean, simple layout focused on studying

Layout structure:
- Header bar with:
  - Left: Text 'WKT Prep' that links to /wkt
  - Center: Navigation links - Dashboard | Practice | Mock Exam | Flashcards | Progress
  - Right: Simple user menu with Sign Out button
- Main content area below header
- Use Tailwind CSS classes
- Make it responsive - on mobile, show hamburger menu

CREATE: app/(wkt)/page.tsx (WKT Dashboard)

This is the home page showing:
- Welcome message: 'Welcome to WKT Prep'
- 4 stat cards in a row (use placeholder numbers for now):
  - Questions Mastered: 0
  - Mock Exams Taken: 0
  - Current Streak: 0 days
  - Due for Review: 0
- Two large buttons:
  - 'Start Practice' linking to /wkt/practice
  - 'Take Mock Exam' linking to /wkt/mock-exam
- Simple card with text 'Your exam readiness will appear here after you start practicing.'

Use existing UI components from components/ui/ if they exist (Button, Card, etc).
Use Tailwind CSS for styling.
Keep it simple and clean."


# ------------------------------------------------------------------------------
# PROMPT 2.2: Create Practice Page
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create the Practice Mode page for WKT.

CREATE: app/(wkt)/practice/page.tsx

Make it a client component with 'use client'.

PAGE LAYOUT:
- Left sidebar (hidden on mobile, 250px on desktop):
  - Title: 'Filters'
  - Category checkboxes for all 6 categories:
    - Medical Terminology
    - Legal Terminology
    - Grammar & Usage
    - Spelling
    - Texas Rules
    - Reporter Duties
  - Difficulty radio buttons: All | Easy | Medium | Hard
  - Toggle switch: 'Show missed only'
  - Button: 'Reset Filters'

- Main area:
  - Progress text: 'Question 1 of 10'
  - Question card with:
    - Category badge (colored based on category)
    - Question text (large, readable)
    - Answer options as radio buttons (A, B, C, D)
    - 'Submit Answer' button (disabled until answer selected)
  - After submitting:
    - Show if correct (green) or incorrect (red)
    - Show the correct answer
    - Show explanation if available
    - 'Next Question' button

STATE TO MANAGE (use React useState):
- questions: array of question objects (use placeholder data for now)
- currentIndex: number
- selectedAnswer: string or null
- isSubmitted: boolean
- isCorrect: boolean or null
- filters: object with categories, difficulty, missedOnly

PLACEHOLDER DATA - Create 5 sample questions like:
{
  id: '1',
  question_text: 'What does the medical term \"cardio\" refer to?',
  question_type: 'multiple_choice',
  options: ['Brain', 'Heart', 'Lung', 'Kidney'],
  correct_answer: 'Heart',
  explanation: 'Cardio is the Latin root meaning heart.',
  category: 'medical_terminology',
  difficulty: 2
}

On mobile: Hide sidebar, show 'Filters' button that could open a modal (just add the button for now)."


# ------------------------------------------------------------------------------
# PROMPT 2.3: Create Mock Exam Page
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create Mock Exam pages for WKT.

CREATE: app/(wkt)/mock-exam/page.tsx (Pre-exam screen)

Show:
- Title: 'Mock Examination'
- Info card explaining:
  - 100 Questions
  - 75% Required to Pass (75 correct)
  - Time is tracked but not limited
- Table showing question distribution:
  | Category | Questions |
  | Medical Terminology | 20 |
  | Legal Terminology | 20 |
  | Grammar & Usage | 15 |
  | Spelling | 15 |
  | Texas Rules | 20 |
  | Reporter Duties | 10 |
- Warning text: 'Make sure you have enough time to complete the exam.'
- Large 'Start Exam' button (for now just shows an alert saying 'Exam feature coming soon')

CREATE: app/(wkt)/mock-exam/results/page.tsx (Results page - placeholder)

Show:
- Title: 'Exam Results'
- Placeholder text: 'Your results will appear here after completing an exam.'
- Button: 'Back to Dashboard' linking to /wkt

Keep both pages simple for now - we will add the full exam logic later."


# ------------------------------------------------------------------------------
# PROMPT 2.4: Create Flashcards Page
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create Flashcards page for WKT.

CREATE: app/(wkt)/flashcards/page.tsx

Make it a client component.

Show a grid of deck cards (2 columns on desktop, 1 on mobile):

Each deck card shows:
- Icon (use emoji for now: medical=🏥, legal=⚖️, grammar=📖, spelling=✏️, texas=📋, duties=💼)
- Category name
- 'X cards' (use placeholder number like '50 cards')
- 'Study' button

Deck cards to show:
1. Medical Terminology - 🏥
2. Legal Terminology - ⚖️
3. Grammar & Usage - 📖
4. Spelling - ✏️
5. Texas Rules - 📋
6. Reporter Duties - 💼
7. Bookmarked Questions - ⭐
8. Due for Review - 🔄

When clicking Study button, show alert: 'Flashcard study coming soon!'

Keep it simple - no actual flashcard logic yet."


# ------------------------------------------------------------------------------
# PROMPT 2.5: Create Progress Page
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create Progress Dashboard page for WKT.

CREATE: app/(wkt)/progress/page.tsx

PAGE SECTIONS (all with placeholder data for now):

SECTION 1: Readiness Score
- Large text showing '0%' with label 'Exam Readiness'
- Text below: 'Start practicing to build your readiness score'
- Button: 'Take Mock Exam'

SECTION 2: Overall Stats (4 cards in a row)
- Total Questions: 573
- Attempted: 0
- Mastered: 0
- Study Streak: 0 days

SECTION 3: Category Progress (6 cards in a grid, 2x3 on desktop, 1 column mobile)
Each card shows:
- Category name
- Progress bar at 0%
- Text: '0 / X attempted' (X = number of questions in category)
- 'Practice' button

Use these question counts per category:
- Medical Terminology: 95
- Legal Terminology: 95
- Grammar & Usage: 86
- Spelling: 86
- Texas Rules: 115
- Reporter Duties: 96

SECTION 4: Recent Mock Exams
- Text: 'No mock exams taken yet'
- Button: 'Take Your First Exam'

SECTION 5: Weak Areas
- Text: 'Complete some practice sessions to identify weak areas'

Keep it simple with placeholder data. We will connect to real data later."


# ------------------------------------------------------------------------------
# After Phase 2, run these commands:
# ------------------------------------------------------------------------------

npm run typecheck
git add -A
git commit -m "WKT: Add all WKT pages - dashboard, practice, mock exam, flashcards, progress"
git push origin feature/wkt-quiz-module


# ================================================================================
# PHASE 3: API ROUTES
# ================================================================================

# ------------------------------------------------------------------------------
# PROMPT 3.1: Create WKT Database Queries Library
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create the database query functions for WKT.

CREATE: lib/wkt/queries.ts

Import the Supabase client from lib/supabase/server.ts or lib/supabase/client.ts (check which exists).
Import types from types/wkt.ts.

Create these functions:

// Get questions with optional filters
export async function getQuestions(filters?: {
  category?: string;
  difficulty?: number;
  limit?: number;
  offset?: number;
}): Promise<WKTQuestion[]>

// Get a single question by ID
export async function getQuestionById(id: string): Promise<WKTQuestion | null>

// Get random questions for practice
export async function getRandomQuestions(
  count: number,
  category?: string
): Promise<WKTQuestion[]>

// Get user's progress for a question
export async function getUserProgress(
  userId: string,
  questionId?: string
): Promise<WKTUserProgress | WKTUserProgress[] | null>

// Update user progress after answering
export async function updateUserProgress(
  userId: string,
  questionId: string,
  isCorrect: boolean
): Promise<WKTUserProgress>

// Get questions due for SRS review
export async function getQuestionsForReview(
  userId: string,
  limit?: number
): Promise<WKTQuestion[]>

// Get user's mock exams
export async function getUserExams(
  userId: string,
  limit?: number
): Promise<WKTMockExam[]>

// Create a new mock exam
export async function createMockExam(
  userId: string,
  questionIds: string[]
): Promise<WKTMockExam>

// Submit mock exam results
export async function submitExamResults(
  examId: string,
  answers: Record<string, string>,
  timeSpent: number
): Promise<WKTMockExam>

// Get user's bookmarks
export async function getBookmarks(userId: string): Promise<WKTBookmark[]>

// Add bookmark
export async function addBookmark(
  userId: string,
  questionId: string,
  notes?: string
): Promise<WKTBookmark>

// Remove bookmark
export async function removeBookmark(
  userId: string,
  questionId: string
): Promise<void>

Each function should use the Supabase client to query the appropriate wkt_* table.
Handle errors gracefully and return appropriate types."


# ------------------------------------------------------------------------------
# PROMPT 3.2: Create SM-2 Spaced Repetition Algorithm
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Implement the SM-2 spaced repetition algorithm for WKT flashcards.

CREATE: lib/wkt/srs.ts

The SM-2 algorithm determines when a user should review a flashcard based on how well they remembered it.

Quality ratings:
- 0: Complete blackout, no memory
- 1: Incorrect, but remembered upon seeing answer
- 2: Incorrect, but answer seemed easy to recall
- 3: Correct with serious difficulty
- 4: Correct with some hesitation
- 5: Perfect response

Create this function:

export function calculateNextReview(
  currentEaseFactor: number,  // Default 2.5, minimum 1.3
  currentInterval: number,    // Days since last review
  quality: 0 | 1 | 2 | 3 | 4 | 5
): {
  newEaseFactor: number;
  newInterval: number;
  nextReview: Date;
} {
  // SM-2 Algorithm:
  
  // 1. If quality < 3 (failed), reset interval to 1 day
  // 2. If quality >= 3 (passed):
  //    - If first review: interval = 1
  //    - If second review: interval = 6
  //    - Otherwise: interval = previous interval * ease factor
  
  // 3. Update ease factor:
  //    EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  //    Minimum EF = 1.3
  
  // 4. Calculate next review date
  
  // Return the new values
}

Also create a helper function:

export function getQualityFromAnswer(isCorrect: boolean, responseTime?: number): 0 | 1 | 2 | 3 | 4 | 5 {
  // Simple version:
  // - Correct = 4 (correct with some hesitation)
  // - Incorrect = 1 (incorrect but remembered upon seeing answer)
  // Can be enhanced later with response time
}

Add JSDoc comments explaining the algorithm."


# ------------------------------------------------------------------------------
# PROMPT 3.3: Create Questions API Routes
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create API routes for WKT questions.

First, check how authentication is done in existing API routes in app/api/ directory.
Use the same pattern for auth.

CREATE: app/api/wkt/questions/route.ts

GET /api/wkt/questions
- Query params: category, difficulty, limit (default 20), offset
- Returns: { questions: WKTQuestion[], total: number }
- Must be authenticated

CREATE: app/api/wkt/questions/[id]/route.ts

GET /api/wkt/questions/[id]
- Returns single question with user's progress if available
- Must be authenticated

POST /api/wkt/questions/[id]
- Body: { answer: string }
- Checks if answer is correct
- Updates user progress in wkt_user_progress table
- Updates SRS values using calculateNextReview from lib/wkt/srs.ts
- Returns: { correct: boolean, correctAnswer: string, explanation: string | null }

CREATE: app/api/wkt/questions/random/route.ts

GET /api/wkt/questions/random
- Query params: count (default 10), category (optional)
- Returns array of random questions
- Must be authenticated

Use the query functions from lib/wkt/queries.ts.
Return proper HTTP status codes (200, 400, 401, 404, 500)."


# ------------------------------------------------------------------------------
# PROMPT 3.4: Create Exams API Routes
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create API routes for WKT mock exams.

CREATE: lib/wkt/exam-generator.ts

export async function generateExamQuestions(userId: string): Promise<string[]> {
  // Generate 100 question IDs following this distribution:
  // - medical_terminology: 20
  // - legal_terminology: 20
  // - grammar_usage: 15
  // - spelling: 15
  // - texas_rules: 20
  // - reporter_duties: 10
  
  // For each category:
  // 1. Get all questions in that category
  // 2. Prioritize questions user hasn't seen (not in wkt_user_progress)
  // 3. Then questions user got wrong
  // 4. Fill remaining with random
  // 5. Shuffle within category
  
  // Return shuffled array of 100 question IDs
}

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
  // Calculate overall and per-category scores
  // passed = percentage >= 75
}

CREATE: app/api/wkt/exams/route.ts

GET /api/wkt/exams
- Returns user's past exams ordered by date DESC
- Query param: limit (default 10)

POST /api/wkt/exams
- Generates new exam using generateExamQuestions
- Creates record in wkt_mock_exams
- Returns: { examId: string, questions: WKTQuestion[] }

CREATE: app/api/wkt/exams/[examId]/route.ts

GET /api/wkt/exams/[examId]
- Returns exam details with questions

PUT /api/wkt/exams/[examId]
- Body: { answers: Record<string, string>, timeSpent: number }
- Calculates score using calculateExamScore
- Updates wkt_mock_exams record
- Updates wkt_user_progress for each question
- Returns exam results"


# ------------------------------------------------------------------------------
# PROMPT 3.5: Create Progress API Routes
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create API routes for progress tracking.

CREATE: lib/wkt/readiness.ts

export function calculateReadiness(
  categoryStats: Array<{ category: string; total: number; correct: number; attempted: number }>,
  recentExams: Array<{ score_percentage: number }>,
  totalAttempted: number,
  totalQuestions: number
): {
  overallScore: number;  // 0-100
  isReady: boolean;      // true only if >= 85
  recommendation: string;
} {
  // Conservative calculation:
  // 1. Category average (40% weight) - all categories must be >= 70%
  // 2. Mock exam average of last 3 (40% weight) - must be >= 75%
  // 3. Coverage (20% weight) - attempted / total questions
  
  // Generate recommendation based on weakest area
  
  // isReady = true ONLY if:
  // - All categories >= 70%
  // - Mock exam average >= 75%
  // - At least 300 questions attempted
}

CREATE: app/api/wkt/progress/route.ts

GET /api/wkt/progress
- Returns comprehensive progress data:
{
  totalQuestions: number,
  questionsAttempted: number,
  questionsMastered: number,  // 80%+ correct rate with 3+ attempts
  currentStreak: number,      // consecutive days with activity
  categoryStats: CategoryStats[],
  readiness: { overallScore, isReady, recommendation }
}

CREATE: app/api/wkt/progress/review-queue/route.ts

GET /api/wkt/progress/review-queue
- Returns questions where next_review <= now
- Ordered by next_review ASC
- Limit 50

CREATE: app/api/wkt/bookmarks/route.ts

GET /api/wkt/bookmarks
- Returns user's bookmarked questions with full question data

POST /api/wkt/bookmarks
- Body: { questionId: string, notes?: string }
- Creates bookmark

DELETE /api/wkt/bookmarks
- Body: { questionId: string }
- Removes bookmark"


# ------------------------------------------------------------------------------
# After Phase 3, run these commands:
# ------------------------------------------------------------------------------

npm run typecheck
git add -A
git commit -m "WKT: Add API routes for questions, exams, and progress"
git push origin feature/wkt-quiz-module


# ================================================================================
# PHASE 4: AUTHENTICATION AND MIDDLEWARE
# ================================================================================

# ------------------------------------------------------------------------------
# PROMPT 4.1: Update Middleware for WKT Routes
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Update the middleware to handle WKT route protection.

First, read the existing middleware.ts file to understand the current pattern.

UPDATE: middleware.ts

Add these rules WITHOUT breaking existing functionality:

1. /wkt/* routes require authentication
   - If not logged in, redirect to /login?redirect=/wkt

2. /wkt/* routes should work for any authenticated user for now
   (We can add role checking later)

3. Keep all existing route protection intact

The key is to ADD the /wkt pattern to the protected routes matcher.

If the middleware uses a config with matcher, add:
'/wkt/:path*'

If it checks routes manually, add /wkt to the protected list.

DO NOT remove or modify any existing route protection.
Only ADD protection for /wkt routes."


# ------------------------------------------------------------------------------
# PROMPT 4.2: Create WKT Registration Page (Optional - for separate signups)
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create a simple WKT-specific registration page.

CREATE: app/(auth)/register/wkt/page.tsx

A simple registration form:
- Title: 'Create Your WKT Prep Account'
- Subtitle: 'Prepare for the Texas CSR Written Knowledge Test'
- Form fields:
  - Full Name (text input)
  - Email (email input)
  - Password (password input)
  - Confirm Password (password input)
- Submit button: 'Create Account'
- Link: 'Already have an account? Sign in' -> /login

On submit:
- Validate passwords match
- Use existing Supabase auth signup pattern from the project
- On success, redirect to /wkt
- On error, show error message

Check how existing registration works in app/(auth)/register/page.tsx and follow the same pattern.
The only difference is this page redirects to /wkt instead of /dashboard."


# ------------------------------------------------------------------------------
# After Phase 4, run these commands:
# ------------------------------------------------------------------------------

npm run typecheck
git add -A
git commit -m "WKT: Add middleware protection and registration page"
git push origin feature/wkt-quiz-module


# ================================================================================
# PHASE 5: QUESTION IMPORT SCRIPTS
# ================================================================================

# ------------------------------------------------------------------------------
# PROMPT 5.1: Create Question Import Scripts
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Create scripts to import WKT questions from JSON files.

The question JSON files will be in: C:\Users\james\depo-pro\data\wkt\

CREATE: scripts/wkt/validate-questions.ts

A script that:
- Takes a JSON file path as command line argument
- Reads and parses the JSON
- Validates each question has required fields:
  - question_text (string, not empty)
  - question_type (one of: multiple_choice, fill_blank, true_false)
  - correct_answer (string, not empty)
  - category (one of the 6 valid categories)
- For multiple_choice: validates options array exists with 2-4 items
- Reports: total questions, valid count, invalid count with details
- Exit code 0 if all valid, 1 if any invalid

Usage: npx ts-node scripts/wkt/validate-questions.ts data/wkt/questions.json

CREATE: scripts/wkt/import-questions.ts

A script that:
- Takes a JSON file path as command line argument
- Validates questions first (same checks as above)
- Connects to Supabase using service role key from environment
- Inserts questions in batches of 50
- Skips duplicates (based on question_text)
- Reports: imported count, skipped count, error count
- Is idempotent (safe to run multiple times)

Usage: npx ts-node scripts/wkt/import-questions.ts data/wkt/questions.json

Environment variables needed:
- SUPABASE_URL (from .env.local)
- SUPABASE_SERVICE_ROLE_KEY (from .env.local)

CREATE: data/wkt/sample-questions.json

Create 10 sample questions for testing (2 from each major category):

Example format:
[
  {
    \"question_text\": \"What does the prefix 'cardio' mean?\",
    \"question_type\": \"multiple_choice\",
    \"options\": [\"Brain\", \"Heart\", \"Lung\", \"Stomach\"],
    \"correct_answer\": \"Heart\",
    \"explanation\": \"Cardio comes from Greek kardia meaning heart.\",
    \"category\": \"medical_terminology\",
    \"difficulty\": 2
  }
]

Include realistic Texas CSR WKT style questions."


# ------------------------------------------------------------------------------
# After Phase 5, run these commands:
# ------------------------------------------------------------------------------

npm run typecheck
git add -A
git commit -m "WKT: Add question import scripts and sample data"
git push origin feature/wkt-quiz-module

# Test the import:
npx ts-node scripts/wkt/validate-questions.ts data/wkt/sample-questions.json
npx ts-node scripts/wkt/import-questions.ts data/wkt/sample-questions.json


# ================================================================================
# PHASE 6: CONNECT PAGES TO APIS
# ================================================================================

# ------------------------------------------------------------------------------
# PROMPT 6.1: Wire Up Practice Page to Real API
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Update the Practice page to use real API data instead of placeholder data.

UPDATE: app/(wkt)/practice/page.tsx

Changes needed:

1. Remove placeholder question data

2. Add state for loading and error:
   - isLoading: boolean
   - error: string | null

3. Fetch questions from API on mount:
   - Call GET /api/wkt/questions/random?count=10
   - Handle loading state
   - Handle errors

4. When user submits answer:
   - Call POST /api/wkt/questions/[id] with { answer: selectedAnswer }
   - Show loading on submit button
   - Display result from API response

5. Add 'Load More Questions' button that fetches another batch

6. Show loading skeleton while fetching

7. Show error message if API fails with retry button

Keep the same UI layout, just connect it to real data.
Use fetch() for API calls.
Add try/catch for error handling."


# ------------------------------------------------------------------------------
# PROMPT 6.2: Wire Up Progress Page to Real API
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Update the Progress page to use real API data.

UPDATE: app/(wkt)/progress/page.tsx

Changes needed:

1. Add loading and error states

2. On mount, fetch from GET /api/wkt/progress

3. Display real data in all sections:
   - Readiness score from API
   - Stats from API (total, attempted, mastered, streak)
   - Category progress from API categoryStats
   - Show recommendation text from API

4. For Mock Exam History section:
   - Fetch from GET /api/wkt/exams?limit=5
   - Display exam history if any
   - Show 'No exams yet' if empty

5. Show loading skeletons while fetching

6. Handle errors gracefully

Use the same layout, just with real data."


# ------------------------------------------------------------------------------
# PROMPT 6.3: Wire Up Dashboard to Real API
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Update the WKT Dashboard to show real stats.

UPDATE: app/(wkt)/page.tsx

Changes needed:

1. Fetch progress data from GET /api/wkt/progress on mount

2. Update stat cards with real data:
   - Questions Mastered: from API questionsMastered
   - Mock Exams Taken: count from GET /api/wkt/exams
   - Current Streak: from API currentStreak
   - Due for Review: from GET /api/wkt/progress/review-queue count

3. Show readiness percentage if available

4. Add loading state while fetching

5. Handle errors

Keep the same clean layout."


# ------------------------------------------------------------------------------
# After Phase 6, run these commands:
# ------------------------------------------------------------------------------

npm run typecheck
git add -A
git commit -m "WKT: Connect all pages to real APIs"
git push origin feature/wkt-quiz-module


# ================================================================================
# PHASE 7: POLISH AND ERROR HANDLING
# ================================================================================

# ------------------------------------------------------------------------------
# PROMPT 7.1: Add Loading Skeletons and Error States
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Add proper loading and error UI components for WKT.

CREATE: components/wkt/loading-skeleton.tsx

Export multiple skeleton components:

export function QuestionSkeleton() - matches question card layout
export function StatCardSkeleton() - matches stat card layout
export function ProgressCardSkeleton() - matches category progress card
export function DashboardSkeleton() - full dashboard loading state
export function PracticeSkeleton() - full practice page loading state

Use Tailwind animate-pulse class for the shimmer effect.
Match the actual component dimensions.

CREATE: components/wkt/error-message.tsx

A reusable error component:

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  // Red-ish background
  // Error icon
  // Message text
  // 'Try Again' button if onRetry provided
}

CREATE: components/wkt/empty-state.tsx

Reusable empty state component:

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

Export pre-configured empty states:
- NoQuestionsFound
- NoExamsYet
- NoBookmarks
- AllCaughtUp (no reviews due)

Update all WKT pages to use these components appropriately."


# ------------------------------------------------------------------------------
# PROMPT 7.2: Add Toast Notifications
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Add toast notifications for user actions in WKT.

Check if the project already has a toast system in components/ui/. If so, use it.
If not, create a simple one.

Add toasts for:
- Practice page:
  - 'Correct!' (green) when answer is right
  - 'Incorrect' (red) when answer is wrong
  - 'Question bookmarked' when bookmarking
  
- Mock Exam:
  - 'Exam started' when beginning
  - 'Answer saved' when auto-saving (subtle)
  - 'Exam submitted!' when completing

- Progress:
  - 'Data refreshed' when manually refreshing

Make toasts auto-dismiss after 3 seconds.
Position in bottom-right corner.
Keep it simple."


# ------------------------------------------------------------------------------
# PROMPT 7.3: Mobile Responsiveness Check
# ------------------------------------------------------------------------------

codex "You are working in C:\Users\james\depo-pro.

TASK: Review and fix mobile responsiveness for all WKT pages.

CHECK AND FIX each page:

app/(wkt)/layout.tsx:
- Header should stack nicely on mobile
- Navigation should collapse to hamburger menu
- Add mobile menu drawer if not present

app/(wkt)/page.tsx (Dashboard):
- Stat cards: 2x2 grid on mobile, 4 across on desktop
- Buttons stack vertically on mobile

app/(wkt)/practice/page.tsx:
- Sidebar hidden on mobile
- Add 'Filters' button that opens sidebar as modal/drawer on mobile
- Question card full width on mobile
- Answer buttons larger touch targets (min 44px height)

app/(wkt)/progress/page.tsx:
- Category grid: 1 column on mobile, 2 on tablet, 3 on desktop
- Stats: 2x2 on mobile

app/(wkt)/flashcards/page.tsx:
- Deck grid: 1 column mobile, 2 columns desktop

app/(wkt)/mock-exam/page.tsx:
- Table scrolls horizontally on mobile if needed

Use Tailwind responsive prefixes: sm:, md:, lg:
Test mentally at 375px width (iPhone)."


# ------------------------------------------------------------------------------
# After Phase 7, run these commands:
# ------------------------------------------------------------------------------

npm run typecheck
npm run lint
git add -A
git commit -m "WKT: Add loading states, error handling, and mobile fixes"
git push origin feature/wkt-quiz-module


# ================================================================================
# FINAL STEPS
# ================================================================================

# Build test:
npm run build

# If build passes, you're ready to merge!

# Create Pull Request on GitHub:
# 1. Go to https://github.com/YOUR_USERNAME/depo-pro
# 2. Click "Compare & pull request" for feature/wkt-quiz-module
# 3. Review changes and merge

# After merge, import your full question bank:
npx ts-node scripts/wkt/import-questions.ts data/wkt/WKT_Complete_Question_Bank.json


# ================================================================================
# TROUBLESHOOTING
# ================================================================================

# If TypeScript errors after a prompt:
codex "Fix the TypeScript errors in [filename]. The error is: [paste error message]"

# If a file wasn't created:
codex "The file [filepath] was not created. Please create it with [description of what it should contain]"

# If build fails:
npm run typecheck
# Then fix reported errors one by one

# To see all WKT files created:
Get-ChildItem -Recurse -Path app,lib,components,types,scripts -Filter "*wkt*"