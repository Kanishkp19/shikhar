/**
 * Shikhar — OmniRoute LLM Gateway Client
 * Primary client for generating Flashcards, Mermaid Mind Maps, and CAT Study Materials.
 *
 * Endpoint: POST ${OMNIROUTE_BASE_URL || 'http://localhost:20128/v1'}/chat/completions
 * Auth: Optional Bearer token / local key
 *
 * Fallback: If local OmniRoute server is offline, automatically falls back to Groq (sub-5s) / Gemini direct.
 */

import type { NoteSection, DiagramType, HandwrittenNoteContent } from "@/lib/types";

const DEFAULT_OMNIROUTE_URL = "http://localhost:20128/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GeneratedFlashcardItem {
  front: string;
  back: string;
  hint?: string;
  category?: string;
}

export type LLMResponse<T> =
  | { ok: true; data: T; provider: "omniroute" | "groq" | "gemini" }
  | { ok: false; code: string; message: string };

/**
 * Helper to call OmniRoute local server API
 */
async function callOmniRoute(
  messages: ChatMessage[],
  temperature = 0.3,
  timeoutMs = 25000,
): Promise<{ ok: true; content: string } | { ok: false; message: string }> {
  const baseUrl = process.env.OMNIROUTE_BASE_URL ?? "http://localhost:20128/v1";
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const apiKey = process.env.OMNIROUTE_API_KEY ?? "omniroute-local";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "auto",
        messages,
        temperature,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, message: `OmniRoute status ${res.status}: ${errText.slice(0, 100)}` };
    }

    const body = await res.json();
    const content = body.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return { ok: false, message: "Empty content from OmniRoute" };
    }

    return { ok: true, content };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fallback to Groq Llama 3.3 70B if OmniRoute is offline
 */
async function callGroqFallback(
  messages: ChatMessage[],
  temperature = 0.3,
  timeoutMs = 25000,
): Promise<{ ok: true; content: string } | { ok: false; message: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, message: "GROQ_API_KEY is not set" };

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
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, message: `Groq status ${res.status}` };
    }

    const body = await res.json();
    const content = body.choices?.[0]?.message?.content;
    if (!content) return { ok: false, message: "Empty response from Groq" };

    return { ok: true, content };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Unified completion helper — tries OmniRoute first, then Groq
 */
async function getCompletion(messages: ChatMessage[]): Promise<{ content: string; provider: "omniroute" | "groq" }> {
  const omni = await callOmniRoute(messages);
  if (omni.ok && omni.content.trim().length > 0) {
    return { content: omni.content, provider: "omniroute" };
  }

  const omniErr = !omni.ok ? omni.message : "empty response";
  console.warn(`[OmniRoute] Local server unavailable (${omniErr}). Falling back to Groq...`);
  const groq = await callGroqFallback(messages);
  if (groq.ok && groq.content.trim().length > 0) {
    return { content: groq.content, provider: "groq" };
  }

  const groqErr = !groq.ok ? groq.message : "empty response";
  throw new Error(`LLM providers unavailable. OmniRoute: ${omniErr}, Groq: ${groqErr}`);
}

// ──────────────────────────────────────────────────────────────
// Flashcard Generation
// ──────────────────────────────────────────────────────────────

