---
name: shikhar-schema
description: Shikhar database schema and migration conventions. Use when creating/altering tables, writing Supabase migrations, adding columns, or updating the DB schema. Triggers on: SQL, migrations, RLS policies, DB schema changes, supabase CLI commands.
---

# Shikhar Schema Conventions

Reference: `docs/05-BACKEND-SCHEMA.md` for every table definition and `supabase/migrations/`.

## Tables (9 total)

| Table | Scope | RLS? |
|---|---|---|
| `plan_days` | Global (read-only, seeded) | Auth'd read only |
| `plan_topics` | Global (read-only, seeded) | Auth'd read only |
| `tasks` | User-scoped | Yes, all CRUD |
| `study_sessions` | User-scoped | Yes, all CRUD |
| `mock_scores` | User-scoped | Yes, select+insert |
| `notes` | User-scoped | Yes, select+insert |
| `tutor_messages` | User-scoped | Yes, select+insert |
| `push_subscriptions` | User-scoped | Yes, select+insert+delete |
| `news_items` | Global (read-only) | Auth'd read only |

## Key Rules

1. Every user-scoped table MUST have: `user_id uuid not null references auth.users(id) on delete cascade` and RLS policies scoped to `auth.uid() = user_id`
2. Never store denormalized state in client — it lives in DB tables
3. `plan_days.day_number` is UNIQUE (1-138)
4. `notes.version` increments on regenerate, never overwrites
5. `notes.status`: `'complete'` (all 7 sections) or `'draft'` (short/incomplete)
6. `study_sessions.status` state machine: running → paused → running | completed | auto-closed
7. Only ONE running/paused session per user (enforced at API, not DB constraint)
8. `study_sessions.duration_seconds` computed by trigger `set_session_duration()` on status='completed'
9. Cron function `auto_close_stale_sessions()` runs every 5 min via pg_cron

## Common Queries

```sql
-- Find running session for user
SELECT * FROM study_sessions WHERE user_id = auth.uid() AND status IN ('running','paused') LIMIT 1;

-- Compute streak: consecutive days with >=1 completed task
-- Done via client-side or helper function

-- Get sectional averages
SELECT section, AVG(overall_percentile) FROM mock_scores WHERE user_id = auth.uid() GROUP BY section;
```

## When Adding a Table

1. Add to `supabase/migrations/` with incrementing prefix
2. Add RLS in same or follow-up migration
3. Add TS type to `lib/types.ts`
4. Add Zod schema to `lib/validation/schemas.ts` if user-provided
5. Run `npm run db:push`