# 06 — Implementation Plan

## Build philosophy

Build bottom-up: database and auth first (nothing works without them), then the Plan Explorer and dashboard (the app is useless without a way to select what to study), then the timer (ties selection to real tracked effort), then the two AI features (highest value, but depend on everything above having real data to be contextual), then reminders and news (background systems, safe to build last), then polish and deploy. Each phase should be independently testable before starting the next.

## Phases

### Phase 0 — Project init
**Entry criteria:** none
**Exit criteria:** app boots locally, Tailwind tokens render, Supabase project exists

Tasks:
1. `npx create-next-app@latest shikhar --typescript --tailwind --app` → scaffold
2. Install deps: `npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query zustand react-hook-form zod @hookform/resolvers lucide-react recharts web-push date-fns react-markdown @radix-ui/react-dialog @radix-ui/react-toast`
3. Create `app/globals.css` with the full CSS variables block from `04-DESIGN.md`
4. Create `tailwind.config.ts` extending theme with the token names from `04-DESIGN.md`
5. Create a Supabase project (free tier), copy URL + anon key into `.env.local` (from `.env.local.example`)
6. Verify: `npm run dev` renders a blank canvas-colored page with the Inter font loading

Git: `git commit -m "phase 0: project init, tokens, supabase project"`

### Phase 1 — Database & Auth
**Entry criteria:** Phase 0 done
**Exit criteria:** all tables exist with RLS, login works end-to-end for the allowlisted email only

Tasks:
1. `supabase init`, `supabase link` to the created project
2. Create `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_functions.sql` exactly as specified in `05-BACKEND-SCHEMA.md`
3. `supabase db push` — verify all 9 tables exist in the Supabase dashboard
4. Build `lib/supabase/client.ts` and `lib/supabase/server.ts` per `@supabase/ssr` docs
5. Build `app/(auth)/login/page.tsx` with the magic-link form (per `03-APP-FLOW.md` → `/login`)
6. Build server-side allowlist check: a shared helper `lib/auth/require-allowed-user.ts` called at the top of every `(app)` layout and API route, comparing the session email to `ALLOWED_USER_EMAIL`, returning `403` otherwise
7. Verify: log in with the allowlisted email succeeds; log in with any other email (if testable) hits the `403` page

Git: `git commit -m "phase 1: database schema, RLS, magic link auth with allowlist"`

### Phase 2 — Plan ingestion & Plan Explorer
**Entry criteria:** Phase 1 done
**Exit criteria:** all 121 days visible and browsable in `/plan`, any topic selectable as active

Tasks:
1. Write `scripts/seed-plan.ts`: parses `cat_2026_daily_plan.html` (the source file), extracts day number, scheduled date, and each topic's section/title/time/duration, and inserts into `plan_days`/`plan_topics` via the Supabase service role client
2. Run the seed script once against the linked Supabase project; verify row counts (121 in `plan_days`, N topics in `plan_topics`)
3. Build `app/api/plan/route.ts` (`GET`, with `section`/`search` filtering per `05-BACKEND-SCHEMA.md`)
4. Build `lib/store/active-topic-store.ts` (Zustand): `activeTopic`, `setActiveTopic()`, hydrated on app load from any `running`/`paused` session
5. Build `components/plan/day-accordion.tsx`, `topic-row.tsx`, `section-filter-bar.tsx` per `03-APP-FLOW.md` → `/plan` spec, with list virtualization (e.g. `@tanstack/react-virtual`) for the 121-day list
6. Build `app/(app)/plan/page.tsx` and `app/(app)/plan/[dayNumber]/page.tsx`
7. Wire "Make active" to `setActiveTopic()` + a toast, per the design spec
8. Verify: search "percentage" surfaces the right topic across all 121 days; selecting a topic from Day 40 while "today" is Day 3 correctly sets it active with no date restriction

Git: `git commit -m "phase 2: plan ingestion, full plan explorer, active topic selection"`

### Phase 3 — Dashboard & Task tracking
**Entry criteria:** Phase 2 done
**Exit criteria:** Dashboard shows real tasks, streak, and the active topic; toggling tasks works

Tasks:
1. Build `app/api/tasks/route.ts` (`GET`), `app/api/tasks/[id]/route.ts` (`PATCH`)
2. Build `components/dashboard/stat-card.tsx`, `task-row.tsx`, `today-plan-card.tsx`, `active-topic-card.tsx`
3. Build streak computation (client-side derive from `tasks` history, or a small server helper) — consecutive days with ≥1 completed task
4. Build `app/(app)/page.tsx` composing all of the above per `03-APP-FLOW.md` → `/` spec
5. Verify: checking a task updates instantly (optimistic), streak recalculates, refresh preserves state

