# Shikhar — Agent Instructions

**Read this before any task.** The project is a personal CAT 2026 prep PWA (Next.js 15 + Supabase + free-tier LLMs).

## Project Context

- **App**: `shikhar` — single-user, zero-cost, 121-day study tracker (Aug 1 → Nov 29) with AI tutor, note generator, push reminders, news digest, mock tracking
- **Docs**: 7 files in `docs/` — read `00-README.md` first, then `01-PRD.md` through `06-IMPLEMENTATION-PLAN.md`
- **Build state**: ~80% complete (Phases 0-9 done), current focus: polish (Phase 10), test (11), deploy (12)

## Required Skills

Always load these skills before working on this project:

```bash
# Local skills (already in .agents/skills/)
shikhar-rules      # Global rules, non-goals, conventions
shikhar-design     # Tailwind/design tokens from docs/04-DESIGN.md
shikhar-api        # API patterns, auth, TanStack Query, LLM calls
shikhar-schema     # DB schema, migrations, RLS from docs/05-BACKEND-SCHEMA.md
shikhar-llm        # OpenRouter/Groq integration, prompts
shikhar-flows      # Screen states, loading/empty/error specs from docs/03-APP-FLOW.md

# External skills (installed via skills-lock.json)
supabase
supabase-postgres-best-practices
```

## Quick Rules

1. **No hex colors** — use `var(--color-*)` from `app/globals.css`
2. **No paid APIs** — use OpenRouter (Gemini/DeepSeek) + Groq free tiers
3. **Check schema first** — `docs/05-BACKEND-SCHEMA.md` defines all API contracts
4. **Zod from `@/lib/validation/schemas.ts`** — never inline validation
5. **Types from `@/lib/types.ts`** — single source of truth
6. **Single-user** — no multi-tenant, no signup, no billing

## Commands

```bash
npm run dev          # Local dev
npm run build        # Production (must pass 0 TS errors)
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm run db:push      # Push migrations to Supabase
```

## Current Phase

See `docs/06-IMPLEMENTATION-PLAN.md` — Phase 10 (Polish): verify all loading/empty/error states, responsive breakpoints, a11y pass. Then Phase 11 (Test), Phase 12 (Deploy).