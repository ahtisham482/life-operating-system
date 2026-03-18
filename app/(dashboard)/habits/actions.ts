"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMirrorSignal } from "@/lib/mirror/signals";
import type { ScheduleType, HabitLogStatus } from "@/lib/db/schema";

// ─────────────────────────────────────────
// HABIT CRUD
// ─────────────────────────────────────────

export async function createHabit(
  name: string,
  emoji: string | null,
  groupId: string | null,
  scheduleType: ScheduleType,
  scheduleDays: number[]
) {
  const supabase = await createClient();

  // Get next sort_order for this group
  const { data: existing } = await supabase
    .from("habits")
    .select("sort_order")
    .eq("group_id", groupId ?? "")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from("habits").insert({
    name,
    emoji: emoji || null,
    group_id: groupId,
    schedule_type: scheduleType,
    schedule_days: scheduleDays,
    sort_order: nextSort,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function updateHabit(
  id: string,
  fields: {
    name?: string;
    emoji?: string | null;
    groupId?: string | null;
    scheduleType?: ScheduleType;
    scheduleDays?: number[];
    sortOrder?: number;
  }
) {
  const supabase = await createClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.emoji !== undefined) update.emoji = fields.emoji;
  if (fields.groupId !== undefined) update.group_id = fields.groupId;
  if (fields.scheduleType !== undefined) update.schedule_type = fields.scheduleType;
  if (fields.scheduleDays !== undefined) update.schedule_days = fields.scheduleDays;
  if (fields.sortOrder !== undefined) update.sort_order = fields.sortOrder;

  const { error } = await supabase.from("habits").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function archiveHabit(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function unarchiveHabit(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function reorderHabits(orderedIds: string[]) {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("habits")
      .update({ sort_order: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// HABIT GROUP CRUD
// ─────────────────────────────────────────

export async function createHabitGroup(
  name: string,
  emoji: string | null,
  timeOfDay: "morning" | "afternoon" | "evening" | "anytime"
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("habit_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from("habit_groups").insert({
    name,
    emoji: emoji || null,
    time_of_day: timeOfDay,
    sort_order: nextSort,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function updateHabitGroup(
  id: string,
  fields: {
    name?: string;
    emoji?: string | null;
    timeOfDay?: "morning" | "afternoon" | "evening" | "anytime";
  }
) {
  const supabase = await createClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.emoji !== undefined) update.emoji = fields.emoji;
  if (fields.timeOfDay !== undefined) update.time_of_day = fields.timeOfDay;

  const { error } = await supabase.from("habit_groups").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function deleteHabitGroup(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("habit_groups").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function reorderHabitGroups(orderedIds: string[]) {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("habit_groups")
      .update({ sort_order: i })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// TOGGLE HABIT LOG (primary action)
// ─────────────────────────────────────────

export async function toggleHabitLog(
  habitId: string,
  date: string,
  newStatus: HabitLogStatus
) {
  const supabase = await createClient();

  // Upsert the log entry
  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      date,
      status: newStatus,
    },
    { onConflict: "habit_id,date" }
  );
  if (error) throw new Error(error.message);

  // Recompute streak for this habit
  await recomputeStreak(habitId);

  // Fire Mirror AI signal with today's summary
  const { data: summary } = await supabase
    .from("habit_completion_summary")
    .select("*")
    .eq("date", date)
    .limit(1);

  const row = summary?.[0];
  logMirrorSignal({
    type: "habit",
    context: {
      completion_rate: row?.completion_rate ?? 0,
      habits_done: row?.habits_completed ?? 0,
      total_habits: row?.habits_total ?? 0,
    },
  });

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

// ─────────────────────────────────────────
// STREAK COMPUTATION
// ─────────────────────────────────────────

/**
 * Recompute current_streak and best_streak for a habit.
 *
 * Algorithm (from plan):
 * - Walk backwards through scheduled days from today
 * - completed → streak++, reset grace
 * - skipped → ignore (safe, doesn't affect streak)
 * - missed/no-log → if grace not used, use grace; else break
 * - Grace resets after each completion
 */
async function recomputeStreak(habitId: string) {
  const supabase = await createClient();

  // Get the habit's schedule
  const { data: habitRow } = await supabase
    .from("habits")
    .select("schedule_type, schedule_days")
    .eq("id", habitId)
    .single();
  if (!habitRow) return;

  // Get logs for this habit, most recent first (up to 120 days for best streak)
  const { data: logs } = await supabase
    .from("habit_logs")
    .select("date, status")
    .eq("habit_id", habitId)
    .order("date", { ascending: false })
    .limit(400);

  const logMap = new Map<string, string>();
  for (const log of logs || []) {
    logMap.set(log.date, log.status);
  }

  const scheduledDays = getScheduledDaySet(habitRow.schedule_type, habitRow.schedule_days || []);

  // Walk backwards from today, computing current streak
  const today = new Date();
  let currentStreak = 0;
  let gracePeriodUsed = false;

  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay(); // 0=Sun..6=Sat
    const dateStr = d.toISOString().slice(0, 10);

    // Skip non-scheduled days
    if (!scheduledDays.has(dayOfWeek)) continue;

    const status = logMap.get(dateStr);

    if (status === "completed") {
      currentStreak++;
      gracePeriodUsed = false;
    } else if (status === "skipped") {
      // Skip is SAFE — doesn't count, doesn't use grace
      continue;
    } else {
      // missed, pending, or no log
      if (!gracePeriodUsed) {
        gracePeriodUsed = true;
        continue;
      } else {
        break;
      }
    }
  }

  // Compute best streak over all history
  let bestStreak = 0;
  let runStreak = 0;
  let runGraceUsed = false;

  // Walk from oldest to newest for best streak
  const sortedDates: string[] = [];
  for (let i = 399; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    if (!scheduledDays.has(dayOfWeek)) continue;
    sortedDates.push(d.toISOString().slice(0, 10));
  }

  for (const dateStr of sortedDates) {
    const status = logMap.get(dateStr);

    if (status === "completed") {
      runStreak++;
      runGraceUsed = false;
      if (runStreak > bestStreak) bestStreak = runStreak;
    } else if (status === "skipped") {
      continue;
    } else {
      if (!runGraceUsed) {
        runGraceUsed = true;
      } else {
        runStreak = 0;
        runGraceUsed = false;
      }
    }
  }

  // Also consider existing best_streak (may be from before our 400-day window)
  const { data: existingHabit } = await supabase
    .from("habits")
    .select("best_streak")
    .eq("id", habitId)
    .single();

  const finalBest = Math.max(bestStreak, existingHabit?.best_streak ?? 0);

  await supabase
    .from("habits")
    .update({ current_streak: currentStreak, best_streak: finalBest })
    .eq("id", habitId);
}

/** Returns a Set of day-of-week numbers (0=Sun..6=Sat) that this habit is scheduled for */
function getScheduledDaySet(scheduleType: string, scheduleDays: number[]): Set<number> {
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

/** Check if a habit is scheduled for a given day of week (0=Sun..6=Sat) */
export function isHabitScheduledForDay(
  scheduleType: string,
  scheduleDays: number[],
  dayOfWeek: number
): boolean {
  return getScheduledDaySet(scheduleType, scheduleDays).has(dayOfWeek);
}
