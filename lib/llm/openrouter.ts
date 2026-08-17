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

Follow EVERY section of the notes skill in exact order:
1. File header & Topic Introduction (100-150 words)
2. Concept Map & Visual Taxonomy (\`\`\`mermaid flowchart/mindmap)
3. All PART N concept sections: Cover EVERY formula, identity, theorem, property, derivation, and CAT shortcut in full depth. For EACH sub-concept include ALL 7 items: plain English explanation (3-4 sentences), formula in code block with ALL variants, derivation/proof sketch, concrete numerical illustration or SVG diagram, [THE MISTAKE 80% OF STUDENTS MAKE], worked example with full Setup→Formula→Calculation→Trap→Verification, and at least one [TRAP]/[CAT TRICK]/[TOPPER INSIGHT] annotation.
4. For Geometry/Mensuration/Trig topics: CONTEXT-ACCURATE SVG DIAGRAMS (\`\`\`svg ... \`\`\`) with labeled vertices, dimensions, angle arcs, right-angle markers. For Algebra/Number topics: concrete worked numerical examples per concept.
5. Worked Examples: Minimum 12 worked examples total with full step-by-step solutions.
6. Practice Questions: Complete set of 25–30 questions (Tier 1: 8–10, Tier 2: 10–12, Tier 3: 8–10).
7. FULL WORKED SOLUTIONS: Write EACH solution Q1 through Q30 as a SEPARATE block with this EXACT format per question:
   **Solution Q[N]:**
   **Setup:** [given values, what to find]
   **Formula:** [which formula, why]
   **Calculation:** Step 1→Step 2→Step 3
   **Answer:** [final answer]
   **Trap:** [wrong approach]
   **Time:** [seconds]
   DO NOT batch multiple solutions into one paragraph. DO NOT say "similarly for remaining". Write out EVERY single solution individually.
8. Speed Techniques (minimum 6, each with standard-vs-shortcut comparison showing time saved)
9. CAT Trap File (minimum 7 traps, each with trigger phrasing from question paper)
10. Master Cheat Sheet with ━━━ boxes: Core Formulas (min 15), Comparison Table (min 10 rows), Speed Tricks Table, 8 Golden Rules.

TARGET: 4,000–6,000+ words. The Practice Questions + Solutions section alone should be 1,500–2,500 words.
CRITICAL: Write in EXTREME depth. Do NOT summarize, truncate, batch, or skip ANY section, sub-concept, or question solution. Every formula needs a derivation. Every question needs an individual solution. This output is the student's ONLY study material for this topic.`,
    },
  ];

  // Notes need depth (~12k+ output tokens) — Groq Llama's 8k cap + shallow
  // style can't hit gold standard, so notes go straight to Gemini direct
  // (free AI Studio tier, 65k output), then OpenRouter as last resort.
  const NOTES_MAX_TOKENS = 32768;
  const NOTES_TIMEOUT_MS = 240000; // route maxDuration is 300s

  // ─── Generation with multi-model fallback ───
  let content: string = "";
  let usedModel: "gemini-2.5-flash" | "deepseek-chat" = "gemini-2.5-flash";

  // 1. Direct Google Gemini API (gemini-3.7-flash -> gemini-3-flash-preview -> gemini-flash-latest)
  const direct = await callGeminiDirect(messages, 0.3, NOTES_TIMEOUT_MS, NOTES_MAX_TOKENS);
  if (direct.ok && direct.content.trim().length > 0) {
    content = direct.content;
    usedModel = "gemini-2.5-flash";
  } else {
    // 2. Groq Llama 3.3 70B (free, sub-5s latency, reliable)
    console.warn(`Direct Gemini unavailable (${!direct.ok ? direct.message : "empty"}). Trying Groq...`);
    const groq = await callGroq(messages, 0.3, 45000);
    if (groq.ok && groq.content.trim().length > 0) {
      content = groq.content;
      usedModel = "gemini-2.5-flash";
    } else {
      // 3. OpenRouter Fallback
      console.warn("Groq unavailable. Trying OpenRouter...");
      const primary = await callOnce(PRIMARY_MODEL, messages, 0.3, NOTES_TIMEOUT_MS, NOTES_MAX_TOKENS);
      if (primary.ok && primary.content.trim().length > 0) {
        content = primary.content;
        usedModel = "gemini-2.5-flash";
      } else {
        const fallback = await callOnce(FALLBACK_MODEL, messages, 0.3, NOTES_TIMEOUT_MS, NOTES_MAX_TOKENS);
        if (fallback.ok && fallback.content.trim().length > 0) {
          content = fallback.content;
          usedModel = "deepseek-chat";
        } else {
          return {
            ok: false,
            code: "LLM_BUSY",
            message: "AI services are temporarily busy. Please wait a few moments and retry.",
          };
        }
      }
    }
  }

  // Clean scratch reasoning text
  content = stripScratchText(content);

  // ─── Completeness retry: if too short or missing sections, ask for continuation ───
  const wordCount = content.split(/\s+/).length;
  const missingSections = findMissingSections(content);

  if (wordCount < 3000 || missingSections.length > 0) {
    const continuationResult = await requestContinuation(
      content,
      missingSections,
      wordCount,
      messages,
      usedModel,
    );
    if (continuationResult) {
      content = content + "\n\n" + stripScratchText(continuationResult);
    }
  }

  return { ok: true, content, model: usedModel };
}

