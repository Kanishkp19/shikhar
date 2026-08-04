# 05 — Backend Schema & API Contract

## Database choice

PostgreSQL via Supabase. Justification: free tier (500MB) comfortably covers a single user's data volume for the full 121-day window (notes are the largest rows at ~40-60KB of markdown each; even 60 notes stays under 4MB); Supabase bundles Auth, Row Level Security, Edge Functions, and `pg_cron` in the same free project, avoiding a separate scheduler or auth service.

## ER diagram

```
users (Supabase auth.users)
  |
  | 1
  |
  +----< plan_days (1--*) >---- plan_topics
  |            (dayNumber unique, seeded once from source HTML)
  |
  +----< tasks >---- (planTopicId -> plan_topics, nullable for ad-hoc tasks)
  |
  +----< study_sessions >---- (planTopicId -> plan_topics, nullable; taskId -> tasks, nullable)
  |
  +----< mock_scores
  |
  +----< notes >---- (planTopicId -> plan_topics, nullable)
  |
  +----< tutor_messages >---- (planTopicId -> plan_topics, nullable)
  |
  +----< push_subscriptions
  |
  +----- news_items (global, not user-scoped — single-user app, but kept user-agnostic for simplicity)
```

## Tables

### `plan_days`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `day_number` | `integer` | NOT NULL, UNIQUE | | 1-121 |
| `scheduled_date` | `date` | NOT NULL | | Original plan date for this day |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

Index: `idx_plan_days_day_number` on `day_number`.

### `plan_topics`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `plan_day_id` | `uuid` | NOT NULL, FK → `plan_days(id)` ON DELETE CASCADE | | |
| `section` | `text` | NOT NULL, CHECK IN ('QA','DILR','VARC','MOCK','REVIEW') | | |
| `title` | `text` | NOT NULL | | |
| `scheduled_time` | `time` | NULL | | |
| `duration_minutes_planned` | `integer` | NULL | | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

Index: `idx_plan_topics_plan_day_id` on `plan_day_id`; `idx_plan_topics_section` on `section`; full-text index `idx_plan_topics_title_search` using `to_tsvector('english', title)` for the Plan Explorer search.

### `tasks`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | | |
| `plan_topic_id` | `uuid` | NULL, FK → `plan_topics(id)` ON DELETE SET NULL | | Nullable for ad-hoc tasks |
| `date` | `date` | NOT NULL | | Real calendar date the task is scheduled for |
| `section` | `text` | NOT NULL, CHECK IN ('QA','DILR','VARC','MOCK','REVIEW') | | |
| `title` | `text` | NOT NULL | | |
| `scheduled_time` | `time` | NULL | | |
| `duration_minutes` | `integer` | NULL | | |
| `completed` | `boolean` | NOT NULL | `false` | |
| `completed_at` | `timestamptz` | NULL | | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

Index: `idx_tasks_user_date` on `(user_id, date)`.

### `study_sessions`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | | |
| `plan_topic_id` | `uuid` | NULL, FK → `plan_topics(id)` ON DELETE SET NULL | | Any topic, any day |
| `task_id` | `uuid` | NULL, FK → `tasks(id)` ON DELETE SET NULL | | |
| `topic_title` | `text` | NOT NULL | | Denormalized snapshot |
| `section` | `text` | NOT NULL, CHECK IN ('QA','DILR','VARC','MOCK','REVIEW') | | |
| `started_at` | `timestamptz` | NOT NULL | `now()` | |
| `ended_at` | `timestamptz` | NULL | | |
| `duration_seconds` | `integer` | NULL | | Computed on stop/auto-close |
| `last_heartbeat_at` | `timestamptz` | NOT NULL | `now()` | Updated every 60s by client while running; used for auto-close |
| `status` | `text` | NOT NULL, CHECK IN ('running','paused','completed','auto-closed') | `'running'` | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

Index: `idx_study_sessions_user_status` on `(user_id, status)` (used to find any stray `running` session on login, and by the auto-close cron); `idx_study_sessions_plan_topic` on `plan_topic_id`.

**State machine:**
```
running --(pause)--> paused --(resume)--> running
running --(stop)--> completed
paused  --(stop)--> completed
running --(30min no heartbeat, via cron)--> auto-closed
```
Only one `running` or `paused` session may exist per user at a time — enforced at the API layer (see `/api/sessions` below), not by a DB constraint, so no active timer is silently orphaned.

