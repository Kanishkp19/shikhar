/**
 * Shikhar — OpenRouter wrapper
 * Used for the notes generator (deep, structured markdown) with DeepSeek fallback.
 *
 * Endpoint: POST https://openrouter.ai/api/v1/chat/completions
 * Auth: Bearer ${OPENROUTER_API_KEY}
 *
 * Fallback rule: if the primary model (Gemini 2.5 Flash) returns 429 or 5xx,
 * retry once against DeepSeek V3 with the same payload.
 */

import { NOTES_SYSTEM_PROMPT, NEWS_SUMMARY_PROMPT } from "./prompts";

const PRIMARY_MODEL = "google/gemini-2.5-flash";
const FALLBACK_MODEL = "deepseek/deepseek-chat";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterChoice {
  message?: { role: string; content: string };
  finish_reason?: string;
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[];
  usage?: { total_tokens: number };
}

interface OpenRouterError {
  error?: { code?: number; message?: string };
}

export type LLMResult =
  | { ok: true; content: string; model: "gemini-2.5-flash" | "deepseek-chat" }
  | { ok: false; code: "LLM_BUSY" | "LLM_TIMEOUT" | "LLM_ERROR" | "VERIFY_FAILED"; message: string };

/**
 * Generate topper-style notes for a CAT topic.
 * Returns markdown content + which model produced it.
 * Includes: generation → scratch cleanup → math verification → auto-regenerate on failure
 */
