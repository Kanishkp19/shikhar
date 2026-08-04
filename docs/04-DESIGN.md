# 04 — Design System (UI/UX Brief)

## Design philosophy

Shikhar should feel like a calm, document-like workspace, not a gamified habit-tracker. The prep window is long (121 days) and the content is dense (18-20 page notes, 25-question sets) — the interface's job is to stay quiet and out of the way so the content and the plan can breathe. This system adapts Notion's warm, restrained, single-accent design language: a warm paper canvas instead of clinical white, near-black type with tight tracking on headlines, exactly one structural accent color reserved for actions, and elevation built from hairlines and barely-there shadows rather than heavy cards. Personality is allowed only in small, decorative touches (section-color dots, not full-color blocks) so the eye stays on the plan and the notes, not on the chrome.

## Colors

### Brand & Accent
- **Primary** `--color-primary` `#0075de` - the single structural accent. Used for: primary CTA fill ("Start Session," "Generate notes," "Send magic link"), active nav item, inline links, focus ring.
- **Primary Active** `--color-primary-active` `#005bab` - pressed/active state of the primary CTA.
- **Secondary (Night)** `--color-secondary` `#213183` - reserved for exactly one moment: the Session Timer bar background when a timer is actively running (an intentional "you're in it" signal), never used elsewhere.

### Section accent dots (decorative only - never structural fills)
- **QA** `--color-accent-teal` `#2a9d99`
- **DILR** `--color-accent-purple` `#8d5fc7` (mid-tone between sticker purple and deep purple for AA contrast on white)
- **VARC** `--color-accent-orange` `#dd5b00`
- **MOCK** `--color-accent-pink` `#c93f96` (darkened from sticker pink for text-label contrast)
- **REVIEW** `--color-accent-sky` `#3d84c9` (darkened from sticker sky for text-label contrast)

These five colors appear only as small `SectionBadge` dots/pills next to topic and task titles - never as a card fill, button, or chart line color choice by itself (charts use `--color-primary` plus greyscale, see Charts below).

### Surface
- **Canvas** `--color-canvas-soft` `#f6f5f4` - page background throughout the app.
- **Surface** `--color-surface` `#ffffff` - cards, panels, nav bar, form fields, modals.
- **Hairline** `--color-hairline` `#e6e6e6` - 1px card borders and dividers.

### Text
- **Ink** `--color-ink` `#000000` (rendered ~95% alpha) - headings, primary body text.
- **Ink Secondary** `--color-ink-secondary` `#31302e` - secondary copy (card descriptions, chat bubble text).
- **Ink Muted** `--color-ink-muted` `#615d59` - supporting/muted copy (timestamps, metadata).
- **Ink Faint** `--color-ink-faint` `#a39e98` - captions, placeholder text, disabled labels.
- **On Primary** `--color-on-primary` `#ffffff` - text/icons on top of the primary-filled buttons and the Night timer bar.

### Semantic
- **Success** `--color-success` `#1aae39` - completed task checkmarks, "on track" streak state, correct-answer indicators in notes.
- **Warning** `--color-warning` `#dd5b00` - weak-section flag (under 80th percentile), stale-active-topic nudge banner.
- **Danger** `--color-danger` `#c0392b` - destructive confirmation (re-import plan data), failed generation state.

## Typography

### Font family
`Inter` (with the same tight negative-tracking treatment Notion applies to `NotionInter`), fallback stack: `Inter, -apple-system, system-ui, "Segoe UI", Helvetica, Arial`. One family for the entire app, including the long-form note content.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Tailwind class | Use |
|---|---|---|---|---|---|---|
| `--text-display-1` | 40px | 700 | 1.1 | -1px | `text-[40px] font-bold leading-[1.1] tracking-[-1px]` | Dashboard/section page titles |
| `--text-heading-1` | 26px | 700 | 1.23 | -0.625px | `text-[26px] font-bold leading-[1.23] tracking-[-0.625px]` | Screen headers ("Full Plan," "Progress") |
| `--text-heading-2` | 22px | 700 | 1.27 | -0.25px | `text-[22px] font-bold leading-[1.27] tracking-[-0.25px]` | Card titles, note section headers |
| `--text-title` | 18px | 600 | 1.4 | -0.125px | `text-lg font-semibold leading-[1.4] tracking-[-0.125px]` | Topic titles, note titles |
| `--text-body-md` | 16px | 400 | 1.5 | 0 | `text-base font-normal leading-[1.5]` | Default body copy, note prose |
| `--text-body-sm` | 14px | 400 | 1.43 | 0 | `text-sm font-normal leading-[1.43]` | Dense rows (task rows, plan topic rows), nav links |
| `--text-button` | 15px | 500 | 1.4 | 0 | `text-[15px] font-medium leading-[1.4]` | Button labels |
| `--text-caption` | 13px | 400 | 1.4 | 0 | `text-[13px] font-normal leading-[1.4]` | Timestamps, word counts, metadata |
| `--text-eyebrow` | 11px | 600 | 1.33 | +0.125px | `text-[11px] font-semibold leading-[1.33] tracking-[0.125px] uppercase` | Section badges (QA/DILR/VARC/MOCK/REVIEW) |

