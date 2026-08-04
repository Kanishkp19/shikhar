import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind class merge — combines clsx + tailwind-merge so we can
 * compose variant strings without later classes clobbering earlier ones
 * unintentionally.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date as "Mon, 5 Aug" — used in dashboard cards and lists.
 */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Format an ISO timestamp as "HH:mm" — used for task scheduled times.
 */
export function formatTime(iso: string | null): string {
  if (!iso) return "Anytime";
  // scheduledTime is stored as "HH:mm" — return as-is for display
  if (/^\d{2}:\d{2}$/.test(iso)) {
    const [h, m] = iso.split(":");
    const hour = parseInt(h ?? "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:${m ?? "00"} ${ampm}`;
  }
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Today's date as `YYYY-MM-DD` in user's local timezone (IST assumed).
 * Stored tasks use the same format for `date` so equality works.
 */
export function todayISODate(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().split("T")[0]!;
}

/**
 * Returns the Monday of the week containing `iso` — used for `publishedWeekOf`.
 */
export function mondayOfWeek(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0]!;
}

/**
 * Group a list by a key — used for grouping tasks by section / time.
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = keyFn(item);
      (acc[k] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
