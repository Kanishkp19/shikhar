---
name: shikhar-api
description: Shikhar API route and data conventions. Use when building ANY API route, data fetching, or server logic. Triggers on: creating/modifying Route Handlers, API calls, Supabase queries, error handling patterns, Zod validation on the server.
---

# Shikhar API Conventions

Always reference `docs/05-BACKEND-SCHEMA.md` and `docs/02-TRD.md` before writing API code.

## API Route Structure

Every API route follows this pattern:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

// 1. Zod schema for body (import from @/lib/validation/schemas when possible)
// 2. Handler: authenticate → validate → operate → respond

export async function METHOD(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    if (user.email !== process.env.ALLOWED_USER_EMAIL) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Not authorized" } }, { status: 403 });

    // Validate body with Zod
    // Execute Supabase query
    // Return { data: result }

  } catch (err) {
    console.error("[route-name]", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
```

## Response Shape

```typescript
// Success: { data: T }  (NOT { task: T, mocks: T[] } — single data key)
// Error:   { error: { code: string, message: string } }

// Codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, DB_ERROR, LLM_BUSY, LLM_TIMEOUT, SESSION_ALREADY_ACTIVE, INTERNAL_ERROR
```

## Database Access Rules

- **Server Components / Route Handlers** → `createSupabaseServerClient()` (from `@/lib/supabase/server`)
- **Client Components** → `createSupabaseBrowserClient()` (from `@/lib/supabase/client`)
- **Service role (bypass RLS)** → ONLY in `/api/cron/*` routes, gated by `CRON_SECRET` header, never elsewhere
- **Never** call Supabase from a React Server Component directly unless it's a read-only query for initial SSR data

## Data Fetching (Client)

- Use TanStack Query for all client-side data fetching
- Never `fetch()` or `supabase.from()` directly in components
- Query keys follow `[resource, filters]` pattern: `["tasks", date]`, `["notes", section]`
- Implement optimistic updates for toggles/saves:

```typescript
const toggleMutation = useMutation({
  mutationFn: (id: string) => fetch(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ completed: true }) }),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ["tasks"] });
    const previous = queryClient.getQueryData(["tasks"]);
    queryClient.setQueryData(["tasks"], (old) => /* optimistic update */);
    return { previous };
  },
  onError: (_err, _vars, context) => queryClient.setQueryData(["tasks"], context.previous),
  onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
});
```

## LLM Calls

- All LLM calls go through API routes, never direct from client
- `/api/tutor` → Groq (Llama 3.3 70B), fast path, 15s timeout
- `/api/notes/generate` → OpenRouter (Gemini 2.5 Flash → DeepSeek fallback)
- Both have rate limiting via `rateLimit()` from `@/lib/validation/schemas`
- Notes generation 202 ACCEPTED pattern — client polls or waits for toast
- Never introduce a paid API call, use the OpenRouter free tier fallback chain

## Session Timer

- Only ONE running/paused session per user — enforce in POST /api/sessions
- Client sends heartbeat PATCH every 60s while running
- CRON auto-closes sessions with 30min no heartbeat
- `duration_seconds` always computed server-side from `started_at`/`ended_at` timestamps

## Zod Schemas

- Import from `@/lib/validation/schemas` — never inline valdiation
- All existing schemas: `taskToggleSchema`, `taskCreateSchema`, `mockScoreCreateSchema`, `noteGenerateSchema`, `tutorMessageSchema`, `pushSubscribeSchema`