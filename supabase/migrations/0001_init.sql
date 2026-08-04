-- Shikhar — 0001_init.sql
-- Initial schema for the Shikhar CAT 2026 prep companion.
-- Tables: plan_days, plan_topics, tasks, study_sessions, mock_scores, notes, tutor_messages, news_items, push_subscriptions, streaks.
-- Run on a fresh Supabase project. RLS policies come in 0002_rls.sql.

-- ──────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────

do $$ begin
  create type task_section as enum ('QA', 'DILR', 'VARC', 'MOCK', 'REVIEW');
exception when duplicate_object then null; end $$;

do $$ begin
  create type note_section as enum ('QA', 'DILR', 'VARC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type llm_provider as enum ('gemini-2.5-flash', 'deepseek-chat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_role as enum ('user', 'assistant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type study_session_status as enum ('running', 'paused', 'completed', 'auto-closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type note_status as enum ('complete', 'draft');
exception when duplicate_object then null; end $$;

-- ──────────────────────────────────────────────────────────────
-- PLAN_DAYS — 138-day curriculum days (seeded once, read-only for users)
-- ──────────────────────────────────────────────────────────────

create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  day_number int not null unique check (day_number between 1 and 138),
  scheduled_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_plan_days_day_number on public.plan_days (day_number);

-- ──────────────────────────────────────────────────────────────
-- PLAN_TOPICS — topics within each plan day (seeded, read-only for users)
-- ──────────────────────────────────────────────────────────────

create table if not exists public.plan_topics (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days(id) on delete cascade,
  section task_section not null,
  title text not null check (char_length(title) between 1 and 200),
  scheduled_time text check (scheduled_time is null or scheduled_time ~ '^\d{2}:\d{2}$'),
  duration_minutes_planned int check (duration_minutes_planned is null or (duration_minutes_planned between 1 and 480)),
  created_at timestamptz not null default now()
);

create index if not exists idx_plan_topics_plan_day_id on public.plan_topics (plan_day_id);
create index if not exists idx_plan_topics_section on public.plan_topics (section);
create index if not exists idx_plan_topics_title_search on public.plan_topics using gin (to_tsvector('english', title));

-- ──────────────────────────────────────────────────────────────
-- TASKS — daily plan items (user-specific, derived from plan)
-- ──────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_topic_id uuid references public.plan_topics(id) on delete set null,
  date date not null,
  section task_section not null,
  title text not null check (char_length(title) between 1 and 200),
  scheduled_time text check (scheduled_time is null or scheduled_time ~ '^\d{2}:\d{2}$'),
  duration_minutes int check (duration_minutes is null or (duration_minutes between 1 and 480)),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_date on public.tasks (user_id, date);
create index if not exists idx_tasks_user_date_time on public.tasks (user_id, date, scheduled_time);
create index if not exists idx_tasks_scheduled_time on public.tasks (date, scheduled_time) where completed = false;
create index if not exists idx_tasks_plan_topic on public.tasks (plan_topic_id);

-- ──────────────────────────────────────────────────────────────
-- STUDY_SESSIONS — timer sessions for active topic tracking
-- ──────────────────────────────────────────────────────────────

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_topic_id uuid references public.plan_topics(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  topic_title text not null,
  section task_section not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  last_heartbeat_at timestamptz not null default now(),
  status study_session_status not null default 'running',
  created_at timestamptz not null default now()
);

create index if not exists idx_study_sessions_user_status on public.study_sessions (user_id, status);
create index if not exists idx_study_sessions_plan_topic on public.study_sessions (plan_topic_id);
create index if not exists idx_study_sessions_task on public.study_sessions (task_id);

-- ──────────────────────────────────────────────────────────────
-- MOCK_SCORES — sectional breakdown per mock test
-- ──────────────────────────────────────────────────────────────

create table if not exists public.mock_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mock_date date not null,
  mock_name text not null check (char_length(mock_name) between 1 and 100),
  total_score numeric(6,2) not null check (total_score between 0 and 300),
  overall_percentile numeric(5,2) not null check (overall_percentile between 0 and 100),
  varc_score numeric(6,2) not null check (varc_score between 0 and 100),
  varc_percentile numeric(5,2) not null check (varc_percentile between 0 and 100),
  dilr_score numeric(6,2) not null check (dilr_score between 0 and 100),
  dilr_percentile numeric(5,2) not null check (dilr_percentile between 0 and 100),
  qa_score numeric(6,2) not null check (qa_score between 0 and 100),
  qa_percentile numeric(5,2) not null check (qa_percentile between 0 and 100),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_mocks_user_date on public.mock_scores (user_id, mock_date);

-- ──────────────────────────────────────────────────────────────
-- NOTES — AI-generated topper-style notes (versioned, never overwritten)
-- ──────────────────────────────────────────────────────────────

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_topic_id uuid references public.plan_topics(id) on delete set null,
  topic text not null check (char_length(topic) between 2 and 150),
  section note_section not null,
  content text not null,
  version int not null default 1 check (version >= 1),
  generated_by llm_provider not null,
  word_count int not null default 0,
  question_count int not null default 0,
  status note_status not null default 'complete',
  file_naming_key text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_user_created on public.notes (user_id, created_at desc);
create index if not exists idx_notes_user_topic on public.notes (user_id, topic);
create index if not exists idx_notes_user_section on public.notes (user_id, section);
create index if not exists idx_notes_plan_topic on public.notes (plan_topic_id);

-- ──────────────────────────────────────────────────────────────
-- TUTOR_MESSAGES — chat history, grouped by day/active topic
-- ──────────────────────────────────────────────────────────────

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_topic_id uuid references public.plan_topics(id) on delete set null,
  thread_date date not null,
  role chat_role not null,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_tutor_user_thread on public.tutor_messages (user_id, thread_date, created_at);
create index if not exists idx_tutor_plan_topic on public.tutor_messages (plan_topic_id);

-- ──────────────────────────────────────────────────────────────
-- NEWS_ITEMS — weekly digest (global, not per-user — single-user app)
-- ──────────────────────────────────────────────────────────────

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  headline text not null check (char_length(headline) between 8 and 200),
  summary text not null check (char_length(summary) between 10 and 1000),
  source_url text not null,
  source_name text not null,
  published_week_of date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_news_week on public.news_items (published_week_of desc);

-- ──────────────────────────────────────────────────────────────
-- PUSH_SUBSCRIPTIONS — browser push endpoints (per user, per device)
-- ──────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_user on public.push_subscriptions (user_id);

-- ──────────────────────────────────────────────────────────────
-- STREAKS — daily aggregated streak row per user
-- ──────────────────────────────────────────────────────────────

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  total_completed int not null default 0 check (total_completed >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists idx_streaks_user on public.streaks (user_id, date desc);