### `mock_scores`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | | |
| `mock_date` | `date` | NOT NULL | | |
| `mock_name` | `text` | NOT NULL | | |
| `total_score` | `numeric(6,2)` | NOT NULL, CHECK (total_score BETWEEN 0 AND 300) | | |
| `overall_percentile` | `numeric(5,2)` | NOT NULL, CHECK (overall_percentile BETWEEN 0 AND 100) | | |
| `varc_score` | `numeric(6,2)` | NOT NULL, CHECK (varc_score BETWEEN 0 AND 100) | | |
| `varc_percentile` | `numeric(5,2)` | NOT NULL, CHECK (varc_percentile BETWEEN 0 AND 100) | | |
| `dilr_score` | `numeric(6,2)` | NOT NULL, CHECK (dilr_score BETWEEN 0 AND 100) | | |
| `dilr_percentile` | `numeric(5,2)` | NOT NULL, CHECK (dilr_percentile BETWEEN 0 AND 100) | | |
| `qa_score` | `numeric(6,2)` | NOT NULL, CHECK (qa_score BETWEEN 0 AND 100) | | |
| `qa_percentile` | `numeric(5,2)` | NOT NULL, CHECK (qa_percentile BETWEEN 0 AND 100) | | |
| `notes` | `text` | NULL, CHECK (char_length(notes) <= 500) | | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

Index: `idx_mock_scores_user_date` on `(user_id, mock_date)`.

### `notes`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | | |
| `plan_topic_id` | `uuid` | NULL, FK → `plan_topics(id)` ON DELETE SET NULL | | |
| `topic` | `text` | NOT NULL | | |
| `section` | `text` | NOT NULL, CHECK IN ('QA','DILR','VARC') | | |
| `content` | `text` | NOT NULL | | Full markdown, all 7 skill sections |
| `word_count` | `integer` | NOT NULL | | |
| `question_count` | `integer` | NOT NULL, CHECK (question_count >= 25) | | Enforced at insert by the API layer's validation, not a hard DB block, so drafts can still be saved (see `status`) |
| `status` | `text` | NOT NULL, CHECK IN ('complete','draft') | `'complete'` | `draft` if generation finished short after retry |
| `version` | `integer` | NOT NULL | `1` | |
| `generated_by` | `text` | NOT NULL, CHECK IN ('gemini-2.5-flash','deepseek-chat') | | |
| `file_naming_key` | `text` | NOT NULL | | e.g. `CAT_QA_Percentages_Complete` |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

Index: `idx_notes_user_topic` on `(user_id, topic)`; `idx_notes_section` on `section`.

### `tutor_messages`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | | |
| `plan_topic_id` | `uuid` | NULL, FK → `plan_topics(id)` ON DELETE SET NULL | | Groups thread by active topic |
| `role` | `text` | NOT NULL, CHECK IN ('user','assistant') | | |
| `content` | `text` | NOT NULL | | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

Index: `idx_tutor_messages_user_topic_created` on `(user_id, plan_topic_id, created_at)`.

### `news_items`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `headline` | `text` | NOT NULL | | |
| `summary` | `text` | NOT NULL | | |
| `source_url` | `text` | NOT NULL | | |
| `source_name` | `text` | NOT NULL | | |
| `published_week_of` | `date` | NOT NULL | | Monday of the digest week |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

Index: `idx_news_items_week` on `published_week_of DESC`.

### `push_subscriptions`
| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | | |
| `endpoint` | `text` | NOT NULL, UNIQUE | | |
| `p256dh` | `text` | NOT NULL | | |
| `auth` | `text` | NOT NULL | | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

## Migration 0001 — `supabase/migrations/0001_init.sql`

