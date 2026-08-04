# 02 — Technical Requirements Document (TRD)

## Tech stack (with versions and justification)

| Layer | Choice | Version | Justification |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Vercel default, stable |
| Framework | Next.js | 15.1.x (App Router) | Server Components + Route Handlers in one deploy target |
| Language | TypeScript | 5.6.x, `strict: true` | Type safety across API contract and DB types |
| Styling | Tailwind CSS | 4.0.x | Utility-first, token-driven per `04-DESIGN.md` |
| UI primitives | Radix UI (headless) | 1.1.x per-package | Accessible primitives under custom-styled components |
| Database | PostgreSQL | 15 (Supabase-managed) | Free tier: 500MB, sufficient for single-user data volume |
| BaaS | Supabase JS | `@supabase/supabase-js` 2.45.x | Auth + DB + Storage + Edge Functions in one free project |
| Auth | Supabase Auth (magic link) | - | No password infra; single allowlisted email |
| LLM (deep/notes) | Gemini 2.5 Flash via OpenRouter | model `google/gemini-2.5-flash` | Free daily quota, strong long-form structured-markdown output, large output window needed for 18-20 page notes |
| LLM (fast/chat) | Llama 3.3 70B via Groq | model `llama-3.3-70b-versatile` | Free, sub-second latency, good enough for live doubt-solving |
| LLM (fallback) | DeepSeek V3 via OpenRouter | model `deepseek/deepseek-chat` | Free-tier fallback if Gemini/Groq rate-limited |
| Push | Web Push API | `web-push` npm 3.6.x | VAPID-based, no third-party notification service cost |
| Scheduling | Supabase Edge Functions + `pg_cron` | Deno runtime (Supabase-managed) | Free-tier cron, triggers reminder dispatch + news refresh |
| Data fetching | TanStack Query | 5.59.x | Client cache/refetch for tasks, notes, news, sessions |
| Client state | Zustand | 5.0.x | Active-topic context + running session timer (UI-only global state) |
| Forms | react-hook-form + Zod | 7.53.x / 3.23.x | Shared schema between client validation and API |
| Icons | lucide-react | 0.451.x | Tree-shakeable, free |
| Charts | Recharts | 2.12.x | Percentile trend, sectional breakdown, time-studied breakdown |
| Hosting (app) | Vercel | Hobby tier | Free for personal projects, auto CI/CD from GitHub |
| Hosting (db/cron) | Supabase | Free tier | 500MB DB, 2 free Edge Function projects, `pg_cron` included |

## Architecture diagram

```
+----------------------+       push subscribe        +------------------------+
|   Browser (PWA)       | ----------------------------> |  Supabase Auth         |
|  Next.js client        |<---- session cookie ---------|  (magic link)          |
|  Zustand: active topic |                                +------------------------+
|  + running timer        |
+-----------+-------------+
            | fetch / TanStack Query
            v
+---------------------------------------------------------------------------+
|                     Next.js Route Handlers (Vercel)                        |
|  /api/plan  /api/sessions  /api/tasks  /api/mocks  /api/notes              |
|  /api/notes/generate  /api/tutor  /api/news  /api/push/subscribe           |
+-----+-----------------+-----------------+-----------------+----------------+
      |                 |                 |                 |
      v                 v                 v                 v
+--------------+  +--------------+  +--------------+  +--------------+
| Supabase      |  | OpenRouter    |  | Groq          |  | web-push      |
| Postgres (RLS)|  | (Gemini 2.5   |  | (Llama 3.3    |  | (VAPID)       |
| plan_days,    |  |  Flash long-  |  |  70B, fast    |  | -> browser    |
| tasks,        |  |  form notes / |  |  tutor chat)  |  |   push service|
| study_sessions|  |  DeepSeek     |  +--------------+  +--------------+
| notes, mocks, |  |  fallback)    |
| news,         |  +--------------+
| tutor_msgs,   |
| push_subs     |
+-------+--------+
        |
        v
+---------------------------------------------------------------------------+
|                    Supabase Edge Functions (Deno) + pg_cron                |
|  dispatch-reminders   -> every 5 min: checks tasks due + stale-active-topic|
|                          nudges, calls web-push                            |
|  refresh-news         -> weekly: scrapes sources, summarizes via           |
|                          OpenRouter, inserts into news_items               |
+---------------------------------------------------------------------------+
```

