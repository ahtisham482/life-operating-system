"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb, getTodayKarachi } from "@/lib/utils";
import {
  type Gateway,
  type GatewayExecution,
  type FrictionMap,
  type FrictionStep,
  type FrictionAction,
  type DecisiveMoment,
  type MomentLog,
  PHASE_NAMES,
  generatePhases,
  autoDetectSteps,
  calculateFrictionScore,
} from "@/lib/friction";

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
// GATEWAYS
// ─────────────────────────────────────────

export async function createGateway(data: {
  ultimateHabit: string;
  ultimateCategory?: string;
  phases?: { description: string; durationValue: number; targetDays: number }[];
}): Promise<Gateway> {
  const { supabase, user } = await getAuthedClient();

  const phases = data.phases ?? generatePhases(data.ultimateHabit);

  const insertData = toDb({
    userId: user.id,
    ultimateHabit: data.ultimateHabit,
    ultimateCategory: data.ultimateCategory || undefined,
    currentPhase: 1,
    currentPhaseName: PHASE_NAMES[1],
    phase1Description: phases[0]?.description ?? "",
    phase1DurationValue: phases[0]?.durationValue ?? 2,
    phase1TargetDays: phases[0]?.targetDays ?? 14,
    phase1DaysDone: 0,
    phase1Completed: false,
    phase2Description: phases[1]?.description || undefined,
    phase2DurationValue: phases[1]?.durationValue || undefined,
    phase2TargetDays: phases[1]?.targetDays || undefined,
    phase2DaysDone: 0,
    phase2Completed: false,
    phase3Description: phases[2]?.description || undefined,
    phase3DurationValue: phases[2]?.durationValue || undefined,
    phase3TargetDays: phases[2]?.targetDays || undefined,
    phase3DaysDone: 0,
    phase3Completed: false,
    phase4Description: phases[3]?.description || undefined,
    phase4DurationValue: phases[3]?.durationValue || undefined,
    phase4TargetDays: phases[3]?.targetDays || undefined,
    phase4DaysDone: 0,
    phase4Completed: false,
    phase5Description: phases[4]?.description || undefined,
    phase5DurationValue: phases[4]?.durationValue || undefined,
    phase5DaysDone: 0,
    totalLevelUps: 0,
    totalLevelDowns: 0,
  });

  const { data: row, error } = await supabase
    .from("gateways")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Gateway>(row);
}

export async function getGateways(): Promise<Gateway[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("gateways")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<Gateway>(row));
}