```sql
create extension if not exists "pgcrypto";

create table plan_days (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null unique,
  scheduled_date date not null,
  created_at timestamptz not null default now()
);
create index idx_plan_days_day_number on plan_days(day_number);

create table plan_topics (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references plan_days(id) on delete cascade,
  section text not null check (section in ('QA','DILR','VARC','MOCK','REVIEW')),
  title text not null,
  scheduled_time time,
  duration_minutes_planned integer,
  created_at timestamptz not null default now()
);
create index idx_plan_topics_plan_day_id on plan_topics(plan_day_id);
create index idx_plan_topics_section on plan_topics(section);
create index idx_plan_topics_title_search on plan_topics using gin (to_tsvector('english', title));

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_topic_id uuid references plan_topics(id) on delete set null,
  date date not null,
  section text not null check (section in ('QA','DILR','VARC','MOCK','REVIEW')),
  title text not null,
  scheduled_time time,
  duration_minutes integer,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_tasks_user_date on tasks(user_id, date);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_topic_id uuid references plan_topics(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  topic_title text not null,
  section text not null check (section in ('QA','DILR','VARC','MOCK','REVIEW')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  last_heartbeat_at timestamptz not null default now(),
  status text not null default 'running' check (status in ('running','paused','completed','auto-closed')),
  created_at timestamptz not null default now()
);
create index idx_study_sessions_user_status on study_sessions(user_id, status);
create index idx_study_sessions_plan_topic on study_sessions(plan_topic_id);

create table mock_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mock_date date not null,
  mock_name text not null,
  total_score numeric(6,2) not null check (total_score between 0 and 300),
  overall_percentile numeric(5,2) not null check (overall_percentile between 0 and 100),
  varc_score numeric(6,2) not null check (varc_score between 0 and 100),
  varc_percentile numeric(5,2) not null check (varc_percentile between 0 and 100),
  dilr_score numeric(6,2) not null check (dilr_score between 0 and 100),
  dilr_percentile numeric(5,2) not null check (dilr_percentile between 0 and 100),
  qa_score numeric(6,2) not null check (qa_score between 0 and 100),
  qa_percentile numeric(5,2) not null check (qa_percentile between 0 and 100),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index idx_mock_scores_user_date on mock_scores(user_id, mock_date);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_topic_id uuid references plan_topics(id) on delete set null,
  topic text not null,
  section text not null check (section in ('QA','DILR','VARC')),
  content text not null,
  word_count integer not null,
  question_count integer not null check (question_count >= 0),
  status text not null default 'complete' check (status in ('complete','draft')),
  version integer not null default 1,
  generated_by text not null check (generated_by in ('gemini-2.5-flash','deepseek-chat')),
  file_naming_key text not null,
  created_at timestamptz not null default now()
);
create index idx_notes_user_topic on notes(user_id, topic);
create index idx_notes_section on notes(section);

create table tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_topic_id uuid references plan_topics(id) on delete set null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index idx_tutor_messages_user_topic_created on tutor_messages(user_id, plan_topic_id, created_at);

create table news_items (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  summary text not null,
  source_url text not null,
  source_name text not null,
  published_week_of date not null,
  created_at timestamptz not null default now()
);
create index idx_news_items_week on news_items(published_week_of desc);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
```

## Migration 0002 — RLS — `supabase/migrations/0002_rls.sql`

```sql
alter table tasks enable row level security;
alter table study_sessions enable row level security;
alter table mock_scores enable row level security;
alter table notes enable row level security;
alter table tutor_messages enable row level security;
alter table push_subscriptions enable row level security;
-- plan_days, plan_topics, news_items are read-only reference/global data, not user-scoped

create policy "select own tasks" on tasks for select using (auth.uid() = user_id);
create policy "insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "update own tasks" on tasks for update using (auth.uid() = user_id);

create policy "select own sessions" on study_sessions for select using (auth.uid() = user_id);
create policy "insert own sessions" on study_sessions for insert with check (auth.uid() = user_id);
create policy "update own sessions" on study_sessions for update using (auth.uid() = user_id);

create policy "select own mocks" on mock_scores for select using (auth.uid() = user_id);
create policy "insert own mocks" on mock_scores for insert with check (auth.uid() = user_id);

create policy "select own notes" on notes for select using (auth.uid() = user_id);
create policy "insert own notes" on notes for insert with check (auth.uid() = user_id);

create policy "select own messages" on tutor_messages for select using (auth.uid() = user_id);
create policy "insert own messages" on tutor_messages for insert with check (auth.uid() = user_id);

create policy "select own push subs" on push_subscriptions for select using (auth.uid() = user_id);
create policy "insert own push subs" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "delete own push subs" on push_subscriptions for delete using (auth.uid() = user_id);

alter table plan_days enable row level security;
alter table plan_topics enable row level security;
alter table news_items enable row level security;
create policy "any authenticated user can read plan" on plan_days for select using (auth.role() = 'authenticated');
create policy "any authenticated user can read topics" on plan_topics for select using (auth.role() = 'authenticated');
create policy "any authenticated user can read news" on news_items for select using (auth.role() = 'authenticated');
```