Git: `git commit -m "phase 3: dashboard, task tracking, streak"`

### Phase 4 — Study Session Timer
**Entry criteria:** Phase 3 done
**Exit criteria:** starting/pausing/stopping a session persists correct durations, visible everywhere via the persistent bar

Tasks:
1. Build `app/api/sessions/route.ts` (`POST`, with the "one active session" guard), `app/api/sessions/[id]/route.ts` (`PATCH` for pause/resume/stop/heartbeat)
2. Build `components/timer/session-timer-bar.tsx` per `04-DESIGN.md` → Session Timer bar spec, mounted in `app/(app)/layout.tsx`
3. Wire a client-side `setInterval` heartbeat (every 60s while `running`) calling `PATCH .../heartbeat`
4. Verify: start a session, navigate across Dashboard/Tutor/Notes — timer keeps running and visible; stop it — `duration_seconds` in the DB matches the visible elapsed time within a few seconds

Git: `git commit -m "phase 4: study session timer, persistent across routes"`

### Phase 5 — AI Tutor
**Entry criteria:** Phase 4 done (needs active-topic context)
**Exit criteria:** live doubt-solving chat, grounded in the active topic, using Groq

Tasks:
1. Build `lib/llm/groq.ts` — request wrapper per `02-TRD.md` → Groq integration
2. Build `lib/llm/prompts.ts` → tutor system prompt template (injects `activeTopic.title`, `activeTopic.section`, and last 6 messages of thread history)
3. Build `app/api/tutor/route.ts` (`POST`)
4. Build `components/tutor/chat-thread.tsx`, `chat-bubble.tsx`, `chat-input.tsx`
5. Build `app/(app)/tutor/page.tsx` per `03-APP-FLOW.md` → `/tutor` spec, including the loading-dots and retry-on-failure states
6. Verify: with a topic active, ask a question — response returns in ~2-3s, no paid API appears in any network log

Git: `git commit -m "phase 5: AI tutor chat via Groq, topic-aware"`

### Phase 6 — AI Note Generation (cat-notes-skill)
**Entry criteria:** Phase 5 done
**Exit criteria:** "Generate notes" produces a full 7-section, 25+ question note matching the skill exactly, saved and viewable

Tasks:
1. Copy the full `cat-notes-skill` instructions verbatim into `lib/llm/prompts.ts` as the system prompt constant `CAT_NOTES_SKILL_PROMPT`
2. Build `lib/llm/openrouter.ts` — request wrapper with the Gemini→DeepSeek fallback logic and the word-count/section-header validation described in `02-TRD.md`
3. Build `app/api/notes/generate/route.ts` (`POST`) — accepts topic/section, calls the wrapper, computes `word_count`/`question_count`, sets `file_naming_key`, saves with correct `version` (increment if prior notes exist for that topic)
4. Build `app/api/notes/route.ts` (`GET` list), `app/api/notes/[id]/route.ts` (`GET` single with versions)
5. Build `components/notes/note-card.tsx`, `note-viewer.tsx`, `note-version-picker.tsx`
6. Build `app/(app)/notes/page.tsx` and `app/(app)/notes/[id]/page.tsx` per `03-APP-FLOW.md`, including the four-stage generation-progress toast
7. Verify: generate notes on "Percentages" — output has all 7 section headers, ≥25 questions across the three tiers, ≥5,000 words; regenerate — a new version appears without deleting the old one

Git: `git commit -m "phase 6: full cat-notes-skill note generation, versioned"`

### Phase 7 — Reminders (Web Push)
**Entry criteria:** Phase 6 done
**Exit criteria:** a push notification fires for a task's scheduled time and for a stale-active-topic nudge

Tasks:
1. Generate VAPID keys (`npx web-push generate-vapid-keys`), add to `.env.local` and `.env.local.example`
2. Build `public/sw.js` (service worker: `push` and `notificationclick` listeners)
3. Build `public/manifest.json` (PWA manifest, icons, `display: standalone`)
4. Build `app/api/push/subscribe/route.ts` (`POST`)
5. Build the push-permission banner + Settings toggle, wiring `Notification.requestPermission()` → subscribe call
6. Build `lib/push/web-push.ts` (server-side send helper)
7. Build `app/api/cron/dispatch-reminders/route.ts` — runs `auto_close_stale_sessions()`, checks due tasks, checks stale active topics, sends push, gated by `CRON_SECRET`
8. Deploy the equivalent logic as `supabase/functions/dispatch-reminders/index.ts`, scheduled via `pg_cron` every 5 minutes to call the deployed Next.js route with the `x-cron-secret` header
9. Verify: schedule a test task 1-2 minutes out, grant push permission, confirm a notification appears even with the tab closed

