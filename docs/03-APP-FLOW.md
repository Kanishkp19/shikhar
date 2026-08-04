# 03 — App Flow & Screen Specifications

## Route table

| Path | Component file | Auth required | Layout |
|---|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | No | Bare, centered card |
| `/` | `app/(app)/page.tsx` | Yes | App shell (nav + timer bar) |
| `/plan` | `app/(app)/plan/page.tsx` | Yes | App shell |
| `/plan/[dayNumber]` | `app/(app)/plan/[dayNumber]/page.tsx` | Yes | App shell |
| `/tutor` | `app/(app)/tutor/page.tsx` | Yes | App shell |
| `/notes` | `app/(app)/notes/page.tsx` | Yes | App shell |
| `/notes/[id]` | `app/(app)/notes/[id]/page.tsx` | Yes | App shell |
| `/news` | `app/(app)/news/page.tsx` | Yes | App shell |
| `/progress` | `app/(app)/progress/page.tsx` | Yes | App shell |
| `/settings` | `app/(app)/settings/page.tsx` | Yes | App shell |

## Navigation diagram

```
/login --(magic link, allowlisted email)--> /  (Dashboard)
                                                  |
        +---------------+---------------+--------+--------+---------------+
        |               |               |                 |               |
        v               v               v                 v               v
      /plan          /tutor          /notes            /news         /progress
        |                                |
        v                                v
  /plan/[dayNumber]                 /notes/[id]
        |
        v
  "Make active" -> sets Zustand active-topic -> visible on Dashboard + Tutor + Notes-generate
                    everywhere via persistent Session Timer bar in app shell
```

The **Session Timer bar** is not a route — it's a persistent component in `app/(app)/layout.tsx`, visible on every authenticated screen once a topic is active, so switching between Tutor/Notes/Plan never loses timer state.

## Global elements

**App shell (`app/(app)/layout.tsx`)**
- Top nav: wordmark, links to Dashboard / Plan / Tutor / Notes / News / Progress, settings icon
- Persistent Session Timer bar (sticky, top or bottom depending on viewport): shows active topic title, elapsed time (`MM:SS` live-updating), Start/Pause/Stop controls. Hidden entirely when no topic is active.
- Push-permission banner: shown once if `Notification.permission === 'default'`, dismissible, reappears on next login if still not granted

**Global error states**
- Network down: a top banner "You're offline — changes will sync when reconnected," data views fall back to last cached TanStack Query data
- `401` (session expired): redirect to `/login` with a toast "Session expired, please log in again"
- `403` (non-allowlisted email): static page, "This app is private to its owner," no further action offered
- `404`: friendly "Page not found" with a button back to Dashboard
- `500`: friendly "Something went wrong on our end," a "try again" button, error logged server-side

---

## Screen: `/login`

**Purpose:** Single entry point, magic-link only.

**Layout:** Centered card on warm canvas background.

**UI elements:**
- Wordmark + tagline
- Email input (pre-fillable, but only the allowlisted email will succeed past the callback)
- "Send magic link" button
- Post-submit: "Check your email" confirmation state

**Interactive elements:**
- Submit → calls Supabase `signInWithOtp`, shows confirmation state, no page navigation until the link is clicked from email

**Data fetched:** none

**Loading state:** button shows spinner + "Sending..." during submit
**Empty state:** n/a
**Error state:** invalid email format → inline Zod validation error under the field; Supabase error → toast "Couldn't send link, try again"

**Form fields:**
| Field | Type | Validation | Error message |
|---|---|---|---|
| Email | email | required, valid email format | "Enter a valid email address" |

---

## Screen: `/` (Dashboard — "Today")

**Purpose:** Single-glance view of active topic, timer, today's scheduled tasks, and key stats.

