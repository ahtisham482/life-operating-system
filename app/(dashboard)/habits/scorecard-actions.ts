"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb } from "@/lib/utils";
import {
  calculateDayScore,
  detectCategory,
  normalizeBehavior,
  type ScorecardDay,
  type ScorecardEntry,
  type ScorecardRating,
  type BehaviorLibraryItem,
} from "@/lib/scorecard";

// ─────────────────────────────────────────
// START / GET TODAY'S SCORECARD
// ─────────────────────────────────────────
export async function startOrGetScorecard(
  date: string,
  morningIntention?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if exists
  const { data: existing } = await supabase
    .from("scorecard_days")
    .select("*")
    .eq("user_id", user.id)
    .eq("scorecard_date", date)
    .maybeSingle();

  if (existing) {
    return { scorecard: fromDb<ScorecardDay>(existing), created: false };
  }

  // Detect day type
  const dayDate = new Date(date + "T12:00:00");
  const dow = dayDate.getDay();
  const dayType = dow === 0 || dow === 6 ? "weekend" : "normal";

  const { data: created, error } = await supabase
    .from("scorecard_days")
    .insert(
      toDb({
        userId: user.id,
        scorecardDate: date,
        dayType,
        morningIntention: morningIntention || null,
        status: "in_progress",
      }),
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return { scorecard: fromDb<ScorecardDay>(created), created: true };
}

// ─────────────────────────────────────────
// GET SCORECARD ENTRIES
// ─────────────────────────────────────────
export async function getScorecardEntries(scorecardId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scorecard_entries")
    .select("*")
    .eq("scorecard_id", scorecardId)
    .order("time_of_action", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((r) => fromDb<ScorecardEntry>(r));
}

// ─────────────────────────────────────────
// ADD ENTRY
// ─────────────────────────────────────────
export async function addScorecardEntry(
  scorecardId: string,
  data: {
    timeOfAction: string;
    endTime?: string;
    durationMinutes?: number;
    behaviorDescription: string;
    behaviorCategory?: string;
    rating: ScorecardRating;
    ratingReason?: string;
    emotionalState?: string;
    wasAutomatic?: boolean;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Auto-detect category
  const category =
    data.behaviorCategory || detectCategory(data.behaviorDescription);

  // Calculate duration if both times provided
  let duration = data.durationMinutes;
  if (!duration && data.endTime && data.timeOfAction) {
    const [sh, sm] = data.timeOfAction.split(":").map(Number);
    const [eh, em] = data.endTime.split(":").map(Number);
    duration = (eh * 60 + em) - (sh * 60 + sm);
    if (duration < 0) duration = 0;
  }

  // Get next sort order
  const { count } = await supabase
    .from("scorecard_entries")
    .select("*", { count: "exact", head: true })
    .eq("scorecard_id", scorecardId);

  const { data: entry, error } = await supabase
    .from("scorecard_entries")
    .insert(
      toDb({
        scorecardId,
        userId: user.id,
        timeOfAction: data.timeOfAction,
        endTime: data.endTime || null,
        durationMinutes: duration || null,
        behaviorDescription: data.behaviorDescription,
        behaviorCategory: category,
        rating: data.rating,
        ratingReason: data.ratingReason || null,
        emotionalState: data.emotionalState || null,
        wasAutomatic: data.wasAutomatic ?? true,
        sortOrder: (count ?? 0) + 1,
      }),
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update scorecard stats
  await recalculateScorecardStats(supabase, scorecardId);

  // Update behavior library (non-blocking)
  try {
    await updateBehaviorLibrary(supabase, user.id, {
      name: data.behaviorDescription,
      category,
      rating: data.rating,
      duration: duration ?? null,
      time: data.timeOfAction,
    });
  } catch {
    // Non-critical
  }

  revalidatePath("/habits");
  return fromDb<ScorecardEntry>(entry);
}

// ─────────────────────────────────────────
// BULK ADD ENTRIES
// ─────────────────────────────────────────
export async function bulkAddScorecardEntries(
  scorecardId: string,
  entries: {
    timeOfAction: string;
    behaviorDescription: string;
    rating: ScorecardRating;
    durationMinutes?: number;
    wasAutomatic?: boolean;
  }[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const rows = entries.map((e, i) =>
    toDb({
      scorecardId,
      userId: user.id,
      timeOfAction: e.timeOfAction,
      behaviorDescription: e.behaviorDescription,
      behaviorCategory: detectCategory(e.behaviorDescription),
      rating: e.rating,
      durationMinutes: e.durationMinutes || null,
      wasAutomatic: e.wasAutomatic ?? true,
      sortOrder: i + 1,
    }),
  );

  const { error } = await supabase.from("scorecard_entries").insert(rows);
  if (error) throw new Error(error.message);

  await recalculateScorecardStats(supabase, scorecardId);

  // Update behavior library for each (non-blocking)
  try {
    for (const e of entries) {
      await updateBehaviorLibrary(supabase, user.id, {
        name: e.behaviorDescription,
        category: detectCategory(e.behaviorDescription),
        rating: e.rating,
        duration: e.durationMinutes ?? null,
        time: e.timeOfAction,
      });
    }
  } catch {
    // Non-critical
  }

  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// UPDATE ENTRY
// ─────────────────────────────────────────
export async function updateScorecardEntry(
  entryId: string,
  updates: {
    timeOfAction?: string;
    endTime?: string;
    durationMinutes?: number;
    behaviorDescription?: string;
    rating?: ScorecardRating;
    ratingReason?: string;
    emotionalState?: string;
    wasAutomatic?: boolean;
  },
) {
  const supabase = await createClient();

  // Get entry to find scorecard_id
  const { data: entry } = await supabase
    .from("scorecard_entries")
    .select("scorecard_id")
    .eq("id", entryId)
    .single();

  if (!entry) throw new Error("Entry not found");

  const dbUpdates: Record<string, unknown> = {};
  if (updates.timeOfAction !== undefined)
    dbUpdates.time_of_action = updates.timeOfAction;
  if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
  if (updates.durationMinutes !== undefined)
    dbUpdates.duration_minutes = updates.durationMinutes;
  if (updates.behaviorDescription !== undefined) {
    dbUpdates.behavior_description = updates.behaviorDescription;
    dbUpdates.behavior_category = detectCategory(updates.behaviorDescription);
  }
  if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
  if (updates.ratingReason !== undefined)
    dbUpdates.rating_reason = updates.ratingReason;
  if (updates.emotionalState !== undefined)
    dbUpdates.emotional_state = updates.emotionalState;
  if (updates.wasAutomatic !== undefined)
    dbUpdates.was_automatic = updates.wasAutomatic;
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("scorecard_entries")
    .update(dbUpdates)
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  await recalculateScorecardStats(supabase, entry.scorecard_id);
  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// DELETE ENTRY
// ─────────────────────────────────────────
export async function deleteScorecardEntry(entryId: string) {
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("scorecard_entries")
    .select("scorecard_id")
    .eq("id", entryId)
    .single();

  if (!entry) throw new Error("Entry not found");

  const { error } = await supabase
    .from("scorecard_entries")
    .delete()
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  await recalculateScorecardStats(supabase, entry.scorecard_id);
  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// COMPLETE SCORECARD (end of day)
// ─────────────────────────────────────────
export async function completeScorecard(
  scorecardId: string,
  eveningReflection?: string,
  awarenessRating?: number,
) {
  const supabase = await createClient();

  // Final stat recalc
  await recalculateScorecardStats(supabase, scorecardId);

  // Get updated scorecard
  const { data: scorecard } = await supabase
    .from("scorecard_days")
    .select("*")
    .eq("id", scorecardId)
    .single();

  if (!scorecard) throw new Error("Scorecard not found");

  // Calculate final day score
  const dayScore = calculateDayScore(
    scorecard.positive_count,
    scorecard.negative_count,
    scorecard.neutral_count,
    scorecard.total_positive_minutes,
    scorecard.total_negative_minutes,
  );

  const { error } = await supabase
    .from("scorecard_days")
    .update({
      evening_reflection: eveningReflection || null,
      awareness_rating: awarenessRating || null,
      day_score: dayScore,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", scorecardId);

  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return dayScore;
}

// ─────────────────────────────────────────
// UPDATE MORNING INTENTION
// ─────────────────────────────────────────
export async function updateMorningIntention(
  scorecardId: string,
  intention: string,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("scorecard_days")
    .update({
      morning_intention: intention,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scorecardId);

  if (error) throw new Error(error.message);
  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// GET BEHAVIOR LIBRARY (favorites)
// ─────────────────────────────────────────
export async function getBehaviorFavorites() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("behavior_library")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_favorite", true)
    .order("times_logged", { ascending: false })
    .limit(15);

  return (data || []).map((r) => fromDb<BehaviorLibraryItem>(r));
}

// ─────────────────────────────────────────
// SEARCH BEHAVIORS (autocomplete)
// ─────────────────────────────────────────
export async function searchBehaviors(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("behavior_library")
    .select("*")
    .eq("user_id", user.id)
    .ilike("behavior_name", `%${query}%`)
    .order("times_logged", { ascending: false })
    .limit(8);

  return (data || []).map((r) => fromDb<BehaviorLibraryItem>(r));
}

// ─────────────────────────────────────────
// GET SCORECARD HISTORY
// ─────────────────────────────────────────
export async function getScorecardHistory(limit = 14) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("scorecard_days")
    .select("*")
    .eq("user_id", user.id)
    .order("scorecard_date", { ascending: false })
    .limit(limit);

  return (data || []).map((r) => fromDb<ScorecardDay>(r));
}

// ─────────────────────────────────────────
// INTERNAL: Recalculate scorecard stats
// ─────────────────────────────────────────
async function recalculateScorecardStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scorecardId: string,
) {
  const { data: entries } = await supabase
    .from("scorecard_entries")
    .select("rating, duration_minutes")
    .eq("scorecard_id", scorecardId);

  if (!entries) return;

  const pos = entries.filter((e) => e.rating === "+");
  const neg = entries.filter((e) => e.rating === "-");
  const neu = entries.filter((e) => e.rating === "=");

  const posMin = pos.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const negMin = neg.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const neuMin = neu.reduce((s, e) => s + (e.duration_minutes || 0), 0);

  const dayScore = calculateDayScore(
    pos.length,
    neg.length,
    neu.length,
    posMin,
    negMin,
  );

  await supabase
    .from("scorecard_days")
    .update({
      total_entries: entries.length,
      positive_count: pos.length,
      negative_count: neg.length,
      neutral_count: neu.length,
      total_positive_minutes: posMin,
      total_negative_minutes: negMin,
      total_neutral_minutes: neuMin,
      day_score: dayScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scorecardId);
}

// ─────────────────────────────────────────
// INTERNAL: Update behavior library
// ─────────────────────────────────────────
async function updateBehaviorLibrary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  data: {
    name: string;
    category: string;
    rating: string;
    duration: number | null;
    time: string;
  },
) {
  const normalized = normalizeBehavior(data.name);

  const { data: existing } = await supabase
    .from("behavior_library")
    .select("*")
    .eq("user_id", userId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing) {
    const timesLogged = existing.times_logged + 1;
    const totalMinutes = existing.total_minutes_spent + (data.duration || 0);
    const posCount =
      existing.positive_count + (data.rating === "+" ? 1 : 0);
    const negCount =
      existing.negative_count + (data.rating === "-" ? 1 : 0);
    const neuCount =
      existing.neutral_count + (data.rating === "=" ? 1 : 0);

    // Determine default rating (most common)
    let defaultRating = "=";
    if (posCount >= negCount && posCount >= neuCount) defaultRating = "+";
    else if (negCount >= posCount && negCount >= neuCount) defaultRating = "-";

    await supabase
      .from("behavior_library")
      .update({
        times_logged: timesLogged,
        total_minutes_spent: totalMinutes,
        avg_duration_minutes:
          totalMinutes > 0 ? Math.round((totalMinutes / timesLogged) * 10) / 10 : 0,
        positive_count: posCount,
        negative_count: negCount,
        neutral_count: neuCount,
        default_rating: defaultRating,
        is_favorite: timesLogged >= 5,
        last_logged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("behavior_library").insert(
      toDb({
        userId,
        behaviorName: data.name,
        normalizedName: normalized,
        behaviorCategory: data.category,
        defaultRating: data.rating,
        timesLogged: 1,
        avgDurationMinutes: data.duration || 0,
        totalMinutesSpent: data.duration || 0,
        positiveCount: data.rating === "+" ? 1 : 0,
        negativeCount: data.rating === "-" ? 1 : 0,
        neutralCount: data.rating === "=" ? 1 : 0,
        mostCommonTime: data.time,
        isFavorite: false,
      }),
    );
  }
}
