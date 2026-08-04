# 01 — Product Requirements Document (PRD)

**App name:** Shikhar
**Tagline:** One summit. One system. 121 days.
**Elevator pitch:** Shikhar is a personal CAT 2026 prep companion that turns a static study plan into a living system — it lays out the entire 121-day plan in front of you so you pick exactly what to study, times every session you put in, tutors you on doubts, generates full topper-length notes on demand, reminds you before you forget, and keeps you current on IIM cutoffs and CAT notifications — all running on free-tier infrastructure with no subscription cost.

## Problem statement

Kanishk has a complete, well-researched 121-day CAT 2026 plan (28 full mocks, sectional rotation across QA/DILR/VARC) that currently lives as static HTML files with no state, no reminders, no time tracking, and no way to jump around the plan on his own terms. The specific failures being solved:

1. **No accountability layer** — completing (or skipping) a task today has no record, no streak, no visible cost to skipping.
2. **No control over what to study today** — the plan is fixed to calendar dates; there's no way to look at the whole 121 days, decide "today I actually want to do Day 34's DI topic instead," and have the system track that choice properly.
3. **No time tracking** — there's no record of how long was actually spent on a topic, a session, or in the app overall — "I studied percentages today" has no number attached to it.
4. **Doubt-solving is disconnected from the plan** — asking a question means opening a separate chat with zero awareness of what topic is being studied right now.
5. **Notes are inconsistent in depth** — sometimes a quick summary, sometimes nothing at all; no guarantee of the exhaustive, topper-level depth needed to never have to revisit a textbook on that topic.
6. **No reminder system** — tasks are scheduled on paper/HTML but nothing pushes a notification when it's time, or nudges when a chosen topic hasn't been started.
7. **News blindness** — IIM shortlist criteria, cutoff trends, and CAT notification dates change during the prep window and are easy to miss without actively checking.

## Target user personas

**Persona 1 — Kanishk (primary and only user)**
- Job: B.Tech Data Science & AI student, also runs a web dev business (Site Story)
- Goal: score 99+ percentile in CAT 2026 and get into a top IIM
- Frustration: has the discipline to execute a plan but no system enforcing it daily, no ability to reorder what he studies without breaking the plan's structure, and no visibility into how much time he's actually putting in

**Persona 2 — Future-Kanishk, mock-review mode**
- Job: same person, post-mock-test state
- Goal: quickly log a mock score, see percentile trend, identify weakest section
- Frustration: currently no single place trend data lives

