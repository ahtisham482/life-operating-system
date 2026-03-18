"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logMirrorSignal } from "@/lib/mirror/signals";
import type {
  ScheduleType,
  HabitLogStatus,
  DiagnosisType,
} from "@/lib/db/schema";
import { getScheduledDaySet } from "@/lib/habits";

// ─────────────────────────────────────────
// HABIT CRUD
// ─────────────────────────────────────────

export async function createHabit(
  name: string,
  emoji: string | null,
  groupId: string | null,
  scheduleType: ScheduleType,
  scheduleDays: number[],
  advanced?: {
    purpose?: string;
    identity?: string;
    tinyVersion?: string;
    anchorText?: string;
    habitType?: "build" | "break";
    breakTarget?: number;
  },
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get next sort_order for this group
  let nextSort = 0;
  if (groupId) {
    const { data: existing } = await supabase
      .from("habits")
      .select("sort_order")
      .eq("group_id", groupId)
      .order("sort_order", { ascending: false })
      .limit(1);
    nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
  } else {
    const { data: existing } = await supabase
      .from("habits")
      .select("sort_order")
      .is("group_id", null)
      .order("sort_order", { ascending: false })
      .limit(1);
    nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    name,
    emoji: emoji || null,
    group_id: groupId,
    schedule_type: scheduleType,
    schedule_days: scheduleDays,
    sort_order: nextSort,
  };

  // Advanced behavioral fields
  if (advanced?.purpose) insertData.purpose = advanced.purpose;
  if (advanced?.identity) insertData.identity = advanced.identity;
  if (advanced?.tinyVersion) insertData.tiny_version = advanced.tinyVersion;
  if (advanced?.anchorText) insertData.anchor_text = advanced.anchorText;
  if (advanced?.habitType) insertData.habit_type = advanced.habitType;
  if (advanced?.breakTarget) insertData.break_target = advanced.breakTarget;

  const { data, error } = await supabase
    .from("habits")
    .insert(insertData)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  return data.id;
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
    purpose?: string | null;
    identity?: string | null;
    tinyVersion?: string | null;
    anchorText?: string | null;
    habitType?: "build" | "break";
    breakTarget?: number | null;
  },
) {
  const supabase = await createClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.emoji !== undefined) update.emoji = fields.emoji;
  if (fields.groupId !== undefined) update.group_id = fields.groupId;
  if (fields.scheduleType !== undefined)
    update.schedule_type = fields.scheduleType;
  if (fields.scheduleDays !== undefined)
    update.schedule_days = fields.scheduleDays;
  if (fields.sortOrder !== undefined) update.sort_order = fields.sortOrder;
  if (fields.purpose !== undefined) update.purpose = fields.purpose;
  if (fields.identity !== undefined) update.identity = fields.identity;
  if (fields.tinyVersion !== undefined)
    update.tiny_version = fields.tinyVersion;
  if (fields.anchorText !== undefined) update.anchor_text = fields.anchorText;
  if (fields.habitType !== undefined) update.habit_type = fields.habitType;
  if (fields.breakTarget !== undefined)
    update.break_target = fields.breakTarget;

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
  timeOfDay: "morning" | "afternoon" | "evening" | "anytime",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("habit_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from("habit_groups").insert({
    user_id: user.id,
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
  },
) {
  const supabase = await createClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.emoji !== undefined) update.emoji = fields.emoji;
  if (fields.timeOfDay !== undefined) update.time_of_day = fields.timeOfDay;

  const { error } = await supabase
    .from("habit_groups")
    .update(update)
    .eq("id", id);
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
// ADOPT TEMPLATE
// ─────────────────────────────────────────

