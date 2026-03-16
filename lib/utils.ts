import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns today's date as YYYY-MM-DD in Asia/Karachi timezone */
export function getTodayKarachi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Returns full date label e.g. "Monday, March 16, 2026" */
export function getDateLabelKarachi(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

/** Days between two YYYY-MM-DD strings (positive = dateStr is in the past) */
export function daysBetween(dateStr: string, today: string): number {
  const diff = new Date(today).getTime() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Convert a snake_case DB row (from Supabase) to camelCase TypeScript object.
 * e.g. { task_name: "x" } → { taskName: "x" }
 */
export function fromDb<T = Record<string, unknown>>(
  row: Record<string, unknown>
): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ])
  ) as T;
}

/**
 * Convert a camelCase object to snake_case for Supabase inserts/updates.
 * Undefined values are omitted automatically.
 */
export function toDb(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [
        k.replace(/([A-Z])/g, (_, c: string) => `_${c.toLowerCase()}`),
        v,
      ])
  );
}