Git: `git commit -m "phase 7: web push reminders, cron dispatch"`

### Phase 8 — News & Cutoffs Digest
**Entry criteria:** Phase 7 done
**Exit criteria:** weekly digest populates `news_items` and renders in `/news`

Tasks:
1. Define the fixed source list (IIM official notification pages, CAT official site) in `lib/news/sources.ts`
2. Build `app/api/cron/refresh-news/route.ts` — fetches sources, summarizes new content via OpenRouter (short `max_tokens`, distinct from the notes prompt), inserts `news_items`
3. Build `supabase/functions/refresh-news/index.ts`, scheduled weekly via `pg_cron`
4. Build `app/api/news/route.ts` (`GET`), `components/news/news-card.tsx`, `app/(app)/news/page.tsx`
5. Verify: manually invoke the cron route once — at least one digest card appears with a working source link

Git: `git commit -m "phase 8: weekly news and cutoffs digest"`

### Phase 9 — Mock Scores & Progress Dashboard
**Entry criteria:** Phase 8 done
**Exit criteria:** logging a mock updates all Progress charts, including time-studied

Tasks:
1. Build `app/api/mocks/route.ts` (`GET`, `POST`)
2. Build `components/progress/streak-chart.tsx`, `percentile-chart.tsx`, `time-studied-chart.tsx` (Recharts)
3. Build the `MockScoreModal` (Radix `Dialog` + `react-hook-form` + `mockScoreSchema`)
4. Build `app/(app)/progress/page.tsx` per `03-APP-FLOW.md` → `/progress` spec, including the weak-section flag and single-point chart fallback
5. Verify: log 2+ mocks — percentile trend line renders; a section under 80th percentile shows the warning badge

Git: `git commit -m "phase 9: mock score logging, progress dashboard with time-studied"`

### Phase 10 — Polish
**Entry criteria:** Phase 9 done
**Exit criteria:** every screen has correct loading/empty/error states; responsive breakpoints verified

Tasks:
1. Walk every screen in `03-APP-FLOW.md` and confirm its loading/empty/error state matches the spec exactly (skeletons, banners, retries)
2. Verify responsive behavior at the three breakpoints in `04-DESIGN.md` (mobile bottom-tab nav, tablet 2x2 stats, desktop 2-column dashboard)
3. Run an accessibility pass: keyboard-only navigation through every screen, `aria-live` on the timer, focus trapping in modals
4. Add `app/(app)/error.tsx` and a root `app/error.tsx` boundary

Git: `git commit -m "phase 10: polish - loading/empty/error states, responsive, a11y"`

### Phase 11 — Testing
Manual test pass (no dedicated test framework needed for a single-user personal app, but each item below must be verified once before deploy):
- Full auth flow (login, allowlist rejection, sign out)
- Plan Explorer search + filter + "make active" from a non-today day
- Timer survives navigation, correct duration on stop, auto-close after 30 min (can be tested by lowering the interval temporarily)
- Tutor round-trip with a real Groq call
- Notes generation end-to-end including the retry-on-short-output path (can be forced by temporarily lowering `max_tokens` to test the retry)
- Push notification received with tab closed
- News digest cron invoked manually, item appears
- Mock score log updates all three charts correctly
- `npm run build` — zero TypeScript errors

Git: `git commit -m "phase 11: manual test pass complete"`

### Phase 12 — Deployment
Tasks:
1. Push repo to GitHub
2. Connect repo to Vercel, set all env vars from `.env.local.example` (production values) in the Vercel dashboard
3. Deploy; verify the production URL loads and login works
4. In Supabase dashboard, confirm `pg_cron` jobs are scheduled and pointing at the production Vercel URL with the correct `CRON_SECRET`
5. Add the PWA to the home screen on the phone that will actually be used daily; grant push permission there
6. Verify one real end-to-end cycle in production: select a topic from `/plan`, start a session, ask the tutor a question, generate notes, confirm they all persist after a fresh login

Git: `git commit -m "phase 12: production deploy"` (tag as `v1.0.0`)

## Agent prompting sequence (paste into Claude Code / Cursor / Windsurf at each phase)

