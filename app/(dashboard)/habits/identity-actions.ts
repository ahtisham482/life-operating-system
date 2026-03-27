"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTodayKarachi } from "@/lib/utils";
import {
  computeConfidenceScore,
  MILESTONE_DEFS,
  getWeekKey,
  type MilestoneDef,
} from "@/lib/identity";
import type { IdentityCategory } from "@/lib/db/schema";

// ─────────────────────────────────────────
// IDENTITY CRUD
// ─────────────────────────────────────────

export async function createIdentity(fields: {
  identityStatement: string;
  identityCategory: IdentityCategory;
  icon?: string;
  color?: string;
  whyStatement?: string;
}): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Validate "I am" format
  let statement = fields.identityStatement.trim();
  if (!statement.toLowerCase().startsWith("i am")) {
    statement = "I am " + statement;
  }
  // Normalise capitalisation
  statement = "I am" + statement.slice(4);

  if (statement.length < 8) {
    throw new Error("Identity statement is too short. Be specific.");
  }

  // Cap at 5 active identities
  const { count } = await supabase
    .from("user_identities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  if ((count ?? 0) >= 5) {
    throw new Error(
      "You can have at most 5 active identities. Pause one before adding another.",
    );
  }

  const { data, error } = await supabase
    .from("user_identities")
    .insert({
      user_id: user.id,
      identity_statement: statement,
      identity_category: fields.identityCategory,
      icon: fields.icon ?? null,
      color: fields.color ?? "#FF6B6B",
      why_statement: fields.whyStatement ?? null,
      confidence_level: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return data.id;
}

export async function updateIdentity(
  id: string,
  fields: {
    identityStatement?: string;
    identityCategory?: IdentityCategory;
    icon?: string | null;
    color?: string;
    whyStatement?: string | null;
    status?: "active" | "paused" | "archived";
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.identityStatement !== undefined)
    update.identity_statement = fields.identityStatement;
  if (fields.identityCategory !== undefined)
    update.identity_category = fields.identityCategory;
  if (fields.icon !== undefined) update.icon = fields.icon;
  if (fields.color !== undefined) update.color = fields.color;
  if (fields.whyStatement !== undefined)
    update.why_statement = fields.whyStatement;
  if (fields.status !== undefined) update.status = fields.status;

  const { error } = await supabase
    .from("user_identities")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

export async function archiveIdentity(id: string) {
  return updateIdentity(id, { status: "archived" });
}

// ─────────────────────────────────────────
// HABIT ↔ IDENTITY LINKING
// ─────────────────────────────────────────

export async function linkHabitToIdentity(habitId: string, identityId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("habits")
    .update({ identity_id: identityId, updated_at: new Date().toISOString() })
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

export async function unlinkHabitFromIdentity(habitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("habits")
    .update({ identity_id: null, updated_at: new Date().toISOString() })
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// CONFIDENCE RECOMPUTATION
// ─────────────────────────────────────────

export async function recomputeIdentityConfidence(
  identityId: string,
): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = getTodayKarachi();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  // Fetch all habits linked to this identity
  const { data: linkedHabits } = await supabase
    .from("habits")
    .select("id, current_streak, best_streak")
    .eq("identity_id", identityId)
    .eq("user_id", user.id)
    .is("archived_at", null);

  const habitIds = (linkedHabits ?? []).map((h: { id: string }) => h.id);

  if (habitIds.length === 0) {
    return 0;
  }

  // Fetch all habit logs for these habits
  const { data: allLogs } = await supabase
    .from("habit_logs")
    .select("date, status")
    .in("habit_id", habitIds)
    .eq("user_id", user.id)
    .neq("status", "skipped")
    .order("date", { ascending: true });

  const logs = allLogs ?? [];

  // Overall stats
  const overallCompletions = logs.filter(
    (l: { status: string }) => l.status === "completed",
  ).length;
  const overallScheduled = logs.length;

  // Recent stats (last 7 days)
  const recentLogs = logs.filter(
    (l: { date: string }) => l.date >= sevenDaysAgoStr,
  );
  const recentCompletions = recentLogs.filter(
    (l: { status: string }) => l.status === "completed",
  ).length;
  const recentScheduled = recentLogs.length;

  // Current streak: max across all linked habits
  const currentStreak = Math.max(
    0,
    ...(linkedHabits ?? []).map(
      (h: { current_streak: number }) => h.current_streak ?? 0,
    ),
  );

  // Weekly consistency: last 8 weeks with at least 1 completion
  let consistentWeeks = 0;
  let totalWeeks = 0;
  for (let w = 0; w < 8; w++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - w * 7 - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const ws = weekStart.toISOString().slice(0, 10);
    const we = weekEnd.toISOString().slice(0, 10);
    const weekLogs = logs.filter(
      (l: { date: string; status: string }) =>
        l.date >= ws && l.date <= we && l.status === "completed",
    );
    if (logs.some((l: { date: string }) => l.date >= ws && l.date <= we)) {
      totalWeeks++;
      if (weekLogs.length > 0) consistentWeeks++;
    }
  }
  const weeklyConsistencyRate =
    totalWeeks > 0 ? consistentWeeks / totalWeeks : 0;

  // Longevity
  const firstLog = logs[0];
  const daysSinceFirstVote = firstLog
    ? Math.floor(
        (new Date(today).getTime() - new Date(firstLog.date).getTime()) /
          86400000,
      )
    : 0;

  const newConfidence = computeConfidenceScore({
    recentCompletions,
    recentScheduled,
    overallCompletions,
    overallScheduled,
    currentStreak,
    weeklyConsistencyRate,
    daysSinceFirstVote,
  });

  // Write back
  await supabase
    .from("user_identities")
    .update({
      confidence_level: newConfidence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", identityId)
    .eq("user_id", user.id);

  // Log the confidence change
  await supabase.from("identity_confidence_log").insert({
    identity_id: identityId,
    user_id: user.id,
    confidence_level: newConfidence,
    logged_date: today,
    trigger_type: "vote_cast",
  });

  return newConfidence;
}

// ─────────────────────────────────────────
// CAST VOTE (Core Action)
// ─────────────────────────────────────────

type CastVoteResult = {
  newConfidence: number;
  milestone: MilestoneDef | null;
};

export async function castVote(
  habitId: string,
  identityId: string,
  date: string,
  enrichment?: {
    difficultyFelt?: number;
    satisfactionRating?: number;
    reflectionNote?: string;
  },
): Promise<CastVoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Step 1: Upsert habit_logs (authoritative completion record)
  const { error: logError } = await supabase.from("habit_logs").upsert(
    {
      habit_id: habitId,
      user_id: user.id,
      date,
      status: "completed",
    },
    { onConflict: "habit_id,date" },
  );
  if (logError) throw new Error(logError.message);

  // Step 2: Upsert habit_votes (enrichment layer)
  const voteData: Record<string, unknown> = {
    habit_id: habitId,
    identity_id: identityId,
    user_id: user.id,
    vote_date: date,
  };
  if (enrichment?.difficultyFelt !== undefined)
    voteData.difficulty_felt = enrichment.difficultyFelt;
  if (enrichment?.satisfactionRating !== undefined)
    voteData.satisfaction_rating = enrichment.satisfactionRating;
  if (enrichment?.reflectionNote !== undefined)
    voteData.reflection_note = enrichment.reflectionNote;

  await supabase
    .from("habit_votes")
    .upsert(voteData, { onConflict: "habit_id,vote_date" });

  // Step 3: Recompute confidence
  const newConfidence = await recomputeIdentityConfidence(identityId);

  // Step 4: Check and award milestones
  const milestone = await checkAndAwardMilestones(
    supabase,
    habitId,
    identityId,
    user.id,
    newConfidence,
  );

  revalidatePath("/habits");
  revalidatePath("/dashboard");

  return { newConfidence, milestone };
}

// ─────────────────────────────────────────
// MILESTONE DETECTION
// ─────────────────────────────────────────

async function checkAndAwardMilestones(
  supabase: Awaited<ReturnType<typeof createClient>>,
  habitId: string,
  identityId: string,
  userId: string,
  currentConfidence: number,
): Promise<MilestoneDef | null> {
  // Get current streak for this habit
  const { data: habitRow } = await supabase
    .from("habits")
    .select("current_streak")
    .eq("id", habitId)
    .single();
  const currentStreak = habitRow?.current_streak ?? 0;

  // Get total positive votes for this identity
  const { count: totalVotes } = await supabase
    .from("habit_logs")
    .select("id", { count: "exact", head: true })
    .in(
      "habit_id",
      (
        await supabase
          .from("habits")
          .select("id")
          .eq("identity_id", identityId)
          .eq("user_id", userId)
      ).data?.map((h: { id: string }) => h.id) ?? [],
    )
    .eq("status", "completed");

  // Get already-awarded milestones for dedup
  const { data: existing } = await supabase
    .from("identity_milestones")
    .select("milestone_type, milestone_value")
    .eq("identity_id", identityId);

  const awardedSet = new Set(
    (existing ?? []).map(
      (m: { milestone_type: string; milestone_value: number }) =>
        `${m.milestone_type}:${m.milestone_value}`,
    ),
  );

  for (const def of MILESTONE_DEFS) {
    const key = `${def.type}:${def.value}`;
    if (awardedSet.has(key)) continue;

    let triggered = false;
    if (def.type === "streak" && currentStreak === def.value) triggered = true;
    if (def.type === "votes" && (totalVotes ?? 0) === def.value)
      triggered = true;
    if (def.type === "confidence" && currentConfidence >= def.value)
      triggered = true;

    if (triggered) {
      await supabase.from("identity_milestones").insert({
        identity_id: identityId,
        user_id: userId,
        milestone_type: def.type,
        milestone_value: def.value,
        milestone_title: def.title,
        milestone_message: def.message,
        celebrated: false,
      });
      return def;
    }
  }

  return null;
}

// ─────────────────────────────────────────
// CELEBRATIONS
// ─────────────────────────────────────────

export async function celebrateMilestone(milestoneId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("identity_milestones")
    .update({ celebrated: true })
    .eq("id", milestoneId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────
// WEEKLY REFLECTION
// ─────────────────────────────────────────

export async function upsertReflection(
  identityId: string,
  fields: {
    wins?: string;
    challenges?: string;
    learning?: string;
    nextWeekIntention?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const weekKey = getWeekKey(new Date());

  // Get current confidence for snapshot
  const { data: identity } = await supabase
    .from("user_identities")
    .select("confidence_level")
    .eq("id", identityId)
    .single();
  const currentConfidence = identity?.confidence_level ?? 0;

  // Get this week's vote stats
  const today = getTodayKarachi();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { data: linkedHabits } = await supabase
    .from("habits")
    .select("id")
    .eq("identity_id", identityId)
    .eq("user_id", user.id);

  const habitIds = (linkedHabits ?? []).map((h: { id: string }) => h.id);

  let totalVotes = 0;
  let positiveVotes = 0;

  if (habitIds.length > 0) {
    const { data: weekLogs } = await supabase
      .from("habit_logs")
      .select("status")
      .in("habit_id", habitIds)
      .gte("date", weekStartStr)
      .lte("date", today);

    totalVotes = (weekLogs ?? []).length;
    positiveVotes = (weekLogs ?? []).filter(
      (l: { status: string }) => l.status === "completed",
    ).length;
  }

  const upsertData: Record<string, unknown> = {
    identity_id: identityId,
    user_id: user.id,
    reflection_week: weekKey,
    confidence_end: currentConfidence,
    total_votes: totalVotes,
    positive_votes: positiveVotes,
    updated_at: new Date().toISOString(),
  };
  if (fields.wins !== undefined) upsertData.wins = fields.wins;
  if (fields.challenges !== undefined)
    upsertData.challenges = fields.challenges;
  if (fields.learning !== undefined) upsertData.learning = fields.learning;
  if (fields.nextWeekIntention !== undefined)
    upsertData.next_week_intention = fields.nextWeekIntention;

  const { error } = await supabase
    .from("identity_reflections")
    .upsert(upsertData, { onConflict: "identity_id,reflection_week" });

  if (error) throw new Error(error.message);

  // Log confidence for this reflection save
  await supabase.from("identity_confidence_log").insert({
    identity_id: identityId,
    user_id: user.id,
    confidence_level: currentConfidence,
    logged_date: today,
    trigger_type: "reflection_saved",
  });

  revalidatePath("/habits");
}
