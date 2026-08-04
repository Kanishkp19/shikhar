-- ──────────────────────────────────────────────────────────────
-- Shikhar — Combined Supabase Migration Script
-- Contains 0001_init.sql, 0002_rls.sql, 0003_functions.sql
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nyhszcsdchehnuivvwmh/sql/new
-- ──────────────────────────────────────────────────────────────

-- 1. ENUMS
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

-- 2. TABLES
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 2 and 150),
  section note_section not null,
  content text not null,
  version int not null default 1 check (version >= 1),
  generated_by llm_provider not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_user_created on public.notes (user_id, created_at desc);
create index if not exists idx_notes_user_topic on public.notes (user_id, topic);
create index if not exists idx_notes_user_section on public.notes (user_id, section);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_date date not null,
  role chat_role not null,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_tutor_user_thread on public.tutor_messages (user_id, thread_date, created_at);

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

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_user on public.push_subscriptions (user_id);

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

-- 3. ROW LEVEL SECURITY (RLS)
alter table public.tasks enable row level security;
alter table public.mock_scores enable row level security;
alter table public.notes enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.news_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.streaks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

drop policy if exists "mocks_select_own" on public.mock_scores;
create policy "mocks_select_own" on public.mock_scores for select using (auth.uid() = user_id);

drop policy if exists "mocks_insert_own" on public.mock_scores;
create policy "mocks_insert_own" on public.mock_scores for insert with check (auth.uid() = user_id);

drop policy if exists "mocks_update_own" on public.mock_scores;
create policy "mocks_update_own" on public.mock_scores for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mocks_delete_own" on public.mock_scores;
create policy "mocks_delete_own" on public.mock_scores for delete using (auth.uid() = user_id);

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

drop policy if exists "tutor_select_own" on public.tutor_messages;
create policy "tutor_select_own" on public.tutor_messages for select using (auth.uid() = user_id);

drop policy if exists "tutor_insert_own" on public.tutor_messages;
create policy "tutor_insert_own" on public.tutor_messages for insert with check (auth.uid() = user_id);

drop policy if exists "tutor_update_own" on public.tutor_messages;
create policy "tutor_update_own" on public.tutor_messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tutor_delete_own" on public.tutor_messages;
create policy "tutor_delete_own" on public.tutor_messages for delete using (auth.uid() = user_id);

drop policy if exists "news_select_authenticated" on public.news_items;
create policy "news_select_authenticated" on public.news_items for select using (auth.role() = 'authenticated');

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions for select using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions for delete using (auth.uid() = user_id);

drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks for select using (auth.uid() = user_id);

drop policy if exists "streaks_insert_own" on public.streaks;
create policy "streaks_insert_own" on public.streaks for insert with check (auth.uid() = user_id);

drop policy if exists "streaks_update_own" on public.streaks;
create policy "streaks_update_own" on public.streaks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "streaks_delete_own" on public.streaks;
create policy "streaks_delete_own" on public.streaks for delete using (auth.uid() = user_id);

-- 4. FUNCTIONS
create or replace function public.update_streak(p_user_id uuid, p_completed boolean)
returns void as $$
declare
  v_today date := current_date;
  v_existing record;
  v_yesterday record;
  v_new_current int := 0;
  v_total int := 0;
  v_longest int := 0;
begin
  select * into v_existing from public.streaks where user_id = p_user_id and date = v_today;
  select * into v_yesterday from public.streaks where user_id = p_user_id and date = v_today - interval '1 day';
  select coalesce(max(total_completed), 0), coalesce(max(longest_streak), 0)
    into v_total, v_longest
    from public.streaks where user_id = p_user_id and date < v_today;

  if p_completed then
    v_new_current := coalesce(v_yesterday.current_streak, 0) + 1;
    v_total := v_total + 1;
    v_longest := greatest(v_longest, v_new_current);
  else
    v_new_current := coalesce(v_yesterday.current_streak, 0);
  end if;

  insert into public.streaks (user_id, date, current_streak, longest_streak, total_completed)
  values (p_user_id, v_today, v_new_current, v_longest, v_total)
  on conflict (user_id, date) do update
    set current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        total_completed = excluded.total_completed;
end;
$$ language plpgsql security definer;

create or replace function public.insert_note_with_version(
  p_user_id uuid,
  p_topic text,
  p_section note_section,
  p_content text,
  p_generated_by llm_provider
)
returns uuid as $$
declare
  v_next_version int;
  v_new_id uuid;
begin
  select coalesce(max(version), 0) + 1 into v_next_version
    from public.notes
    where user_id = p_user_id and topic = p_topic and section = p_section;

  insert into public.notes (user_id, topic, section, content, version, generated_by)
  values (p_user_id, p_topic, p_section, p_content, v_next_version, p_generated_by)
  returning id into v_new_id;

  return v_new_id;
end;
$$ language plpgsql security definer;

grant execute on function public.update_streak(uuid, boolean) to authenticated;
grant execute on function public.insert_note_with_version(uuid, text, note_section, text, llm_provider) to authenticated;