### Principles
Headlines are heavy (700) with negative tracking; body stays at 400 for the long note-reading sessions this app is built around. Note content specifically must never exceed `--text-body-md` for prose - a 5,000+ word document set any larger becomes fatiguing to read on screen.

## Spacing scale (4px base)

`--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` 16px · `--space-5` 20px · `--space-6` 24px · `--space-8` 32px · `--space-10` 40px · `--space-12` 48px

Card interior padding: `--space-6` (24px). Compact list rows (task rows, plan topic rows): `--space-3` vertical, `--space-4` horizontal. Section gaps on scroll pages: `--space-8`-`--space-12`.

## Border radius tokens

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | Form fields, section badge pills' inner tag if square variant used |
| `--radius-sm` | 5px | List rows (task row, plan topic row), menu items |
| `--radius-md` | 8px | Utility buttons, nav buttons, small stat cards |
| `--radius-lg` | 12px | Feature cards (ActiveTopicCard, NoteCard, DayAccordion), modals |
| `--radius-xl` | 16px | Note-viewer content well, large containers |
| `--radius-full` | 9999px | Primary/secondary marketing-style CTAs, section badge pills, avatar/icon buttons |

## Shadow tokens

| Level | Value | Use |
|---|---|---|
| `--shadow-0` (flat) | `border: 1px solid var(--color-hairline)`, no shadow | Default cards on canvas (task rows, plan topic rows) |
| `--shadow-1` (soft) | `0 0.175px 1.041px rgba(0,0,0,0.01), 0 0.8px 2.925px rgba(0,0,0,0.02), 0 2.025px 7.847px rgba(0,0,0,0.027), 0 4px 18px rgba(0,0,0,0.04)` | Raised cards (ActiveTopicCard, NoteCard on hover, StatCard) |
| `--shadow-2` (elevated) | 5-stop stack ending `0 23px 52px rgba(0,0,0,0.05)` | Modals (MockScoreModal), the Session Timer bar, toasts |

## Components

> States documented: Default, Hover (added where genuinely useful for a study tool - the source Notion spec skips hover, but a daily-use app benefits from it), Active/Pressed, Focus, Disabled, Loading.

### Buttons

**`button-primary`**
- `bg-[var(--color-primary)] text-[var(--color-on-primary)] text-[15px] font-medium rounded-full px-5 py-2.5`
- Hover: `hover:bg-[#0068c7]` (5% darker)
- Active/Pressed: `active:bg-[var(--color-primary-active)] active:scale-[0.97]`
- Focus: `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary)]`
- Disabled: `disabled:bg-[var(--color-ink-faint)] disabled:cursor-not-allowed`
- Loading: replace label with a 14px spinner + keep width fixed (no layout shift), `aria-busy="true"`
- Used for: "Start Session," "Generate notes," "Send magic link," "Log a mock score" (modal submit)
- ARIA: standard `<button>`, `aria-disabled` mirrors `disabled`

**`button-secondary`**
- `bg-[var(--color-surface)] text-[var(--color-ink)] text-[15px] font-medium rounded-full px-5 py-2.5 shadow-[var(--shadow-1)]`
- Hover: `hover:bg-[var(--color-canvas-soft)]`
- Active: `active:scale-[0.97]`
- Used for: "Ask tutor about this," "Back to full plan," secondary modal actions ("Cancel")

**`button-utility`**
- `bg-[var(--color-surface)] text-[var(--color-ink)] text-[15px] font-medium rounded-[8px] px-3.5 py-1 border border-[var(--color-hairline)]`
- Used for: nav links styled as buttons, "Make active," filter chip toggle-off state, "Regenerate"

