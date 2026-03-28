"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb, getTodayKarachi } from "@/lib/utils";
import {
  type HabitMastery,
  type PerformanceLog,
  type LevelChange,
  type MasteryReview,
  type Challenge,
  type GoldilocksAssessment,
  assessGoldilocks,
  calculateMasteryScore,
  getChallengesForHabit,
  canAdvancePhase,
  PHASE_NAMES,
} from "@/lib/mastery";

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
// 1. CREATE MASTERY HABIT
// ─────────────────────────────────────────

export async function createMastery(data: {
  habitName: string;
  habitIcon?: string;
  baselineAmount: number;
  baselineUnit?: string;
  currentTarget?: number;
  horizonAmount?: number;
}): Promise<HabitMastery> {
  const { supabase, user } = await getAuthedClient();

  const row = toDb({
    userId: user.id,
    habitName: data.habitName,
    habitIcon: data.habitIcon || undefined,
    baselineAmount: data.baselineAmount,
    baselineUnit: data.baselineUnit || undefined,
    currentTarget: data.currentTarget ?? data.baselineAmount,
    horizonAmount: data.horizonAmount || undefined,
    currentPhase: 1,
    phaseStartedAt: new Date().toISOString(),
    totalLevelUps: 0,
    totalLevelDowns: 0,
    goldilocksZone: "goldilocks",
    consistencyScore: 0,
    growthScore: 0,
    depthScore: 0,
    masteryScore: 0,
    deliberateChallengesDone: 0,
    isActive: true,
  });

  const { data: inserted, error } = await supabase
    .from("habit_masteries")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<HabitMastery>(inserted);
}

// ─────────────────────────────────────────
// 2. GET MASTERY HABITS
// ─────────────────────────────────────────

export async function getMasteryHabits(): Promise<HabitMastery[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("habit_masteries")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<HabitMastery>(row));
}

// ─────────────────────────────────────────
// 3. DELETE MASTERY HABIT
// ─────────────────────────────────────────