## Migration 0003 — functions & triggers — `supabase/migrations/0003_functions.sql`

```sql
-- Auto-close stale running sessions (called by dispatch-reminders Edge Function every 5 min)
create or replace function auto_close_stale_sessions() returns void as $$
begin
  update study_sessions
  set status = 'auto-closed',
      ended_at = last_heartbeat_at,
      duration_seconds = extract(epoch from (last_heartbeat_at - started_at))::integer
  where status = 'running'
    and last_heartbeat_at < now() - interval '30 minutes';
end;
$$ language plpgsql security definer;

-- Compute duration on manual stop (called from the API route, but enforced here as a safety net)
create or replace function set_session_duration() returns trigger as $$
begin
  if new.status = 'completed' and new.ended_at is not null then
    new.duration_seconds := extract(epoch from (new.ended_at - new.started_at))::integer;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_session_duration
before update on study_sessions
for each row execute function set_session_duration();
```

## API contract

All routes require an authenticated session (Supabase cookie) except `/api/cron/*`, which instead require the `x-cron-secret` header to equal `CRON_SECRET`. All routes also enforce `ALLOWED_USER_EMAIL` server-side.

### `GET /api/plan`
- Auth: user session
- Query params: `section?` (comma-separated list), `search?` (string)
- Response `200`: `{ days: PlanDay[] }` (each with nested `topics: PlanTopic[]`)
- Errors: `500 DB_ERROR`

### `GET /api/tasks?date=YYYY-MM-DD`
- Response `200`: `{ tasks: Task[] }`
- Errors: `400 INVALID_DATE`, `500 DB_ERROR`

### `PATCH /api/tasks/:id`
- Body: `{ completed: boolean }` — Zod: `z.object({ completed: z.boolean() })`
- Response `200`: `{ task: Task }`
- Errors: `404 NOT_FOUND`, `403 FORBIDDEN` (not owner), `500 DB_ERROR`

### `POST /api/sessions`
- Body: `{ planTopicId: string | null, taskId: string | null, topicTitle: string, section: Section }`
- Zod: `z.object({ planTopicId: z.string().uuid().nullable(), taskId: z.string().uuid().nullable(), topicTitle: z.string().min(1), section: z.enum(['QA','DILR','VARC','MOCK','REVIEW']) })`
- Behavior: rejects with `409 SESSION_ALREADY_ACTIVE` if a `running` or `paused` session already exists for this user
- Response `201`: `{ session: StudySession }`

### `PATCH /api/sessions/:id`
- Body: `{ action: 'pause' | 'resume' | 'stop' | 'heartbeat' }`
- Zod: `z.object({ action: z.enum(['pause','resume','stop','heartbeat']) })`
- Behavior: `stop` sets `ended_at = now()`, `status = 'completed'` (trigger computes `duration_seconds`); `heartbeat` updates `last_heartbeat_at`
- Response `200`: `{ session: StudySession }`

### `GET /api/mocks`
- Query: `limit?` (default 20)
- Response `200`: `{ mocks: MockScore[] }`

### `POST /api/mocks`
- Body matches `MockScore` minus `id`/`userId`/`createdAt`
- Zod schema mirrors the table CHECK constraints (see `lib/validation/schemas.ts` below)
- Response `201`: `{ mock: MockScore }`
- Errors: `422 VALIDATION_ERROR` with per-field messages

### `GET /api/notes?section=&search=&cursor=`
- Response `200`: `{ notes: Note[], nextCursor: string | null }`

### `GET /api/notes/:id`
- Response `200`: `{ note: Note, versions: Note[] }` (all versions sharing the same `topic`)
- Errors: `404 NOT_FOUND`

### `POST /api/notes/generate`
- Body: `{ planTopicId: string | null, topic: string, section: 'QA' | 'DILR' | 'VARC' }`
- Zod: `z.object({ planTopicId: z.string().uuid().nullable(), topic: z.string().min(1), section: z.enum(['QA','DILR','VARC']) })`
- Behavior: calls `lib/llm/openrouter.ts` with the full `cat-notes-skill` system prompt (see `02-TRD.md` → Third-party API integrations); validates word count and section-header presence; retries once on Gemini failure or short output; saves as `notes` row with incremented `version` if the topic already has prior notes; sets `status: 'draft'` if the retry still falls short
- Response `202` (accepted, generation may take 15-45s — client polls or receives a toast on completion): `{ jobAccepted: true, topic: string }`
- Response on completion (via a subsequent `GET /api/notes/:id` once the client is notified): `{ note: Note }`
- Errors: `429 LLM_BUSY`, `504 LLM_TIMEOUT`