export async function generateNotes(topic: string, section?: string): Promise<LLMResult> {
  const sectionText = section ? ` [Section: ${section}]` : "";
  const messages: ChatMessage[] = [
    { role: "system", content: NOTES_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Generate the complete, gold-standard CAT topper notes for topic: "${topic}"${sectionText}.

Follow EVERY section of the notes skill in exact order: file header, Topic Introduction, all PART N concept sections (minimum 12 worked examples across the file), Practice Questions (25–30 for QA with full worked solutions for every question), Speed Techniques (minimum 6), the CAT Trap File (minimum 7 traps), and the Master Cheat Sheet with ━━━ box separators.

Target 3,000–5,000+ words. Write in extreme depth. Do not summarize or shorten any section or question solution.`,
    },
  ];

  // Notes need depth (~12k+ output tokens) — Groq Llama's 8k cap + shallow
  // style can't hit gold standard, so notes go straight to Gemini direct
  // (free AI Studio tier, 65k output), then OpenRouter as last resort.
  const NOTES_MAX_TOKENS = 32768;
  const NOTES_TIMEOUT_MS = 240000; // route maxDuration is 300s

  // ─── Generation with up to 2 verification retries ───
  const MAX_VERIFY_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_VERIFY_RETRIES; attempt++) {
    const direct = await callGeminiDirect(messages, 0.3, NOTES_TIMEOUT_MS, NOTES_MAX_TOKENS);
    let content: string;

    if (direct.ok && direct.content.trim().length > 0) {
      content = direct.content;
    } else {
      console.warn(`Gemini direct unavailable (${!direct.ok ? direct.message : "empty"}). Trying OpenRouter...`);
      const primary = await callOnce(PRIMARY_MODEL, messages, 0.3, NOTES_TIMEOUT_MS, NOTES_MAX_TOKENS);
      if (primary.ok && primary.content.trim().length > 0) {
        content = primary.content;
      } else {
        return !direct.ok
          ? { ok: false, code: direct.code, message: direct.message }
          : { ok: false, code: "LLM_ERROR", message: "Empty response" };
}
}

/**
 * Strip internal model reasoning artefacts ("Wait, let me verify...", "Let's re-check...",
 * "Wait, let's re-verify...", "Let me recalculate...", etc.) from the output.
 */
function stripScratchText(content: string): string {
  const patterns = [
    /^.*?(?:Wait, let me (?:verify|re-verify|re-check|check|recalculate|fix)).*$/gim,
    /^.*?(?:Let me (?:verify|re-verify|check|recalculate|fix|re-check)).*$/gim,
    /^.*?(?:Let's (?:verify|re-verify|check|recalculate|fix|re-check)).*$/gim,
    /^.*?(?:Hmm,?\s*).*$/gim,
    /^.*?(?:Actually,?\s*).*$/gim,
    /^.*?(?:So,?\s*).*$/gim,
    /^\s*(?:Wait|Let|Let's|Hmm|Actually|So)[^.]*\.\s*/gim,
  ];

  let cleaned = content;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  // Remove empty lines left behind (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

/**
 * Math verification: sends the generated notes to a fast model (Groq Llama 3.3 70B)
 * to check that every MCQ option matches the computed answer in the worked solution.
 * Returns { ok: true } if all math verifies, or { ok: false, message } listing failures.
 */
async function verifyMath(content: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: true }; // skip if no key

  // Extract all Q&A blocks with MCQ options and worked solutions
  const qaBlocks = extractQABlocks(content);
  if (qaBlocks.length === 0) return { ok: true };

  const prompt = `You are a strict arithmetic verifier. For each question below, check if the worked solution's computed answer matches one of the printed MCQ options EXACTLY.

Output JSON only: { "errors": ["Question X: computed Y, options [A, B, C, D] — no match", ...] } or { "errors": [] } if all match.

Questions to verify:
${qaBlocks.map((b, i) => `${i + 1}. Question: ${b.question}\nOptions: ${b.options.join(" | ")}\nWorked Solution: ${b.solution}`).join("\n\n")}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You verify arithmetic only. Output strict JSON. No prose." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return { ok: true }; // skip on API error

    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const jsonText = body.choices?.[0]?.message?.content ?? '{"errors":[]}';
    const parsed = JSON.parse(jsonText);

    if (parsed.errors?.length > 0) {
      return { ok: false, message: parsed.errors.join("; ") };
    }
    return { ok: true };
  } catch {
    return { ok: true }; // skip on parse/network error
  }
}

function extractQABlocks(content: string): Array<{ question: string; options: string[]; solution: string }> {
  const blocks: Array<{ question: string; options: string[]; solution: string }> = [];

  // Match Q1, Q2, ... or Question 1, Question 2, etc. with (a)/(b)/(c)/(d) options
  const qaRegex = /(?:^|\n)(?:Q(\d+)\.|Question\s+(\d+):?)\s*([\s\S]*?)(?=\n\s*(?:Q\d+\.|Question\s+\d+:?|$))/g;
  let match: RegExpExecArray | null;
  while ((match = qaRegex.exec(content)) !== null) {
    const block = match[3]?.trim() ?? "";
    if (!block) continue;
    // Extract options: (a) ... (b) ... (c) ... (d) ...
    const optMatch = block.match(/\(a\)\s*([^\n]+)\s*\(b\)\s*([^\n]+)\s*\(c\)\s*([^\n]+)\s*\(d\)\s*([^\n]+)/i);
    if (!optMatch) continue;

    const options = [optMatch[1]?.trim() ?? "", optMatch[2]?.trim() ?? "", optMatch[3]?.trim() ?? "", optMatch[4]?.trim() ?? ""];
    // Extract worked solution (look for "Solution:", "Worked Solution:", "Full Solution:", etc.)
    const solMatch = block.match(/(?:Solution|Worked Solution|Full Solution|Answer)[:\s]*([\s\S]*)/i);
    const solution = solMatch?.[1]?.trim() ?? block;

    blocks.push({
      question: block.split("\n")[0]?.slice(0, 200) ?? "",
      options,
      solution: solution.slice(0, 2000), // cap length
    });
  }
  return blocks;
}

/**
 * Structural completeness check — ensures all required sections are present
 * per the notes skill spec.
 */
function checkStructure(content: string): { ok: true } | { ok: false; message: string } {
  const lower = content.toLowerCase();
  const missing: string[] = [];

  const required = [
    { key: "introduction", label: "Topic Introduction" },
    { key: "concept", label: "Core Concepts / Concept Map" },
    { key: "practice", label: "Practice Questions" },
    { key: "speed", label: "Speed Techniques" },
    { key: "trap", label: "Common Traps / CAT Trap File" },
    { key: "cheat sheet", label: "Master Cheat Sheet" },
  ];

  for (const r of required) {
    if (!lower.includes(r.key)) missing.push(r.label);
  }

  // Check for minimum worked examples (≥6) with flexible matching
  const exampleCount = (content.match(/(?:Worked Example|Example)\s*\d*/gi) || []).length;
  if (exampleCount < 6) missing.push(`Worked Examples (found ${exampleCount})`);

  // Check for minimum questions (≥15) with flexible matching
  const questionCount = (content.match(/(?:Q\d+|(?:^|\n)\d+\.\s+[A-Z]|Question\s*\d+)/gi) || []).length;
  if (questionCount < 15) missing.push(`Practice Questions (found ${questionCount})`);

  // Check for minimum speed techniques (≥4)
  const techCount = (content.match(/(?:Technique|Speed Technique)\s*\d*/gi) || []).length;
  if (techCount < 4) missing.push(`Speed Techniques (found ${techCount})`);

  // Check for minimum traps (≥4)
  const trapCount = (content.match(/(?:Trap|CAT Trap)\s*\d*/gi) || []).length;
  if (trapCount < 4) missing.push(`Traps (found ${trapCount})`);

  // Check for box or section separators
  if (!/(?:━━━━━|═════|─────|-----|_____)/.test(content)) missing.push("Cheat Sheet Box Separators");

  if (missing.length > 0) {
    return { ok: false, message: `Missing: ${missing.join(", ")}` };
  }
  return { ok: true };
}

    // Step 1: Remove internal scratch text ("Wait, let me verify...", "Let's re-check...")
    content = stripScratchText(content);

    // Step 2: Math verification — check all MCQ options against computed answers
    const verifyResult = await verifyMath(content);
    if (!verifyResult.ok) {
      console.warn(`Verification warning (attempt ${attempt + 1}/${MAX_VERIFY_RETRIES + 1}): ${verifyResult.message}`);
      if (attempt < MAX_VERIFY_RETRIES) {
        messages.push(
          { role: "assistant", content },
          {
            role: "user",
            content: `Your previous output had math errors. Fix them:
${verifyResult.message}

Regenerate the FULL notes with CORRECT arithmetic. Every MCQ option must match the computed answer exactly. Remove all internal reasoning text.`,
          },
        );
        continue; // retry
      }
    }

    // Step 3: Structural completeness check
    const structureCheck = checkStructure(content);
    if (!structureCheck.ok) {
      console.warn(`Structure check warning (attempt ${attempt + 1}): ${structureCheck.message}`);
      if (attempt < MAX_VERIFY_RETRIES) {
        messages.push(
          { role: "assistant", content },
          {
            role: "user",
            content: `Your previous output is missing required sections. Add them:
${structureCheck.message}

Regenerate the FULL notes with ALL required sections present.`,
          },
        );
        continue;
      }
    }

    // Return generated content cleanly (never throw 502)
    return { ok: true, content, model: "gemini-2.5-flash" };
  }

  return { ok: false, code: "VERIFY_FAILED", message: "Generation timeout exceeded" };
}

