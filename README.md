# Shikhar — CAT 2026 Prep Companion

> **One summit. One system. 121 days.**

Shikhar (शिखर, "summit") is a personal, single-user, zero-cost PWA that replaces five disconnected habits — a static daily-plan tracker, ad-hoc doubt-solving, manually written notes, forgetting to check CAT/IIM news, and forgetting to actually open the plan — with one app.

Built to run **entirely on free-tier infrastructure**: Vercel + Supabase + OpenRouter + Groq. No subscription cost for the full prep window.

---

## Features

| Feature | What it does |
|---|---|
| **Daily plan tracker** | Today's tasks with complete/incomplete toggle, streak counter, scheduled vs. "anytime" grouping. |
| **AI tutor chat** | Context-aware doubt solver — knows what you're studying today. Sub-2s replies via Groq (Llama 3.3 70B). |
| **AI note generation** | Topper-style structured notes (concept summary, worked example, common traps, quick recall) via Gemini 2.5 Flash with DeepSeek fallback. Versioned — never overwrites. |
| **Web Push reminders** | Fires at each task's scheduled time. Streak-risk warning at 18:00 if no task started. |
| **News & cutoffs digest** | Weekly auto-generated summary of CAT notifications / IIM cutoff changes from official sources. |
| **Progress dashboard** | Streak counter, percentile trend chart (overall + sectional), section strength flags. |
| **Mock score logging** | Form to log total + sectional scores per mock. |

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), TypeScript strict | SSR + API routes in one deploy, free on Vercel |
| Styling | Tailwind CSS v4, custom Notion-inspired tokens | Token-driven, no component library lock-in |
| Backend | Next.js Route Handlers + Supabase | No separate server to host |
| Database | Postgres via Supabase (free tier, 500MB) | Single free-tier project covers auth + DB + cron + storage |
| Auth | Supabase Auth, magic link, single-email allowlist | Zero password infra, one user only |
| LLM (notes, deep) | Gemini 2.5 Flash via OpenRouter | Free daily quota, structured markdown output |
| LLM (tutor, fast) | Llama 3.3 70B via Groq | Free, sub-second latency |
| LLM (fallback) | DeepSeek V3 via OpenRouter | Free-tier fallback if Gemini is rate-limited |
| Push notifications | Web Push API (VAPID) + service worker | No third-party SMS/WhatsApp cost |
| Scheduled jobs | Supabase Edge Functions + `pg_cron` | Free-tier cron |
| Data fetching | TanStack Query v5 + Server Components | Standard Next.js 15 pairing |
| State | Zustand (UI-only) | Most state is server state |
| Forms | react-hook-form + Zod | Shared client/server validation |
| Charts | Recharts | Percentile trends, section breakdown |

---

## Project structure

```
shikhar/
├── app/
│   ├── (auth)/login/page.tsx              # magic-link login
│   ├── (app)/                             # authenticated shell
│   │   ├── layout.tsx                     # nav + push banner
│   │   ├── page.tsx                       # Today dashboard
│   │   ├── tutor/page.tsx                 # AI tutor chat
│   │   ├── notes/page.tsx                 # notes list
│   │   ├── notes/[id]/page.tsx            # single note viewer
│   │   ├── news/page.tsx                  # weekly digest
│   │   ├── progress/page.tsx              # streak + percentile charts
│   │   └── settings/page.tsx              # push enable, PWA info
│   ├── api/                               # route handlers
│   │   ├── tasks/route.ts                 # GET list, by date
│   │   ├── tasks/[id]/route.ts            # PATCH toggle complete
│   │   ├── mocks/route.ts                 # GET list, POST create
│   │   ├── notes/route.ts                 # GET list
│   │   ├── notes/[id]/route.ts            # GET single note
│   │   ├── notes/generate/route.ts        # POST → Gemini via OpenRouter
│   │   ├── tutor/route.ts                 # GET/POST chat
│   │   ├── news/route.ts                  # GET digest
│   │   ├── push/subscribe/route.ts        # POST/DELETE push subscription
│   │   ├── push/vapid/route.ts            # GET public VAPID key
│   │   ├── streak/route.ts                # GET streak info
│   │   └── cron/
│   │       ├── dispatch-reminders/route.ts # called by Supabase every 5 min
│   │       └── refresh-news/route.ts       # called weekly
│   ├── auth/callback/route.ts             # magic-link redirect target
│   ├── layout.tsx                         # root layout + SW registration
│   ├── globals.css                        # Tailwind + design tokens
│   ├── error.tsx                          # global error boundary
│   └── not-found.tsx                      # 404
├── components/
│   ├── ui/                                # button, card, badge, input, modal, toast, skeleton, etc.
│   ├── dashboard/                         # StatCard, TaskRow, TodayPlanCard
│   ├── tutor/                             # ChatBubble, ChatInput, ChatThread
│   ├── notes/                             # NoteCard, NoteViewer
│   ├── news/                              # NewsCard
│   ├── progress/                          # StreakChart, PercentileChart
│   ├── app/                               # AppNav, AppProviders, PushPermissionBanner
│   └── settings/                          # SettingsClient
├── lib/
│   ├── types.ts                           # shared TS interfaces
│   ├── utils.ts                           # cn(), date helpers
│   ├── supabase/
│   │   ├── client.ts                      # browser client
│   │   └── server.ts                      # server + service-role + allowlist
│   ├── llm/
│   │   ├── openrouter.ts                  # Gemini + DeepSeek fallback
│   │   ├── groq.ts                        # Llama 3.3 70B fast path
│   │   └── prompts.ts                     # cat-notes-skill, tutor, news prompts
│   ├── push/
│   │   └── web-push.ts                    # VAPID-signed send helper
│   └── validation/
│       └── schemas.ts                     # Zod schemas + rate limiter + cron secret verifier
├── public/
│   ├── sw.js                              # service worker (push + notificationclick)
│   ├── manifest.json                      # PWA manifest
│   └── icons/                             # 192 / 512 PNG icons
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql                  # tables, indexes
│   │   ├── 0002_rls.sql                   # RLS policies
│   │   └── 0003_functions.sql             # update_streak, insert_note_with_version, pg_cron jobs
│   ├── functions/
│   │   ├── dispatch-reminders/index.ts    # forwards to /api/cron/dispatch-reminders
│   │   └── refresh-news/index.ts          # forwards to /api/cron/refresh-news
│   └── config.toml                        # supabase project config
├── middleware.ts                          # session refresh + redirect to /login
├── .env.local.example                     # all env vars documented
├── .gitignore
├── .eslintrc.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Setup

### 1. Install dependencies

```bash
cd shikhar
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Note your Project URL and anon key from Settings → API.
3. Generate a service role key (Settings → API → service_role secret).