export async function adoptTemplate(
  templateId: string,
  groupId: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch template
  const { data: template, error: tErr } = await supabase
    .from("habit_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (tErr || !template) throw new Error("Template not found");

  // Convert default_schedule to ScheduleType + days
  const scheduleType = template.default_schedule as ScheduleType;
  const scheduleDays =
    scheduleType === "weekdays"
      ? [1, 2, 3, 4, 5]
      : scheduleType === "weekends"
        ? [0, 6]
        : [];

  return createHabit(
    template.name,
    template.emoji || null,
    groupId,
    scheduleType,
    scheduleDays,
    {
      purpose: template.purpose || undefined,
      tinyVersion: template.tiny_version || undefined,
      anchorText: template.anchor_text || undefined,
    },
  );
}

// ─────────────────────────────────────────
// HABIT DIAGNOSIS (B=MAP)
// ─────────────────────────────────────────

export async function submitDiagnosis(
  habitId: string,
  diagnosis: DiagnosisType,
  actionTaken?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("habit_diagnoses").insert({
    habit_id: habitId,
    user_id: user.id,
    diagnosis,
    action_taken: actionTaken || null,
  });
  if (error) throw new Error(error.message);

  // Fire Mirror AI signal
  try {
    logMirrorSignal({
      type: "habit",
      context: {
        event: `diagnosis_${diagnosis}`,
        habit_id: habitId,
        action_taken: actionTaken || null,
      },
    });
  } catch {
    // Non-critical
  }

  revalidatePath("/habits");
}

export async function dismissDiagnosis(diagnosisId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("habit_diagnoses")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", diagnosisId);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// BULK COMPLETE (Recovery "I'm back" button)
// ─────────────────────────────────────────

export async function bulkCompleteToday(habitIds: string[], date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  for (const habitId of habitIds) {
    await supabase.from("habit_logs").upsert(
      {
        habit_id: habitId,
        user_id: user.id,
        date,
        status: "completed",
      },
      { onConflict: "habit_id,date" },
    );
  }

  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

// ─────────────────────────────────────────
// TOGGLE HABIT LOG (primary action)
// ─────────────────────────────────────────

export async function toggleHabitLog(
  habitId: string,
  date: string,
  newStatus: HabitLogStatus,
  note?: string | null,
): Promise<{ currentStreak: number; bestStreak: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Step 1: Upsert the log entry — THIS is the critical save
  const { error } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      user_id: user.id,
      date,
      status: newStatus,
      note: note ?? null,
    },
    { onConflict: "habit_id,date" },
  );
  if (error) throw new Error(error.message);

  // Step 2: Post-save operations (non-blocking — failures here don't affect the save)
  let currentStreak = 0;
  let bestStreak = 0;
  try {
    await recomputeStreak(supabase, habitId);
    const { data: updatedHabit } = await supabase
      .from("habits")
      .select("current_streak, best_streak")
      .eq("id", habitId)
      .single();
    currentStreak = updatedHabit?.current_streak ?? 0;
    bestStreak = updatedHabit?.best_streak ?? 0;
  } catch {
    // Streak recomputation failed — not critical, log silently
    console.error("Streak recomputation failed for habit", habitId);
  }

  // Step 3: Fire Mirror AI signal (non-blocking)
  try {
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
  } catch {
    // Mirror signal failed — not critical
    console.error("Mirror signal failed for habit log");
  }

  revalidatePath("/habits");
  revalidatePath("/dashboard");
  return { currentStreak, bestStreak };
}

// ─────────────────────────────────────────
// STREAK COMPUTATION
// ─────────────────────────────────────────

/**
 * Recompute current_streak and best_streak for a habit.
 *
 * Algorithm:
 * - Walk backwards through scheduled days from today
 * - completed → streak++, reset grace
 * - skipped → ignore (safe, doesn't affect streak)
 * - missed/no-log → if grace not used, use grace; else break
 * - Grace resets after each completion
 */
async function recomputeStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
  habitId: string,
) {
  // Get the habit's schedule
  const { data: habitRow } = await supabase
    .from("habits")
    .select("schedule_type, schedule_days")
    .eq("id", habitId)
    .single();
  if (!habitRow) return;

  // Get logs for this habit, most recent first
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

  const scheduledDays = getScheduledDaySet(
    habitRow.schedule_type,
    habitRow.schedule_days || [],
  );

  // Walk backwards from today, computing current streak
  const today = new Date();
  let currentStreak = 0;
  let gracePeriodUsed = false;

  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().slice(0, 10);

    if (!scheduledDays.has(dayOfWeek)) continue;

    const status = logMap.get(dateStr);

    if (status === "completed") {
      currentStreak++;
      gracePeriodUsed = false;
    } else if (status === "skipped") {
      continue;
    } else {
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

  // Preserve existing best_streak if higher
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
