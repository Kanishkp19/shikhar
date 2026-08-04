---
name: shikhar-rules
description: Shikhar project-wide coding rules and restrictions. ALWAYS consult before writing ANY code. Triggers on: any code change, new file creation, import decisions, architecture decisions.
---

# Shikhar Global Rules

Reference: `docs/00-README.md` (esp. Agent Operating Rules section), `docs/01-PRD.md` (Non-Goals)

## Absolute Rules

1. **Never hardcode a hex color.** Always use `var(--color-*)` CSS variables defined in `app/globals.css`
2. **Never introduce a paid API call.** If a task requires one, re-check `docs/02-TRD.md` LLM routing for the free alternative
3. **Always check `docs/05-BACKEND-SCHEMA.md` before writing any API route.** The request/response shape is already defined
4. **Always match Tailwind classes to `docs/04-DESIGN.md`.** Colors, radii, spacing are tokenized
5. **Build in phase order.** See `docs/06-IMPLEMENTATION-PLAN.md` — don't build dependent features before their dependencies exist
6. **Every screen in `docs/03-APP-FLOW.md` must have a route.** If one doesn't exist, create it
7. **This is a single-user app.** No multi-tenant abstractions (org switching, team invites, billing, signup flow)

## Non-Goals (do NOT build)

- Multi-user support (accounts for others, signup flow)
- Payment processing
- Native mobile app (PWA is sufficient)
- Full CAT question bank (not a mock test platform)
- Offline-first architecture (connectivity assumed)
- Paid LLM usage
- Regenerating the 138-day plan structure

## File Organization

- Components grouped by feature: `components/dashboard/`, `components/tutor/`, `components/notes/`, `components/progress/`, `components/news/`, `components/plan/`, `components/timer/`, `components/app/`, `components/settings/`, `components/ui/`
- Shared utilities in `lib/`: `supabase/`, `llm/`, `push/`, `store/`, `validation/`
- API route files: `app/api/[resource]/*.ts`
- Each component file exports ONE primary component

## TypeScript Rules

- `strict: true` mode — no `any` types ever
- Import types from `@/lib/types.ts` - it's the SSOT
- Zod schemas from `@/lib/validation/schemas.ts` — never inline validation

## Environment Variables

All listed in `.env.local.example`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client AND server
- `SUPABASE_SERVICE_ROLE_KEY` — server only, cron routes
- `ALLOWED_USER_EMAIL` — server-side auth check
- `OPENROUTER_API_KEY`, `GROQ_API_KEY` — server-side LLM
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — push notifications
- `CRON_SECRET` — verifies cron route calls

Never commit `.env.local` or real API keys to git.

## Git Conventions

Commit messages follow conventional commits with phase prefix:
```
feat(phase-2): add plan explorer with search and section filters
fix(timer): resolve auto-close race condition
refactor(api): extract auth check to shared middleware
```

## Build Commands

```bash
npm run dev            # Start local dev
npm run build          # Production build (must have 0 TS errors)
npm run lint           # Run ESLint
npm run type-check     # tsc --noEmit
npm run db:push        # Push migrations to Supabase
```