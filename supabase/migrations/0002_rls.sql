-- Shikhar — 0002_rls.sql
-- Row Level Security: every table scoped to auth.uid() = user_id.
-- News items are global (no user_id) but read-only — only the service role
-- (used in cron routes) can insert.

-- ──────────────────────────────────────────────────────────────
-- Enable RLS on all tables
-- ──────────────────────────────────────────────────────────────

alter table public.tasks enable row level security;
alter table public.mock_scores enable row level security;
alter table public.notes enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.news_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.streaks enable row level security;

-- ──────────────────────────────────────────────────────────────
-- TASKS
-- ──────────────────────────────────────────────────────────────

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- MOCK_SCORES
-- ──────────────────────────────────────────────────────────────

drop policy if exists "mocks_select_own" on public.mock_scores;
create policy "mocks_select_own" on public.mock_scores
  for select using (auth.uid() = user_id);

drop policy if exists "mocks_insert_own" on public.mock_scores;
create policy "mocks_insert_own" on public.mock_scores
  for insert with check (auth.uid() = user_id);

drop policy if exists "mocks_update_own" on public.mock_scores;
create policy "mocks_update_own" on public.mock_scores
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mocks_delete_own" on public.mock_scores;
create policy "mocks_delete_own" on public.mock_scores
  for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- NOTES
-- ──────────────────────────────────────────────────────────────

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- TUTOR_MESSAGES
-- ──────────────────────────────────────────────────────────────

drop policy if exists "tutor_select_own" on public.tutor_messages;
create policy "tutor_select_own" on public.tutor_messages
  for select using (auth.uid() = user_id);

drop policy if exists "tutor_insert_own" on public.tutor_messages;
create policy "tutor_insert_own" on public.tutor_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "tutor_update_own" on public.tutor_messages;
create policy "tutor_update_own" on public.tutor_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tutor_delete_own" on public.tutor_messages;
create policy "tutor_delete_own" on public.tutor_messages
  for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- NEWS_ITEMS — global (no user_id), read-only for authenticated users.
-- Inserts happen only via the service-role client in /api/cron/refresh-news.
-- ──────────────────────────────────────────────────────────────

drop policy if exists "news_select_authenticated" on public.news_items;
create policy "news_select_authenticated" on public.news_items
  for select using (auth.role() = 'authenticated');

-- No insert/update/delete policy for authenticated users — service role bypasses RLS.

-- ──────────────────────────────────────────────────────────────
-- PUSH_SUBSCRIPTIONS
-- ──────────────────────────────────────────────────────────────

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- STREAKS
-- ──────────────────────────────────────────────────────────────

drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks
  for select using (auth.uid() = user_id);

drop policy if exists "streaks_insert_own" on public.streaks;
create policy "streaks_insert_own" on public.streaks
  for insert with check (auth.uid() = user_id);

drop policy if exists "streaks_update_own" on public.streaks;
create policy "streaks_update_own" on public.streaks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "streaks_delete_own" on public.streaks;
create policy "streaks_delete_own" on public.streaks
  for delete using (auth.uid() = user_id);
