"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb, getTodayKarachi } from "@/lib/utils";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface BlueprintExecution {
  id: string;
  blueprintId: string;
  userId: string;
  executionDate: string;
  status: string;
  plannedTime: string | null;
  actualTime: string | null;
  timeDeviationMinutes: number | null;
  plannedLocation: string | null;
  actualLocation: string | null;
  locationMatched: boolean | null;
  stackAnchorCompleted: boolean | null;
  stackTriggeredNaturally: boolean | null;
  environmentWasSetUp: boolean | null;
  frictionWasRemoved: boolean | null;
  difficulty: string | null;
  usedTwoMinuteVersion: boolean;
  satisfaction: number | null;
  note: string | null;
  skipReason: string | null;
  chainId: string | null;
  chainPosition: number | null;
  chainBrokeHere: boolean;
}

export interface ChainExecution {
  id: string;
  chainId: string;
  userId: string;
  executionDate: string;
  totalLinks: number;
  completedLinks: number;
  completionPercentage: number;
  wasFullCompletion: boolean;
  brokeAtPosition: number | null;
  brokeAtBlueprintId: string | null;
  breakReason: string | null;
  chainStartTime: string | null;
  chainEndTime: string | null;
  totalDurationMinutes: number | null;
  flowRating: number | null;
  feltAutomatic: boolean | null;
  note: string | null;
}

export interface TimingInsight {
  blueprintId: string;
  habitName: string;
  habitIcon: string | null;
  plannedTime: string;
  avgActualTime: string;
  avgDeviationMinutes: number;
  onTimePercentage: number;
  direction: "early" | "on_time" | "late";
  suggestion: string;
}

export interface ChainHealthInsight {
  chainId: string;
  chainName: string;
  chainIcon: string;
  totalLinks: number;
  fullCompletionRate: number;
  weakestLinkName: string | null;
  weakestLinkPosition: number | null;
  avgBreakPoint: number | null;
  currentStreak: number;
  health: "strong" | "moderate" | "weak" | "new";
  suggestions: string[];
}

export interface StackInsight {
  blueprintId: string;
  habitName: string;
  completionWithAnchor: number;
  completionWithoutAnchor: number;
  anchorDescription: string | null;
  effectiveness: string;
}

export interface EnvironmentImpactInsight {
  setupName: string;
  prepRate: number;
  completionWithPrep: number;
  completionWithoutPrep: number;
  impactDelta: number;
  message: string;
}

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
// TIME HELPERS
// ─────────────────────────────────────────