**`button-icon-circular`**
- `rounded-full bg-black/5 text-[var(--color-ink)] w-9 h-9 flex items-center justify-center`
- Active: `active:scale-[0.9]`
- Used for: Session Timer bar's pause/stop icon controls, chat retry icon

**`button-destructive`**
- Same shape as `button-primary` but `bg-[var(--color-danger)] text-white`
- Used for: "Re-import plan data" confirm action

### Inputs

**`text-input`**
- `bg-[var(--color-surface)] text-[var(--color-ink)] text-sm border border-[#dddddd] rounded-[4px] px-3 py-1.5`
- Focus: `focus:shadow-[var(--shadow-1)] focus:border-[var(--color-primary)]`
- Error: `border-[var(--color-danger)]`, error text below in `--text-caption` / `--color-danger`
- Disabled: `disabled:bg-[var(--color-canvas-soft)] disabled:text-[var(--color-ink-faint)]`
- Used for: email (login), mock score numeric fields, search inputs

**`select` / `toggle`**
- Radix `Select`/`Switch` primitives styled with the same `text-input` border treatment; toggle uses `--color-primary` as the "on" track fill
- Used for: push-notification toggle in Settings

### Cards & containers

**`stat-card`**
- `bg-[var(--color-surface)] rounded-[8px] shadow-[var(--shadow-1)] p-4`
- Content: large number (`--text-display-1` scaled down to 24px for stat context) + `--text-caption` label beneath
- Used for: Dashboard's 4-stat row

**`feature-card`** (base for `ActiveTopicCard`, `NoteCard`, `DayAccordion`, `NewsCard`)
- `bg-[var(--color-surface)] rounded-[12px] border border-[var(--color-hairline)] p-6`
- Hover (only where the whole card is clickable, e.g. `NoteCard`, `DayAccordion` header): `hover:shadow-[var(--shadow-1)] transition-shadow`

**`list-row`** (base for `TaskRow`, `TopicRow`)
- `rounded-[5px] px-4 py-3 flex items-center justify-between border-b border-[var(--color-hairline)] last:border-b-0`
- Completed state (`TaskRow`): title gets `line-through text-[var(--color-ink-faint)]`, checkbox fills `--color-success`

### Badges / Section tags

**`section-badge`**
- `inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.125px]`
- Dot color maps to section: QA→`--color-accent-teal`, DILR→`--color-accent-purple`, VARC→`--color-accent-orange`, MOCK→`--color-accent-pink`, REVIEW→`--color-accent-sky`
- Background always `bg-black/[0.04]`, text always `--color-ink-secondary` - **only the small dot carries the section color**, never the badge fill, matching the source system's "decoration never structure" rule

### Session Timer bar (signature component)

**`session-timer-bar`**
- Persistent, sticky bar in the app shell, visible only when a topic is active
- Default state: `bg-[var(--color-surface)] shadow-[var(--shadow-1)] border-t border-[var(--color-hairline)]` with topic title, elapsed `00:00` (static), a `button-primary` "Start"
- Running state: `bg-[var(--color-secondary)] text-[var(--color-on-primary)]` (the one deliberate "night" inversion in the whole app, signaling active focus time), live-updating `MM:SS`, `button-icon-circular` pause + stop controls
- Paused state: `bg-[var(--color-surface)]` reverts, elapsed time frozen, "Resume" `button-primary` + "Stop" `button-utility`

### Chat components

**`chat-bubble`**
- User: `bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[12px] rounded-br-[4px] px-4 py-2.5 ml-auto max-w-[80%]`
- Assistant: `bg-[var(--color-canvas-soft)] text-[var(--color-ink)] rounded-[12px] rounded-bl-[4px] px-4 py-2.5 mr-auto max-w-[80%]`
- Loading (assistant thinking): three `--color-ink-faint` dots, staggered opacity pulse animation
- Error: assistant-position bubble with `border border-[var(--color-danger)]`, retry icon button inline

### Modals

**`modal`**
- Radix `Dialog`, overlay `bg-black/40`, content `bg-[var(--color-surface)] rounded-[12px] shadow-[var(--shadow-2)] p-6 max-w-md`
- Used for: `MockScoreModal`, "Re-import plan data" confirmation

### Toasts

**`toast`**
- `bg-[var(--color-ink)] text-white rounded-[8px] shadow-[var(--shadow-2)] px-4 py-3 text-sm`
- Success variant keeps the same dark chrome with a small `--color-success` dot leading the text (no full-color toast fills, consistent with the decoration-only accent rule)
- Persistent status toast (notes generation) additionally shows a thin `--color-primary` progress underline that advances through the four generation phases

