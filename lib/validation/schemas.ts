/**
 * Shikhar — Zod validation schemas
 * Shared between client (react-hook-form) and API routes.
 * Single source of truth — never re-implement validation inline.
 */

import { z } from "zod";

// ──────────────────────────────────────────────────────────────
// Tasks
// ──────────────────────────────────────────────────────────────

export const sectionSchema = z.enum(["QA", "DILR", "VARC", "MOCK", "REVIEW"]);
export const noteSectionSchema = z.enum(["QA", "DILR", "VARC"]);

export const taskToggleSchema = z.object({
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const bulkTaskToggleSchema = z.object({
  taskIds: z.array(z.string()),
  completed: z.boolean(),
});

export const taskCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  section: sectionSchema,
  title: z.string().min(1).max(200),
  scheduledTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "scheduledTime must be HH:mm")
    .nullable()
    .optional(),
  durationMinutes: z.number().int().min(1).max(480).nullable().optional(),
});

// ──────────────────────────────────────────────────────────────
// Mock scores
// ──────────────────────────────────────────────────────────────

const percentile = z.number().min(0).max(100);
const score = z.number().min(0).max(300);

export const mockScoreCreateSchema = z.object({
  mockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mockName: z.string().min(1).max(100),
  totalScore: score,
  overallPercentile: percentile,
  varcScore: score,
  varcPercentile: percentile,
  dilrScore: score,
  dilrPercentile: percentile,
  qaScore: score,
  qaPercentile: percentile,
  notes: z.string().max(2000).nullable().optional(),
});

// ──────────────────────────────────────────────────────────────
// Notes
// ──────────────────────────────────────────────────────────────

export const noteGenerateSchema = z.object({
  topic: z.string().min(2).max(150),
  section: noteSectionSchema,
});

// ──────────────────────────────────────────────────────────────
// Tutor
// ──────────────────────────────────────────────────────────────

export const tutorMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  threadDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ──────────────────────────────────────────────────────────────
// Push subscriptions
// ──────────────────────────────────────────────────────────────

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

// ──────────────────────────────────────────────────────────────
// Cron — verifies CRON_SECRET header
// ──────────────────────────────────────────────────────────────

export function verifyCronSecret(headerValue: string | null): boolean {
  if (!process.env.CRON_SECRET || !headerValue) return false;
  return headerValue === process.env.CRON_SECRET;
}

// ──────────────────────────────────────────────────────────────
// In-memory rate limiter (per TRD: simple, single-instance)
// Used on /api/tutor and /api/notes/generate to avoid burning LLM quota.
// ──────────────────────────────────────────────────────────────

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request is allowed; false if rate-limited.
 * Limits: `max` calls per `windowMs` per identifier (e.g. user id).
 */
export function rateLimit(
  identifier: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const existing = buckets.get(identifier);
  if (!existing || existing.resetAt < now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= max) return false;
  existing.count += 1;
  return true;
}