**Layout:** Single column on mobile, 2-column on desktop (stats row full-width, then active-topic card + today's plan side by side).

**UI elements:**
- Stat row (4 `StatCard`s): days left until exam, current streak, last mock percentile, tasks completed today / total today
- `ActiveTopicCard`: shows currently selected topic (title, section badge, originally-scheduled day number), Start Session button (or live timer if running), "Generate notes on this" button, "Ask tutor about this" button
- `TodayPlanCard`: list of tasks scheduled for the real calendar date (from ingested plan), each a `TaskRow` with checkbox, title, section badge, scheduled time
- If no topic is active: `ActiveTopicCard` shows an empty state with a "Browse the plan" CTA linking to `/plan`

**Interactive elements:**
- Toggling a task checkbox → optimistic UI update, `PATCH /api/tasks/:id`, updates streak counter without reload
- "Start Session" on active topic → `POST /api/sessions`, timer bar appears/starts
- "Generate notes on this" → navigates to `/notes` with generation triggered for the active topic (see Notes screen)
- "Ask tutor about this" → navigates to `/tutor` with the active topic pre-loaded as context

**Data fetched:** today's tasks (`GET /api/tasks?date=today`), active topic (from Zustand, hydrated from `GET /api/sessions?status=running` on load in case a session was left running), last mock score (`GET /api/mocks?limit=1`), streak (computed from tasks)

**Loading state:** skeleton stat cards + skeleton task rows (3 placeholder rows)
**Empty state:** "No tasks scheduled for today" with a link to `/plan` to pick something to study anyway
**Error state:** each card fails independently with its own inline retry — one failed fetch never blanks the whole dashboard

---

## Screen: `/plan` (Full Plan Explorer)

**Purpose:** Lay out all 121 days so any topic from any day can be selected as active, regardless of the real calendar date.

**Layout:** Virtualized vertical list of `DayAccordion` components, one per day (1–121), with a sticky `SectionFilterBar` at top.

**UI elements:**
- `SectionFilterBar`: toggle chips for QA / DILR / VARC / MOCK / REVIEW (multi-select, default all selected), a search input filtering by topic title
- `DayAccordion` per day: header shows "Day N — [original scheduled date]", collapsed by default except the day matching today's real date (auto-expanded on first load)
- Inside each expanded day: list of `TopicRow`s — title, section badge, planned duration, a "Make active" button (or "Active" badge state if it's the current active topic)

**Interactive elements:**
- Clicking a day header expands/collapses it
- Clicking "Make active" on any `TopicRow` → sets Zustand active-topic state + persists via `PATCH` (so it survives a refresh), shows a toast "Now studying: [topic]," and surfaces it immediately on the Dashboard's `ActiveTopicCard`
- Section filter chips filter which days/topics render (days with zero matching topics after filtering collapse out of view)
- Search input filters topics by title match across all 121 days

**Data fetched:** `GET /api/plan` (all days + topics, cached aggressively client-side since the plan itself doesn't change often)

**Loading state:** skeleton accordions (5 placeholders)
**Empty state:** not applicable (plan is seeded at setup; if genuinely empty, show "Plan not yet loaded — check Settings")
**Error state:** full-card retry banner if `/api/plan` fails, since this screen has no partial-data fallback

---

## Screen: `/plan/[dayNumber]`

**Purpose:** Focused single-day view (deep-linkable), same data as the expanded accordion on `/plan` but standalone — useful when a specific day is bookmarked or opened from a reminder notification.

**Layout:** Single column, day header, list of `TopicRow`s.

**UI elements:** identical `TopicRow` list as the accordion, plus a "Back to full plan" link

**Interactive elements:** same "Make active" behavior as `/plan`

**Data fetched:** `GET /api/plan` filtered client-side to the requested `dayNumber` (or a dedicated query param on the same endpoint)

**Loading / empty / error states:** same pattern as `/plan`

---

## Screen: `/tutor`

**Purpose:** Doubt-solving chat, aware of the active topic.

**Layout:** Full-height chat column: header showing active topic context, scrollable `ChatThread`, fixed `ChatInput` at bottom.

**UI elements:**
- Header: "Asking about: [active topic]" (or "General question" if no topic is active)
- `ChatThread`: list of `ChatBubble`s (user right-aligned, assistant left-aligned), grouped by `planTopicId`
- `ChatInput`: textarea + send button, disabled while a response is streaming in

**Interactive elements:**
- Sending a message → optimistic bubble appended, `POST /api/tutor`, assistant bubble appended on response
- Failed send → bubble shows a "retry" icon instead of silently disappearing

**Data fetched:** `GET` message history scoped to the active `planTopicId` on mount

**Loading state:** three animated typing-dot bubbles while awaiting response
**Empty state:** "No messages yet — ask your first doubt about [active topic]"
**Error state:** inline "Tutor is busy, try again in a moment" bubble in place of the assistant response, with a retry button that resends the same user message

---

## Screen: `/notes`

**Purpose:** Notes list + trigger point for full-length generation.

**Layout:** Grid of `NoteCard`s (2-column desktop, 1-column mobile), filter bar at top, prominent "Generate notes" button.

**UI elements:**
- Filter bar: section chips (QA/DILR/VARC), search by topic
- `NoteCard`: topic title, section badge, word count, "v[N]" version badge, generated date
- "Generate notes" button: opens a small picker (defaults to the current active topic if one is set; otherwise lets the user pick any topic from the plan) then confirms and triggers generation

**Interactive elements:**
- Clicking "Generate notes" → `POST /api/notes/generate` with the chosen topic; button enters a progress state (see below) rather than blocking navigation
- Clicking a `NoteCard` → navigates to `/notes/[id]`

**Data fetched:** `GET /api/notes` (paginated, 20/page)

**Loading state:** skeleton note cards (4 placeholders)
**Empty state:** "No notes yet — generate your first full topic write-up" with the Generate button emphasized
**Error state:** inline retry on the list; generation failures surface as a toast, not a blocked screen (user can navigate away while generation continues)

**Generation progress states (shown as a persistent toast/status pill, not a full-page blocker):**
1. "Queued..." (immediately after click)
2. "Writing core concepts..." (after ~5s)
3. "Building practice questions..." (after ~15s)
4. "Finalizing cheat sheet..." (after ~30s)
5. Success toast: "Notes ready: [topic]" with a "View" action → navigates to `/notes/[id]`
6. Failure toast: "Couldn't finish generating [topic] — retry?" with a retry action

---

## Screen: `/notes/[id]`

**Purpose:** Read the full generated note.

**Layout:** Single-column reading view, max content width for readability, table of contents sidebar on desktop (auto-generated from the 7 section headers).

**UI elements:**
- Header: topic title, section badge, word count, `NoteVersionPicker` dropdown if multiple versions exist
- Rendered markdown body (via `react-markdown`) — all 7 sections in order, tables for the cheat sheet, code-block-style formula boxes
- "Regenerate" button at the bottom (creates a new version, does not overwrite)

**Interactive elements:**
- Version picker → swaps rendered content to the selected version, no page reload
- Regenerate → same progress-toast flow as `/notes`, new version appears in the picker on success

**Data fetched:** `GET /api/notes/[id]` (includes all versions)

**Loading state:** skeleton text blocks matching the 7-section shape
**Empty state:** n/a (note must exist to reach this route)
**Error state:** "Note not found" if the ID is invalid, link back to `/notes`

---

## Screen: `/news`

**Purpose:** Weekly CAT/IIM digest.

**Layout:** Single column list of `NewsCard`s, most recent week first, grouped by week with a date header.

**UI elements:**
- Week header: "Week of [date]"
- `NewsCard`: headline, 2–3 sentence summary, source name + external link icon

**Interactive elements:**
- Clicking a `NewsCard`'s source link opens the original source in a new tab

**Data fetched:** `GET /api/news` (paginated, 20/page)

**Loading state:** skeleton news cards (3 placeholders)
**Empty state:** "No digest yet — the first weekly update will appear after [next scheduled run]"
**Error state:** inline retry on the list

---

## Screen: `/progress`

**Purpose:** Streak, percentile trend, sectional strength, and time-studied breakdown.

**Layout:** Stacked cards: streak card, `PercentileChart`, sectional strength bars, `TimeStudiedChart`, "Log a mock score" button opening a modal form.

**UI elements:**
- Streak card: current streak, best streak
- `PercentileChart` (Recharts line chart): overall percentile per mock over time
- Sectional strength: three horizontal bars (VARC/DILR/QA) with current average percentile, weak section visually flagged (distinct badge, not just color) if under 80th percentile
- `TimeStudiedChart` (Recharts bar chart): hours studied per section, per week
- "Recent mocks" list: last 5 mocks with date, name, total percentile

**Interactive elements:**
- "Log a mock score" → opens `MockScoreModal`
- **`MockScoreModal` fields:**

| Field | Type | Validation | Error message |
|---|---|---|---|
| Mock name | text | required, max 60 chars | "Give this mock a name" |
| Mock date | date | required, not in the future | "Pick a valid date" |
| Total score | number | required, 0–300 | "Enter a score between 0 and 300" |
| Overall percentile | number | required, 0–100 | "Enter a percentile between 0 and 100" |
| VARC score | number | required, 0–100 | "Enter a valid section score" |
| VARC percentile | number | required, 0–100 | "Enter a percentile between 0 and 100" |
| DILR score | number | required, 0–100 | "Enter a valid section score" |
| DILR percentile | number | required, 0–100 | "Enter a percentile between 0 and 100" |
| QA score | number | required, 0–100 | "Enter a valid section score" |
| QA percentile | number | required, 0–100 | "Enter a percentile between 0 and 100" |
| Notes (optional) | textarea | max 500 chars | "Keep it under 500 characters" |

- Submit → `POST /api/mocks`, modal closes, toast "Mock logged," charts update immediately (optimistic + refetch)

**Data fetched:** `GET /api/mocks`, sectional averages computed client-side from the same payload, `GET /api/sessions?aggregate=true` for time-studied rollups

**Loading state:** skeleton charts (flat placeholder bars)
**Empty state:** "Log your first mock to start seeing trends" with fewer-than-2-points chart rendering a single dot instead of a broken line
**Error state:** inline retry per chart card

---

## Screen: `/settings`

**Purpose:** Push permission management, allowlisted email display, plan re-seed (advanced), sign out.

**Layout:** Simple list of settings rows.

**UI elements:**
- Push notification toggle (reflects actual `Notification.permission` state, re-triggers browser prompt if toggled on from `default`)
- Logged-in-as email display (read-only)
- "Re-import plan data" (advanced, confirmation modal, re-runs the seed script against `plan_days`/`plan_topics` — used only if the source plan HTML changes)
- Sign out button

**Interactive elements:**
- Push toggle → browser permission API, `POST /api/push/subscribe` on grant
- Sign out → Supabase `signOut`, redirect to `/login`

**Data fetched:** current session info

**Loading / empty / error states:** minimal — this is a low-data screen; a failed sign-out shows a toast retry

---

## Modals / toasts summary

| Trigger | Type | Content |
|---|---|---|
| "Log a mock score" | Modal | `MockScoreModal` form (see `/progress`) |
| "Re-import plan data" | Modal | Confirmation: "This will re-sync all 121 days from source. Continue?" |
| Task toggled | Toast (subtle, auto-dismiss 2s) | none needed beyond the checkbox animation — no toast |
| "Make active" on a topic | Toast | "Now studying: [topic]" |
| Notes generation progress | Persistent status toast | See `/notes` generation states above |
| Session auto-closed by inactivity | Toast (on next app open) | "Your last session was auto-closed after 30 minutes of inactivity — [duration] logged" |
| Push permission granted/denied | Toast | "Reminders enabled" / "Reminders off — you can turn them on later in Settings" |