export async function deleteGateway(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase.from("gateways").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function logGatewayExecution(data: {
  gatewayId: string;
  completed: boolean;
  actualDurationValue?: number;
  feltEasy?: boolean;
  feltAutomatic?: boolean;
  wantedToDoMore?: boolean;
  resistanceLevel?: number;
  note?: string;
}): Promise<GatewayExecution> {
  const { supabase } = await getAuthedClient();
  const today = getTodayKarachi();

  // Get gateway to determine current phase and target value
  const { data: gateway, error: gwErr } = await supabase
    .from("gateways")
    .select("*")
    .eq("id", data.gatewayId)
    .single();
  if (gwErr) throw new Error(gwErr.message);

  const currentPhase = gateway.current_phase as number;
  const phaseKey = `phase_${currentPhase}_duration_value`;
  const targetValue = gateway[phaseKey] as number;

  // Determine status
  let status: string;
  let exceededBy: number | null = null;

  if (!data.completed) {
    status =
      data.actualDurationValue && data.actualDurationValue > 0
        ? "partial"
        : "skipped";
  } else {
    if (
      data.actualDurationValue &&
      targetValue &&
      data.actualDurationValue > targetValue
    ) {
      status = "exceeded";
      exceededBy = data.actualDurationValue - targetValue;
    } else {
      status = "completed";
    }
  }

  const executionData = toDb({
    gatewayId: data.gatewayId,
    executionDate: today,
    phaseAtExecution: currentPhase,
    status,
    actualDurationValue: data.actualDurationValue || undefined,
    exceededBy: exceededBy || undefined,
    feltEasy: data.feltEasy || undefined,
    feltAutomatic: data.feltAutomatic || undefined,
    wantedToDoMore: data.wantedToDoMore || undefined,
    resistanceLevel: data.resistanceLevel || undefined,
    note: data.note || undefined,
  });

  // Upsert (on conflict: gateway_id + execution_date)
  const { data: row, error } = await supabase
    .from("gateway_executions")
    .upsert(executionData, {
      onConflict: "gateway_id,execution_date",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Update gateway: increment phase_X_days_done for current phase
  if (data.completed) {
    const daysDoneKey = `phase_${currentPhase}_days_done`;
    const currentDaysDone = (gateway[daysDoneKey] as number) ?? 0;

    await supabase
      .from("gateways")
      .update({
        [daysDoneKey]: currentDaysDone + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.gatewayId);
  }

  revalidatePath("/habits");
  return fromDb<GatewayExecution>(row);
}

export async function levelUp(gatewayId: string): Promise<Gateway> {
  const { supabase } = await getAuthedClient();

  const { data: gateway, error: gwErr } = await supabase
    .from("gateways")
    .select("*")
    .eq("id", gatewayId)
    .single();
  if (gwErr) throw new Error(gwErr.message);

  const currentPhase = gateway.current_phase as number;
  if (currentPhase >= 5) throw new Error("Already at maximum phase");

  const newPhase = currentPhase + 1;
  const phaseCompletedKey = `phase_${currentPhase}_completed`;

  const { data: row, error } = await supabase
    .from("gateways")
    .update({
      [phaseCompletedKey]: true,
      current_phase: newPhase,
      current_phase_name: PHASE_NAMES[newPhase],
      total_level_ups: ((gateway.total_level_ups as number) ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gatewayId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Gateway>(row);
}

export async function levelDown(gatewayId: string): Promise<Gateway> {
  const { supabase } = await getAuthedClient();

  const { data: gateway, error: gwErr } = await supabase
    .from("gateways")
    .select("*")
    .eq("id", gatewayId)
    .single();
  if (gwErr) throw new Error(gwErr.message);

  const currentPhase = gateway.current_phase as number;
  if (currentPhase <= 1) throw new Error("Already at minimum phase");

  const newPhase = currentPhase - 1;

  const { data: row, error } = await supabase
    .from("gateways")
    .update({
      current_phase: newPhase,
      current_phase_name: PHASE_NAMES[newPhase],
      total_level_downs: ((gateway.total_level_downs as number) ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gatewayId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Gateway>(row);
}

export async function getGatewayExecutions(
  gatewayId: string,
  days: number = 30,
): Promise<GatewayExecution[]> {
  const { supabase } = await getAuthedClient();

  const cutoffDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() - days * 86400000));

  const { data, error } = await supabase
    .from("gateway_executions")
    .select("*")
    .eq("gateway_id", gatewayId)
    .gte("execution_date", cutoffDate)
    .order("execution_date", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<GatewayExecution>(row));
}

// ─────────────────────────────────────────
// FRICTION MAPS
// ─────────────────────────────────────────

export async function createFrictionMap(data: {
  habitName: string;
  habitType: "good_habit" | "bad_habit";
  steps?: FrictionStep[];
  frictionReducers?: FrictionAction[];
  frictionAdders?: FrictionAction[];
  decisionPoints?: number;
}): Promise<FrictionMap> {
  const { supabase, user } = await getAuthedClient();

  const steps = data.steps ?? autoDetectSteps(data.habitName, data.habitType);
  const frictionReducers = data.frictionReducers ?? [];
  const frictionAdders = data.frictionAdders ?? [];
  const frictionScore = calculateFrictionScore(
    steps,
    frictionReducers,
    frictionAdders,
  );

  const totalSteps = steps.filter((s) => !s.isEliminated).length;
  const timeToStartSeconds = steps
    .filter((s) => !s.isEliminated)
    .reduce((sum, s) => sum + s.timeSeconds, 0);

  const insertData = toDb({
    userId: user.id,
    habitName: data.habitName,
    habitType: data.habitType,
    stepsList: steps,
    frictionReducers,
    frictionAdders,
    frictionScore,
    totalSteps,
    timeToStartSeconds,
    decisionPoints: data.decisionPoints ?? 0,
  });

  const { data: row, error } = await supabase
    .from("friction_maps")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<FrictionMap>(row);
}

export async function getFrictionMaps(): Promise<FrictionMap[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("friction_maps")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<FrictionMap>(row));
}

export async function deleteFrictionMap(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("friction_maps")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function applyFrictionChange(
  frictionMapId: string,
  data: {
    type: "reduce" | "add";
    action: string;
    impact: string;
    eliminatesStepIndex?: number;
  },
): Promise<FrictionMap> {
  const { supabase } = await getAuthedClient();

  // Get current friction map
  const { data: current, error: fetchErr } = await supabase
    .from("friction_maps")
    .select("*")
    .eq("id", frictionMapId)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  const steps = (current.steps_list as FrictionStep[]) ?? [];
  const frictionReducers =
    (current.friction_reducers as FrictionAction[]) ?? [];
  const frictionAdders = (current.friction_adders as FrictionAction[]) ?? [];

  const newAction: FrictionAction = {
    action: data.action,
    status: "active",
    impact: data.impact,
    addedAt: new Date().toISOString(),
  };

  if (data.type === "reduce") {
    frictionReducers.push(newAction);

    // Optionally mark step as eliminated
    if (
      data.eliminatesStepIndex !== undefined &&
      data.eliminatesStepIndex >= 0 &&
      data.eliminatesStepIndex < steps.length
    ) {
      steps[data.eliminatesStepIndex].isEliminated = true;
    }
  } else {
    frictionAdders.push(newAction);
  }

  const frictionScore = calculateFrictionScore(
    steps,
    frictionReducers,
    frictionAdders,
  );
  const totalSteps = steps.filter((s) => !s.isEliminated).length;

  const { data: row, error } = await supabase
    .from("friction_maps")
    .update(
      toDb({
        stepsList: steps,
        frictionReducers,
        frictionAdders,
        frictionScore,
        totalSteps,
        updatedAt: new Date().toISOString(),
      }),
    )
    .eq("id", frictionMapId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<FrictionMap>(row);
}

// ─────────────────────────────────────────
// DECISIVE MOMENTS
// ─────────────────────────────────────────

export async function createDecisiveMoment(data: {
  momentName: string;
  momentTrigger?: string;
  momentTime?: string;
  momentLocation?: string;
  productivePath: string;
  productiveOutcome?: string;
  productiveSteps?: number;
  destructivePath: string;
  destructiveOutcome?: string;
  destructiveSteps?: number;
  preDecision?: string;
  preDecisionCue?: string;
  identityId?: string;
  identityQuestion?: string;
  importanceLevel?: string;
}): Promise<DecisiveMoment> {
  const { supabase, user } = await getAuthedClient();

  const insertData = toDb({
    userId: user.id,
    momentName: data.momentName,
    momentTrigger: data.momentTrigger || undefined,
    momentTime: data.momentTime || undefined,
    momentLocation: data.momentLocation || undefined,
    productivePath: data.productivePath,
    productiveOutcome: data.productiveOutcome || undefined,
    productiveSteps: data.productiveSteps || undefined,
    destructivePath: data.destructivePath,
    destructiveOutcome: data.destructiveOutcome || undefined,
    destructiveSteps: data.destructiveSteps || undefined,
    preDecision: data.preDecision || undefined,
    preDecisionCue: data.preDecisionCue || undefined,
    identityId: data.identityId || undefined,
    identityQuestion: data.identityQuestion || undefined,
    importanceLevel: data.importanceLevel || undefined,
  });

  const { data: row, error } = await supabase
    .from("decisive_moments")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<DecisiveMoment>(row);
}

export async function getDecisiveMoments(): Promise<DecisiveMoment[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("decisive_moments")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<DecisiveMoment>(row));
}

export async function deleteDecisiveMoment(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("decisive_moments")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function logMomentOutcome(data: {
  momentId: string;
  pathChosen: "productive" | "destructive";
  wasPreDecided?: boolean;
  environmentWasReady?: boolean;
  wasConsciousChoice?: boolean;
  autopilot?: boolean;
  subsequentHoursQuality?: number;
  whatHelped?: string;
  whatWouldChange?: string;
  note?: string;
}): Promise<MomentLog> {
  const { supabase } = await getAuthedClient();
  const today = getTodayKarachi();

  const logData = toDb({
    momentId: data.momentId,
    logDate: today,
    pathChosen: data.pathChosen,
    wasPreDecided: data.wasPreDecided ?? false,
    environmentWasReady: data.environmentWasReady ?? false,
    wasConsciousChoice: data.wasConsciousChoice ?? false,
    autopilot: data.autopilot ?? false,
    subsequentHoursQuality: data.subsequentHoursQuality || undefined,
    whatHelped: data.whatHelped || undefined,
    whatWouldChange: data.whatWouldChange || undefined,
    note: data.note || undefined,
  });

  // Upsert into decisive_moment_logs
  const { data: row, error } = await supabase
    .from("decisive_moment_logs")
    .upsert(logData, {
      onConflict: "moment_id,log_date",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Update moment stats
  const { data: moment, error: mErr } = await supabase
    .from("decisive_moments")
    .select(
      "times_faced, times_productive, times_destructive, productive_rate, current_productive_streak",
    )
    .eq("id", data.momentId)
    .single();
  if (mErr) throw new Error(mErr.message);

  const timesFaced = ((moment.times_faced as number) ?? 0) + 1;
  const timesProductive =
    ((moment.times_productive as number) ?? 0) +
    (data.pathChosen === "productive" ? 1 : 0);
  const timesDestructive =
    ((moment.times_destructive as number) ?? 0) +
    (data.pathChosen === "destructive" ? 1 : 0);
  const productiveRate =
    timesFaced > 0 ? Math.round((timesProductive / timesFaced) * 100) : 0;

  const currentStreak =
    (moment.current_productive_streak as number) ?? 0;
  const currentProductiveStreak =
    data.pathChosen === "productive" ? currentStreak + 1 : 0;

  await supabase
    .from("decisive_moments")
    .update({
      times_faced: timesFaced,
      times_productive: timesProductive,
      times_destructive: timesDestructive,
      productive_rate: productiveRate,
      current_productive_streak: currentProductiveStreak,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.momentId);

  revalidatePath("/habits");
  return fromDb<MomentLog>(row);
}

export async function getMomentLogs(
  momentId: string,
  days: number = 30,
): Promise<MomentLog[]> {
  const { supabase } = await getAuthedClient();

  const cutoffDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() - days * 86400000));

  const { data, error } = await supabase
    .from("decisive_moment_logs")
    .select("*")
    .eq("moment_id", momentId)
    .gte("log_date", cutoffDate)
    .order("log_date", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<MomentLog>(row));
}
