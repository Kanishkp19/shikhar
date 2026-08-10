/**
 * Shikhar — shared TypeScript interfaces
 * Mirrors the database schema in `supabase/migrations/0001_init.sql`.
 * Source of truth for both client and server code.
 */

export type Section = "QA" | "DILR" | "VARC" | "MOCK" | "REVIEW";
export type NoteSection = "QA" | "DILR" | "VARC";
export type LLMProvider = "gemini-2.5-flash" | "deepseek-chat";
export type ChatRole = "user" | "assistant";

export interface Task {
  id: string;
  userId: string;
  date: string; // ISO date, e.g. "2026-08-05"
  section: Section;
  title: string;
  scheduledTime: string | null; // "HH:mm" or null for "anytime"
  durationMinutes: number | null;
  completed: boolean;
  completedAt: string | null; // ISO timestamp
  createdAt: string;
}

export interface MockScore {
  id: string;
  userId: string;
  mockDate: string; // ISO date
  mockName: string; // e.g. "SimCAT 12"
  totalScore: number;
  overallPercentile: number;
  varcScore: number;
  varcPercentile: number;
  dilrScore: number;
  dilrPercentile: number;
  qaScore: number;
  qaPercentile: number;
  notes: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  topic: string;
  section: NoteSection;
  content: string; // markdown
  version: number; // increments on regenerate, never overwrites
  generatedBy: LLMProvider;
  createdAt: string;
}

export interface TutorMessage {
  id: string;
  userId: string;
  threadDate: string; // groups messages by day
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedWeekOf: string; // ISO date, Monday of the digest week
  createdAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────
// API envelope — uniform response shape across all routes
// ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ──────────────────────────────────────────────────────────────
// Streak / progress aggregates
// ──────────────────────────────────────────────────────────────

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  todayCompleted: number;
  todayTotal: number;
}

export interface SectionStrength {
  section: NoteSection;
  averagePercentile: number;
  mockCount: number;
  flagged: boolean; // true if average below 80
}

// ──────────────────────────────────────────────────────────────
// Study Materials — Flashcards, Mind Maps & Visual Diagrams
// ──────────────────────────────────────────────────────────────

export type SRSStatus = "new" | "learning" | "mastered";
export type DiagramType = "mindmap" | "graph" | "sequence" | "pie";

export interface Flashcard {
  id: string;
  deckId: string;
  userId: string;
  front: string;
  back: string;
  hint?: string;
  category?: string;
  masteryLevel: SRSStatus;
  lastReviewedAt?: string | null;
  createdAt: string;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  topic: string;
  section: NoteSection;
  cardCount: number;
  cards?: Flashcard[];
  createdAt: string;
}

export interface MindMap {
  id: string;
  userId: string;
  topic: string;
  section: NoteSection;
  diagramType: DiagramType;
  mermaidCode: string;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────
// Handwritten Notes
// ──────────────────────────────────────────────────────────────

export interface HandwrittenNoteConcept {
  heading: string;
  body: string;
  highlight?: string;
}

export interface HandwrittenNoteFormula {
  label: string;
  formula: string;
  subtext?: string;
}

export interface HandwrittenNoteExample {
  q: string;
  method: string;
  answer: string;
}

export interface HandwrittenNoteTheorem {
  num?: number;
  title: string;
  body: string;
  formula?: string;
  diagramType?: "triangle_basic" | "triangle_exterior" | "pythagoras" | "bisector" | "proportionality" | "circle" | "coordinate" | "none";
}

export interface HandwrittenNotePage {
  pageNo?: number;
  dateStr?: string;
  subjectTag?: string;
  basicsSummary?: string;
  basics: HandwrittenNoteConcept[];
  basicsDiagramType?: "triangle_basic" | "triangle_exterior" | "pythagoras" | "bisector" | "proportionality" | "circle" | "coordinate" | "none";
  notationBox?: string[];
  typesBox?: { name: string; desc: string }[];
  theorems?: HandwrittenNoteTheorem[];
  formulas: HandwrittenNoteFormula[];
  results?: string[];
  shortcuts: string[];
  traps: string[];
  examples: HandwrittenNoteExample[];
  memory?: string;
  revision: string[];
  motivationalQuote?: string;
  footerBanner?: string;
}

export interface HandwrittenNoteContent {
  title: string;
  subtitle: string;
  pages: HandwrittenNotePage[];
}

export interface HandwrittenNote {
  id: string;
  userId: string;
  topic: string;
  section: string;
  contentJson: HandwrittenNoteContent;
  createdAt: string;
}