## Complete folder/file structure

```
shikhar/
|-- app/
|   |-- (auth)/
|   |   `-- login/page.tsx
|   |-- (app)/
|   |   |-- layout.tsx                       # authenticated shell: nav + push permission prompt + persistent timer bar
|   |   |-- page.tsx                         # Today dashboard (active topic, timer, today's tasks, stats)
|   |   |-- plan/
|   |   |   |-- page.tsx                     # Full 121-day Plan Explorer
|   |   |   `-- [dayNumber]/page.tsx         # single day detail, topic list, "make active" action
|   |   |-- tutor/page.tsx
|   |   |-- notes/
|   |   |   |-- page.tsx                     # notes list, filter by section/topic
|   |   |   `-- [id]/page.tsx                # note viewer (versions dropdown)
|   |   |-- news/page.tsx
|   |   |-- progress/page.tsx
|   |   `-- settings/page.tsx
|   |-- api/
|   |   |-- plan/route.ts                    # GET all 121 days + topics
|   |   |-- tasks/route.ts                   # GET (list by date), PATCH (toggle complete)
|   |   |-- tasks/[id]/route.ts              # PATCH single task
|   |   |-- sessions/route.ts                # POST start session, GET list (by topic/date)
|   |   |-- sessions/[id]/route.ts           # PATCH stop/pause session (sets endedAt, durationSeconds)
|   |   |-- mocks/route.ts                   # GET list, POST create
|   |   |-- notes/route.ts                   # GET list
|   |   |-- notes/[id]/route.ts              # GET single note (with version history)
|   |   |-- notes/generate/route.ts          # POST -> calls Gemini via OpenRouter with full cat-notes-skill prompt
|   |   |-- tutor/route.ts                   # POST chat message -> Groq
|   |   |-- news/route.ts                    # GET digest list
|   |   |-- push/subscribe/route.ts          # POST save push subscription
|   |   `-- cron/
|   |       |-- dispatch-reminders/route.ts  # invoked by Supabase Edge Function
|   |       `-- refresh-news/route.ts        # invoked by Supabase Edge Function
|   |-- layout.tsx                           # root layout, font, manifest link
|   `-- globals.css                          # Tailwind + CSS variable tokens
|-- components/
|   |-- ui/
|   |   |-- button.tsx
|   |   |-- card.tsx
|   |   |-- badge.tsx
|   |   |-- input.tsx
|   |   |-- modal.tsx
|   |   |-- toast.tsx
|   |   `-- skeleton.tsx
|   |-- dashboard/
|   |   |-- stat-card.tsx
|   |   |-- task-row.tsx
|   |   |-- active-topic-card.tsx            # shows currently selected topic + timer controls
|   |   `-- today-plan-card.tsx
|   |-- plan/
|   |   |-- day-accordion.tsx                # one day, expandable, lists topics
|   |   |-- topic-row.tsx                    # single topic with "make active" button
|   |   `-- section-filter-bar.tsx
|   |-- timer/
|   |   `-- session-timer-bar.tsx            # persistent bottom/top bar, visible across all routes when a session is running
|   |-- tutor/
|   |   |-- chat-thread.tsx
|   |   |-- chat-bubble.tsx
|   |   `-- chat-input.tsx
|   |-- notes/
|   |   |-- note-card.tsx
|   |   |-- note-viewer.tsx
|   |   `-- note-version-picker.tsx
|   |-- news/
|   |   `-- news-card.tsx
|   `-- progress/
|       |-- streak-chart.tsx
|       |-- percentile-chart.tsx
|       `-- time-studied-chart.tsx
|-- lib/
|   |-- supabase/
|   |   |-- client.ts                        # browser client
|   |   `-- server.ts                        # server client (RSC/route handlers)
|   |-- llm/
|   |   |-- openrouter.ts                    # Gemini + DeepSeek fallback wrapper, high max_tokens for long notes
|   |   |-- groq.ts                          # fast tutor chat wrapper
|   |   `-- prompts.ts                       # full cat-notes-skill system prompt (verbatim), tutor system prompt
|   |-- push/
|   |   `-- web-push.ts                      # VAPID config, send helper
|   |-- store/
|   |   `-- active-topic-store.ts            # Zustand: activeTopic, activeTaskId, timer state (running/paused, elapsedSeconds)
|   |-- validation/
|   |   `-- schemas.ts                       # Zod schemas, shared client+server
|   `-- types.ts                             # shared TS interfaces
|-- public/
|   |-- sw.js                                # service worker: push + notificationclick
|   |-- manifest.json                        # PWA manifest
|   `-- icons/                               # 192x192, 512x512
|-- supabase/
|   |-- migrations/
|   |   |-- 0001_init.sql
|   |   |-- 0002_rls.sql
|   |   `-- 0003_functions.sql
|   `-- functions/
|       |-- dispatch-reminders/index.ts
|       `-- refresh-news/index.ts
|-- .env.local.example
|-- next.config.ts
|-- tailwind.config.ts
|-- tsconfig.json
`-- package.json
```

## npm packages (exact purpose)

| Package | Purpose |
|---|---|
| `next` | Framework |
| `react`, `react-dom` | UI runtime |
| `typescript` | Type checking |
| `tailwindcss`, `@tailwindcss/postcss` | Styling |
| `@radix-ui/react-dialog` | Modal primitive (note viewer, mock-score form) |
| `@radix-ui/react-toast` | Toast primitive |
| `@supabase/supabase-js` | DB/Auth/Storage client |
| `@supabase/ssr` | Server-side session handling in Route Handlers/RSC |
| `@tanstack/react-query` | Client data fetching/caching |
| `zustand` | Active-topic context + running session timer state |
| `react-hook-form` | Form state |
| `zod` | Schema validation (client + API) |
| `@hookform/resolvers` | Wires Zod into react-hook-form |
| `lucide-react` | Icons |
| `recharts` | Charts (percentile trend, sectional breakdown, time studied) |
| `web-push` | Server-side push sending (VAPID) |
| `date-fns` | Date/duration math for streaks, session timers, task scheduling |
| `react-markdown` | Render AI-generated notes (markdown -> HTML), including tables in the cheat sheet |

## Environment variables

| Variable | Type | Example | Used by |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | string (URL) | `https://xxxx.supabase.co` | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | `eyJhbGciOi...` | client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | string (secret) | `eyJhbGciOi...` | server only - cron routes, bypasses RLS |
| `ALLOWED_USER_EMAIL` | string | `kanishk@example.com` | server - allowlist check on login |
| `OPENROUTER_API_KEY` | string (secret) | `sk-or-v1-...` | server - `lib/llm/openrouter.ts` |
| `GROQ_API_KEY` | string (secret) | `gsk_...` | server - `lib/llm/groq.ts` |
| `VAPID_PUBLIC_KEY` | string | `BN4Gv...` | client (subscribe) + server (send) |
| `VAPID_PRIVATE_KEY` | string (secret) | `xY3...` | server - `lib/push/web-push.ts` |
| `VAPID_SUBJECT` | string | `mailto:kanishk@example.com` | server - required by web-push spec |
| `CRON_SECRET` | string (secret) | random 32-char | server - verifies Supabase Edge Function -> Next.js API calls |

