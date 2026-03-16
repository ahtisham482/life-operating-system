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
