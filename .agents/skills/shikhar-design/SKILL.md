---
name: shikhar-design
description: Shikhar UI/UX design conventions. Use when building ANY component, page, or styling for this project. Triggers on: creating new components, writing JSX/TSX with Tailwind, adding UI elements, changing colors/typography/spacing, building modals/toasts/skeletons/empty-states.
---

# Shikhar Design System

Always reference `docs/04-DESIGN.md` for the full token spec. These are the critical rules:

## Colors — NEVER hardcode a hex value

```css
/* Use CSS variables ALWAYS */
var(--color-primary)       /* #0075de — the sole structural accent */
var(--color-canvas-soft)   /* #f6f5f4 — page bg */
var(--color-surface)       /* #ffffff — cards, panels */
var(--color-hairline)      /* #e6e6e6 — 1px borders/dividers */
var(--color-ink)           /* #000000 — headings */
var(--color-ink-secondary) /* #31302e — body copy */
var(--color-ink-muted)     /* #615d59 — timestamps */
var(--color-ink-faint)     /* #a39e98 — captions */
var(--color-secondary)     /* #213183 — timer bar bg ONLY when running */
var(--color-success)       /* #1aae39 */
var(--color-warning)       /* #dd5b00 */
var(--color-danger)        /* #c0392b */

// Section accent dots (decorative only, never fills)
var(--color-accent-teal)   /* QA */
var(--color-accent-purple) /* DILR */
var(--color-accent-orange) /* VARC */
var(--color-accent-pink)   /* MOCK */
var(--color-accent-sky)    /* REVIEW */
```

## Component rules

### Buttons
- Primary: `bg-[var(--color-primary)] text-white text-[15px] font-medium rounded-full px-5 py-2.5`
- Secondary: `bg-white text-[var(--color-ink)] rounded-full px-5 py-2.5 shadow-[var(--shadow-1)]`
- Icon: `rounded-full bg-black/5 w-9 h-9 flex items-center justify-center`
- Loading state: replace label with 14px spinner, keep `aria-busy="true"`, fix width to prevent layout shift

### Cards
- Feature card: `bg-white rounded-[12px] border border-[var(--color-hairline)] p-6`
- Stat card: `bg-white rounded-[8px] shadow-[var(--shadow-1)] p-4`
- List row: `rounded-[5px] px-4 py-3 border-b border-[var(--color-hairline)] last:border-b-0`
- Completed task row: title gets `line-through text-[var(--color-ink-faint)]`

### Inputs
- `bg-white border border-[#dddddd] rounded-[4px] px-3 py-1.5`
- Focus: `ring-2 ring-offset-2 ring-[var(--color-primary)]`
- Error: `border-[var(--color-danger)]` + error text beneath in `text-[13px] text-[var(--color-danger)]`

### Section Badges
```tsx
<span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.125px] bg-black/[0.04] text-[var(--color-ink-secondary)]">
  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sectionColor }} />
  {section}
</span>
```
- Only the dot carries color, never the badge fill

### Loading Skeletons
- Base: `bg-black/[0.06] rounded-[8px] animate-pulse`
- Component skeletons: h-5 bars matching list row heights

### Empty States
- lucide icon (32px, `text-[var(--color-ink-faint)]`)
- `text-base text-[var(--color-ink-muted)]` centered message
- Optional `button-secondary` CTA
- `py-12` padding

### Spacing Scale (4px base)
4, 8, 12, 16, 20, 24, 32, 40, 48 → Tailwind: `p-1` through `p-12`

### Typography
- Headings: Inter 700 with negative tracking (`text-[26px] font-bold leading-[1.23] tracking-[-0.625px]`)
- Body: Inter 400, `text-base leading-[1.5]`
- Small: `text-sm leading-[1.43]`
- Buttons: `text-[15px] font-medium`
- Captions: `text-[13px] text-[var(--color-ink-muted)]`
- Section badges: `text-[11px] font-semibold uppercase tracking-[0.125px]`
- Note content: never exceed `text-base` for readability

### Timer Bar (signature)
- Default (stopped): `bg-white shadow-[var(--shadow-1)] border-t border-[var(--color-hairline)]`
- Running: `bg-[var(--color-secondary)] text-white` — the ONLY use of `--color-secondary` anywhere
- Paused: white background with frozen elapsed time

### Modals
- Radix Dialog modal overlay: `bg-black/40`
- Content: `bg-white rounded-[12px] shadow-[var(--shadow-2)] p-6 max-w-md`
- Focus trap, returns focus to trigger on close

### Toasts
- `bg-[var(--color-ink)] text-white rounded-[8px] px-4 py-3 text-sm`
- Success/docs: same dark chrome with success-color dot
- Persistent status (notes generation): thin `--color-primary` progress underline

### Animations
- Button press: `active:scale-[0.97]` / icon `active:scale-[0.9]`, 100ms
- Card hover shadow: 150ms ease
- Toast enter/exit: slide-up + fade, 200ms
- Chat thinking dots: 1.2s staggered opacity pulse

### Responsive
- Mobile ≤600px: single column everywhere, bottom tab nav, timer becomes slim top bar
- Tablet 768-1024px: dash stats 2x2, charts stack
- Desktop ≥1080px: dash 2-col layout
- Minimum 44x44px touch targets on mobile

### Accessibility
- `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary)]` on all interactive
- Timer time in `aria-live="polite"`
- Charts include hidden data-table fallback