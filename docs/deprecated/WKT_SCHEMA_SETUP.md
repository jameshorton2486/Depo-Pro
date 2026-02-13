# WKT Schema Setup Guide

**Purpose:** Manual setup guide for creating the Written Knowledge Test (WKT) database schema in Supabase.

**Prerequisites:** Access to Supabase Dashboard with SQL Editor permissions.

---

## Step 1: Open Supabase Dashboard

1. Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `xqrroyyqrgdytzpcckwk`
3. In the left sidebar, click **SQL Editor**

---

## Step 2: Open SQL Editor

1. Click **New Query** (or use the query editor)
2. Ensure you're connected to the correct database
3. Clear any existing query text

---

## Step 3: Paste & Run SQL

Copy the entire SQL block below and paste it into the SQL Editor, then click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).

```sql
-- ============================================
-- WKT QUIZ MODULE TABLES
-- ============================================

-- 1. Questions Table
CREATE TABLE IF NOT EXISTS wkt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'fill_blank', 'true_false')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  category TEXT NOT NULL CHECK (category IN ('medical_terminology', 'legal_terminology', 'grammar_usage', 'spelling', 'texas_rules', 'reporter_duties')),
  subcategory TEXT,
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5) DEFAULT 2,
  source_reference TEXT,
  ai_generated BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. User Progress Table (SRS tracking)
CREATE TABLE IF NOT EXISTS wkt_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES wkt_questions(id) ON DELETE CASCADE NOT NULL,
  attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  next_review TIMESTAMPTZ,
  ease_factor DECIMAL(4,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 3. Mock Exams Table
CREATE TABLE IF NOT EXISTS wkt_mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_questions INTEGER DEFAULT 100,
  correct_answers INTEGER,
  score_percentage DECIMAL(5,2),
  time_spent_seconds INTEGER,
  category_scores JSONB,
  question_ids UUID[],
  answers JSONB,
  passed BOOLEAN GENERATED ALWAYS AS (score_percentage >= 75) STORED
);

-- 4. Bookmarks Table
CREATE TABLE IF NOT EXISTS wkt_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES wkt_questions(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- 5. Study Sessions Table
CREATE TABLE IF NOT EXISTS wkt_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT CHECK (session_type IN ('practice', 'review', 'mock_exam', 'flashcards')),
  category TEXT,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wkt_questions_category ON wkt_questions(category);
CREATE INDEX IF NOT EXISTS idx_wkt_questions_difficulty ON wkt_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_wkt_questions_verified ON wkt_questions(verified);
CREATE INDEX IF NOT EXISTS idx_wkt_user_progress_user_review ON wkt_user_progress(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_wkt_mock_exams_user_completed ON wkt_mock_exams(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_wkt_study_sessions_user_started ON wkt_study_sessions(user_id, started_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE wkt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wkt_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE wkt_mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE wkt_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wkt_study_sessions ENABLE ROW LEVEL SECURITY;

-- Questions: Everyone can read, only admins can write
CREATE POLICY "Anyone can read questions" ON wkt_questions FOR SELECT USING (true);

-- User Progress: Users can only access their own
CREATE POLICY "Users can manage their own progress" ON wkt_user_progress FOR ALL USING (auth.uid() = user_id);

-- Mock Exams: Users can only access their own
CREATE POLICY "Users can manage their own exams" ON wkt_mock_exams FOR ALL USING (auth.uid() = user_id);

-- Bookmarks: Users can only access their own
CREATE POLICY "Users can manage their own bookmarks" ON wkt_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Study Sessions: Users can only access their own
CREATE POLICY "Users can manage their own sessions" ON wkt_study_sessions FOR ALL USING (auth.uid() = user_id);
```

**Expected Result:** Query should complete with "Success. No rows returned" or similar success message.

---

## Step 4: Verify Tables Exist

1. In Supabase Dashboard, click **Table Editor** in the left sidebar
2. Verify these tables appear:
   - `wkt_questions`
   - `wkt_user_progress`
   - `wkt_mock_exams`
   - `wkt_bookmarks`
   - `wkt_study_sessions`

3. Click on each table to verify:
   - Columns match the schema above
   - RLS is enabled (indicated by a shield icon or "RLS enabled" badge)

---

## Table Descriptions

### wkt_questions

Stores all quiz questions with metadata including question text, type (multiple choice, fill-in-the-blank, true/false), correct answer, explanation, category, difficulty level, and verification status. Supports AI-generated questions that can be verified by admins before use.

### wkt_user_progress

Tracks individual user performance on each question using a spaced repetition system (SRS). Stores attempt counts, correctness history, next review date, ease factor, and interval days to optimize learning retention. Each user-question pair is unique.

### wkt_mock_exams

Records complete mock exam attempts including start/completion times, total questions, correct answers, score percentage, time spent, category breakdowns, and whether the exam was passed (75% threshold). Stores question IDs and user answers for review.

### wkt_bookmarks

Allows users to bookmark questions for later review. Users can add personal notes to bookmarked questions. Each user can bookmark a question only once (enforced by unique constraint).

### wkt_study_sessions

Tracks individual study sessions (practice, review, mock exam, flashcards) with timing data, questions answered, correct answers, and optional category filtering. Used for analytics and progress tracking.

---

## Row Level Security Overview

### Questions Table

**Read Access:** All authenticated users can read questions (public learning content).

**Write Access:** Currently no write policy defined. Admin users would need explicit INSERT/UPDATE/DELETE policies added separately if question management is required through the application.

### User Data Tables (Progress, Exams, Bookmarks, Sessions)

**Access Model:** Users can only access their own records. The RLS policies use `auth.uid() = user_id` to ensure complete data isolation.

**Security Guarantee:** Even if a user attempts to query another user's data directly, Supabase will return zero rows. This prevents:
- Users seeing other users' progress
- Users accessing other users' exam results
- Users viewing other users' bookmarks
- Cross-user data leakage

**Why This Is Safe:** The `auth.uid()` function returns the authenticated user's ID from the JWT token. This value cannot be spoofed by client-side code. All queries are filtered server-side by Supabase before results are returned.

---

## Success Checklist

After running the SQL:

- [ ] All 5 tables visible in Table Editor
- [ ] RLS enabled on all tables (shield icon visible)
- [ ] No errors in SQL Editor output
- [ ] Indexes created (verify in Table Editor → Indexes tab)
- [ ] Foreign key constraints present (verify in Table Editor → Relationships tab)
- [ ] Ready for frontend integration

---

## Next Steps

Once the schema is created, you can:

1. **Seed Questions:** Add initial question data via SQL Editor or admin interface
2. **Test RLS:** Create test users and verify they can only see their own data
3. **Frontend Integration:** Connect Next.js app using Supabase client with RLS-safe queries
4. **Add Admin Policies:** If needed, create policies for admin users to manage questions

---

**Document Version:** 1.0  
**Last Updated:** January 2025