### Loading skeletons

- `skeleton` base: `bg-black/[0.06] rounded-[8px] animate-pulse`
- Stat card skeleton: full-card rectangle matching `stat-card` dimensions
- Task/topic row skeleton: `h-5 w-3/4` bar + `h-5 w-10` badge placeholder, matching `list-row` height
- Note viewer skeleton: 7 stacked bars of varying width mimicking the 7 section headers

### Empty states

- Icon (lucide, 32px, `--color-ink-faint`) + `--text-body-md` message in `--color-ink-muted` + optional `button-secondary` CTA, centered, `py-12`

## Animation / transition specs

- Button press: `scale(0.97)` / `scale(0.9)` (icon buttons), 100ms ease-out
- Card hover shadow: 150ms ease
- Toast enter/exit: slide-up + fade, 200ms ease-out / 150ms ease-in
- Timer bar state change (default → running → paused): background-color transition 200ms ease, no jarring snap
- Chat "thinking" dots: 1.2s staggered opacity pulse loop
- Task-complete checkbox: 150ms scale-bounce on check

## Responsive breakpoints

| Name | Width | Key changes |
|---|---|---|
| Mobile | ≤600px | Single column everywhere; nav collapses to a bottom tab bar (Dashboard/Plan/Tutor/Notes/More); Session Timer bar becomes a slim top bar |
| Tablet | 768-1024px | Dashboard stat row 2x2 grid; Progress charts stack |
| Desktop | ≥1080px | Dashboard 2-column (stats full width, ActiveTopicCard + TodayPlanCard side by side); Plan Explorer gets a wider reading column with the filter bar pinned |

### Touch targets
All buttons and list-row tap areas maintain a minimum 44x44px hit area on mobile, including compact `TaskRow`/`TopicRow` checkboxes (visual size can stay small; padding extends the hit area).

## Accessibility rules

- WCAG 2.1 AA minimum contrast for all text/background pairs; the darkened section-accent colors (DILR purple, MOCK pink, REVIEW sky) were specifically adjusted from the source sticker palette to pass 4.5:1 as badge-dot-adjacent label text
- All interactive elements reachable by keyboard (Tab order follows visual order); `focus-visible` ring uses `--color-primary` at 2px with 2px offset on every button/input
- Session Timer bar's live-updating time is in an `aria-live="polite"` region so screen readers announce state changes (start/pause/stop), not every second tick
- Modal (Radix `Dialog`) traps focus and returns focus to the triggering element on close
- Charts (Recharts) include an accessible data-table fallback (visually hidden, screen-reader only) summarizing the same data as the chart

## CSS variables block (`app/globals.css`)

```css
:root {
  /* Brand & accent */
  --color-primary: #0075de;
  --color-primary-active: #005bab;
  --color-secondary: #213183;

  /* Section accents (decorative only) */
  --color-accent-teal: #2a9d99;
  --color-accent-purple: #8d5fc7;
  --color-accent-orange: #dd5b00;
  --color-accent-pink: #c93f96;
  --color-accent-sky: #3d84c9;

  /* Surface */
  --color-canvas-soft: #f6f5f4;
  --color-surface: #ffffff;
  --color-hairline: #e6e6e6;

  /* Text */
  --color-ink: #000000;
  --color-ink-secondary: #31302e;
  --color-ink-muted: #615d59;
  --color-ink-faint: #a39e98;
  --color-on-primary: #ffffff;

  /* Semantic */
  --color-success: #1aae39;
  --color-warning: #dd5b00;
  --color-danger: #c0392b;

  /* Spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* Radius */
  --radius-xs: 4px; --radius-sm: 5px; --radius-md: 8px;
  --radius-lg: 12px; --radius-xl: 16px; --radius-full: 9999px;

  /* Shadows */
  --shadow-1: 0 0.175px 1.041px rgba(0,0,0,0.01), 0 0.8px 2.925px rgba(0,0,0,0.02),
              0 2.025px 7.847px rgba(0,0,0,0.027), 0 4px 18px rgba(0,0,0,0.04);
  --shadow-2: 0 1px 2px rgba(0,0,0,0.02), 0 4px 8px rgba(0,0,0,0.03),
              0 12px 24px rgba(0,0,0,0.04), 0 23px 52px rgba(0,0,0,0.05);
}

body {
  background: var(--color-canvas-soft);
  color: var(--color-ink);
  font-family: Inter, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
}
```