/** Parse "HH:MM" to minutes since midnight */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight back to "HH:MM" */
function minutesToTime(minutes: number): string {
  const clamped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = Math.round(clamped % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Calculate deviation in minutes between two "HH:MM" strings (positive = late) */
function calculateDeviation(planned: string, actual: string): number {
  const p = parseTimeToMinutes(planned);
  const a = parseTimeToMinutes(actual);
  let diff = a - p;
  // Handle wrap-around midnight: pick the shorter direction
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return diff;
}

/** Get date N days ago as YYYY-MM-DD in Karachi timezone */
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
// 1. LOG BLUEPRINT EXECUTION
// ─────────────────────────────────────────

export async function logBlueprintExecution(data: {
  blueprintId: string;
  status: "completed" | "skipped" | "partial" | "missed" | "two_minute";
  actualTime?: string;
  plannedTime?: string;
  difficulty?: string;
  usedTwoMinuteVersion?: boolean;
  satisfaction?: number;
  note?: string;
  skipReason?: string;
  stackAnchorCompleted?: boolean;
  stackTriggeredNaturally?: boolean;
  environmentWasSetUp?: boolean;
  frictionWasRemoved?: boolean;
  anchorCompleted?: boolean;
  chainId?: string;
}): Promise<BlueprintExecution> {
  const { supabase, user } = await getAuthedClient();
  const today = getTodayKarachi();

  // Fetch the blueprint for planned values
  const { data: blueprint, error: bpErr } = await supabase
    .from("habit_blueprints")
    .select("*")
    .eq("id", data.blueprintId)
    .single();
  if (bpErr) throw new Error(bpErr.message);

  // Resolve planned time: prefer blueprint value, fall back to explicit param
  const plannedTime =
    (blueprint.intention_time as string | null) ?? data.plannedTime ?? null;
  const plannedLocation = blueprint.intention_location as string | null;
  const chainId =
    (blueprint.chain_id as string | null) ?? data.chainId ?? null;
  const chainPosition = blueprint.chain_position as number | null;

  // Normalize status: treat "two_minute" as "completed" with usedTwoMinuteVersion flag
  const normalizedStatus =
    data.status === "two_minute" ? "completed" : data.status;
  const usedTwoMinuteVersion =
    data.usedTwoMinuteVersion ?? data.status === "two_minute";

  // Merge anchorCompleted (backward compat) into stackAnchorCompleted
  const stackAnchorCompleted =
    data.stackAnchorCompleted ?? data.anchorCompleted ?? null;

  // Calculate time deviation
  let timeDeviationMinutes: number | null = null;
  if (plannedTime && data.actualTime) {
    timeDeviationMinutes = calculateDeviation(plannedTime, data.actualTime);
  }

  // Check location match
  let locationMatched: boolean | null = null;
  if (plannedLocation) {
    locationMatched = data.environmentWasSetUp ?? null;
  }

  const executionData = toDb({
    blueprintId: data.blueprintId,
    userId: user.id,
    executionDate: today,
    status: normalizedStatus,
    plannedTime,
    actualTime: data.actualTime ?? null,
    timeDeviationMinutes,
    plannedLocation,
    actualLocation: null,
    locationMatched,
    stackAnchorCompleted,
    stackTriggeredNaturally: data.stackTriggeredNaturally ?? null,
    environmentWasSetUp: data.environmentWasSetUp ?? null,
    frictionWasRemoved: data.frictionWasRemoved ?? null,
    difficulty: data.difficulty ?? null,
    usedTwoMinuteVersion,
    satisfaction: data.satisfaction ?? null,
    note: data.note ?? null,
    skipReason: data.skipReason ?? null,
    chainId,
    chainPosition,
    chainBrokeHere: false,
  });

  // Upsert (on conflict: blueprint_id + execution_date)
  const { data: row, error } = await supabase
    .from("blueprint_executions")
    .upsert(executionData, {
      onConflict: "blueprint_id,execution_date",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Update blueprint stats
  const timesExecuted = (blueprint.times_executed as number) ?? 0;
  const timesSkipped = (blueprint.times_skipped as number) ?? 0;
  const currentStreak = (blueprint.current_streak as number) ?? 0;
  const bestStreak = (blueprint.best_streak as number) ?? 0;

  const statsUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (normalizedStatus === "completed") {
    statsUpdate.times_executed = timesExecuted + 1;
    statsUpdate.current_streak = currentStreak + 1;
    if (currentStreak + 1 > bestStreak) {
      statsUpdate.best_streak = currentStreak + 1;
    }
  } else if (normalizedStatus === "skipped") {
    statsUpdate.times_skipped = timesSkipped + 1;
  } else if (normalizedStatus === "missed") {
    statsUpdate.current_streak = 0;
  }

  // Recalculate execution rate
  const newExecuted =
    (statsUpdate.times_executed as number | undefined) ?? timesExecuted;
  const newSkipped =
    (statsUpdate.times_skipped as number | undefined) ?? timesSkipped;
  const totalAttempts = newExecuted + newSkipped;
  statsUpdate.execution_rate =
    totalAttempts > 0 ? Math.round((newExecuted / totalAttempts) * 100) : 0;

  await supabase
    .from("habit_blueprints")
    .update(statsUpdate)
    .eq("id", data.blueprintId);

  revalidatePath("/habits");
  return fromDb<BlueprintExecution>(row);
}

// ─────────────────────────────────────────
// 2. LOG CHAIN EXECUTION
// ─────────────────────────────────────────

export async function logChainExecution(data: {
  chainId: string;
  links?: {
    blueprintId: string;
    completed: boolean;
    actualTime?: string;
    difficulty?: string;
  }[];
  flowRating?: number;
  feltAutomatic?: boolean;
  note?: string;
}): Promise<ChainExecution> {
  const { supabase, user } = await getAuthedClient();
  const today = getTodayKarachi();

  // Get chain info
  const { data: chain, error: chainErr } = await supabase
    .from("habit_chains")
    .select("*")
    .eq("id", data.chainId)
    .single();
  if (chainErr) throw new Error(chainErr.message);

  // Log each link as a blueprint execution
  const links = data.links ?? [];
  let brokeAtPosition: number | null = null;
  let brokeAtBlueprintId: string | null = null;
  let completedLinks = 0;
  let chainStartTime: string | null = null;
  let chainEndTime: string | null = null;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const status = link.completed ? "completed" : "missed";

    await logBlueprintExecution({
      blueprintId: link.blueprintId,
      status,
      actualTime: link.actualTime,
      difficulty: link.difficulty,
    });

    if (link.completed) {
      completedLinks++;
      if (link.actualTime) {
        if (!chainStartTime) chainStartTime = link.actualTime;
        chainEndTime = link.actualTime;
      }
    } else if (brokeAtPosition === null) {
      brokeAtPosition = i;
      brokeAtBlueprintId = link.blueprintId;

      // Mark this blueprint execution as the chain break point
      await supabase
        .from("blueprint_executions")
        .update({ chain_broke_here: true })
        .eq("blueprint_id", link.blueprintId)
        .eq("execution_date", today);
    }
  }

  const totalLinks = links.length || ((chain.total_links as number) ?? 0);
  const completionPercentage =
    totalLinks > 0 ? Math.round((completedLinks / totalLinks) * 100) : 0;
  const wasFullCompletion = completedLinks === totalLinks;

  // Calculate duration
  let totalDurationMinutes: number | null = null;
  if (chainStartTime && chainEndTime) {
    const dur = calculateDeviation(chainStartTime, chainEndTime);
    totalDurationMinutes = dur >= 0 ? dur : null;
  }

  const chainExecutionData = toDb({
    chainId: data.chainId,
    userId: user.id,
    executionDate: today,
    totalLinks,
    completedLinks,
    completionPercentage,
    wasFullCompletion,
    brokeAtPosition,
    brokeAtBlueprintId,
    breakReason: null,
    chainStartTime,
    chainEndTime,
    totalDurationMinutes,
    flowRating: data.flowRating ?? null,
    feltAutomatic: data.feltAutomatic ?? null,
    note: data.note ?? null,
  });

  // Upsert chain execution
  const { data: row, error } = await supabase
    .from("chain_executions")
    .upsert(chainExecutionData, {
      onConflict: "chain_id,execution_date",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Update chain stats
  const timesFullCompletion =
    ((chain.times_full_completion as number) ?? 0) +
    (wasFullCompletion ? 1 : 0);
  const timesPartial =
    ((chain.times_partial as number) ?? 0) + (wasFullCompletion ? 0 : 1);
  const totalExecutions = timesFullCompletion + timesPartial;
  const fullCompletionRate =
    totalExecutions > 0
      ? Math.round((timesFullCompletion / totalExecutions) * 100)
      : 0;

  // Find weakest link (most chain_broke_here)
  const { data: breakData } = await supabase
    .from("blueprint_executions")
    .select("blueprint_id")
    .eq("chain_id", data.chainId)
    .eq("chain_broke_here", true);

  let weakestLinkBlueprintId: string | null = null;
  if (breakData && breakData.length > 0) {
    const breakCounts = new Map<string, number>();
    for (const b of breakData) {
      const bpId = b.blueprint_id as string;
      breakCounts.set(bpId, (breakCounts.get(bpId) ?? 0) + 1);
    }
    let maxBreaks = 0;
    breakCounts.forEach((count, bpId) => {
      if (count > maxBreaks) {
        maxBreaks = count;
        weakestLinkBlueprintId = bpId;
      }
    });
  }

  // Calculate avg break point
  const { data: breakPositions } = await supabase
    .from("chain_executions")
    .select("broke_at_position")
    .eq("chain_id", data.chainId)
    .not("broke_at_position", "is", null);

  let avgBreakPoint: number | null = null;
  if (breakPositions && breakPositions.length > 0) {
    const sum = breakPositions.reduce(
      (acc, r) => acc + (r.broke_at_position as number),
      0,
    );
    avgBreakPoint = Math.round(sum / breakPositions.length);
  }

  // Current streak (consecutive full completions, most recent first)
  const { data: recentExecs } = await supabase
    .from("chain_executions")
    .select("was_full_completion")
    .eq("chain_id", data.chainId)
    .order("execution_date", { ascending: false })
    .limit(100);

  let currentStreak = 0;
  for (const exec of recentExecs ?? []) {
    if (exec.was_full_completion) {
      currentStreak++;
    } else {
      break;
    }
  }

  await supabase
    .from("habit_chains")
    .update({
      times_full_completion: timesFullCompletion,
      times_partial: timesPartial,
      full_completion_rate: fullCompletionRate,
      weakest_link_blueprint_id: weakestLinkBlueprintId,
      avg_break_point: avgBreakPoint,
      current_streak: currentStreak,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.chainId);

  revalidatePath("/habits");
  return fromDb<ChainExecution>(row);
}

// ─────────────────────────────────────────
// 3. LOG ENVIRONMENT PREP
// ─────────────────────────────────────────

export async function logEnvironmentPrep(data: {
  setupId: string;
  itemsTotal?: number;
  itemsCompleted?: number;
  completedItems?: string[];
  totalItems?: number;
}): Promise<void> {
  const { supabase, user } = await getAuthedClient();
  const today = getTodayKarachi();

  // Support both old and new parameter shapes
  const itemsTotal = data.itemsTotal ?? data.totalItems ?? 0;
  const itemsCompleted =
    data.itemsCompleted ?? data.completedItems?.length ?? 0;

  const completionPercentage =
    itemsTotal > 0 ? Math.round((itemsCompleted / itemsTotal) * 100) : 0;

  const prepData = toDb({
    setupId: data.setupId,
    userId: user.id,
    prepDate: today,
    itemsTotal,
    itemsCompleted,
    completionPercentage,
  });

  const { error } = await supabase
    .from("environment_prep_logs")
    .upsert(prepData, {
      onConflict: "setup_id,prep_date",
    });
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// 4. TIMING INSIGHTS
// ─────────────────────────────────────────

export async function getTimingInsights(): Promise<TimingInsight[]> {
  const { supabase, user } = await getAuthedClient();

  // Get active blueprints with intention_time set
  const { data: blueprints, error: bpErr } = await supabase
    .from("habit_blueprints")
    .select("id, habit_name, habit_icon, intention_time")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("intention_time", "is", null);
  if (bpErr) throw new Error(bpErr.message);
  if (!blueprints || blueprints.length === 0) return [];

  const cutoffDate = getDateDaysAgo(14);
  const insights: TimingInsight[] = [];

  for (const bp of blueprints) {
    const { data: executions } = await supabase
      .from("blueprint_executions")
      .select("actual_time, time_deviation_minutes")
      .eq("blueprint_id", bp.id)
      .eq("status", "completed")
      .not("actual_time", "is", null)
      .gte("execution_date", cutoffDate)
      .order("execution_date", { ascending: false })
      .limit(14);

    if (!executions || executions.length < 3) continue;

    const deviations = executions
      .map((e) => e.time_deviation_minutes as number | null)
      .filter((d): d is number => d !== null);

    const actualMinutes = executions
      .map((e) => parseTimeToMinutes(e.actual_time as string))
      .filter((m) => !isNaN(m));

    if (deviations.length === 0 || actualMinutes.length === 0) continue;

    const avgDeviation = Math.round(
      deviations.reduce((a, b) => a + b, 0) / deviations.length,
    );
    const avgActualMin = Math.round(
      actualMinutes.reduce((a, b) => a + b, 0) / actualMinutes.length,
    );
    const onTimeCount = deviations.filter((d) => Math.abs(d) <= 15).length;
    const onTimePercentage = Math.round(
      (onTimeCount / deviations.length) * 100,
    );

    let direction: "early" | "on_time" | "late";
    if (avgDeviation <= -15) {
      direction = "early";
    } else if (avgDeviation >= 15) {
      direction = "late";
    } else {
      direction = "on_time";
    }

    let suggestion: string;
    if (direction === "late" || direction === "early") {
      suggestion = `Consider updating planned time to ${minutesToTime(avgActualMin)}`;
    } else {
      suggestion = "Timing looks consistent - keep it up!";
    }

    insights.push({
      blueprintId: bp.id as string,
      habitName: bp.habit_name as string,
      habitIcon: bp.habit_icon as string | null,
      plannedTime: bp.intention_time as string,
      avgActualTime: minutesToTime(avgActualMin),
      avgDeviationMinutes: avgDeviation,
      onTimePercentage,
      direction,
      suggestion,
    });
  }

  return insights;
}

// ─────────────────────────────────────────
// 5. CHAIN HEALTH INSIGHTS
// ─────────────────────────────────────────

export async function getChainHealthInsights(): Promise<ChainHealthInsight[]> {
  const { supabase, user } = await getAuthedClient();

  const { data: chains, error: chainErr } = await supabase
    .from("habit_chains")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (chainErr) throw new Error(chainErr.message);
  if (!chains || chains.length === 0) return [];

  const cutoffDate = getDateDaysAgo(14);
  const insights: ChainHealthInsight[] = [];

  for (const chain of chains) {
    const chainId = chain.id as string;

    // Get recent executions
    const { data: executions } = await supabase
      .from("chain_executions")
      .select("*")
      .eq("chain_id", chainId)
      .gte("execution_date", cutoffDate)
      .order("execution_date", { ascending: false })
      .limit(14);

    const execCount = executions?.length ?? 0;

    let health: "strong" | "moderate" | "weak" | "new";
    let fullCompletionRate = 0;
    let avgBreakPoint: number | null = null;
    let currentStreak = 0;

    if (execCount < 3) {
      health = "new";
    } else {
      const fullCount = executions!.filter(
        (e) => e.was_full_completion,
      ).length;
      fullCompletionRate = Math.round((fullCount / execCount) * 100);

      const breakPoints = executions!
        .map((e) => e.broke_at_position as number | null)
        .filter((p): p is number => p !== null);
      if (breakPoints.length > 0) {
        avgBreakPoint = Math.round(
          breakPoints.reduce((a, b) => a + b, 0) / breakPoints.length,
        );
      }

      // Current streak (consecutive full completions from most recent)
      for (const exec of executions!) {
        if (exec.was_full_completion) {
          currentStreak++;
        } else {
          break;
        }
      }

      if (fullCompletionRate >= 70) health = "strong";
      else if (fullCompletionRate >= 40) health = "moderate";
      else health = "weak";
    }

    // Find weakest link
    let weakestLinkName: string | null = null;
    let weakestLinkPosition: number | null = null;

    const { data: breakData } = await supabase
      .from("blueprint_executions")
      .select("blueprint_id, chain_position")
      .eq("chain_id", chainId)
      .eq("chain_broke_here", true)
      .gte("execution_date", cutoffDate);

    if (breakData && breakData.length > 0) {
      const breakCounts = new Map<string, number>();
      const positionMap = new Map<string, number>();
      for (const b of breakData) {
        const bpId = b.blueprint_id as string;
        breakCounts.set(bpId, (breakCounts.get(bpId) ?? 0) + 1);
        positionMap.set(bpId, b.chain_position as number);
      }
      let maxBreaks = 0;
      let weakestBpId: string | null = null;
      breakCounts.forEach((count, bpId) => {
        if (count > maxBreaks) {
          maxBreaks = count;
          weakestBpId = bpId;
        }
      });
      if (weakestBpId) {
        weakestLinkPosition = positionMap.get(weakestBpId) ?? null;
        const { data: bpRow } = await supabase
          .from("habit_blueprints")
          .select("habit_name")
          .eq("id", weakestBpId)
          .single();
        weakestLinkName = bpRow ? (bpRow.habit_name as string) : null;
      }
    }

    // Generate suggestions
    const suggestions: string[] = [];
    if (health === "weak") {
      suggestions.push(
        "Consider shortening the chain to build consistency first",
      );
    }
    if (weakestLinkName) {
      suggestions.push(
        `"${weakestLinkName}" is the weakest link - try using its 2-minute version`,
      );
    }
    if (avgBreakPoint !== null && avgBreakPoint <= 1) {
      suggestions.push(
        "Chain tends to break early - ensure the trigger/first habit is easy",
      );
    }
    if (health === "moderate") {
      suggestions.push(
        "Getting there! Focus on completing the full chain 3 days in a row",
      );
    }
    if (health === "strong" && currentStreak >= 5) {
      suggestions.push(
        "Excellent momentum! Consider adding a new link to the chain",
      );
    }
    if (suggestions.length === 0) {
      suggestions.push("Keep logging executions to get personalized insights");
    }

    insights.push({
      chainId,
      chainName: chain.chain_name as string,
      chainIcon: (chain.chain_icon as string) ?? "???",
      totalLinks: (chain.total_links as number) ?? 0,
      fullCompletionRate,
      weakestLinkName,
      weakestLinkPosition,
      avgBreakPoint,
      currentStreak,
      health,
      suggestions,
    });
  }

  return insights;
}

// ─────────────────────────────────────────
// 6. STACK EFFECTIVENESS
// ─────────────────────────────────────────

export async function getStackEffectiveness(): Promise<StackInsight[]> {
  const { supabase, user } = await getAuthedClient();

  // Get blueprints with stacking
  const { data: blueprints, error: bpErr } = await supabase
    .from("habit_blueprints")
    .select("id, habit_name, stack_type, stack_anchor_description")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .neq("stack_type", "none");
  if (bpErr) throw new Error(bpErr.message);
  if (!blueprints || blueprints.length === 0) return [];

  const cutoffDate = getDateDaysAgo(14);
  const insights: StackInsight[] = [];

  for (const bp of blueprints) {
    const { data: executions } = await supabase
      .from("blueprint_executions")
      .select("status, stack_anchor_completed")
      .eq("blueprint_id", bp.id)
      .gte("execution_date", cutoffDate);

    if (!executions || executions.length === 0) continue;

    const withAnchor = executions.filter(
      (e) => e.stack_anchor_completed === true,
    );
    const withoutAnchor = executions.filter(
      (e) => e.stack_anchor_completed === false,
    );

    const completionWithAnchor =
      withAnchor.length > 0
        ? Math.round(
            (withAnchor.filter((e) => e.status === "completed").length /
              withAnchor.length) *
              100,
          )
        : 0;

    const completionWithoutAnchor =
      withoutAnchor.length > 0
        ? Math.round(
            (withoutAnchor.filter((e) => e.status === "completed").length /
              withoutAnchor.length) *
              100,
          )
        : 0;

    let effectiveness: string;
    const delta = completionWithAnchor - completionWithoutAnchor;
    if (withAnchor.length === 0 || withoutAnchor.length === 0) {
      effectiveness = "Not enough data for comparison";
    } else if (delta >= 20) {
      effectiveness = "Stack is highly effective";
    } else if (delta >= 5) {
      effectiveness = "Stack is moderately effective";
    } else if (delta >= -5) {
      effectiveness = "Stack has minimal effect";
    } else {
      effectiveness = "Stack may not be helping - consider a different anchor";
    }

    insights.push({
      blueprintId: bp.id as string,
      habitName: bp.habit_name as string,
      completionWithAnchor,
      completionWithoutAnchor,
      anchorDescription: bp.stack_anchor_description as string | null,
      effectiveness,
    });
  }

  return insights;
}

// ─────────────────────────────────────────
// 7. ENVIRONMENT IMPACT
// ─────────────────────────────────────────

export async function getEnvironmentImpact(): Promise<
  EnvironmentImpactInsight[]
> {
  const { supabase, user } = await getAuthedClient();

  const { data: setups, error: setupErr } = await supabase
    .from("environment_setups")
    .select("id, space_name, linked_blueprint_ids")
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (setupErr) throw new Error(setupErr.message);
  if (!setups || setups.length === 0) return [];

  const cutoffDate = getDateDaysAgo(14);
  const insights: EnvironmentImpactInsight[] = [];

  for (const setup of setups) {
    const linkedBlueprintIds =
      (setup.linked_blueprint_ids as string[]) ?? [];
    if (linkedBlueprintIds.length === 0) continue;

    // Get prep logs for this setup
    const { data: prepLogs } = await supabase
      .from("environment_prep_logs")
      .select("prep_date, completion_percentage")
      .eq("setup_id", setup.id)
      .gte("prep_date", cutoffDate);

    // Build a set of dates with prep (completion > 50%)
    const datesWithPrep = new Set<string>();
    const allPrepDates = new Set<string>();
    for (const log of prepLogs ?? []) {
      const date = log.prep_date as string;
      allPrepDates.add(date);
      if ((log.completion_percentage as number) > 50) {
        datesWithPrep.add(date);
      }
    }

    // Get linked blueprint executions in the same period
    const { data: executions } = await supabase
      .from("blueprint_executions")
      .select("execution_date, status")
      .in(
        "blueprint_id",
        linkedBlueprintIds.length > 0 ? linkedBlueprintIds : ["__none__"],
      )
      .gte("execution_date", cutoffDate);

    if (!executions || executions.length === 0) continue;

    // Split executions by prep vs no-prep days
    const withPrep = executions.filter((e) =>
      datesWithPrep.has(e.execution_date as string),
    );
    const withoutPrep = executions.filter(
      (e) => !datesWithPrep.has(e.execution_date as string),
    );

    const completionWithPrep =
      withPrep.length > 0
        ? Math.round(
            (withPrep.filter((e) => e.status === "completed").length /
              withPrep.length) *
              100,
          )
        : 0;

    const completionWithoutPrep =
      withoutPrep.length > 0
        ? Math.round(
            (withoutPrep.filter((e) => e.status === "completed").length /
              withoutPrep.length) *
              100,
          )
        : 0;

    const impactDelta = completionWithPrep - completionWithoutPrep;
    const prepRate =
      allPrepDates.size > 0
        ? Math.round((datesWithPrep.size / allPrepDates.size) * 100)
        : 0;

    let message: string;
    if (withPrep.length === 0 || withoutPrep.length === 0) {
      message = "Need more data - keep logging prep and executions";
    } else if (impactDelta >= 20) {
      message = `Prepping "${setup.space_name}" boosts completion by ${impactDelta}%!`;
    } else if (impactDelta >= 5) {
      message = `Prepping "${setup.space_name}" helps moderately (+${impactDelta}%)`;
    } else {
      message = `Prep doesn't seem to impact completion much for "${setup.space_name}"`;
    }

    insights.push({
      setupName: setup.space_name as string,
      prepRate,
      completionWithPrep,
      completionWithoutPrep,
      impactDelta,
      message,
    });
  }

  return insights;
}

// ─────────────────────────────────────────
// 8. BLUEPRINT EXECUTION HISTORY
// ─────────────────────────────────────────

export async function getBlueprintExecutionHistory(
  blueprintId: string,
  days: number = 30,
): Promise<BlueprintExecution[]> {
  const { supabase } = await getAuthedClient();
  const cutoffDate = getDateDaysAgo(days);

  const { data, error } = await supabase
    .from("blueprint_executions")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .gte("execution_date", cutoffDate)
    .order("execution_date", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<BlueprintExecution>(row));
}

// ─────────────────────────────────────────
// 9. CHAIN EXECUTION HISTORY
// ─────────────────────────────────────────

export async function getChainExecutionHistory(
  chainId: string,
  days: number = 30,
): Promise<ChainExecution[]> {
  const { supabase } = await getAuthedClient();
  const cutoffDate = getDateDaysAgo(days);

  const { data, error } = await supabase
    .from("chain_executions")
    .select("*")
    .eq("chain_id", chainId)
    .gte("execution_date", cutoffDate)
    .order("execution_date", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<ChainExecution>(row));
}

// ─────────────────────────────────────────
// 10. TODAY'S EXECUTIONS
// ─────────────────────────────────────────

export async function getTodayExecutions(): Promise<BlueprintExecution[]> {
  const { supabase, user } = await getAuthedClient();
  const today = getTodayKarachi();

  const { data, error } = await supabase
    .from("blueprint_executions")
    .select("*")
    .eq("user_id", user.id)
    .eq("execution_date", today);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<BlueprintExecution>(row));
}