### `POST /api/tutor`
- Body: `{ planTopicId: string | null, message: string }`
- Zod: `z.object({ planTopicId: z.string().uuid().nullable(), message: z.string().min(1).max(2000) })`
- Behavior: saves the user message, calls Groq with system prompt including active-topic context and recent thread history, saves and returns the assistant message
- Response `200`: `{ userMessage: TutorMessage, assistantMessage: TutorMessage }`
- Errors: `429 LLM_BUSY`, `504 LLM_TIMEOUT`

### `GET /api/news?cursor=`
- Response `200`: `{ items: NewsItem[], nextCursor: string | null }`

### `POST /api/push/subscribe`
- Body: `{ endpoint: string, keys: { p256dh: string, auth: string } }`
- Zod: `z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) })`
- Response `201`: `{ subscribed: true }`

### `POST /api/cron/dispatch-reminders` (internal, called by Supabase Edge Function)
- Header required: `x-cron-secret: ${CRON_SECRET}`
- Behavior: (1) runs `auto_close_stale_sessions()`, (2) finds tasks with `scheduled_time` matching the current 5-minute window and `completed = false`, sends push via `web-push`, (3) finds a `plan_topic` marked active for 3+ hours with zero `study_sessions` logged against it today, sends a single nudge push
- Response `200`: `{ dispatched: number }`

### `POST /api/cron/refresh-news` (internal, weekly)
- Header required: `x-cron-secret: ${CRON_SECRET}`
- Behavior: fetches a fixed list of official source URLs, summarizes new content via OpenRouter (Gemini 2.5 Flash, short `max_tokens` since this is a digest not a note), inserts `news_items` rows for the current `published_week_of`
- Response `200`: `{ itemsAdded: number }`

## Zod schemas (`lib/validation/schemas.ts`)

```typescript
import { z } from 'zod';

export const sectionSchema = z.enum(['QA', 'DILR', 'VARC', 'MOCK', 'REVIEW']);
export const noteSectionSchema = z.enum(['QA', 'DILR', 'VARC']);

export const taskUpdateSchema = z.object({ completed: z.boolean() });

export const sessionStartSchema = z.object({
  planTopicId: z.string().uuid().nullable(),
  taskId: z.string().uuid().nullable(),
  topicTitle: z.string().min(1),
  section: sectionSchema,
});

export const sessionActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'stop', 'heartbeat']),
});

export const mockScoreSchema = z.object({
  mockDate: z.string().date(),
  mockName: z.string().min(1).max(60),
  totalScore: z.number().min(0).max(300),
  overallPercentile: z.number().min(0).max(100),
  varcScore: z.number().min(0).max(100),
  varcPercentile: z.number().min(0).max(100),
  dilrScore: z.number().min(0).max(100),
  dilrPercentile: z.number().min(0).max(100),
  qaScore: z.number().min(0).max(100),
  qaPercentile: z.number().min(0).max(100),
  notes: z.string().max(500).optional(),
});

export const noteGenerateSchema = z.object({
  planTopicId: z.string().uuid().nullable(),
  topic: z.string().min(1),
  section: noteSectionSchema,
});

export const tutorMessageSchema = z.object({
  planTopicId: z.string().uuid().nullable(),
  message: z.string().min(1).max(2000),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});
```

## Seed data (development)

```sql
-- Example seed for the first 3 days of the 121-day plan; the full seed script
-- (scripts/seed-plan.ts) parses cat_2026_daily_plan.html and generates the
-- equivalent inserts for all 121 days at setup time.

insert into plan_days (day_number, scheduled_date) values
  (1, '2026-08-03'),
  (2, '2026-08-04'),
  (3, '2026-08-05');

insert into plan_topics (plan_day_id, section, title, scheduled_time, duration_minutes_planned)
select id, 'QA', 'Percentages — foundations', '09:00', 60 from plan_days where day_number = 1
union all
select id, 'DILR', 'Seating arrangement (linear)', '16:00', 45 from plan_days where day_number = 1
union all
select id, 'VARC', 'RC — social science passage drill', '20:00', 40 from plan_days where day_number = 2
union all
select id, 'MOCK', 'SimCAT 1 — full mock', '09:00', 180 from plan_days where day_number = 3;
```
