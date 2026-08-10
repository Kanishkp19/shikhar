-- ──────────────────────────────────────────────────────────────
-- Migration 0004: Handwritten Notes table
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nyhszcsdchehnuivvwmh/sql/new
-- ──────────────────────────────────────────────────────────────

create table if not exists public.handwritten_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 2 and 150),
  section text not null default 'QA',
  content_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hw_notes_user on public.handwritten_notes (user_id, created_at desc);
create index if not exists idx_hw_notes_user_topic on public.handwritten_notes (user_id, topic);