`.env.local.example` must list all of the above with placeholder values, committed to the repo; the real `.env.local` is gitignored.

## Third-party API integrations

### OpenRouter (Gemini 2.5 Flash, DeepSeek fallback) — long-form note generation
- **Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Auth:** `Authorization: Bearer ${OPENROUTER_API_KEY}`
- **Request shape (notes generation, full `cat-notes-skill` prompt as system message):**
```json
{
  "model": "google/gemini-2.5-flash",
  "messages": [
    { "role": "system", "content": "<verbatim cat-notes-skill instructions from lib/llm/prompts.ts>" },
    { "role": "user", "content": "Generate the complete CAT topper notes for topic: 'Percentages' (section: QA). Follow every section of the skill in order. Do not summarize or shorten any section. Minimum 25 practice questions across the three tiers, each with a full worked solution." }
  ],
  "temperature": 0.3,
  "max_tokens": 12000
}
```
- **Response shape:** `{ choices: [{ message: { role: "assistant", content: "<full markdown, ~5000-8000+ words>" } }], usage: {...} }`
- **Fallback rule:** if response status is 429 or 5xx, retry once against `model: "deepseek/deepseek-chat"` with the same payload and `max_tokens`.
- **Post-generation validation:** the API route counts words in the returned content; if under ~3,000 words or missing any of the 7 required section headers, it automatically re-requests once with an appended instruction: "Your previous output was incomplete — regenerate in full, ensuring all 7 sections and at least 25 practice questions are present."

