---
name: shikhar-flows
description: Shikhar screen states and user flows. Use when building pages, handling loading/empty/error states, or implementing navigation. Triggers on: adding pages, creating UX, building loading/error/empty states, navigation, screen specifications.
---

# Shikhar App Flows & States

Reference: `docs/03-APP-FLOW.md` for full specs on every screen.

## Route Table

| Path | Component | Auth |
|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | No |
| `/` | `app/(app)/page.tsx` | Yes, app shell |
| `/plan` | `app/(app)/plan/page.tsx` | Yes |
| `/tutor` | `app/(app)/tutor/page.tsx` | Yes |
| `/notes` | `app/(app)/notes/page.tsx` | Yes |
| `/notes/[id]` | `app/(app)/notes/[id]/page.tsx` | Yes |
| `/news` | `app/(app)/news/page.tsx` | Yes |
| `/progress` | `app/(app)/progress/page.tsx` | Yes |
| `/settings` | `app/(app)/settings/page.tsx` | Yes |

## State Management

- **Server State** (TanStack Query): tasks, mocks, notes, news, sessions, tutor messages
- **Client State** (Zustand): active topic + active task + running session timer
- **Persistence**: active topic backed by `study_sessions` row so it survives reload

## Three States Every Page MUST Handle

### Loading
- Dashboard: skeleton stat cards + skeleton task rows (3 placeholders)
- Plan: 5 skeleton accordion items
- Notes: 4 skeleton note cards
- Tutor: skeleton messages or empty state
- Progress: skeleton chart placeholders
- Note Viewer: 7 stacked skeleton bars mimicking section headers

### Empty
- Dashboard (no tasks today): "No tasks scheduled for today" → link to /plan
- Notes (no items): "No notes yet — generate your first full topic write-up"
- News (no digest): "No content yet — first weekly update after [next run]"
- Progress (no mocks): "Log your first mock to start seeing trends"
- Plan: "Plan not yet loaded — check Settings"

### Error
- Inline retry per-card, never a full page crash
- 401: Redirect to /login with toast message
- 403: Full page showing "This app is private to its owner"
- 404: "Page not found" with Action button → Dashboard
- 500: "Something went wrong" with "Try again" retry badge

## Specific UI Flows

### Notes Generation Status Toast (persistent)
```
1. "Queued..." → 2. "Writing core concepts..." → 3. "Building practice questions..." → 4. "Finalizing cheat sheet..." → 5. "Notes ready: [topic]" → "View"
```

### Timer Bar (persists in app shell)
- Hidden when no topic active
- Default: white → topic name + "Start Session" button
- Running: `bg-[var(--color-secondary)]` → live countdown + pause/stop icons
- Paused: white → elapsed frozen + "Resume" + "Stop"
- Time is `aria-live="polite"` for screen readers

### Mock Score Logging (Progress page modal)
Modal with react-hook-form + mockScoreCreateSchema fields, shows close on success, updates charts immediately.