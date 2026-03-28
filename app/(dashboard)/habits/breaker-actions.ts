"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb, getTodayKarachi } from "@/lib/utils";
import {
  type BadHabit,
  type UrgeLog,
  type ReframeItem,
  type DefenseAction,
  calculateDefenseStrength,
  getDefaultDefenseActions,
  getDefaultReframes,
  analyzeUrges,
} from "@/lib/breaker";

// ─────────────────────────────────────────
// AUTH HELPER
// ─────────────────────────────────────────

async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

// ─────────────────────────────────────────
// BAD HABITS
// ─────────────────────────────────────────

export async function createBadHabit(data: {
  habitName: string;
  antiIdentity?: string;
  frequencyEstimate?: string;
  underlyingNeeds?: string[];
  replacementDescription?: string;
  triggersTime?: string[];
  triggersLocation?: string[];
  triggersEmotion?: string[];
  triggersAction?: string[];
  dailyHoursEstimate?: number;
  hourlyValue?: number;
}): Promise<BadHabit> {
  const { supabase, user } = await getAuthedClient();

  const defenseLayers = getDefaultDefenseActions(data.habitName);
  const defenseStrength = calculateDefenseStrength(defenseLayers);

  const insertData = toDb({
    userId: user.id,
    habitName: data.habitName,
    antiIdentity: data.antiIdentity || undefined,
    frequencyEstimate: data.frequencyEstimate || undefined,
    underlyingNeeds: data.underlyingNeeds || [],
    replacementDescription: data.replacementDescription || undefined,
    triggersTime: data.triggersTime || [],
    triggersLocation: data.triggersLocation || [],
    triggersEmotion: data.triggersEmotion || [],
    triggersAction: data.triggersAction || [],
    dailyHoursEstimate: data.dailyHoursEstimate || undefined,
    hourlyValue: data.hourlyValue || undefined,
    defenseLayer1: defenseLayers[0],
    defenseLayer2: defenseLayers[1],
    defenseLayer3: defenseLayers[2],
    defenseLayer4: defenseLayers[3],
    defenseStrength,
    currentCleanStreak: 0,
    bestCleanStreak: 0,
    totalUrgesResisted: 0,
    totalSlips: 0,
    resistanceRate: 0,
    isActive: true,
  });

  const { data: row, error } = await supabase
    .from("bad_habits")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<BadHabit>(row);
}