/**
 * Summarize raw news headlines into structured digest JSON.
 * Used by the `refresh-news` cron route.
 */
export async function summarizeNews(rawHeadlines: string): Promise<LLMResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: NEWS_SUMMARY_PROMPT },
    { role: "user", content: rawHeadlines },
  ];
  return callWithFallback(messages, 0.2, 35000); // 35s timeout for news
}

/**
 * Core call helper — tries Groq (sub-5s), then Gemini, then DeepSeek fallback.
 * All models are free-tier.
 */
async function callWithFallback(
  messages: ChatMessage[],
  temperature: number,
  timeoutMs: number,
): Promise<LLMResult> {
  // 1. Fast path: Groq Llama 3.3 70B (sub-5s latency, 100% free)
  const groqRes = await callGroq(messages, temperature, 25000);
  if (groqRes.ok && groqRes.content.trim().length > 0) {
    return { ok: true, content: groqRes.content, model: "gemini-2.5-flash" };
  }

  // 2. Fallback: OpenRouter Gemini 2.5 Flash
  console.warn("Groq path unavailable. Falling back to OpenRouter Gemini...");
  const primary = await callOnce(PRIMARY_MODEL, messages, temperature, timeoutMs);
  if (primary.ok && primary.content.trim().length > 0) {
    return { ok: true, content: primary.content, model: "gemini-2.5-flash" };
  }

  // 3. Fallback: DeepSeek Chat
  console.warn("Gemini path unavailable. Falling back to DeepSeek...");
  const fallback = await callOnce(FALLBACK_MODEL, messages, temperature, timeoutMs);
  if (fallback.ok && fallback.content.trim().length > 0) {
    return { ok: true, content: fallback.content, model: "deepseek-chat" };
  }

  return { ok: false, code: primary.ok ? "LLM_ERROR" : primary.code, message: primary.ok ? "Empty response" : (primary as { message: string }).message };
}

