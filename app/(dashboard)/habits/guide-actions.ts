"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb, getTodayKarachi } from "@/lib/utils";
import {
  type OnboardingProgress,
  type GuardianAlert,
  type GuardianHealth,
  runGuardianChecks,
  getGuardianOverallScore,
} from "@/lib/dayone";

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
// DATE HELPER
// ─────────────────────────────────────────

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// ─────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const { supabase, user } = await getAuthedClient();

  const { data: existing } = await supabase
    .from("onboarding_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (existing) return fromDb<OnboardingProgress>(existing);

  const { data: row, error } = await supabase
    .from("onboarding_progress")
    .insert(
      toDb({
        userId: user.id,
        currentStep: 1,
        completed: false,
        stepData: {},
      }),
    )
    .select("*")
    .single();

  if (error || !row) throw new Error(error?.message || "Failed to create onboarding progress");
  return fromDb<OnboardingProgress>(row);
}

export async function updateOnboardingStep(
  step: number,
  data: Record<string, unknown>,
): Promise<OnboardingProgress> {
  const { supabase, user } = await getAuthedClient();

  // Get current step_data to merge
  const { data: current } = await supabase
    .from("onboarding_progress")
    .select("step_data")
    .eq("user_id", user.id)
    .single();

  const existingData = (current?.step_data as Record<string, unknown>) || {};
  const mergedData = { ...existingData, ...data };

  const updatePayload: Record<string, unknown> = {
    currentStep: step,
    stepData: mergedData,
  };

  if (step === 10) {
    updatePayload.completed = true;
    updatePayload.completedAt = new Date().toISOString();
  }

  const { data: row, error } = await supabase
    .from("onboarding_progress")
    .update(toDb(updatePayload))
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !row) throw new Error(error?.message || "Failed to update onboarding step");
  revalidatePath("/habits");
  return fromDb<OnboardingProgress>(row);
}