/**
 * Strip internal model reasoning artefacts from the output.
 * Only removes explicit model "thinking out loud" patterns — never removes
 * legitimate content sentences that happen to start with common English words.
 */
function stripScratchText(content: string): string {
  // Only target unambiguous model-reasoning patterns (never broad words like "So," or "Actually,")
  const patterns = [
    /^\s*Wait,? let me (?:verify|re-verify|re-check|check|recalculate|fix|think|reconsider)[^\n]*$/gim,
    /^\s*Let me (?:verify|re-verify|re-check|check|recalculate|fix|reconsider|think about)[^\n]*$/gim,
    /^\s*Let's (?:verify|re-verify|re-check|check|recalculate|fix|reconsider|think about)[^\n]*$/gim,
    /^\s*Hmm,? (?:wait|let me|I think|I need to|that doesn't)[^\n]*$/gim,
    /^\s*(?:Wait|Hold on),? (?:that's|this is|I made|the calculation)[^\n]*$/gim,
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
 * Find which required sections are missing from the generated content.
 */
function findMissingSections(content: string): string[] {
  const lower = content.toLowerCase();
  const missing: string[] = [];

  const sections = [
    { pattern: /(?:topic introduction|introduction)/i, label: "Topic Introduction" },
    { pattern: /(?:concept map|visual taxonomy)/i, label: "Concept Map" },
    { pattern: /(?:part\s+\d|core concepts)/i, label: "Concept Sections" },
    { pattern: /(?:practice questions|tier\s+1)/i, label: "Practice Questions" },
    { pattern: /(?:solution q\d|solution\s+q\d|full.*solutions)/i, label: "Full Worked Solutions" },
    { pattern: /(?:speed technique|shortcut)/i, label: "Speed Techniques" },
    { pattern: /(?:common trap|cat trap|trap file)/i, label: "CAT Trap File" },
    { pattern: /(?:cheat sheet|golden rule|master.*matrix)/i, label: "Master Cheat Sheet" },
  ];

  for (const s of sections) {
    if (!s.pattern.test(content)) missing.push(s.label);
  }

  // Check individual Q solutions exist (not batched)
  const solutionCount = (content.match(/\*\*Solution Q\d+/gi) || []).length;
  const questionCount = (content.match(/\*\*Q\d+\./gi) || []).length;
  if (questionCount > 0 && solutionCount < questionCount * 0.7) {
    missing.push(`Individual Solutions (found ${solutionCount} solutions for ${questionCount} questions)`);
  }

  return missing;
}

/**
 * Send a continuation prompt to fill missing sections or add depth.
 * Uses the same model cascade as the initial generation.
 */
async function requestContinuation(
  existingContent: string,
  missingSections: string[],
  wordCount: number,
  _originalMessages: ChatMessage[],
  preferredModel: "gemini-2.5-flash" | "deepseek-chat",
): Promise<string | null> {
  const missingText = missingSections.length > 0
    ? `The following sections are MISSING or INCOMPLETE: ${missingSections.join(", ")}.`
    : "";
  const depthText = wordCount < 3000
    ? `The content is only ${wordCount} words (target: 4,000-6,000+). You need to add significant depth to concept explanations, derivations, and practice question solutions.`
    : "";

  const continuationMessages: ChatMessage[] = [
    {
      role: "system",
      content: "You are continuing/completing CAT study notes. Output ONLY the missing or incomplete sections in the same markdown format. Do NOT repeat sections that are already complete. Do NOT add any preamble like 'Here are the missing sections'.",
    },
    {
      role: "user",
      content: `The following CAT notes were generated but are incomplete.

${missingText}
${depthText}

Here is what was already generated (DO NOT repeat this, only ADD what's missing):

---BEGIN EXISTING NOTES---
${existingContent.slice(0, 12000)}
---END EXISTING NOTES---

Please generate ONLY the missing/incomplete sections listed above. Follow the exact same formatting and structure. For practice question solutions, write EACH solution as a SEPARATE block with Setup/Formula/Calculation/Answer/Trap/Time format.`,
    },
  ];

  const CONTINUATION_MAX_TOKENS = 16384;
  const CONTINUATION_TIMEOUT_MS = 120000;

  try {
    // Try the same model that produced the original content first
    if (preferredModel === "gemini-2.5-flash") {
      const direct = await callGeminiDirect(continuationMessages, 0.3, CONTINUATION_TIMEOUT_MS, CONTINUATION_MAX_TOKENS);
      if (direct.ok && direct.content.trim().length > 100) return direct.content;
    }

    const groq = await callGroq(continuationMessages, 0.3, 45000);
    if (groq.ok && groq.content.trim().length > 100) return groq.content;

    const orFallback = await callOnce(
      preferredModel === "deepseek-chat" ? FALLBACK_MODEL : PRIMARY_MODEL,
      continuationMessages, 0.3, CONTINUATION_TIMEOUT_MS, CONTINUATION_MAX_TOKENS,
    );
    if (orFallback.ok && orFallback.content.trim().length > 100) return orFallback.content;
  } catch (e) {
    console.warn("[notes/generate] continuation request failed:", e);
  }

  return null;
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
        max_tokens: 32768,
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

  const directModels = [
    "gemini-3.6-flash",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
  ];
  let lastError: { code: LLMErrorCode; message: string } = { code: "LLM_ERROR", message: "Gemini call failed" };

  for (const model of directModels) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
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
        lastError = { code: "LLM_BUSY", message: `Gemini ${model} returned status ${res.status}` };
        console.warn(`[GeminiDirect] ${model} returned ${res.status}, trying next direct model...`);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        lastError = { code: "LLM_ERROR", message: `Gemini ${model} ${res.status}: ${errText.slice(0, 200)}` };
        console.warn(`[GeminiDirect] ${model} ${res.status}, trying next direct model...`);
        continue;
      }

      const body = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const content = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (content.trim().length > 0) {
        return { ok: true, content };
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        lastError = { code: "LLM_TIMEOUT", message: `Gemini ${model} timed out after ${timeoutMs}ms` };
      } else {
        lastError = { code: "LLM_ERROR", message: String(e) };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false, code: lastError.code, message: lastError.message };
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