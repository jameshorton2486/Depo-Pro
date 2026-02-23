-- =============================================================================
-- WKT QUIZ TABLES
-- Applied: 2026-01-24
-- =============================================================================

-- =============================================================================
-- WKT_QUESTIONS
-- =============================================================================

create table if not exists wkt_questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice', 'fill_blank', 'true_false')),
  options jsonb,
  correct_answer text not null,
  explanation text,
  category text not null check (category in ('medical_terminology', 'legal_terminology', 'grammar_usage', 'spelling', 'texas_rules', 'reporter_duties')),
  subcategory text,
  difficulty int not null default 2 check (difficulty between 1 and 5),
  source_reference text,
  ai_generated boolean default false,
  verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists wkt_questions_category_idx on wkt_questions(category);
create index if not exists wkt_questions_difficulty_idx on wkt_questions(difficulty);

-- =============================================================================
-- WKT_USER_PROGRESS
-- =============================================================================

create table if not exists wkt_user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references wkt_questions(id) on delete cascade,
  attempts int not null default 0,
  correct_count int not null default 0,
  last_attempt timestamptz,
  next_review timestamptz,
  ease_factor decimal not null default 2.5,
  interval_days int not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, question_id)
);

create index if not exists wkt_user_progress_user_id_next_review_idx on wkt_user_progress(user_id, next_review);

-- =============================================================================
-- WKT_MOCK_EXAMS
-- =============================================================================

create table if not exists wkt_mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  started_at timestamptz default now(),
  completed_at timestamptz,
  total_questions int not null default 100,
  correct_answers int,
  score_percentage decimal,
  time_spent_seconds int,
  category_scores jsonb,
  question_ids uuid[],
  answers jsonb,
  passed boolean generated always as (score_percentage >= 75) stored
);

create index if not exists wkt_mock_exams_user_id_completed_at_idx on wkt_mock_exams(user_id, completed_at);

-- =============================================================================
-- WKT_BOOKMARKS
-- =============================================================================

create table if not exists wkt_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references wkt_questions(id) on delete cascade,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, question_id)
);

-- =============================================================================
-- WKT_STUDY_SESSIONS
-- =============================================================================

create table if not exists wkt_study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_type text not null check (session_type in ('practice', 'review', 'mock_exam', 'flashcards')),
  category text,
  questions_answered int not null default 0,
  correct_answers int not null default 0,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int
);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

create or replace function update_wkt_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists wkt_questions_updated_at on wkt_questions;
create trigger wkt_questions_updated_at
before update on wkt_questions
for each row execute function update_wkt_updated_at();

drop trigger if exists wkt_user_progress_updated_at on wkt_user_progress;
create trigger wkt_user_progress_updated_at
before update on wkt_user_progress
for each row execute function update_wkt_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table wkt_questions enable row level security;
alter table wkt_user_progress enable row level security;
alter table wkt_mock_exams enable row level security;
alter table wkt_bookmarks enable row level security;
alter table wkt_study_sessions enable row level security;

-- Questions: authenticated read, admin write

drop policy if exists "read wkt questions" on wkt_questions;
create policy "read wkt questions"
on wkt_questions for select
to authenticated
using (true);

drop policy if exists "admins manage wkt questions" on wkt_questions;
create policy "admins manage wkt questions"
on wkt_questions for all
to authenticated
using (is_admin())
with check (is_admin());

-- User-owned tables: full access where user_id = auth.uid()

drop policy if exists "wkt user progress access" on wkt_user_progress;
create policy "wkt user progress access"
on wkt_user_progress for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "wkt mock exams access" on wkt_mock_exams;
create policy "wkt mock exams access"
on wkt_mock_exams for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "wkt bookmarks access" on wkt_bookmarks;
create policy "wkt bookmarks access"
on wkt_bookmarks for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "wkt study sessions access" on wkt_study_sessions;
create policy "wkt study sessions access"
on wkt_study_sessions for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
