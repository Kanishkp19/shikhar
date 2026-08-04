---
name: shikhar-llm
description: Shikhar LLM integration conventions. Use when working with AI tutor, note generation, or any LLM API call. Triggers on: AI/LLM code, OpenRouter, Groq, chat completions, streaming, fallback logic, prompt engineering for this project.
---

# Shikhar LLM Conventions

Reference: `docs/02-TRD.md` (LLM section), `lib/llm/openrouter.ts`, `lib/llm/groq.ts`, `lib/llm/prompts.ts`

## Provider Matrix

| Purpose | Model | Provider | Endpoint | Timeout |
|---|---|---|---|---|
| Notes generation (deep) | `google/gemini-2.5-flash` | OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | 60s |
| Notes fallback | `deepseek/deepseek-chat` | OpenRouter | Same | 60s |
| Tutor chat (fast) | `llama-3.3-70b-versatile` | Groq | `https://api.groq.com/openai/v1/chat/completions` | 15s |
| News digest | `google/gemini-2.5-flash` | OpenRouter | Same | 30s |
| Fallback chain | Gemini → DeepSeek | OpenRouter | Same | Configurable |

## Call Flow — Notes Generation

```
POST /api/notes/generate
  → call openrouter.ts with NOTES_SYSTEM_PROMPT (from lib/llm/prompts.ts)
  → if 429/5xx → retry with deepseek/deepseek-chat
  → validate: word_count >= ~3000 AND all 6 section headers present
  → if short/missing: auto-regenerate with appended "Your previous output was incomplete..."
  → save with status: 'complete' or 'draft'
  → return 202 ACCEPTED
```

## Call Flow — Tutor

```
POST /api/tutor
  → call groq.ts with built tutor system prompt (from buildTutorSystemPrompt)
  → system prompt injects: today's date + today's topics from plan_days
  → fetch last 6 messages from tutor_messages table for context
  → apiMessage: user message
  → return both userMessage + assistantMessage
```

## Rate Limiting

- `/api/tutor`: max 12 req/minute per user
- `/api/notes/generate`: max 3 req/minute per user
- Uses `rateLimit()` from `@/lib/validation/schemas`

## API Keys

```
OpenRouter: Authorization: Bearer ${OPENROUTER_API_KEY}
Groq:       Authorization: Bearer ${GROQ_API_KEY}
```

- Both via `lib/llm/openrouter.ts` and `lib/llm/groq.ts`
- NEVER expose keys to client — all LLM calls go through Next.js API routes

## Prompting Rules

- Notes: use exact `NOTES_SYSTEM_PROMPT` from `lib/llm/prompts.ts` — never improvise
- Tutor: use `buildTutorSystemPrompt({ todayDate, todaysTopics })` — never hardcode context
- News: `NEWS_SUMMARY_PROMPT` for digest summarization
- All prompts as system message in the message array
- Notes gen `max_tokens: 12000` to accommodate 5,000-8,000 word output