### 3. Run database migrations

```bash
# Install Supabase CLI: https://supabase.com/docs/guides/cli
supabase db push --db-url postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

Or paste the contents of `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_functions.sql` into the Supabase SQL editor and run them in order.

### 4. Generate VAPID keys for Web Push

```bash
npx web-push generate-vapid-keys
```

Save the public and private keys for the next step.

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_USER_EMAIL` — the single email that can access the app
- `OPENROUTER_API_KEY` — from [openrouter.ai/keys](https://openrouter.ai/keys)
- `GROQ_API_KEY` — from [console.groq.com/keys](https://console.groq.com/keys)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `CRON_SECRET` — generate with `openssl rand -hex 32`

### 6. Set up the auth allowlist

In Supabase → Auth → Users, disable "Allow new users to sign up" after you've added the allowlisted email. (Or leave it on — non-allowlisted emails will still be rejected by the server on first authenticated request.)

### 7. Deploy Edge Functions + pg_cron

```bash
supabase functions deploy dispatch-reminders --no-verify-jwt
supabase functions deploy refresh-news --no-verify-jwt
```

In Supabase → Edge Functions → Secrets, set:
- `SHIKHAR_API_BASE` — your deployed Vercel URL (e.g. `https://shikhar.vercel.app`)
- `CRON_SECRET` — same value as in `.env.local`

Then in the SQL editor, run the `cron.schedule` calls from `0003_functions.sql` (they're inside a `do $$` block that's idempotent). Set the project settings:
```sql
alter database postgres set app.functions_url to 'https://[PROJECT].functions.supabase.co';
alter database postgres set app.cron_secret to '[CRON_SECRET]';
```

### 8. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`. Enter the allowlisted email, click the magic link, and you're in.

### 9. Deploy to Vercel

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add all env vars from `.env.local` to Vercel → Settings → Environment Variables.
4. Deploy. Vercel auto-detects Next.js.

---

## Seed the 121-day plan (Aug 1 → Nov 29, 2026)

The plan mirrors `cat_2026_daily_plan.html`: 121 days, 28 full mocks, phases August (Foundation Sprint) → September (Deep Practice & Mock Ramp) → October (Mock Marathon) → November (Final Sprint & Taper).

Run:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TARGET_USER_ID=<your-uuid> npx tsx scripts/seed-plan.ts
```

The script is re-seedable — it deletes existing tasks in the Aug 1 – Nov 29 window before inserting. Sections used: `QA`, `DILR`, `VARC`, `MOCK`, `REVIEW`.

---

## Definition of done (per `00-README.md`)

- [x] User can log in via magic link; only allowlisted email can access the app
- [x] Today dashboard shows real tasks with working complete/incomplete toggle
- [x] Tutor chat returns Groq response, no paid API call in network tab
- [x] "Generate notes" produces markdown via Gemini 2.5 Flash, saved to `notes` table
- [x] Push notification fires at scheduled task time (test via a 1-min-out task)
- [x] News tab shows at least one digest entry after cron runs once manually
- [x] Progress tab renders streak + percentile trend chart
- [x] Every screen has loading / empty / error states
- [x] `npm run build` succeeds with zero TypeScript errors
- [x] No API key committed; `.env.local.example` lists every required variable

---

## License

Personal use only. Built for one user's CAT 2026 prep.
