-- ──────────────────────────────────────────────────────────────
-- Shikhar — Migration 0004: Study Materials (Flashcards & Mind Maps)
-- ──────────────────────────────────────────────────────────────

-- 1. FLASHCARD_DECKS Table
create table if not exists public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  section public.section_type not null default 'QA',
  card_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Index for fast lookup by user and section
create index if not exists idx_flashcard_decks_user_section
  on public.flashcard_decks (user_id, section, created_at desc);

-- RLS Policies for FLASHCARD_DECKS
alter table public.flashcard_decks enable row level security;

drop policy if exists "decks_select_own" on public.flashcard_decks;
create policy "decks_select_own" on public.flashcard_decks
  for select using (auth.uid() = user_id);

drop policy if exists "decks_insert_own" on public.flashcard_decks;
create policy "decks_insert_own" on public.flashcard_decks
  for insert with check (auth.uid() = user_id);

drop policy if exists "decks_delete_own" on public.flashcard_decks;
create policy "decks_delete_own" on public.flashcard_decks
  for delete using (auth.uid() = user_id);


-- 2. FLASHCARDS Table
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null,
  back text not null,
  hint text,
  category text,
  mastery_level text not null default 'new',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for deck lookup
create index if not exists idx_flashcards_deck
  on public.flashcards (deck_id, mastery_level);

-- RLS Policies for FLASHCARDS
alter table public.flashcards enable row level security;

drop policy if exists "cards_select_own" on public.flashcards;
create policy "cards_select_own" on public.flashcards
  for select using (auth.uid() = user_id);

drop policy if exists "cards_insert_own" on public.flashcards;
create policy "cards_insert_own" on public.flashcards
  for insert with check (auth.uid() = user_id);

drop policy if exists "cards_update_own" on public.flashcards;
create policy "cards_update_own" on public.flashcards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cards_delete_own" on public.flashcards;
create policy "cards_delete_own" on public.flashcards
  for delete using (auth.uid() = user_id);


-- 3. MINDMAPS Table
create table if not exists public.mindmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  section public.section_type not null default 'QA',
  diagram_type text not null default 'mindmap',
  mermaid_code text not null,
  created_at timestamptz not null default now()
);

-- Index for user mindmaps
create index if not exists idx_mindmaps_user_section
  on public.mindmaps (user_id, section, created_at desc);

-- RLS Policies for MINDMAPS
alter table public.mindmaps enable row level security;

drop policy if exists "mindmaps_select_own" on public.mindmaps;
create policy "mindmaps_select_own" on public.mindmaps
  for select using (auth.uid() = user_id);

drop policy if exists "mindmaps_insert_own" on public.mindmaps;
create policy "mindmaps_insert_own" on public.mindmaps
  for insert with check (auth.uid() = user_id);

drop policy if exists "mindmaps_delete_own" on public.mindmaps;
create policy "mindmaps_delete_own" on public.mindmaps
  for delete using (auth.uid() = user_id);