```
Phase 0: "Read 00-README.md and 02-TRD.md. Scaffold the Next.js project exactly as
specified in the folder structure. Set up Tailwind with the CSS variables from
04-DESIGN.md. Do not build any feature yet."

Phase 1: "Read 05-BACKEND-SCHEMA.md in full. Create the three migration files exactly
as written, run them against the linked Supabase project, then build the magic-link
login flow and the ALLOWED_USER_EMAIL server-side check described in 06-IMPLEMENTATION-PLAN.md
Phase 1."

Phase 2: "Read 03-APP-FLOW.md's /plan and /plan/[dayNumber] specs and 05-BACKEND-SCHEMA.md's
plan_days/plan_topics tables. Write scripts/seed-plan.ts to parse the uploaded
cat_2026_daily_plan.html into those tables, then build the full Plan Explorer with
search, section filtering, and 'make active' exactly as specified."

... (continue this pattern for Phases 3-9, each prompt naming the exact doc sections to
    re-read before writing code)

Phase 10-12: "Read 03-APP-FLOW.md again end to end. For every screen, verify the loading/
empty/error state matches exactly. Then follow 06-IMPLEMENTATION-PLAN.md's Phase 10-12
tasks for polish, testing, and deployment."
```

## Testing strategy per feature

| Feature | How to verify |
|---|---|
| Plan Explorer | Search returns correct topic across all 121 days; filter chips narrow results; "make active" works from any day regardless of today's date |
| Session Timer | Duration recorded matches wall-clock time within a few seconds; survives route navigation; auto-closes after 30 min inactivity |
| Tutor | Response reflects the active topic in context; retry button resends on failure; no paid API key ever appears in request headers |
| Notes generation | Output contains all 7 section headers in order, ≥25 questions across 3 tiers, ≥5,000 words; regeneration creates a new version |
| Reminders | Push received with the app tab fully closed; no reminder fires for days with zero scheduled tasks |
| News digest | Manual cron invocation inserts at least one row when source content is new; empty run doesn't blank the tab |
| Mock scores + Progress | Chart updates immediately after logging; single-mock state renders a point, not a broken line; weak section flags correctly at <80th percentile |

## Deployment checklist

- [ ] All env vars set in Vercel (production values, not `.env.local` placeholders)
- [ ] Supabase RLS policies verified active on every user-scoped table
- [ ] `pg_cron` jobs scheduled and confirmed firing (check Supabase logs after first scheduled run)
- [ ] VAPID keys match between `.env` and the subscribed service worker (mismatched keys silently break push)
- [ ] `CRON_SECRET` matches between the Supabase Edge Function and the Vercel env var
- [ ] PWA installed on the actual daily-use device, push permission granted there
- [ ] `ALLOWED_USER_EMAIL` set to the correct production email

## Post-launch monitoring

- Check Vercel's function logs weekly for `500`s on `/api/notes/generate` and `/api/tutor` (most likely failure points given external LLM dependency)
- Check OpenRouter and Groq usage dashboards monthly to confirm free-tier limits aren't being approached
- Check Supabase's database size against the 500MB free-tier cap quarterly (notes are the largest contributor)
- Check `pg_cron` job history in Supabase monthly to confirm `dispatch-reminders` and `refresh-news` are still firing on schedule

## Common failure points and how to debug them

| Symptom | Likely cause | Fix |
|---|---|---|
| Push notifications never arrive | VAPID key mismatch, or service worker not registered | Check `navigator.serviceWorker.getRegistrations()` in devtools; re-generate and re-sync VAPID keys |
| Notes generation returns short/incomplete output | Gemini truncated at `max_tokens`, or the fallback DeepSeek call was also truncated | Increase `max_tokens`, confirm the word-count validation and retry logic in `app/api/notes/generate/route.ts` actually fired |
| Timer shows wrong duration after stop | Client clock drift vs. server `started_at` | Always compute `duration_seconds` server-side from `started_at`/`ended_at` timestamps (per the `set_session_duration` trigger), never trust a client-side stopwatch value |
| Cron jobs not firing | `pg_cron` schedule misconfigured, or `CRON_SECRET` mismatch causing silent `401`s | Check Supabase Edge Function logs for the response status of its call to the Vercel route |
| "Make active" from a non-today plan day doesn't stick after refresh | Active-topic state only in Zustand (client memory), not persisted | Confirm the active topic is also written to a `running`/`paused` `study_sessions` row or a small `active_topic` settings row so it survives a reload |
| Login succeeds for a non-allowlisted email | Allowlist check only applied at the login page, not on subsequent requests | Confirm `require-allowed-user.ts` runs in the `(app)` layout and every API route, not just `/login` |