export async function getBadHabits(): Promise<BadHabit[]> {
  const { supabase, user } = await getAuthedClient();

  const { data: rows, error } = await supabase
    .from("bad_habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (rows ?? []).map((r) => fromDb<BadHabit>(r));
}

export async function deleteBadHabit(id: string): Promise<void> {
  const { supabase, user } = await getAuthedClient();

  const { error } = await supabase
    .from("bad_habits")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function updateDefenseAction(
  badHabitId: string,
  layerNumber: 1 | 2 | 3 | 4,
  actionIndex: number,
  completed: boolean,
): Promise<BadHabit> {
  const { supabase, user } = await getAuthedClient();

  // Get current habit
  const { data: row, error: fetchErr } = await supabase
    .from("bad_habits")
    .select("*")
    .eq("id", badHabitId)
    .eq("user_id", user.id)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  const habit = fromDb<BadHabit>(row);
  const layerKey = `defenseLayer${layerNumber}` as
    | "defenseLayer1"
    | "defenseLayer2"
    | "defenseLayer3"
    | "defenseLayer4";
  const layer = [...habit[layerKey]];

  if (actionIndex < 0 || actionIndex >= layer.length) {
    throw new Error("Invalid action index");
  }

  layer[actionIndex] = { ...layer[actionIndex], completed };

  const updatedLayers = [
    layerNumber === 1 ? layer : habit.defenseLayer1,
    layerNumber === 2 ? layer : habit.defenseLayer2,
    layerNumber === 3 ? layer : habit.defenseLayer3,
    layerNumber === 4 ? layer : habit.defenseLayer4,
  ];
  const defenseStrength = calculateDefenseStrength(updatedLayers);

  const dbLayerKey = `defense_layer_${layerNumber}`;
  const { data: updated, error: updateErr } = await supabase
    .from("bad_habits")
    .update({
      [dbLayerKey]: layer,
      defense_strength: defenseStrength,
    })
    .eq("id", badHabitId)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (updateErr) throw new Error(updateErr.message);

  revalidatePath("/habits");
  return fromDb<BadHabit>(updated);
}

export async function addDefenseAction(
  badHabitId: string,
  layerNumber: 1 | 2 | 3 | 4,
  action: string,
): Promise<BadHabit> {
  const { supabase, user } = await getAuthedClient();

  const { data: row, error: fetchErr } = await supabase
    .from("bad_habits")
    .select("*")
    .eq("id", badHabitId)
    .eq("user_id", user.id)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  const habit = fromDb<BadHabit>(row);
  const layerKey = `defenseLayer${layerNumber}` as
    | "defenseLayer1"
    | "defenseLayer2"
    | "defenseLayer3"
    | "defenseLayer4";
  const layer = [...habit[layerKey], { action, completed: false }];

  const updatedLayers = [
    layerNumber === 1 ? layer : habit.defenseLayer1,
    layerNumber === 2 ? layer : habit.defenseLayer2,
    layerNumber === 3 ? layer : habit.defenseLayer3,
    layerNumber === 4 ? layer : habit.defenseLayer4,
  ];
  const defenseStrength = calculateDefenseStrength(updatedLayers);

  const dbLayerKey = `defense_layer_${layerNumber}`;
  const { data: updated, error: updateErr } = await supabase
    .from("bad_habits")
    .update({
      [dbLayerKey]: layer,
      defense_strength: defenseStrength,
    })
    .eq("id", badHabitId)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (updateErr) throw new Error(updateErr.message);

  revalidatePath("/habits");
  return fromDb<BadHabit>(updated);
}

// ─────────────────────────────────────────
// URGE LOGGING
// ─────────────────────────────────────────

export async function logUrge(data: {
  badHabitId: string;
  result: "resisted" | "slipped" | "surfed";
  triggerType?: string;
  triggerLocation?: string;
  urgeIntensity?: number;
  usedReplacement?: boolean;
  slipDurationMinutes?: number;
  failedDefenseLayer?: number;
  postFeeling?: string;
  note?: string;
}): Promise<UrgeLog> {
  const { supabase, user } = await getAuthedClient();
  const today = getTodayKarachi();
  const now = new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Karachi",
    hour12: false,
  });

  // Insert urge log
  const insertData = toDb({
    badHabitId: data.badHabitId,
    userId: user.id,
    logDate: today,
    logTime: now,
    result: data.result,
    triggerType: data.triggerType || undefined,
    triggerLocation: data.triggerLocation || undefined,
    urgeIntensity: data.urgeIntensity || undefined,
    usedReplacement: data.usedReplacement ?? false,
    slipDurationMinutes: data.slipDurationMinutes || undefined,
    failedDefenseLayer: data.failedDefenseLayer || undefined,
    postFeeling: data.postFeeling || undefined,
    note: data.note || undefined,
  });

  const { data: logRow, error: logErr } = await supabase
    .from("urge_logs")
    .insert(insertData)
    .select("*")
    .single();
  if (logErr) throw new Error(logErr.message);

  // Update bad_habit stats
  const { data: habitRow, error: habitErr } = await supabase
    .from("bad_habits")
    .select("*")
    .eq("id", data.badHabitId)
    .eq("user_id", user.id)
    .single();
  if (habitErr) throw new Error(habitErr.message);

  const habit = fromDb<BadHabit>(habitRow);

  let totalUrgesResisted = habit.totalUrgesResisted;
  let totalSlips = habit.totalSlips;
  let currentCleanStreak = habit.currentCleanStreak;
  let bestCleanStreak = habit.bestCleanStreak;

  if (data.result === "resisted" || data.result === "surfed") {
    totalUrgesResisted++;
  } else {
    totalSlips++;
  }

  const resistanceRate =
    totalUrgesResisted + totalSlips > 0
      ? Math.round((totalUrgesResisted / (totalUrgesResisted + totalSlips)) * 100)
      : 0;

  // Check clean streak
  if (data.result === "slipped") {
    // Check if this is the first slip today
    const { count } = await supabase
      .from("urge_logs")
      .select("id", { count: "exact", head: true })
      .eq("bad_habit_id", data.badHabitId)
      .eq("user_id", user.id)
      .eq("log_date", today)
      .eq("result", "slipped")
      .neq("id", logRow.id);

    if ((count ?? 0) === 0) {
      // First slip today — reset streak
      if (currentCleanStreak > bestCleanStreak) {
        bestCleanStreak = currentCleanStreak;
      }
      currentCleanStreak = 0;
    }
  } else {
    // Check if today has any slips at all
    const { count } = await supabase
      .from("urge_logs")
      .select("id", { count: "exact", head: true })
      .eq("bad_habit_id", data.badHabitId)
      .eq("user_id", user.id)
      .eq("log_date", today)
      .eq("result", "slipped");

    if ((count ?? 0) === 0) {
      // No slips today — increment streak (only once per day logic can be refined)
      // We increment on first resisted/surfed of day with no slips
      const { count: resistedToday } = await supabase
        .from("urge_logs")
        .select("id", { count: "exact", head: true })
        .eq("bad_habit_id", data.badHabitId)
        .eq("user_id", user.id)
        .eq("log_date", today)
        .in("result", ["resisted", "surfed"])
        .neq("id", logRow.id);

      if ((resistedToday ?? 0) === 0) {
        // First resisted/surfed log today with no slips — increment
        currentCleanStreak++;
        if (currentCleanStreak > bestCleanStreak) {
          bestCleanStreak = currentCleanStreak;
        }
      }
    }
  }

  const { error: updateErr } = await supabase
    .from("bad_habits")
    .update(
      toDb({
        totalUrgesResisted,
        totalSlips,
        resistanceRate,
        currentCleanStreak,
        bestCleanStreak,
      }),
    )
    .eq("id", data.badHabitId)
    .eq("user_id", user.id);
  if (updateErr) throw new Error(updateErr.message);

  revalidatePath("/habits");
  return fromDb<UrgeLog>(logRow);
}