**Persona 3 — Future-Kanishk, "I want to study something else today" mode**
- Job: same person, deciding mid-week that a weak topic needs revisiting out of sequence
- Goal: open the full 121-day plan, pick any day or any topic directly (not just what's scheduled for today), start a timed session on it, and have that count properly
- Frustration: a rigid date-locked planner would force him to either break sequence silently or ignore the plan entirely

*(Single-user app — personas represent different modes of the same user, not different accounts.)*

## Core features

### 1. Full Plan Explorer (the whole 121 days, laid out, fully selectable)
The entire ingested plan — all 121 days, every topic, every section tag — is browsable as a scrollable timeline/list, not hidden behind a single "today" view. Kanishk can open any day, see every topic scheduled for it, and select **any topic from any day** to make it "what I'm studying right now," regardless of the actual calendar date. Selecting a topic starts a study context that flows into the timer, the tutor, and note generation.
- **Acceptance criteria:**
  - It works when opening the Plan tab shows all 121 days in order, each expandable to show its topics/sections
  - It works when clicking any topic on any day sets it as the "active topic" shown on the dashboard, with no restriction to the current calendar date
  - It works when the plan is filterable by section (QA / DILR / VARC / MOCK / REVIEW) so a specific topic type can be found quickly across all 121 days
  - It works when the originally-scheduled date for a topic remains visible even after it's selected out of sequence, so the plan's structure is never lost

### 2. Study Session Timer
A start/pause/stop timer attached to whatever topic is currently active (from the Plan Explorer or the dashboard). Tracks exact time spent per session, rolls up into per-topic total time, per-day total time, and total time in the app.
- **Acceptance criteria:**
  - It works when starting a session begins a visible running timer that persists even if the user navigates to Tutor or Notes while it's running
  - It works when pausing/stopping a session saves the exact duration against the active topic, timestamped with the real date/time the session occurred
  - It works when the dashboard shows "time studied today" and the Progress tab shows "time studied per topic/section" as a breakdown
  - It works when a session is left running and the tab is closed, the session auto-closes at a reasonable timeout (30 min of inactivity) rather than counting indefinitely

### 3. AI tutor chat
A chat interface, aware of whatever topic is currently active (from Plan Explorer selection, not just today's date), answering doubts using a fast free-tier model.
- **Acceptance criteria:**
  - It works when a message sent gets a response within ~3 seconds (Groq/Llama 3.3 70B path)
  - It works when the chat thread persists across sessions, grouped by the active topic it was asked under
  - It works when the model has no answer or the API fails, the user sees a clear retry option, never a silent hang

### 4. AI note generation — full topper-length notes via the `cat-notes-skill`
One-click "Generate notes" on the currently active topic (or any topic picked directly from the Plan Explorer), running the **exact `cat-notes-skill` structure** end to end — not a summary, the full seven-section output. This is intentionally long: a complete topic write-up runs roughly **18-20 pages** (5,000-8,000+ words) when rendered, because it must be self-sufficient enough that no textbook or video is ever needed again for that topic.

**Required output structure (must match the skill exactly, in order):**
1. Topic Introduction (100-150 words: what it is, why CAT tests it, question frequency, connected topics)
2. Core Concepts (plain-English explanation, formula, where it comes from, the mistake 80% of students make, full worked example, repeated per sub-concept)
3. Concept Map / Connections (tree or arrow-notation linking sub-concepts to each other and to adjacent topics)
4. Practice Questions - minimum 25, in three tiers (Foundation 1-8, Application 9-18, CAT-Level Hard 19-25), each with full worked solution (setup, concept applied, calculation, the trap, time target)
5. Speed Techniques & Approximation - minimum 5, each with a worked time-saving example
6. Common Traps (CAT Trap File) - minimum 6, each naming the phrasing, why students fall for it, and the correct approach
7. Master Cheat Sheet - every formula, key definition, and speed trick in one standalone block

**Illustrative example (abbreviated - a real generated note is far longer):**

> **Topic Introduction**
> Percentages measure a quantity as a fraction of 100 - CAT doesn't test percentages in isolation, it tests whether you can convert between percentage change, ratio, and fraction language instantly, because that same skill resurfaces inside Profit & Loss, Mixtures, and almost every DI table. Roughly 2-3 direct questions appear per CAT slot, but the underlying skill drives another 8-10 across other topics.
>
> **Core Concepts (excerpt)**
> Percentage change vs. new value - Plain English: "20% more" means you're describing how much was added, not what the final number is.
> Formula: New Value = Original x (1 plus-or-minus %change/100)
> [TRAP] 80% of students apply successive percentage changes by adding them (e.g., +20% then -20% = 0%) - it's actually 1.20 x 0.80 = 0.96, a net -4%, because each change applies to a different base.
> Worked example: A shirt's price rises 25%, then falls 20%. Net change? Compute 1.25 x 0.80 = 1.00, so no net change *(full step-by-step reasoning continues in the real output)*
>
> **Practice Questions (excerpt)**
> Q1. (Foundation) A number is increased by 15% to get 230. Find the original number. - Difficulty: Easy - Topic tag: reverse percentage
> Q19. (CAT-Level Hard, TITA) A trader marks up goods by x%, offers two successive discounts of half of x% each, and still makes 8% profit on cost. If x is a multiple of 10, find x. - Difficulty: Hard - Topic tag: successive % + reverse-solve
> *(all 25 questions include full worked solutions with the trap called out, in the real output)*
>
> **Master Cheat Sheet (excerpt)**
> New = Original x (1 plus-or-minus %/100) - Successive % changes multiply, never add - x% of y = y% of x *(...continues with every formula from the topic)*

- **Acceptance criteria:**
  - It works when generated notes contain all seven sections in the skill's exact order, with a minimum of 25 practice questions across the three specified tiers
  - It works when the note's word count is in the 5,000-8,000+ word range (roughly 18-20 rendered pages) - a note under ~3,000 words is rejected/regenerated rather than saved as complete
  - It works when notes are saved and retrievable from the Notes tab without regenerating, filterable by section and topic
  - It works when the same topic is regenerated, the old version is kept as a prior "version," not silently overwritten
  - It works when the file-naming convention from the skill (CAT_QA_[Topic]_Complete, CAT_DI_[Type]_Complete, CAT_VARC_[SubType]_Complete) is used for the note's stored title

### 5. Reminders (Web Push)
Push notifications fire at each plan task's originally scheduled time, and separately warn when a topic was selected as "active" but no session timer has been started by evening.
- **Acceptance criteria:**
  - It works when the browser has granted push permission and a task's time arrives - a notification appears even if the tab is closed
  - It works when a topic has been active for 3+ hours with zero logged session time, a nudge notification fires once
  - It works when permission is denied, the app still functions, just without push (visible banner explains this)

### 6. News & cutoffs digest
A weekly auto-generated digest of CAT notification updates and IIM cutoff/shortlist changes, summarized from a fixed set of official sources.
- **Acceptance criteria:**
  - It works when the weekly cron produces at least one digest card per run when there is new source content
  - It works when there is nothing new, the tab shows the last digest with its date, not an empty screen
  - It works when a digest item links back to its source

### 7. Mock score logging & progress dashboard
A form to log total score, percentile, and per-section (VARC/DILR/QA) scores after each mock, feeding a streak counter, percentile trend chart, per-section strength breakdown, and time-studied breakdown.
- **Acceptance criteria:**
  - It works when all fields validate (numeric ranges) before saving
  - It works when a saved mock appears immediately in Progress and updates the trend chart
  - It works when total time studied (from all sessions) is shown alongside percentile trend, so effort and result are visible together

## Nice-to-haves (v2 - not built in this phase)

- Spaced-repetition flashcards generated from saved notes
- Voice input for tutor chat (Web Speech API - he's used this in KaamConnect)
- Multi-device push sync
- Sharing a note publicly via link
- CAT-specific vocabulary/RC passage daily drill auto-generated
- Auto-suggesting the next topic to study based on weakest section from mock data

## User stories

1. As Kanishk, I want to see the entire 121-day plan laid out so that I can choose exactly what to study instead of being locked to today's date.
2. As Kanishk, I want to pick any topic from any day so that I have full control over sequencing when I want to deviate from the plan.
3. As Kanishk, I want a visible timer when I start studying so that I know exactly how long I actually spent on a topic.
4. As Kanishk, I want my total time-in-app tracked per day and per topic so that effort is measurable, not just task-completion.
5. As Kanishk, I want to mark a task complete so that my streak reflects real progress.
6. As Kanishk, I want to ask a doubt about whatever topic is currently active so that I don't lose momentum switching tools.
7. As Kanishk, I want the tutor to know what topic I've selected so that I don't have to re-explain context.
8. As Kanishk, I want to generate a full, topper-length note (using the exact cat-notes-skill structure) on any topic so that I never need an external textbook or video for it again.
9. As Kanishk, I want every generated note to include at least 25 tiered practice questions with full worked solutions so that I can self-test immediately after reading.
10. As Kanishk, I want past notes saved, versioned, and searchable so that I can revise from them closer to the exam.
11. As Kanishk, I want a push notification when a scheduled task's time arrives so that I don't drift off-plan.
12. As Kanishk, I want a nudge if a topic I selected has sat inactive for hours so that I don't forget I meant to study it.
13. As Kanishk, I want a weekly digest of IIM/CAT news so that I don't have to actively monitor multiple sites.
14. As Kanishk, I want to log a mock score with sectional breakdown so that I can see my percentile trend over time.
15. As Kanishk, I want to see which section is weakest so that I can rebalance my study time.
16. As Kanishk, I want the whole system to run at zero recurring cost so that I can use it daily without worrying about API bills.

## Non-goals

- **Multi-user support / accounts for others** - this is a single-user tool; no signup flow, no team features, no billing.
- **Payment processing** - irrelevant to this app.
- **Native mobile app** - PWA (installable, push-capable) covers the need without app store overhead.
- **Full CAT question bank / test engine** - Shikhar tutors and tracks; it does not replace existing mock test platforms (IMS, TIME, etc.) which already log percentile data he'll manually enter.
- **Offline-first architecture** - the app assumes intermittent connectivity is fine; no local-first sync engine.
- **Paid LLM usage** - every AI feature must route through a free-tier model; if free quota is exhausted, the feature degrades gracefully (queued/retry) rather than falling back to a paid call.
- **Rewriting the plan's structure** - the app tracks and surfaces the existing 121-day plan; it does not regenerate or re-plan the schedule itself.

## Success metrics

- 90%+ task-completion rate against the 121-day plan by exam date (Nov 2026), measured via streak/task data in-app
- Average logged study time of 4+ hours/day across the prep window, visible via the time-tracking rollup
- Tutor chat used at least once per study day on average over the prep window
- At least one full-length note (25+ questions, 5,000+ words) generated per topic covered in the plan (target: 40+ saved notes by exam date)
- Zero recurring infrastructure cost through the full prep window (verified via Vercel/Supabase/OpenRouter/Groq usage dashboards staying within free tiers)
- Weekly news digest delivered with zero missed weeks from launch to exam date