async function callGroq(
  messages: ChatMessage[],
  temperature: number,
  timeoutMs: number,
): Promise<{ ok: true; content: string } | { ok: false; code: LLMErrorCode; message: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, code: "LLM_ERROR", message: "GROQ_API_KEY is not set" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return { ok: false, code: "LLM_BUSY", message: `Groq ${res.status}` };
    const body = (await res.json()) as OpenRouterResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) return { ok: false, code: "LLM_ERROR", message: "Empty response from Groq" };
    return { ok: true, content };
  } catch (e) {
    return { ok: false, code: "LLM_TIMEOUT", message: String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

type LLMErrorCode = "LLM_BUSY" | "LLM_TIMEOUT" | "LLM_ERROR";

/**
 * Google AI Studio Gemini API — free tier, large output budget.
 * Requires GEMINI_API_KEY (get one free at https://aistudio.google.com/apikey).
 */
async function callGeminiDirect(
  messages: ChatMessage[],
  temperature: number,
  timeoutMs: number,
  maxTokens: number,
): Promise<{ ok: true; content: string } | { ok: false; code: LLMErrorCode; message: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, code: "LLM_ERROR", message: "GEMINI_API_KEY is not set" };

  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const userParts = messages.filter((m) => m.role !== "system");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
          contents: userParts.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
        signal: controller.signal,
      },
    );

    if (res.status === 429 || res.status >= 500) {
      return { ok: false, code: "LLM_BUSY", message: `Gemini ${res.status}` };
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, code: "LLM_ERROR", message: `Gemini ${res.status}: ${errText.slice(0, 200)}` };
    }

    const body = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!content) return { ok: false, code: "LLM_ERROR", message: "Empty response from Gemini" };
    return { ok: true, content };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, code: "LLM_TIMEOUT", message: `Gemini timed out after ${timeoutMs}ms` };
    }
    return { ok: false, code: "LLM_ERROR", message: String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOnce(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  timeoutMs: number,
  maxTokens = 8192,
): Promise<{ ok: true; content: string } | { ok: false; code: LLMErrorCode; message: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, code: "LLM_ERROR", message: "OPENROUTER_API_KEY is not set" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://shikhar.app",
        "X-Title": "Shikhar",
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
      signal: controller.signal,
    });

    if (res.status === 429 || res.status >= 500) {
      return { ok: false, code: "LLM_BUSY", message: `OpenRouter ${res.status}` };
    }

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as OpenRouterError;
      return {
        ok: false,
        code: "LLM_ERROR",
        message: errBody.error?.message ?? `OpenRouter ${res.status}`,
      };
    }

    const body = (await res.json()) as OpenRouterResponse;
    const choice = body.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      return { ok: false, code: "LLM_ERROR", message: "Empty response from OpenRouter" };
    }

    return { ok: true, content };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, code: "LLM_TIMEOUT", message: `OpenRouter timed out after ${timeoutMs}ms` };
    }
    return { ok: false, code: "LLM_ERROR", message: String(e) };
  } finally {
    clearTimeout(timeout);
  }
}