export async function getUrgeHistory(
  badHabitId: string,
  days: number = 30,
): Promise<UrgeLog[]> {
  const { supabase, user } = await getAuthedClient();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: rows, error } = await supabase
    .from("urge_logs")
    .select("*")
    .eq("bad_habit_id", badHabitId)
    .eq("user_id", user.id)
    .gte("log_date", sinceStr)
    .order("log_date", { ascending: false })
    .order("log_time", { ascending: false });
  if (error) throw new Error(error.message);

  return (rows ?? []).map((r) => fromDb<UrgeLog>(r));
}

export async function getTodayUrges(badHabitId: string): Promise<UrgeLog[]> {
  const { supabase, user } = await getAuthedClient();
  const today = getTodayKarachi();

  const { data: rows, error } = await supabase
    .from("urge_logs")
    .select("*")
    .eq("bad_habit_id", badHabitId)
    .eq("user_id", user.id)
    .eq("log_date", today)
    .order("log_time", { ascending: false });
  if (error) throw new Error(error.message);

  return (rows ?? []).map((r) => fromDb<UrgeLog>(r));
}

// ─────────────────────────────────────────
// REFRAME VAULT
// ─────────────────────────────────────────

export async function createReframe(data: {
  badHabitId: string;
  brainSays: string;
  truthIs: string;
}): Promise<ReframeItem> {
  const { supabase, user } = await getAuthedClient();

  const insertData = toDb({
    badHabitId: data.badHabitId,
    userId: user.id,
    brainSays: data.brainSays,
    truthIs: data.truthIs,
    isCustom: true,
    timesShown: 0,
    timesHelped: 0,
  });

  const { data: row, error } = await supabase
    .from("reframe_items")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<ReframeItem>(row);
}