### Groq (Llama 3.3 70B, tutor chat)
- **Endpoint:** `POST https://api.groq.com/openai/v1/chat/completions`
- **Auth:** `Authorization: Bearer ${GROQ_API_KEY}`
- **Request shape:**
```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    { "role": "system", "content": "<tutor system prompt, includes the currently active topic from the Zustand/DB active-topic state, not the calendar date>" },
    { "role": "user", "content": "<user question>" }
  ],
  "temperature": 0.4,
  "max_tokens": 800
}
```
- **Response shape:** OpenAI-compatible `{ choices: [{ message: { content: "..." } }] }`

### Web Push (browser push service, via `web-push` npm)
- No HTTP call written by hand - the `web-push` library handles the VAPID-signed request to whatever push service the browser's subscription endpoint points to (FCM for Chrome, Mozilla for Firefox, etc.)
- **Server call shape:**
```ts
webpush.sendNotification(subscription, JSON.stringify({ title, body, url }))
```

## TypeScript interfaces (shared, `lib/types.ts`)

```typescript
export type Section = 'QA' | 'DILR' | 'VARC' | 'MOCK' | 'REVIEW';

export interface PlanDay {
  id: string;
  dayNumber: number;          // 1-121
  scheduledDate: string;      // ISO date this day was originally planned for
  topics: PlanTopic[];
}

export interface PlanTopic {
  id: string;
  planDayId: string;
  dayNumber: number;
  section: Section;
  title: string;              // e.g. "Percentages", "Seating arrangement (circular)"
  scheduledTime: string | null;
  durationMinutesPlanned: number | null;
}

export interface Task {
  id: string;
  userId: string;
  planTopicId: string | null; // links back to the original plan slot, nullable for ad-hoc tasks
  date: string;                // real calendar date the task is scheduled for
  section: Section;
  title: string;
  scheduledTime: string | null;
  durationMinutes: number | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  planTopicId: string | null;  // which plan topic this session was logged against (any day, any topic)
  taskId: string | null;
  topicTitle: string;          // denormalized for fast display even if plan topic changes
  section: Section;
  startedAt: string;           // ISO timestamp
  endedAt: string | null;
  durationSeconds: number | null;
  status: 'running' | 'paused' | 'completed' | 'auto-closed';
  createdAt: string;
}

export interface MockScore {
  id: string;
  userId: string;
  mockDate: string;
  mockName: string;
  totalScore: number;
  overallPercentile: number;
  varcScore: number;
  varcPercentile: number;
  dilrScore: number;
  dilrPercentile: number;
  qaScore: number;
  qaPercentile: number;
  notes: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  planTopicId: string | null;
  topic: string;
  section: 'QA' | 'DILR' | 'VARC';
  content: string;              // full markdown, all 7 cat-notes-skill sections
  wordCount: number;
  questionCount: number;        // must be >= 25
  version: number;               // increments on regenerate, never overwrites
  generatedBy: 'gemini-2.5-flash' | 'deepseek-chat';
  fileNamingKey: string;         // e.g. "CAT_QA_Percentages_Complete"
  createdAt: string;
}

export interface TutorMessage {
  id: string;
  userId: string;
  planTopicId: string | null;   // groups messages by active topic, not just by day
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedWeekOf: string;
  createdAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}
```

