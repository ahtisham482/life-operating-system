/**
 * Check if a habit is scheduled for a given day of the week.
 * Extracted to a shared utility because "use server" files
 * cannot export non-async functions.
 *
 * @param scheduleType - 'daily' | 'weekdays' | 'weekends' | 'custom'
 * @param scheduleDays - Array of day numbers (0=Sun, 6=Sat) for custom schedules
 * @param dayOfWeek - The day to check (0=Sun, 6=Sat)
 */
export function isHabitScheduledForDay(
  scheduleType: string,
  scheduleDays: number[],
  dayOfWeek: number
): boolean {
  switch (scheduleType) {
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekends":
      return dayOfWeek === 0 || dayOfWeek === 6;
    case "custom":
      return (scheduleDays || []).includes(dayOfWeek);
    default:
      return true;
  }
}

/** Returns a Set of day-of-week numbers that this habit is scheduled for */
export function getScheduledDaySet(
  scheduleType: string,
  scheduleDays: number[]
): Set<number> {
  switch (scheduleType) {
    case "daily":
      return new Set([0, 1, 2, 3, 4, 5, 6]);
    case "weekdays":
      return new Set([1, 2, 3, 4, 5]);
    case "weekends":
      return new Set([0, 6]);
    case "custom":
      return new Set(scheduleDays);
    default:
      return new Set([0, 1, 2, 3, 4, 5, 6]);
  }
}