export async function getReframes(badHabitId: string): Promise<ReframeItem[]> {
  const { supabase, user } = await getAuthedClient();

  const { data: rows, error } = await supabase
    .from("reframe_items")
    .select("*")
    .eq("bad_habit_id", badHabitId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (rows ?? []).map((r) => fromDb<ReframeItem>(r));
}

export async function deleteReframe(id: string): Promise<void> {
  const { supabase, user } = await getAuthedClient();

  const { error } = await supabase
    .from("reframe_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function seedDefaultReframes(
  badHabitId: string,
  habitName: string,
): Promise<number> {
  const { supabase, user } = await getAuthedClient();

  const defaults = getDefaultReframes(habitName);
  const rows = defaults.map((d) =>
    toDb({
      badHabitId,
      userId: user.id,
      brainSays: d.brainSays,
      truthIs: d.truthIs,
      isCustom: false,
      timesShown: 0,
      timesHelped: 0,
    }),
  );

  const { error } = await supabase.from("reframe_items").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return defaults.length;
}

// ─────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────

export async function getUrgeAnalytics(
  badHabitId: string,
  days: number = 30,
): Promise<{
  analysis: ReturnType<typeof analyzeUrges>;
  dailyRates: { date: string; resisted: number; slipped: number }[];
  dangerHours: { hour: number; count: number }[];
  intensityTrend: { week: string; avg: number }[];
}> {
  const { supabase, user } = await getAuthedClient();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: rows, error } = await supabase
    .from("urge_logs")
    .select("*")
    .eq("bad_habit_id", badHabitId)
    .eq("user_id", user.id)
    .gte("log_date", sinceStr)
    .order("log_date", { ascending: true });
  if (error) throw new Error(error.message);

  const logs = (rows ?? []).map((r) => fromDb<UrgeLog>(r));
  const analysis = analyzeUrges(logs);

  // Group by date for daily rates
  const byDate: Record<string, { resisted: number; slipped: number }> = {};
  for (const log of logs) {
    if (!byDate[log.logDate]) byDate[log.logDate] = { resisted: 0, slipped: 0 };
    if (log.result === "resisted" || log.result === "surfed") {
      byDate[log.logDate].resisted++;
    } else {
      byDate[log.logDate].slipped++;
    }
  }
  const dailyRates = Object.entries(byDate).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  // Group by hour for danger zones
  const byHour: Record<number, number> = {};
  for (const log of logs) {
    if (log.logTime) {
      const hour = parseInt(log.logTime.split(":")[0], 10);
      byHour[hour] = (byHour[hour] ?? 0) + 1;
    }
  }
  const dangerHours = Object.entries(byHour)
    .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
    .sort((a, b) => b.count - a.count);

  // Intensity trend: week over week
  const byWeek: Record<string, { sum: number; count: number }> = {};
  for (const log of logs) {
    if (log.urgeIntensity != null) {
      const d = new Date(log.logDate);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];
      if (!byWeek[weekKey]) byWeek[weekKey] = { sum: 0, count: 0 };
      byWeek[weekKey].sum += log.urgeIntensity;
      byWeek[weekKey].count++;
    }
  }
  const intensityTrend = Object.entries(byWeek)
    .map(([week, { sum, count }]) => ({
      week,
      avg: Math.round((sum / count) * 10) / 10,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return { analysis, dailyRates, dangerHours, intensityTrend };
}

export async function getCleanStreakCalendar(
  badHabitId: string,
): Promise<{ date: string; status: "clean" | "battle" | "slip" | "none" }[]> {
  const { supabase, user } = await getAuthedClient();

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: rows, error } = await supabase
    .from("urge_logs")
    .select("*")
    .eq("bad_habit_id", badHabitId)
    .eq("user_id", user.id)
    .gte("log_date", sinceStr)
    .order("log_date", { ascending: true });
  if (error) throw new Error(error.message);

  const logs = (rows ?? []).map((r) => fromDb<UrgeLog>(r));

  // Group by date
  const byDate: Record<string, UrgeLog[]> = {};
  for (const log of logs) {
    if (!byDate[log.logDate]) byDate[log.logDate] = [];
    byDate[log.logDate].push(log);
  }

  // Build last 30 days
  const calendar: { date: string; status: "clean" | "battle" | "slip" | "none" }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLogs = byDate[dateStr];

    if (!dayLogs || dayLogs.length === 0) {
      calendar.push({ date: dateStr, status: "none" });
      continue;
    }

    const slips = dayLogs.filter((l) => l.result === "slipped");
    if (slips.length === 0) {
      calendar.push({ date: dateStr, status: "clean" });
    } else {
      const hasLongSlip = slips.some(
        (s) => s.slipDurationMinutes != null && s.slipDurationMinutes >= 30,
      );
      calendar.push({
        date: dateStr,
        status: hasLongSlip ? "slip" : "battle",
      });
    }
  }

  return calendar;
}

export async function getCostAnalysis(
  badHabitId: string,
): Promise<{
  dailyHoursEstimate: number;
  hourlyValue: number;
  currentDailyUsage: number;
  beforeCost: { daily: number; weekly: number; monthly: number; yearly: number };
  afterCost: { daily: number; weekly: number; monthly: number; yearly: number };
  projectedSavings: { hoursPerYear: number; moneyPerYear: number };
}> {
  const { supabase, user } = await getAuthedClient();

  const { data: habitRow, error: habitErr } = await supabase
    .from("bad_habits")
    .select("*")
    .eq("id", badHabitId)
    .eq("user_id", user.id)
    .single();
  if (habitErr) throw new Error(habitErr.message);

  const habit = fromDb<BadHabit>(habitRow);
  const dailyHoursEstimate = habit.dailyHoursEstimate ?? 0;
  const hourlyValue = habit.hourlyValue ?? 0;

  // Get recent slips (last 7 days) to estimate current daily usage
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: recentSlips, error: slipErr } = await supabase
    .from("urge_logs")
    .select("*")
    .eq("bad_habit_id", badHabitId)
    .eq("user_id", user.id)
    .eq("result", "slipped")
    .gte("log_date", sinceStr);
  if (slipErr) throw new Error(slipErr.message);

  const slipLogs = (recentSlips ?? []).map((r) => fromDb<UrgeLog>(r));
  const totalSlipMinutes = slipLogs.reduce(
    (sum, l) => sum + (l.slipDurationMinutes ?? 0),
    0,
  );
  const currentDailyUsage = Math.round((totalSlipMinutes / 7 / 60) * 10) / 10;

  const beforeCost = {
    daily: dailyHoursEstimate,
    weekly: Math.round(dailyHoursEstimate * 7 * 10) / 10,
    monthly: Math.round(dailyHoursEstimate * 30 * 10) / 10,
    yearly: Math.round(dailyHoursEstimate * 365 * 10) / 10,
  };

  const afterCost = {
    daily: currentDailyUsage,
    weekly: Math.round(currentDailyUsage * 7 * 10) / 10,
    monthly: Math.round(currentDailyUsage * 30 * 10) / 10,
    yearly: Math.round(currentDailyUsage * 365 * 10) / 10,
  };

  const savedHoursPerYear = Math.round((beforeCost.yearly - afterCost.yearly) * 10) / 10;
  const projectedSavings = {
    hoursPerYear: savedHoursPerYear,
    moneyPerYear: Math.round(savedHoursPerYear * hourlyValue),
  };

  return {
    dailyHoursEstimate,
    hourlyValue,
    currentDailyUsage,
    beforeCost,
    afterCost,
    projectedSavings,
  };
}
