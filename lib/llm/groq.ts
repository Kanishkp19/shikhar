/**
 * Shikhar — Groq wrapper
 * Fast path for the tutor chat. Uses Llama 3.3 70B via Groq's OpenAI-compatible API.
 *
 * Endpoint: POST https://api.groq.com/openai/v1/chat/completions
 * Auth: Bearer ${GROQ_API_KEY}
 * Typical latency: sub-second first-token, ~2s full response.
 */

const GROQ_MODEL = "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  choices: Array<{ message: { role: string; content: string } }>;
  usage?: { total_tokens: number };
}

export type GroqResult =
  | { ok: true; content: string }
  | { ok: false; code: "LLM_BUSY" | "LLM_TIMEOUT" | "LLM_ERROR"; message: string };

/**
 * Send a single tutor chat turn.
 * Caller is responsible for assembling the message history (system + prior turns).
 *
 * Per TRD: temperature 0.4, max_tokens 800, 15s timeout.
 */
export async function tutorChat(messages: ChatMessage[]): Promise<GroqResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, code: "LLM_ERROR", message: "GROQ_API_KEY is not set" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    if (res.status === 429 || res.status >= 500) {
      return { ok: false, code: "LLM_BUSY", message: `Groq ${res.status}` };
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        ok: false,
        code: "LLM_ERROR",
        message: (errBody as { error?: { message?: string } })?.error?.message ?? `Groq ${res.status}`,
      };
    }

    const body = (await res.json()) as GroqResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, code: "LLM_ERROR", message: "Empty response from Groq" };
    }
    return { ok: true, content };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, code: "LLM_TIMEOUT", message: "Groq timed out after 15s" };
    }
    return { ok: false, code: "LLM_ERROR", message: String(e) };
  } finally {
    clearTimeout(timeout);
  }
}
