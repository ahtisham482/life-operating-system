"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb } from "@/lib/utils";
import { getTodayKarachi } from "@/lib/utils";
import {
  type HabitContract,
  type SavingsJar,
  type SavingsTransaction,
  type Projection,
  type MilestoneCard,
  calculateProjections,
  getHabitMetric,
  generateMilestoneCard,
} from "@/lib/contracts";

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
// CONTRACTS
// ─────────────────────────────────────────

export async function createContract(data: {
  habitName: string;
  identityStatement?: string;
  implementationIntention?: string;
  twoMinuteVersion?: string;
  rewardText?: string;
  partnerName?: string;
  partnerEmail?: string;
  maxConsecutiveMisses?: number;
  penaltyDescription?: string;
  penaltyAmount?: number;
  penaltyCurrency?: string;
  commitmentDays?: number;
  startDate?: string;
}): Promise<HabitContract> {
  const { supabase, user } = await getAuthedClient();

  const startDate = data.startDate || getTodayKarachi();
  const commitmentDays = data.commitmentDays || 30;

  // Calculate end_date from start_date + commitment_days
  const endDateObj = new Date(startDate + "T12:00:00");
  endDateObj.setDate(endDateObj.getDate() + commitmentDays);
  const endDate = endDateObj.toISOString().slice(0, 10);

  const { data: row, error } = await supabase
    .from("habit_contracts")
    .insert(
      toDb({
        userId: user.id,
        habitName: data.habitName,
        identityStatement: data.identityStatement || undefined,
        implementationIntention: data.implementationIntention || undefined,
        twoMinuteVersion: data.twoMinuteVersion || undefined,
        rewardText: data.rewardText || undefined,
        partnerName: data.partnerName || undefined,
        partnerEmail: data.partnerEmail || undefined,
        maxConsecutiveMisses: data.maxConsecutiveMisses || undefined,
        penaltyDescription: data.penaltyDescription || undefined,
        penaltyAmount: data.penaltyAmount || undefined,
        penaltyCurrency: data.penaltyCurrency || undefined,
        commitmentDays,
        startDate,
        endDate,
        status: "active",
        currentConsecutiveMisses: 0,
        totalCompletions: 0,
        totalMisses: 0,
        penaltyTriggered: false,
        signedAt: new Date().toISOString(),
      }),
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<HabitContract>(row);
}

export async function getContracts(): Promise<HabitContract[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("habit_contracts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromDb<HabitContract>(row));
}

export async function deleteContract(id: string) {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("habit_contracts")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

export async function logContractDay(
  contractId: string,
  completed: boolean,
): Promise<HabitContract> {
  const { supabase } = await getAuthedClient();

  // Fetch current contract
  const { data: contract, error: fetchErr } = await supabase
    .from("habit_contracts")
    .select("*")
    .eq("id", contractId)
    .single();

  if (fetchErr || !contract) throw new Error("Contract not found");

  const update: Record<string, unknown> = {};

  if (completed) {
    update.total_completions = (contract.total_completions ?? 0) + 1;
    update.current_consecutive_misses = 0;
  } else {
    update.total_misses = (contract.total_misses ?? 0) + 1;
    const newMisses = (contract.current_consecutive_misses ?? 0) + 1;
    update.current_consecutive_misses = newMisses;

    // Check penalty trigger
    if (newMisses >= (contract.max_consecutive_misses ?? 3)) {
      update.penalty_triggered = true;
      update.penalty_triggered_at = new Date().toISOString();
      update.status = "violated";
    }
  }

  // Check if contract period ended
  const today = getTodayKarachi();
  if (contract.end_date && today >= contract.end_date) {
    const totalActions =
      (update.total_completions ?? contract.total_completions ?? 0) as number;
    const totalMisses =
      (update.total_misses ?? contract.total_misses ?? 0) as number;
    const total = totalActions + totalMisses;
    const completionRate = total > 0 ? (totalActions / total) * 100 : 0;

    if (update.status !== "violated") {
      update.status = completionRate >= 80 ? "completed" : "expired";
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from("habit_contracts")
    .update(update)
    .eq("id", contractId)
    .select()
    .single();

  if (updateErr) throw new Error(updateErr.message);

  revalidatePath("/habits");
  return fromDb<HabitContract>(updated);
}

export async function updateContractStatus(
  contractId: string,
  status: "active" | "completed" | "violated" | "expired",
) {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("habit_contracts")
    .update({ status })
    .eq("id", contractId);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// SAVINGS JARS
// ─────────────────────────────────────────

export async function createJar(data: {
  jarName: string;
  jarIcon?: string;
  goalAmount: number;
  currency?: string;
  goalDescription?: string;
}): Promise<SavingsJar> {
  const { supabase, user } = await getAuthedClient();

  const { data: row, error } = await supabase
    .from("savings_jars")
    .insert(
      toDb({
        userId: user.id,
        jarName: data.jarName,
        jarIcon: data.jarIcon || undefined,
        goalAmount: data.goalAmount,
        currency: data.currency || undefined,
        goalDescription: data.goalDescription || undefined,
        currentAmount: 0,
        isActive: true,
        completed: false,
      }),
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<SavingsJar>(row);
}

export async function getJars(): Promise<SavingsJar[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("savings_jars")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromDb<SavingsJar>(row));
}

export async function deleteJar(id: string) {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("savings_jars")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

export async function addTransaction(data: {
  jarId: string;
  amount: number;
  description: string;
  habitName?: string;
}): Promise<SavingsTransaction> {
  const { supabase, user } = await getAuthedClient();

  // Insert transaction
  const { data: txn, error: txnErr } = await supabase
    .from("savings_transactions")
    .insert(
      toDb({
        jarId: data.jarId,
        userId: user.id,
        amount: data.amount,
        description: data.description,
        habitName: data.habitName || undefined,
        transactionDate: getTodayKarachi(),
      }),
    )
    .select()
    .single();

  if (txnErr) throw new Error(txnErr.message);

  // Update jar's current_amount
  const { data: jar, error: jarErr } = await supabase
    .from("savings_jars")
    .select("current_amount, goal_amount")
    .eq("id", data.jarId)
    .single();

  if (jarErr) throw new Error(jarErr.message);

  const newAmount = (jar.current_amount ?? 0) + data.amount;
  const jarUpdate: Record<string, unknown> = { current_amount: newAmount };

  if (newAmount >= jar.goal_amount) {
    jarUpdate.completed = true;
    jarUpdate.completed_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from("savings_jars")
    .update(jarUpdate)
    .eq("id", data.jarId);

  if (updateErr) throw new Error(updateErr.message);

  revalidatePath("/habits");
  return fromDb<SavingsTransaction>(txn);
}

export async function getTransactions(
  jarId: string,
  limit?: number,
): Promise<SavingsTransaction[]> {
  const { supabase } = await getAuthedClient();

  let query = supabase
    .from("savings_transactions")
    .select("*")
    .eq("jar_id", jarId)
    .order("transaction_date", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromDb<SavingsTransaction>(row));
}

export async function getJarSummary(): Promise<{
  jars: SavingsJar[];
  totalSaved: number;
}> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("savings_jars")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const jars = (data ?? []).map((row) => fromDb<SavingsJar>(row));
  const totalSaved = jars.reduce((sum, jar) => sum + jar.currentAmount, 0);

  return { jars, totalSaved };
}

// ─────────────────────────────────────────
// PROJECTIONS
// ─────────────────────────────────────────

export async function getProjections(): Promise<Projection[]> {
  const { supabase, user } = await getAuthedClient();

  // Get all active habits
  const { data: habits, error: habitsErr } = await supabase
    .from("habits")
    .select("id, name, emoji")
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (habitsErr) throw new Error(habitsErr.message);
  if (!habits || habits.length === 0) return [];

  const projections: Projection[] = [];

  for (const habit of habits) {
    // Count completions
    const { count: completions } = await supabase
      .from("habit_logs")
      .select("id", { count: "exact", head: true })
      .eq("habit_id", habit.id)
      .eq("status", "completed");

    // Count total days tracked
    const { count: totalDays } = await supabase
      .from("habit_logs")
      .select("id", { count: "exact", head: true })
      .eq("habit_id", habit.id);

    const customMetric = getHabitMetric(habit.name);
    const projection = calculateProjections(
      habit.name,
      habit.emoji || "",
      completions ?? 0,
      totalDays ?? 0,
      customMetric,
    );

    projections.push(projection);
  }

  return projections;
}

// ─────────────────────────────────────────
// MILESTONE CARDS
// ─────────────────────────────────────────

export async function getMilestoneCards(): Promise<MilestoneCard[]> {
  const { supabase, user } = await getAuthedClient();

  // Get all active habits with streaks
  const { data: habits, error: habitsErr } = await supabase
    .from("habits")
    .select("id, name, emoji, current_streak, identity_id")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .gte("current_streak", 7);

  if (habitsErr) throw new Error(habitsErr.message);
  if (!habits || habits.length === 0) return [];

  const cards: MilestoneCard[] = [];

  for (const habit of habits) {
    // Calculate completion rate from habit_logs
    const { count: completions } = await supabase
      .from("habit_logs")
      .select("id", { count: "exact", head: true })
      .eq("habit_id", habit.id)
      .eq("status", "completed");

    const { count: totalDays } = await supabase
      .from("habit_logs")
      .select("id", { count: "exact", head: true })
      .eq("habit_id", habit.id);

    const completionRate =
      (totalDays ?? 0) > 0
        ? Math.round(((completions ?? 0) / (totalDays ?? 1)) * 100)
        : 0;

    // Generate cumulative impact string
    const metric = getHabitMetric(habit.name);
    const cumulativeImpact = metric
      ? `~${((completions ?? 0) * metric.perCompletion).toLocaleString()} ${metric.unit}`
      : `${completions ?? 0} completions`;

    // Get linked identity statement if any
    let identityStatement: string | null = null;
    if (habit.identity_id) {
      const { data: identity } = await supabase
        .from("user_identities")
        .select("identity_statement")
        .eq("id", habit.identity_id)
        .single();
      identityStatement = identity?.identity_statement || null;
    }

    const card = generateMilestoneCard(
      habit.name,
      habit.current_streak ?? 0,
      completionRate,
      identityStatement,
      cumulativeImpact,
    );

    if (card) {
      cards.push(card);
    }
  }

  return cards;
}