## Error handling strategy

| Layer | Failure | Behavior |
|---|---|---|
| Client fetch (TanStack Query) | Network error | Show inline retry button on the affected card only, not a full-page crash |
| API route -> Supabase | DB error | Return `500` with `{ error: { code: "DB_ERROR", message: "..." } }`; log full error server-side only |
| API route -> OpenRouter (notes) | 429 rate limit | Retry once against DeepSeek fallback; if that also fails, return `{ error: { code: "LLM_BUSY" } }` and client shows "Notes engine is busy, try again shortly" without losing the topic selection |
| API route -> OpenRouter (notes) | Output too short / missing sections | One automatic regeneration attempt with a stricter instruction (see Third-party API integrations above); if still incomplete, save as `status: draft` and flag it in the UI rather than silently discarding |
| API route -> Groq (tutor) | 429 / timeout | Return `{ error: { code: "LLM_BUSY" } }`, client shows "Tutor is busy, try again in a moment" |
| API route -> OpenRouter/Groq | Network/timeout (>15s chat, >45s notes) | Abort via `AbortController`, return `504`, client shows retry |
| Sessions | Timer left running, no heartbeat for 30 min | Cron marks session `auto-closed`, sets `endedAt` to last heartbeat time, `durationSeconds` computed from that |
| Push send | Subscription expired (410/404) | Delete the stale `push_subscriptions` row server-side, don't retry |
| Auth | Non-allowlisted email attempts login | Magic link still sends (Supabase default) but server rejects session on first authenticated request with `403`, redirects to a static "not authorized" page |
| Global | Any uncaught client error | Next.js `error.tsx` boundary per route group, shows a friendly message + "reload" action, never a blank screen |

## Performance requirements

- Dashboard (Today) must be interactive within 1.5s on a 4G connection - achieved via Server Component initial render + streaming, no client-side waterfall for the first paint
- Tutor chat first-token latency under 2s (Groq's typical response time supports this)
- Notes generation is expected to take 15-45s given the required 5,000-8,000+ word output - the UI must show an explicit progress state ("Writing core concepts...", "Building practice questions...") rather than a spinner with no context, and must remain navigable (user can leave the page; generation continues server-side and the note appears in Notes when ready, with a toast notification)
- Plan Explorer (121 days) must virtualize the list (render only visible days) to stay performant on mobile
- All list views (`notes`, `news`, `sessions`) paginate at 20 items with cursor-based `created_at` pagination to keep payloads small on the free Supabase tier

## Security checklist

- [ ] Row Level Security enabled on every table; all policies scoped to `auth.uid() = user_id` (see `05-BACKEND-SCHEMA.md`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to the client - used only in `app/api/cron/*` routes, gated by `CRON_SECRET` header check
- [ ] Login restricted to `ALLOWED_USER_EMAIL` - checked server-side on every authenticated request, not just at login
- [ ] All API inputs validated via Zod before touching the database (see `05-BACKEND-SCHEMA.md` -> Zod schemas)
- [ ] VAPID private key stored only in server env, never sent to client
- [ ] `CRON_SECRET` required on `dispatch-reminders` and `refresh-news` routes to prevent public triggering
- [ ] No LLM API key ever included in a client bundle - all LLM calls proxied through Next.js API routes
- [ ] Rate limit on `/api/tutor` and `/api/notes/generate` (simple in-memory or Supabase-backed counter) to avoid burning free-tier LLM quota from accidental loops
- [ ] `/api/sessions` start endpoint rejects starting a second `running` session while one is already active, to keep time-tracking data clean