export async function generateFlashcardDeck(
  topic: string,
  section: NoteSection,
): Promise<LLMResponse<GeneratedFlashcardItem[]>> {
  const systemPrompt = `You are an expert CAT 2026 exam tutor specializing in Active Recall & Spaced Repetition (SRS) flashcards.
Generate 10 to 12 high-yield flashcards for CAT ${section} on topic: "${topic}".

Format requirement: Return ONLY a valid JSON array of objects with NO markdown formatting, NO extra text:
[
  {
    "front": "Clear question, formula prompt, or concept identifier",
    "back": "Detailed answer with exact step-by-step formula or shortcut derivation",
    "hint": "Optional short hint (1 sentence)",
    "category": "Formula | Concept | Shortcut | Traps"
  }
]`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Generate 10-12 active recall flashcards for CAT topic: "${topic}" (${section}).` },
  ];

  try {
    const { content, provider } = await getCompletion(messages);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    const data = JSON.parse(cleaned) as GeneratedFlashcardItem[];

    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, code: "PARSE_ERROR", message: "Generated flashcards were empty" };
    }

    return { ok: true, data, provider };
  } catch (err) {
    return { ok: false, code: "GENERATION_FAILED", message: err instanceof Error ? err.message : String(err) };
  }
}

// ──────────────────────────────────────────────────────────────
// Mind Map & Visual Diagram Generation (Mermaid.js)
// ──────────────────────────────────────────────────────────────

export async function generateMindMap(
  topic: string,
  section: NoteSection,
  diagramType: DiagramType = "mindmap",
): Promise<LLMResponse<string>> {
  const exampleFormat = `graph TD
    Root["${topic}"]
    
    Root --> C1["1. Core Concepts & Definitions"]
    C1 --> N1_1["Concept 1: Definition & Frame"]
    C1 --> N1_2["Concept 2: Key Properties"]
    C1 --> N1_3["Concept 3: Essential Rules"]

    Root --> C2["2. Essential Formulas & Derivations"]
    C2 --> N2_1["Formula 1: Primary Equation"]
    C2 --> N2_2["Formula 2: Derived Shortcut"]
    C2 --> N2_3["Formula 3: Special Cases"]

    Root --> C3["3. Problem Types & Applications"]
    C3 --> N3_1["Type A: Solution Steps"]
    C3 --> N3_2["Type B: Solution Steps"]

    Root --> C4["4. CAT Traps & Speed Shortcuts"]
    C4 --> N4_1["Topper Shortcut 1"]
    C4 --> N4_2["Common Distractor Trap"]`;

  const systemPrompt = `You are an expert visual learning architect for CAT 2026 prep.
Generate a deep, highly detailed, multi-tier Mermaid.js diagram for CAT ${section} topic: "${topic}".

Requirements:
- Must follow strict multi-level \`graph TD\` hierarchy matching this structure:
${exampleFormat}
- Must have 4 main category branches off the Root.
- Under EACH main category branch, include 3 to 4 detailed subnode boxes with actual formulas, equations, rules, and CAT shortcuts.
- Output ONLY valid Mermaid.js code.
- Do NOT output markdown fences (no \`\`\`mermaid).
- Do NOT output explanations or conversational text outside the mermaid code.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Generate a deep 3-tier visual concept map and formula graph for CAT topic: "${topic}".` },
  ];

  try {
    const { content, provider } = await getCompletion(messages);
    const code = content.replace(/^```mermaid\s*|^```\s*|\s*```$/g, "").trim();

    if (!code) {
      return { ok: false, code: "EMPTY_DIAGRAM", message: "Diagram code was empty" };
    }

    return { ok: true, data: code, provider };
  } catch (err) {
    return { ok: false, code: "GENERATION_FAILED", message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generate a Mermaid diagram from existing notes content (not from scratch).
 * The LLM receives the full notes text and extracts the key structure into a diagram.
 */
export async function generateMindMapFromNotes(
  topic: string,
  section: NoteSection,
  notesContent: string,
  diagramType: DiagramType = "mindmap",
): Promise<LLMResponse<string>> {
  const truncated = notesContent.slice(0, 28000);

  const exampleFormat = `graph TD
    Root["${topic}"]
    
    Root --> C1["1. Core Concepts"]
    C1 --> N1_1["Concept A: Definition & Key Properties"]
    C1 --> N1_2["Concept B: Definition & Key Properties"]

    Root --> C2["2. Formulas & Derivations"]
    C2 --> N2_1["Formula 1: Primary Equation"]
    C2 --> N2_2["Formula 2: Derived Variant"]

    Root --> C3["3. Problem Types"]
    C3 --> N3_1["Type A: Step-by-Step Approach"]
    C3 --> N3_2["Type B: Step-by-Step Approach"]

    Root --> C4["4. Speed Shortcuts & Traps"]
    C4 --> N4_1["Topper Shortcut 1"]
    C4 --> N4_2["Common Trap"]`;

  const systemPrompt = `You are an expert visual learning architect.
Read the following detailed CAT 2026 study notes for topic "${topic}" (${section}) and generate a structured Mermaid.js diagram that faithfully represents the notes.

Requirements:
- Must follow \`graph TD\` hierarchy with 4 main category branches.
- Extract concepts, formulas, problem types, and traps FROM the provided notes — use the exact formulas, numbers, and trap names that appear in the notes. Do NOT invent generic placeholders.
- Each branch must have 3–4 subnodes with real content pulled verbatim from the notes (e.g. actual equations like "S = D/T", named traps from the trap file, named speed techniques).
- Node labels must be specific enough that a student revising from the diagram alone recalls the note content.
- Output ONLY valid Mermaid.js code (no markdown fences, no explanations).`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Here are the detailed CAT ${section} notes for "${topic}":\n\n${truncated}...\n\nGenerate a structured Mermaid.js diagram from these notes.`,
    },
  ];

  try {
    const { content, provider } = await getCompletion(messages);
    const code = content.replace(/^```mermaid\s*|^```\s*|\s*```$/g, "").trim();
    if (!code) return { ok: false, code: "EMPTY_DIAGRAM", message: "Diagram code was empty" };
    return { ok: true, data: code, provider };
  } catch (err) {
    return { ok: false, code: "GENERATION_FAILED", message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generate flashcards from existing notes content (not from scratch).
 */
export async function generateFlashcardsFromNotes(
  topic: string,
  section: NoteSection,
  notesContent: string,
): Promise<LLMResponse<GeneratedFlashcardItem[]>> {
  const truncated = notesContent.slice(0, 28000);

  const systemPrompt = `You are an active recall expert tutor for CAT 2026 prep.
Read the following detailed study notes for topic "${topic}" (${section}) and generate 12–15 high-yield flashcards extracted DIRECTLY from the notes.

Extraction rules:
- Every card must trace back to specific content in the notes — exact formulas, named traps, named speed techniques, key table values, and insights from worked examples. No generic textbook cards.
- Cover the spread: core formulas (with the derivation from the notes), each named trap from the trap file, each speed technique with its trigger condition, and the golden rules from the cheat sheet.
- Front = a recall prompt (question / "when do you use X?" / "what's the trap in Y?").
- Back = the precise answer as written in the notes, including the formula in backticks.

Format: Return ONLY a valid JSON array of objects with NO markdown:
[
  {
    "front": "Question or concept prompt from the notes",
    "back": "Detailed answer from the notes with formulas or step-by-step derivation",
    "hint": "Optional short hint (1 sentence)",
    "category": "Formula | Concept | Shortcut | Traps"
  }
]`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Study notes for CAT topic "${topic}" (${section}):\n\n${truncated}...\n\nGenerate 12–15 active recall flashcards from these notes.`,
    },
  ];

  try {
    const { content, provider } = await getCompletion(messages);
    const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
    const data = JSON.parse(cleaned) as GeneratedFlashcardItem[];
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, code: "PARSE_ERROR", message: "Generated flashcards were empty" };
    }
    return { ok: true, data, provider };
  } catch (err) {
    return { ok: false, code: "GENERATION_FAILED", message: err instanceof Error ? err.message : String(err) };
  }
}

// ──────────────────────────────────────────────────────────────
// Handwritten Notes Generation
// ──────────────────────────────────────────────────────────────

const HW_NOTES_JSON_SCHEMA = `{
  "title": "TOPIC NAME IN CAPS",
  "subtitle": "CAT Quant / DILR / VARC — Subtopic",
  "pages": [
    {
      "basicsSummary": "1-2 sentence core definition or summary of the topic",
      "basics": [
        { "heading": "Sum of angles", "body": "180°" },
        { "heading": "Triangle inequality", "body": "a + b > c, b + c > a, c + a > b" }
      ],
      "notationBox": [
        "Side opposite ∠A → a",
        "Side opposite ∠B → b",
        "Side opposite ∠C → c"
      ],
      "typesBox": [
        { "name": "Equilateral", "desc": "All sides equal (60°,60°,60°)" },
        { "name": "Isosceles", "desc": "Two sides equal" },
        { "name": "Right angled", "desc": "One angle = 90°" }
      ],
      "theorems": [
        {
          "num": 1,
          "title": "Exterior Angle Theorem",
          "body": "Exterior angle = Sum of two interior opposite angles.",
          "diagramType": "triangle_exterior"
        },
        {
          "num": 2,
          "title": "Pythagoras Theorem (Right Δ)",
          "body": "(Hypotenuse)² = (Base)² + (Perpendicular)², i.e., c² = a² + b²",
          "diagramType": "pythagoras"
        },
        {
          "num": 3,
          "title": "Angle Bisector Theorem",
          "body": "AD bisects ∠A → BD/DC = AB/AC",
          "diagramType": "bisector"
        }
      ],
      "formulas": [
        { "label": "Area", "formula": "½ × base × height" },
        { "label": "Heron's Formula", "formula": "Area = √(s(s-a)(s-b)(s-c))", "subtext": "where s = (a+b+c)/2" }
      ],
      "results": [
        "In any triangle, larger side is opposite larger angle.",
        "Centroid divides median in ratio 2:1.",
        "Inradius (r) = Area / s",
        "Circumradius (R) in right Δ = Hypotenuse / 2"
      ],
      "shortcuts": [
        "For right Δ check: If (largest side)² ≈ sum of squares → Right Δ",
        "Equilateral Δ: Height = (√3/2)a, Area = (√3/4)a²",
        "Remember: √2 ≈ 1.414, √3 ≈ 1.732"
      ],
      "traps": [
        "Don't confuse area ratio with side ratio. Side ratio k → Area ratio k².",
        "Assuming 2 sides equal ⇒ angles equal (NOT always).",
        "Using Pythagoras in non-right Δ."
      ],
      "examples": [
        { "q": "If sides are 3, 4, 5, what is the area?", "method": "3² + 4² = 5² ⇒ Right triangle with legs 3 & 4. Area = ½ × 3 × 4", "answer": "6" }
      ],
      "revision": [
        "Angle sum = 180°",
        "Pythagoras for right Δ",
        "Area (Heron's) = √(s(s-a)(s-b)(s-c))"
      ],
      "motivationalQuote": "Consistent Practice Beats Talent! 😊",
      "footerBanner": "Practice + Concept Clarity + Smart Approach = 99+ Percentile in CAT! 🔥"
    }
  ]
}`;

/** Used when no existing notes are available — generates from general knowledge */
const HW_FROM_SCRATCH_SYSTEM = `You are an elite CAT 2026 preparation tutor who creates ultra-high-density, visually structured handwritten study notes.
Given a topic, generate a complete structured JSON object for handwritten revision notes.

The output must be ONLY a valid JSON object with this exact shape (no markdown fences, no extra text):
${HW_NOTES_JSON_SCHEMA}

Rules:
- Fill all fields (basics, notationBox, typesBox, theorems, formulas, results, shortcuts, traps, examples, revision, motivationalQuote, footerBanner).
- Use valid diagramType values when applicable: "triangle_basic", "triangle_exterior", "pythagoras", "bisector", "proportionality", "circle", "coordinate", "none".
- Keep every text string concise and bullet-ready, optimized for quick scanning and visual memory.
- Every formula must be mathematically precise.
- Return ONLY the JSON object.`;

/** Used when the user has existing detailed notes — distills them faithfully */
const HW_FROM_NOTES_SYSTEM = `You are an elite CAT 2026 preparation tutor who distills detailed study notes into ultra-high-density, visually structured handwritten revision notes.

You will receive detailed study notes for a topic. Your job is to extract and condense the most important information into a structured JSON object for handwritten revision notes.

CRITICAL RULES:
- Extract ALL formulas, theorems, shortcuts, traps, results verbatim from the provided notes.
- Populate all sections (basics, notationBox, typesBox, theorems, formulas, results, shortcuts, traps, examples, revision).
- Assign appropriate diagramType values where relevant ("triangle_basic", "triangle_exterior", "pythagoras", "bisector", "proportionality", "circle", "coordinate", "none").
- The provided notes are the SINGLE SOURCE OF TRUTH.

The output must be ONLY a valid JSON object with this exact shape (no markdown fences, no extra text):
${HW_NOTES_JSON_SCHEMA}

Rules:
- Return ONLY the JSON object.`;

/**
 * Generate handwritten revision notes for a CAT topic.
 * If existingNotesContent is provided (from the notes table), distills those notes.
 * Otherwise generates from scratch using general CAT knowledge.
 */
export async function generateHandwrittenNotes(
  topic: string,
  section: string,
  existingNotesContent?: string,
): Promise<LLMResponse<HandwrittenNoteContent>> {
  const usingExistingNotes = !!existingNotesContent && existingNotesContent.trim().length > 100;
  const truncatedNotes = usingExistingNotes ? existingNotesContent!.slice(0, 28000) : null;

  const messages: ChatMessage[] = usingExistingNotes
    ? [
        { role: "system", content: HW_FROM_NOTES_SYSTEM },
        {
          role: "user",
          content: `Here are my detailed study notes for "${topic}" (${section}):\n\n${truncatedNotes}\n\nNow distill these into premium handwritten revision notes following the JSON schema exactly. Use ONLY what is in my notes — extract every formula, shortcut, trap, and key concept from there.`,
        },
      ]
    : [
        { role: "system", content: HW_FROM_SCRATCH_SYSTEM },
        {
          role: "user",
          content: `Generate premium handwritten CAT revision notes for the topic: "${topic}" (Section: ${section}). Follow the JSON schema exactly.`,
        },
      ];

  try {
    const { content, provider } = await getCompletion(messages);
    const cleaned = content.replace(/^```json\s*|^```\s*|\s*```$/g, "").trim();
    const data = JSON.parse(cleaned) as HandwrittenNoteContent;

    if (!data.title || !Array.isArray(data.pages) || data.pages.length === 0) {
      return { ok: false, code: "PARSE_ERROR", message: "Invalid handwritten notes structure from LLM" };
    }

    return { ok: true, data, provider };
  } catch (err) {
    return {
      ok: false,
      code: "GENERATION_FAILED",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