export async function deleteMastery(id: string): Promise<void> {
  const { supabase, user } = await getAuthedClient();

  const { error } = await supabase
    .from("habit_masteries")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// 4. LOG PERFORMANCE
// ─────────────────────────────────────────

export async function logPerformance(data: {
  masteryId: string;
  actualAmount?: number;
  timeSpentMinutes?: number;
  difficultyFeeling?: number;
  completed: boolean;
  usedTwoMinute?: boolean;
  note?: string;
}): Promise<{ log: PerformanceLog; assessment: GoldilocksAssessment }> {
  const { supabase, user } = await getAuthedClient();
  const today = getTodayKarachi();

  // Get mastery habit for current_target
  const { data: mastery, error: mErr } = await supabase
    .from("habit_masteries")
    .select("*")
    .eq("id", data.masteryId)
    .eq("user_id", user.id)
    .single();
  if (mErr) throw new Error(mErr.message);

  const currentTarget = mastery.current_target as number;

  // Upsert performance log
  const logData = toDb({
    masteryId: data.masteryId,
    logDate: today,
    targetAmount: currentTarget,
    actualAmount: data.actualAmount || undefined,
    timeSpentMinutes: data.timeSpentMinutes || undefined,
    difficultyFeeling: data.difficultyFeeling || undefined,
    completed: data.completed,
    usedTwoMinute: data.usedTwoMinute ?? false,
    note: data.note || undefined,
  });

  const { data: logRow, error: logErr } = await supabase
    .from("performance_logs")
    .upsert(logData, { onConflict: "mastery_id,log_date" })
    .select("*")
    .single();
  if (logErr) throw new Error(logErr.message);

  // Run Goldilocks assessment on last 7 logs
  const cutoff7 = getDateDaysAgo(7);
  const { data: recentLogs } = await supabase
    .from("performance_logs")
    .select("*")
    .eq("mastery_id", data.masteryId)
    .gte("log_date", cutoff7)
    .order("log_date", { ascending: false });

  const mappedLogs = (recentLogs ?? []).map((r) => fromDb<PerformanceLog>(r));
  const assessment = assessGoldilocks(mappedLogs, currentTarget);

  // Update mastery goldilocks_zone
  await supabase
    .from("habit_masteries")
    .update({ goldilocks_zone: assessment.zone })
    .eq("id", data.masteryId);

  // Recalculate mastery scores
  const cutoff30 = getDateDaysAgo(30);
  const { data: last30Logs } = await supabase
    .from("performance_logs")
    .select("*")
    .eq("mastery_id", data.masteryId)
    .gte("log_date", cutoff30)
    .order("log_date", { ascending: false });

  const completedCount = (last30Logs ?? []).filter(
    (l) => l.completed,
  ).length;
  const consistencyRate =
    (last30Logs ?? []).length > 0
      ? (completedCount / (last30Logs ?? []).length) * 100
      : 0;

  // Growth from level history
  const { count: levelUpCount } = await supabase
    .from("level_history")
    .select("*", { count: "exact", head: true })
    .eq("mastery_id", data.masteryId)
    .eq("direction", "up");

  // Depth from challenges
  const { count: challengesDone } = await supabase
    .from("deliberate_challenges")
    .select("*", { count: "exact", head: true })
    .eq("mastery_id", data.masteryId)
    .eq("completed", true);

  const { count: totalChallenges } = await supabase
    .from("deliberate_challenges")
    .select("*", { count: "exact", head: true })
    .eq("mastery_id", data.masteryId);

  const scores = calculateMasteryScore(
    consistencyRate,
    levelUpCount ?? 0,
    mastery.baseline_amount as number,
    currentTarget,
    challengesDone ?? 0,
    totalChallenges ?? 0,
  );

  await supabase
    .from("habit_masteries")
    .update({
      consistency_score: scores.consistency,
      growth_score: scores.growth,
      depth_score: scores.depth,
      mastery_score: scores.overall,
    })
    .eq("id", data.masteryId);

  revalidatePath("/habits");
  return { log: fromDb<PerformanceLog>(logRow), assessment };
}

// ─────────────────────────────────────────
// 5. GET PERFORMANCE LOGS
// ─────────────────────────────────────────

export async function getPerformanceLogs(
  masteryId: string,
  days: number = 30,
): Promise<PerformanceLog[]> {
  const { supabase } = await getAuthedClient();
  const cutoff = getDateDaysAgo(days);

  const { data, error } = await supabase
    .from("performance_logs")
    .select("*")
    .eq("mastery_id", masteryId)
    .gte("log_date", cutoff)
    .order("log_date", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<PerformanceLog>(row));
}

// ─────────────────────────────────────────
// 6. RUN GOLDILOCKS ASSESSMENT
// ─────────────────────────────────────────

export async function runGoldilocksAssessment(
  masteryId: string,
): Promise<GoldilocksAssessment> {
  const { supabase } = await getAuthedClient();

  // Get mastery for current_target
  const { data: mastery, error: mErr } = await supabase
    .from("habit_masteries")
    .select("*")
    .eq("id", masteryId)
    .single();
  if (mErr) throw new Error(mErr.message);

  const currentTarget = mastery.current_target as number;

  // Get last 7 performance logs
  const cutoff = getDateDaysAgo(7);
  const { data: logs, error: logErr } = await supabase
    .from("performance_logs")
    .select("*")
    .eq("mastery_id", masteryId)
    .gte("log_date", cutoff)
    .order("log_date", { ascending: false });
  if (logErr) throw new Error(logErr.message);

  const mappedLogs = (logs ?? []).map((r) => fromDb<PerformanceLog>(r));
  const assessment = assessGoldilocks(mappedLogs, currentTarget);

  // Update mastery goldilocks_zone
  await supabase
    .from("habit_masteries")
    .update({ goldilocks_zone: assessment.zone })
    .eq("id", masteryId);

  revalidatePath("/habits");
  return assessment;
}

// ─────────────────────────────────────────
// 7. APPLY LEVEL CHANGE
// ─────────────────────────────────────────

export async function applyLevelChange(
  masteryId: string,
  newTarget: number,
  reason: string,
): Promise<HabitMastery> {
  const { supabase, user } = await getAuthedClient();

  // Get current mastery
  const { data: mastery, error: mErr } = await supabase
    .from("habit_masteries")
    .select("*")
    .eq("id", masteryId)
    .eq("user_id", user.id)
    .single();
  if (mErr) throw new Error(mErr.message);

  const oldTarget = mastery.current_target as number;
  const direction = newTarget > oldTarget ? "up" : "down";

  // Get recent logs for avg performance/feeling
  const cutoff = getDateDaysAgo(7);
  const { data: recentLogs } = await supabase
    .from("performance_logs")
    .select("*")
    .eq("mastery_id", masteryId)
    .gte("log_date", cutoff);

  const mappedLogs = (recentLogs ?? []).map((r) => fromDb<PerformanceLog>(r));

  const withAmount = mappedLogs.filter((l) => l.actualAmount != null);
  const avgPerformance =
    withAmount.length > 0
      ? Math.round(
          withAmount.reduce(
            (s, l) => s + (l.actualAmount! / l.targetAmount) * 100,
            0,
          ) / withAmount.length,
        )
      : null;

  const withFeeling = mappedLogs.filter((l) => l.difficultyFeeling != null);
  const avgFeeling =
    withFeeling.length > 0
      ? Math.round(
          (withFeeling.reduce((s, l) => s + l.difficultyFeeling!, 0) /
            withFeeling.length) *
            10,
        ) / 10
      : null;

  // Insert into level_history
  const levelData = toDb({
    masteryId,
    oldTarget,
    newTarget,
    direction,
    reason,
    avgPerformance: avgPerformance || undefined,
    avgFeeling: avgFeeling || undefined,
    changedAt: new Date().toISOString(),
  });

  const { error: levelErr } = await supabase
    .from("level_history")
    .insert(levelData);
  if (levelErr) throw new Error(levelErr.message);

  // Update mastery: current_target + level counts
  const totalLevelUps = (mastery.total_level_ups as number) ?? 0;
  const totalLevelDowns = (mastery.total_level_downs as number) ?? 0;

  const updateData: Record<string, unknown> = {
    current_target: newTarget,
  };
  if (direction === "up") {
    updateData.total_level_ups = totalLevelUps + 1;
  } else {
    updateData.total_level_downs = totalLevelDowns + 1;
  }

  // Recalculate goldilocks after change
  const assessment = assessGoldilocks(mappedLogs, newTarget);
  updateData.goldilocks_zone = assessment.zone;

  const { data: updated, error: updateErr } = await supabase
    .from("habit_masteries")
    .update(updateData)
    .eq("id", masteryId)
    .select("*")
    .single();
  if (updateErr) throw new Error(updateErr.message);

  revalidatePath("/habits");
  return fromDb<HabitMastery>(updated);
}

// ─────────────────────────────────────────
// 8. CHECK PHASE ADVANCEMENT
// ─────────────────────────────────────────

export async function checkPhaseAdvancement(masteryId: string): Promise<{
  canAdvance: boolean;
  currentPhase: number;
  stats: {
    daysDone: number;
    consistency: number;
    neverMissedTwice: boolean;
    levelUps: number;
    flowDays: number;
  };
  nextPhaseName: string | null;
}> {
  const { supabase } = await getAuthedClient();

  // Get mastery
  const { data: mastery, error: mErr } = await supabase
    .from("habit_masteries")
    .select("*")
    .eq("id", masteryId)
    .single();
  if (mErr) throw new Error(mErr.message);

  const currentPhase = mastery.current_phase as number;
  const phaseStartedAt = mastery.phase_started_at as string;

  // Get logs since phase started
  const { data: logs } = await supabase
    .from("performance_logs")
    .select("*")
    .eq("mastery_id", masteryId)
    .gte("log_date", phaseStartedAt.slice(0, 10))
    .order("log_date", { ascending: true });

  const mappedLogs = (logs ?? []).map((r) => fromDb<PerformanceLog>(r));
  const daysDone = mappedLogs.filter((l) => l.completed).length;
  const consistency =
    mappedLogs.length > 0
      ? Math.round((daysDone / mappedLogs.length) * 100)
      : 0;

  // Never missed twice in a row
  let neverMissedTwice = true;
  for (let i = 1; i < mappedLogs.length; i++) {
    if (!mappedLogs[i].completed && !mappedLogs[i - 1].completed) {
      neverMissedTwice = false;
      break;
    }
  }

  // Level ups count
  const { count: levelUps } = await supabase
    .from("level_history")
    .select("*", { count: "exact", head: true })
    .eq("mastery_id", masteryId)
    .eq("direction", "up");

  // Flow days: days where difficulty_feeling was 2 or 3 (good challenge / in the flow)
  const flowDays =
    mappedLogs.length > 0
      ? Math.round(
          (mappedLogs.filter(
            (l) =>
              l.difficultyFeeling != null &&
              l.difficultyFeeling >= 2 &&
              l.difficultyFeeling <= 3,
          ).length /
            mappedLogs.length) *
            100,
        )
      : 0;

  const stats = {
    daysDone,
    consistency,
    neverMissedTwice,
    levelUps: levelUps ?? 0,
    flowDays,
  };

  const canAdvanceResult = canAdvancePhase(currentPhase, stats);
  const nextPhaseName =
    currentPhase < PHASE_NAMES.length - 1
      ? PHASE_NAMES[currentPhase + 1]
      : null;

  return {
    canAdvance: canAdvanceResult,
    currentPhase,
    stats,
    nextPhaseName,
  };
}

// ─────────────────────────────────────────
// 9. ADVANCE PHASE
// ─────────────────────────────────────────

export async function advancePhase(masteryId: string): Promise<HabitMastery> {
  const { supabase, user } = await getAuthedClient();

  // Get mastery
  const { data: mastery, error: mErr } = await supabase
    .from("habit_masteries")
    .select("*")
    .eq("id", masteryId)
    .eq("user_id", user.id)
    .single();
  if (mErr) throw new Error(mErr.message);

  const currentPhase = mastery.current_phase as number;

  // Verify can advance
  const check = await checkPhaseAdvancement(masteryId);
  if (!check.canAdvance) {
    throw new Error(
      `Cannot advance from phase ${currentPhase}. Requirements not met.`,
    );
  }

  const { data: updated, error: updateErr } = await supabase
    .from("habit_masteries")
    .update({
      current_phase: currentPhase + 1,
      phase_started_at: new Date().toISOString(),
    })
    .eq("id", masteryId)
    .select("*")
    .single();
  if (updateErr) throw new Error(updateErr.message);

  revalidatePath("/habits");
  return fromDb<HabitMastery>(updated);
}

// ─────────────────────────────────────────
// 10. CREATE REVIEW
// ─────────────────────────────────────────

export async function createReview(data: {
  reviewType: "weekly" | "monthly" | "quarterly" | "annual";
  periodLabel: string;
  responses: Record<string, string>;
}): Promise<MasteryReview> {
  const { supabase, user } = await getAuthedClient();

  // Auto-generate insights based on review type
  const autoInsights: string[] = [];

  // Get all active mastery habits for stats
  const { data: masteries } = await supabase
    .from("habit_masteries")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (masteries && masteries.length > 0) {
    const avgScore =
      Math.round(
        masteries.reduce(
          (s, m) => s + ((m.mastery_score as number) ?? 0),
          0,
        ) / masteries.length,
      );
    autoInsights.push(`Average mastery score: ${avgScore}/100`);

    const inFlow = masteries.filter(
      (m) => m.goldilocks_zone === "goldilocks",
    );
    autoInsights.push(
      `${inFlow.length}/${masteries.length} habits in flow zone`,
    );

    const bored = masteries.filter(
      (m) =>
        m.goldilocks_zone === "boredom" || m.goldilocks_zone === "ready",
    );
    if (bored.length > 0) {
      autoInsights.push(
        `${bored.length} habit(s) ready for a level up`,
      );
    }

    const struggling = masteries.filter(
      (m) =>
        m.goldilocks_zone === "anxiety" ||
        m.goldilocks_zone === "friction_warning",
    );
    if (struggling.length > 0) {
      autoInsights.push(
        `${struggling.length} habit(s) need attention (too hard or inconsistent)`,
      );
    }
  }

  // For monthly/quarterly, add growth insights
  if (
    data.reviewType === "monthly" ||
    data.reviewType === "quarterly" ||
    data.reviewType === "annual"
  ) {
    const totalLevelUps = (masteries ?? []).reduce(
      (s, m) => s + ((m.total_level_ups as number) ?? 0),
      0,
    );
    autoInsights.push(`Total level ups across all habits: ${totalLevelUps}`);
  }

  const reviewData = toDb({
    userId: user.id,
    reviewType: data.reviewType,
    periodLabel: data.periodLabel,
    responses: data.responses,
    autoInsights,
    completedAt: new Date().toISOString(),
  });

  const { data: inserted, error } = await supabase
    .from("mastery_reviews")
    .insert(reviewData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<MasteryReview>(inserted);
}

// ─────────────────────────────────────────
// 11. GET REVIEWS
// ─────────────────────────────────────────

export async function getReviews(
  reviewType?: string,
  limit: number = 10,
): Promise<MasteryReview[]> {
  const { supabase, user } = await getAuthedClient();

  let query = supabase
    .from("mastery_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (reviewType) {
    query = query.eq("review_type", reviewType);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<MasteryReview>(row));
}

// ─────────────────────────────────────────
// 12. GET REVIEW DUE
// ─────────────────────────────────────────

export async function getReviewDue(): Promise<{
  type: string;
  daysSince: number;
  isOverdue: boolean;
} | null> {
  const { supabase, user } = await getAuthedClient();

  const reviewTypes = [
    { type: "weekly", intervalDays: 7 },
    { type: "monthly", intervalDays: 30 },
    { type: "quarterly", intervalDays: 90 },
  ];

  for (const { type, intervalDays } of reviewTypes) {
    const { data: lastReview } = await supabase
      .from("mastery_reviews")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("review_type", type)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    let daysSince: number;
    if (!lastReview) {
      // Never done this review type
      daysSince = intervalDays + 1;
    } else {
      const lastDate = new Date(lastReview.completed_at as string);
      const now = new Date();
      daysSince = Math.floor(
        (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    if (daysSince >= intervalDays) {
      return { type, daysSince, isOverdue: true };
    }
  }

  return null;
}

// ─────────────────────────────────────────
// 13. SUGGEST CHALLENGE
// ─────────────────────────────────────────

export async function suggestChallenge(
  masteryId: string,
): Promise<Challenge> {
  const { supabase } = await getAuthedClient();

  // Get mastery habit
  const { data: mastery, error: mErr } = await supabase
    .from("habit_masteries")
    .select("*")
    .eq("id", masteryId)
    .single();
  if (mErr) throw new Error(mErr.message);

  const habitName = mastery.habit_name as string;

  // Get existing challenges to avoid repeats
  const { data: existingChallenges } = await supabase
    .from("deliberate_challenges")
    .select("challenge_text")
    .eq("mastery_id", masteryId);

  const existingTexts = new Set(
    (existingChallenges ?? []).map(
      (c) => c.challenge_text as string,
    ),
  );

  // Pick next challenge
  const allChallenges = getChallengesForHabit(habitName);
  const available = allChallenges.filter((c) => !existingTexts.has(c));
  const challengeText =
    available.length > 0
      ? available[0]
      : allChallenges[Math.floor(Math.random() * allChallenges.length)];

  const weekNumber = (existingChallenges ?? []).length + 1;

  const challengeData = toDb({
    masteryId,
    challengeText,
    weekNumber,
    accepted: false,
    completed: false,
    completedAt: undefined,
    rating: undefined,
  });

  const { data: inserted, error } = await supabase
    .from("deliberate_challenges")
    .insert(challengeData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Challenge>(inserted);
}

// ─────────────────────────────────────────
// 14. RESPOND TO CHALLENGE
// ─────────────────────────────────────────

export async function respondToChallenge(
  challengeId: string,
  response: "accept" | "complete" | "skip",
  rating?: string,
): Promise<Challenge | null> {
  const { supabase } = await getAuthedClient();

  if (response === "skip") {
    const { error } = await supabase
      .from("deliberate_challenges")
      .delete()
      .eq("id", challengeId);
    if (error) throw new Error(error.message);

    revalidatePath("/habits");
    return null;
  }

  if (response === "accept") {
    const { data: updated, error } = await supabase
      .from("deliberate_challenges")
      .update({ accepted: true })
      .eq("id", challengeId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/habits");
    return fromDb<Challenge>(updated);
  }

  // response === "complete"
  // Get challenge to find mastery_id
  const { data: challenge, error: cErr } = await supabase
    .from("deliberate_challenges")
    .select("mastery_id")
    .eq("id", challengeId)
    .single();
  if (cErr) throw new Error(cErr.message);

  const { data: updated, error: updateErr } = await supabase
    .from("deliberate_challenges")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      rating: rating || undefined,
    })
    .eq("id", challengeId)
    .select("*")
    .single();
  if (updateErr) throw new Error(updateErr.message);

  // Update mastery's deliberate_challenges_done
  const masteryId = challenge.mastery_id as string;
  const { data: mastery } = await supabase
    .from("habit_masteries")
    .select("deliberate_challenges_done")
    .eq("id", masteryId)
    .single();

  const currentDone =
    ((mastery?.deliberate_challenges_done as number) ?? 0) + 1;
  await supabase
    .from("habit_masteries")
    .update({ deliberate_challenges_done: currentDone })
    .eq("id", masteryId);

  revalidatePath("/habits");
  return fromDb<Challenge>(updated);
}

// ─────────────────────────────────────────
// 15. GET CHALLENGES
// ─────────────────────────────────────────

export async function getChallenges(
  masteryId: string,
): Promise<Challenge[]> {
  const { supabase } = await getAuthedClient();

  const { data, error } = await supabase
    .from("deliberate_challenges")
    .select("*")
    .eq("mastery_id", masteryId)
    .order("week_number", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<Challenge>(row));
}