export async function skipOnboarding(): Promise<void> {
  const { supabase, user } = await getAuthedClient();

  const { error } = await supabase
    .from("onboarding_progress")
    .update(
      toDb({
        completed: true,
        completedAt: new Date().toISOString(),
      }),
    )
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// GUARDIAN
// ─────────────────────────────────────────

export async function runGuardianCheck(): Promise<{
  checks: ReturnType<typeof runGuardianChecks>;
  overallScore: number;
  suggestions: string[];
}> {
  const { supabase, user } = await getAuthedClient();
  const today = getTodayKarachi();
  const fourteenDaysAgo = getDateDaysAgo(14);
  const twoDaysAgo = getDateDaysAgo(2);

  // 1. Count active habits
  const { data: activeHabits } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", user.id)
    .is("archived_at", null);

  const activeHabitsCount = activeHabits?.length || 0;

  // 2. Get consistency per habit (last 14 days)
  const habitConsistencies: number[] = [];
  let mostTrackedHabitId: string | null = null;
  let mostTrackedCount = 0;

  for (const habit of activeHabits || []) {
    const { count } = await supabase
      .from("habit_logs")
      .select("*", { count: "exact", head: true })
      .eq("habit_id", habit.id)
      .eq("status", "completed")
      .gte("log_date", fourteenDaysAgo)
      .lte("log_date", today);

    const completedCount = count || 0;
    habitConsistencies.push((completedCount / 14) * 100);

    if (completedCount > mostTrackedCount) {
      mostTrackedCount = completedCount;
      mostTrackedHabitId = habit.id;
    }
  }

  // 3. Count days tracked (distinct dates)
  const { data: logDates } = await supabase
    .from("habit_logs")
    .select("log_date")
    .eq("user_id", user.id);

  const distinctDates = new Set((logDates || []).map((l) => l.log_date));
  const daysTracked = distinctDates.size;

  // 4. Check implementation intentions (habit_blueprints)
  const { count: blueprintCount } = await supabase
    .from("habit_blueprints")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasImplementationIntention = (blueprintCount || 0) > 0;

  // 5. Check environment setups
  const { count: envCount } = await supabase
    .from("environment_setups")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasEnvironmentSetup = (envCount || 0) > 0;

  // 6. Check accountability partners
  const { count: partnerCount } = await supabase
    .from("accountability_partners")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasAccountabilityPartner = (partnerCount || 0) > 0;

  // 7. Consecutive misses for most-tracked habit (last 2 days)
  let consecutiveMisses = 0;
  if (mostTrackedHabitId) {
    const { data: recentLogs } = await supabase
      .from("habit_logs")
      .select("log_date, status")
      .eq("habit_id", mostTrackedHabitId)
      .gte("log_date", twoDaysAgo)
      .lte("log_date", today)
      .order("log_date", { ascending: false });

    if (!recentLogs || recentLogs.length === 0) {
      consecutiveMisses = 2;
    } else {
      for (const log of recentLogs) {
        if (log.status !== "completed") consecutiveMisses++;
        else break;
      }
    }
  }

  // 8. Days since last app engagement
  const { data: lastLog } = await supabase
    .from("habit_logs")
    .select("log_date")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(1);

  let daysSinceLastOpen = 0;
  if (lastLog && lastLog.length > 0) {
    const lastDate = new Date(lastLog[0].log_date + "T12:00:00");
    const todayDate = new Date(today + "T12:00:00");
    daysSinceLastOpen = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // 9. Historical consistency
  const { count: totalCompleted } = await supabase
    .from("habit_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  const { count: totalLogged } = await supabase
    .from("habit_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const historicalConsistency =
    (totalLogged || 0) > 0
      ? ((totalCompleted || 0) / (totalLogged || 1)) * 100
      : 100;

  // 10. Run guardian checks
  const checks = runGuardianChecks({
    activeHabitsCount,
    habitConsistencies,
    daysTracked,
    hasImplementationIntention,
    hasEnvironmentSetup,
    hasAccountabilityPartner,
    consecutiveMisses,
    daysSinceLastOpen,
    historicalConsistency,
  });

  const overallScore = getGuardianOverallScore(checks);
  const suggestions = checks
    .filter((c) => c.suggestion !== null)
    .map((c) => c.suggestion as string);

  // 11. Upsert into guardian_health_scores
  const scores: Record<string, string> = {};
  for (const c of checks) {
    scores[`mistake_${c.mistakeNumber}`] = c.status;
  }

  const { error } = await supabase
    .from("guardian_health_scores")
    .upsert(
      toDb({
        userId: user.id,
        scoreDate: today,
        scores,
        overallScore,
        suggestions,
      }),
      { onConflict: "user_id,score_date" },
    );

  if (error) throw new Error(error.message);

  return { checks, overallScore, suggestions };
}

export async function getGuardianHistory(
  days?: number,
): Promise<GuardianHealth[]> {
  const { supabase, user } = await getAuthedClient();

  let query = supabase
    .from("guardian_health_scores")
    .select("*")
    .eq("user_id", user.id)
    .order("score_date", { ascending: false });

  if (days) {
    query = query.limit(days);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => fromDb<GuardianHealth>(row));
}

export async function createGuardianAlert(data: {
  mistakeNumber: number;
  mistakeName: string;
  alertText: string;
  severity?: string;
}): Promise<GuardianAlert> {
  const { supabase, user } = await getAuthedClient();

  const { data: row, error } = await supabase
    .from("guardian_alerts")
    .insert(
      toDb({
        userId: user.id,
        mistakeNumber: data.mistakeNumber,
        mistakeName: data.mistakeName,
        alertText: data.alertText,
        severity: data.severity || undefined,
        isActive: true,
      }),
    )
    .select("*")
    .single();

  if (error || !row) throw new Error(error?.message || "Failed to create guardian alert");
  revalidatePath("/habits");
  return fromDb<GuardianAlert>(row);
}

export async function respondToAlert(
  alertId: string,
  response: "accepted" | "dismissed" | "overridden",
): Promise<void> {
  const { supabase, user } = await getAuthedClient();

  const { error } = await supabase
    .from("guardian_alerts")
    .update(
      toDb({
        userResponse: response,
        isActive: false,
      }),
    )
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

export async function getActiveAlerts(): Promise<GuardianAlert[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("guardian_alerts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => fromDb<GuardianAlert>(row));
}

// ─────────────────────────────────────────
// COMPOUND VISUALIZER
// ─────────────────────────────────────────

export async function getCompoundData(): Promise<
  {
    habitName: string;
    emoji: string | null;
    totalDone: number;
    daysTracked: number;
    dailyRate: number;
    projections: { label: string; value: number }[];
    valleyMessage: string | null;
  }[]
> {
  const { supabase, user } = await getAuthedClient();

  // Get active habits
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, emoji")
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (!habits || habits.length === 0) return [];

  const results = [];

  for (const habit of habits) {
    // Count total completions
    const { count: totalDone } = await supabase
      .from("habit_logs")
      .select("*", { count: "exact", head: true })
      .eq("habit_id", habit.id)
      .eq("status", "completed");

    // Count days tracked (distinct dates)
    const { data: logDates } = await supabase
      .from("habit_logs")
      .select("log_date")
      .eq("habit_id", habit.id);

    const distinctDates = new Set((logDates || []).map((l) => l.log_date));
    const daysTracked = distinctDates.size;

    const completions = totalDone || 0;
    const dailyRate = daysTracked > 0 ? completions / daysTracked : 0;

    // Generate projections
    const projections = [30, 90, 180, 365].map((days) => ({
      label: `${days} days`,
      value: Math.round(dailyRate * days),
    }));

    // Valley message based on days tracked
    let valleyMessage: string | null = null;
    if (daysTracked >= 10 && daysTracked <= 21) {
      valleyMessage =
        "You're in the Valley of Disappointment. This is exactly when most people quit. " +
        "The compound curve doesn't FEEL like growth yet — but it IS growing, underground, like roots. " +
        "You are RIGHT ON SCHEDULE. Keep going.";
    } else if (daysTracked >= 22 && daysTracked <= 45) {
      valleyMessage =
        "You've survived the Valley. Most people quit by now. " +
        "The compound effect is building momentum. Stay the course.";
    }

    results.push({
      habitName: habit.name,
      emoji: habit.emoji || null,
      totalDone: completions,
      daysTracked,
      dailyRate,
      projections,
      valleyMessage,
    });
  }

  return results;
}
