"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb } from "@/lib/utils";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface BlueprintExecution {
  id: string;
  userId: string;
  blueprintId: string;
  chainId: string | null;
  executionDate: string;
  status: "completed" | "skipped" | "two_minute";
  plannedTime: string | null;
  actualTime: string | null;
  difficulty: "easy" | "moderate" | "hard" | "struggled" | null;
  satisfaction: number | null;
  skipReason: string | null;
  note: string | null;
  anchorCompleted: boolean | null;
  createdAt: string;
}

export interface TimingInsight {
  blueprintId: string;
  habitName: string;
  habitIcon: string | null;
  plannedTime: string | null;
  avgActualTime: string | null;
  deviationMinutes: number;
  onTimePercentage: number;
  direction: "early" | "on_time" | "late";
  suggestion: string | null;
}

export interface ChainHealthInsight {
  chainId: string;
  chainName: string;
  chainIcon: string;
  health: "strong" | "moderate" | "weak" | "new";
  fullCompletionRate: number;
  weakestLinkIndex: number | null;
  weakestLinkName: string | null;
  avgBreakPoint: number | null;
  currentStreak: number;
  suggestions: string[];
}

export interface StackInsight {
  blueprintId: string;
  habitName: string;
  withAnchorRate: number;
  withoutAnchorRate: number;
  delta: number;
  effectiveness: string;
}

export interface EnvironmentImpactInsight {
  setupId: string;
  spaceName: string;
  spaceIcon: string | null;
  prepRate: number;
  withPrepRate: number;
  withoutPrepRate: number;
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
// LOGGING ACTIONS
// ─────────────────────────────────────────

export async function logBlueprintExecution(data: {
  blueprintId: string;
  chainId?: string;
  status: "completed" | "skipped" | "two_minute";
  plannedTime?: string;
  actualTime?: string;
  difficulty?: "easy" | "moderate" | "hard" | "struggled";
  satisfaction?: number;
  skipReason?: string;
  note?: string;
  anchorCompleted?: boolean;
}): Promise<BlueprintExecution> {
  const { supabase, user } = await getAuthedClient();
  const today = new Date().toISOString().split("T")[0];

  const insertData = toDb({
    userId: user.id,
    blueprintId: data.blueprintId,
    chainId: data.chainId || undefined,
    executionDate: today,
    status: data.status,
    plannedTime: data.plannedTime || undefined,
    actualTime: data.actualTime || undefined,
    difficulty: data.difficulty || undefined,
    satisfaction: data.satisfaction || undefined,
    skipReason: data.skipReason || undefined,
    note: data.note || undefined,
    anchorCompleted: data.anchorCompleted || undefined,
  });

  const { data: row, error } = await supabase
    .from("blueprint_executions")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<BlueprintExecution>(row);
}

export async function logChainExecution(data: {
  chainId: string;
  flowRating: number;
  feltAutomatic: boolean;
}): Promise<void> {
  const { supabase, user } = await getAuthedClient();
  const today = new Date().toISOString().split("T")[0];

  const insertData = toDb({
    userId: user.id,
    chainId: data.chainId,
    executionDate: today,
    flowRating: data.flowRating,
    feltAutomatic: data.feltAutomatic,
  });

  const { error } = await supabase
    .from("chain_executions")
    .insert(insertData);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function logEnvironmentPrep(data: {
  setupId: string;
  completedItems: string[];
  totalItems: number;
}): Promise<void> {
  const { supabase, user } = await getAuthedClient();
  const today = new Date().toISOString().split("T")[0];

  const insertData = toDb({
    userId: user.id,
    setupId: data.setupId,
    prepDate: today,
    completedItems: data.completedItems,
    totalItems: data.totalItems,
  });

  const { error } = await supabase
    .from("environment_prep_logs")
    .insert(insertData);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// QUERY ACTIONS
// ─────────────────────────────────────────

export async function getTodayExecutions(): Promise<BlueprintExecution[]> {
  const { supabase, user } = await getAuthedClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("blueprint_executions")
    .select("*")
    .eq("user_id", user.id)
    .eq("execution_date", today);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<BlueprintExecution>(row));
}

export async function getBlueprintExecutionHistory(
  blueprintId: string,
  days = 30,
): Promise<BlueprintExecution[]> {
  const { supabase, user } = await getAuthedClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("blueprint_executions")
    .select("*")
    .eq("user_id", user.id)
    .eq("blueprint_id", blueprintId)
    .gte("execution_date", since.toISOString().split("T")[0])
    .order("execution_date", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<BlueprintExecution>(row));
}

// ─────────────────────────────────────────
// INSIGHT ACTIONS
// ─────────────────────────────────────────

export async function getTimingInsights(): Promise<TimingInsight[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase.rpc("get_timing_insights", {
    p_user_id: user.id,
  });
  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>) => fromDb<TimingInsight>(row));
}

export async function getChainHealthInsights(): Promise<ChainHealthInsight[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase.rpc("get_chain_health_insights", {
    p_user_id: user.id,
  });
  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>) => fromDb<ChainHealthInsight>(row));
}

export async function getStackEffectiveness(): Promise<StackInsight[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase.rpc("get_stack_effectiveness", {
    p_user_id: user.id,
  });
  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>) => fromDb<StackInsight>(row));
}

export async function getEnvironmentImpact(): Promise<EnvironmentImpactInsight[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase.rpc("get_environment_impact", {
    p_user_id: user.id,
  });
  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>) => fromDb<EnvironmentImpactInsight>(row));
}
