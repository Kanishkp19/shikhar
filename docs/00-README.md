# Shikhar — CAT 2026 Prep Companion

**Read this file first.** It orients an AI coding agent (Claude Code, Cursor, Windsurf) to the whole project before it opens any other doc.

## What this is

Shikhar (शिखर, "summit") is a personal, single-user, zero-cost PWA that replaces five disconnected habits — a static daily-plan tracker, ad-hoc doubt-solving, manually written notes, forgetting to check CAT/IIM news, and forgetting to actually open the plan — with one app: tutor, notes generator, reminder system, and news digest for one person's CAT 2026 prep, running entirely on free tiers.

## Project summary

Kanishk is running a 121-day CAT 2026 prep plan (28 full mocks, DILR/QA/VARC sectional rotation) that currently lives as static HTML dashboards. Shikhar turns that plan into a living Supabase-backed tracker, adds an AI tutor and topper-style note generator (both running on free-tier LLMs, never a paid API), fires Web Push reminders at each task's scheduled time, and pulls a weekly digest of CAT notifications, IIM cutoffs, and shortlist criteria changes. It is built to be free to run indefinitely for one user.

## Tech stack (one line each)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), TypeScript strict | SSR + API routes in one deploy, free on Vercel |
| Styling | Tailwind CSS v4, custom tokens (see `04-DESIGN.md`) | Notion-derived design system, no component library lock-in |
| Backend | Next.js Route Handlers + Supabase | No separate server to host |
| Database | Postgres via Supabase (free tier, 500MB) | Single free-tier project covers auth + DB + cron + storage |
| Auth | Supabase Auth, magic link, single-email allowlist | Zero password infra, one user only |
| LLM — notes & tutor (deep) | Gemini 2.5 Flash via OpenRouter | Free daily quota, best match to Claude-quality structured notes |
| LLM — tutor (fast) | Llama 3.3 70B via Groq | Free, near-instant, for live chat replies |
| LLM — fallback | DeepSeek V3 via OpenRouter | Free-tier fallback if Gemini quota is hit |
| Push notifications | Web Push API (VAPID) + service worker | No third-party SMS/WhatsApp cost |
| Scheduled jobs | Supabase Edge Functions + `pg_cron` | Free-tier cron, no external scheduler needed |
| Hosting | Vercel (frontend/API), Supabase (DB/cron/storage) | Both have free tiers sufficient for one user |
| Data fetching | TanStack Query v5 (client), Server Components (SSR) | Standard Next.js 15 pairing |
| State | Zustand for UI-only global state | No Redux; most state is server state via TanStack Query |
| Forms | react-hook-form + Zod | Shared validation with API layer |
| Icons | lucide-react | Free, tree-shakeable |

## Folder structure to scaffold

```
shikhar/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Today dashboard
│   │   ├── tutor/page.tsx
│   │   ├── notes/page.tsx
│   │   ├── notes/[id]/page.tsx
│   │   ├── news/page.tsx
│   │   ├── progress/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── tasks/route.ts
│   │   ├── tasks/[id]/route.ts
│   │   ├── mocks/route.ts
│   │   ├── notes/route.ts
│   │   ├── notes/generate/route.ts
│   │   ├── tutor/route.ts
│   │   ├── news/route.ts
│   │   ├── push/subscribe/route.ts
│   │   └── cron/
│   │       ├── dispatch-reminders/route.ts
│   │       └── refresh-news/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # button, card, badge, input, modal — see 04-DESIGN.md
│   ├── dashboard/                   # StatCard, TaskRow, TodayPlanCard
│   ├── tutor/                       # ChatBubble, ChatInput, ChatThread
│   ├── notes/                       # NoteCard, NoteViewer
│   ├── news/                        # NewsCard
│   └── progress/                    # StreakChart, PercentileChart
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── llm/openrouter.ts
│   ├── llm/groq.ts
│   ├── llm/prompts.ts               # cat-notes-skill prompt, tutor system prompt
│   ├── push/web-push.ts
│   ├── validation/schemas.ts        # Zod schemas
│   └── types.ts
├── public/
│   ├── sw.js                        # service worker for push
│   └── manifest.json
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls.sql
│   │   └── 0003_functions.sql
│   └── functions/
│       ├── dispatch-reminders/index.ts
│       └── refresh-news/index.ts
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

## Doc reading order

1. `00-README.md` — this file
2. `01-PRD.md` — what to build and why
3. `02-TRD.md` — full stack, folder tree, types, env vars
4. `03-APP-FLOW.md` — every screen, every state
5. `04-DESIGN.md` — every token, every component style
6. `05-BACKEND-SCHEMA.md` — every table, every SQL statement, every API contract
7. `06-IMPLEMENTATION-PLAN.md` — the exact build order, phase by phase

## Agent operating rules

- Always check `05-BACKEND-SCHEMA.md` before writing any API route — the request/response shape is already defined, don't improvise it.
- Always match Tailwind classes to `04-DESIGN.md` — colors and radii are tokenized, never hardcode a hex value in a component.
- Never introduce a paid API call. If a task seems to need one, re-check `02-TRD.md` → LLM routing table for the free alternative.
- Every screen in `03-APP-FLOW.md` must resolve to a route in the folder tree above — if it doesn't, add the route, don't skip the screen.
- Build in the phase order given in `06-IMPLEMENTATION-PLAN.md` — don't build the tutor before the database exists.
- This is a single-user app. Don't build multi-tenant abstractions (org switching, team invites, billing) — see Non-Goals in `01-PRD.md`.

## Build command sequence

```
1. init        → npx create-next-app, install deps, set up Tailwind tokens
2. db           → supabase init, run migrations 0001–0003
3. auth         → magic link login, allowlist check
4. features     → dashboard → tutor → notes → reminders → news → progress
5. polish       → loading/empty/error states per 03-APP-FLOW.md
6. test         → manual pass through every screen state
7. deploy       → Vercel + Supabase, set env vars, verify cron fires
```

## Definition of done

- [ ] User can log in via magic link and only the allowlisted email can access the app
- [ ] Today dashboard shows real tasks pulled from the seeded 121-day plan, with working complete/incomplete toggle
- [ ] Tutor chat returns a response from Groq (fast path) with no paid API call in the network tab
- [ ] "Generate notes" on any topic produces markdown notes via Gemini 2.5 Flash and saves them to `notes` table
- [ ] A push notification fires at a task's scheduled time (test via a task scheduled 1 minute out)
- [ ] News tab shows at least one digest entry after the weekly cron runs once manually
- [ ] Progress tab renders streak count and a percentile trend chart from seeded mock scores
- [ ] Every screen has a working loading, empty, and error state as specified in `03-APP-FLOW.md`
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] No API key is committed; `.env.local.example` lists every required variable
