"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb } from "@/lib/utils";
import {
  type Bundle,
  type Reframe,
  type Tribe,
  type Partner,
  buildBundleStatement,
  detectNeedCategory,
  detectWantCategory,
  getNeedIcon,
  getWantIcon,
  calculateBundleStrength,
  normalizeOldFrame,
  normalizeNewFrame,
  identifyDeeperMotive,
} from "@/lib/attraction";

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
// BUNDLE CRUD
// ─────────────────────────────────────────

export async function createBundle(data: {
  needDescription: string;
  needCategory?: string;
  needIcon?: string;
  needEstimatedMinutes?: number;
  wantDescription: string;
  wantCategory?: string;
  wantIcon?: string;
  wantTimeLimit?: number;
  strictness?: "strict" | "moderate" | "flexible";
  identityId?: string;
}): Promise<Bundle> {
  const { supabase, user } = await getAuthedClient();

  // Auto-detect categories if not provided
  const needCategory =
    data.needCategory || detectNeedCategory(data.needDescription);
  const wantCategory =
    data.wantCategory || detectWantCategory(data.wantDescription);

  // Auto-set icons if not provided
  const needIcon = data.needIcon || getNeedIcon(needCategory);
  const wantIcon = data.wantIcon || getWantIcon(wantCategory);

  const strictness = data.strictness ?? "moderate";
  const wantTimeLimit = data.wantTimeLimit ?? null;

  // Build bundle statement
  const bundleStatement = buildBundleStatement(
    data.needDescription,
    data.wantDescription,
    wantTimeLimit,
  );

  // Get next sort order
  const { data: existing } = await supabase
    .from("temptation_bundles")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const insertData = toDb({
    userId: user.id,
    needDescription: data.needDescription,
    needCategory,
    needIcon,
    needEstimatedMinutes: data.needEstimatedMinutes ?? null,
    wantDescription: data.wantDescription,
    wantCategory,
    wantIcon,
    wantTimeLimit,
    bundleStatement,
    strictness,
    identityId: data.identityId ?? null,
    sortOrder,
  });

  const { data: row, error } = await supabase
    .from("temptation_bundles")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Bundle>(row);
}

export async function updateBundle(
  id: string,
  updates: Partial<Bundle>,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Rebuild bundle statement if need/want/timeLimit changed
  if (
    updates.needDescription !== undefined ||
    updates.wantDescription !== undefined ||
    updates.wantTimeLimit !== undefined
  ) {
    const { data: current, error: fetchErr } = await supabase
      .from("temptation_bundles")
      .select("need_description, want_description, want_time_limit")
      .eq("id", id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);

    const need = updates.needDescription ?? current.need_description;
    const want = updates.wantDescription ?? current.want_description;
    const timeLimit = updates.wantTimeLimit ?? current.want_time_limit;
    updates.bundleStatement = buildBundleStatement(need, want, timeLimit);
  }

  // Re-detect categories if descriptions changed
  if (updates.needDescription !== undefined && updates.needCategory === undefined) {
    updates.needCategory = detectNeedCategory(updates.needDescription);
    if (updates.needIcon === undefined) {
      updates.needIcon = getNeedIcon(updates.needCategory);
    }
  }
  if (updates.wantDescription !== undefined && updates.wantCategory === undefined) {
    updates.wantCategory = detectWantCategory(updates.wantDescription);
    if (updates.wantIcon === undefined) {
      updates.wantIcon = getWantIcon(updates.wantCategory);
    }
  }

  const dbUpdates = toDb(updates as Record<string, unknown>);
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("temptation_bundles")
    .update(dbUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function deleteBundle(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("temptation_bundles")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function getBundles(): Promise<Bundle[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("temptation_bundles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<Bundle>(row));
}

export async function logBundleOutcome(
  bundleId: string,
  outcome: "full_bundle" | "need_only" | "cheated" | "skipped",
): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Fetch current counters
  const { data: current, error: fetchErr } = await supabase
    .from("temptation_bundles")
    .select("times_completed, times_need_only, times_cheated, times_skipped")
    .eq("id", bundleId)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!current) throw new Error("Bundle not found");

  const row = current as Record<string, unknown>;
  const counterMap: Record<string, string> = {
    full_bundle: "times_completed",
    need_only: "times_need_only",
    cheated: "times_cheated",
    skipped: "times_skipped",
  };

  const field = counterMap[outcome];
  const { error } = await supabase
    .from("temptation_bundles")
    .update({
      [field]: ((row[field] as number) || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bundleId);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// REFRAME CRUD
// ─────────────────────────────────────────

export async function createReframe(data: {
  habitDescription?: string;
  oldFrame: string;
  newFrame: string;
  whyTrue?: string;
  underlyingMotive?: string;
  gratitudeAnchor?: string;
  identityId?: string;
  identityConnection?: string;
}): Promise<Reframe> {
  const { supabase, user } = await getAuthedClient();

  // Normalize old/new frames
  const oldFrame = normalizeOldFrame(data.oldFrame);
  const newFrame = normalizeNewFrame(data.newFrame);

  // Auto-detect motive if not provided
  const underlyingMotive =
    data.underlyingMotive ||
    (data.habitDescription
      ? identifyDeeperMotive(data.habitDescription).motive
      : null);

  // Get next sort order
  const { data: existing } = await supabase
    .from("attraction_reframes")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const insertData = toDb({
    userId: user.id,
    habitDescription: data.habitDescription ?? null,
    oldFrame,
    newFrame,
    whyTrue: data.whyTrue ?? null,
    underlyingMotive: underlyingMotive ?? null,
    gratitudeAnchor: data.gratitudeAnchor ?? null,
    identityId: data.identityId ?? null,
    identityConnection: data.identityConnection ?? null,
    sortOrder,
  });

  const { data: row, error } = await supabase
    .from("attraction_reframes")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Reframe>(row);
}

export async function updateReframe(
  id: string,
  updates: Partial<Reframe>,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Normalize frames if they're being updated
  if (updates.oldFrame !== undefined) {
    updates.oldFrame = normalizeOldFrame(updates.oldFrame);
  }
  if (updates.newFrame !== undefined) {
    updates.newFrame = normalizeNewFrame(updates.newFrame);
  }

  const dbUpdates = toDb(updates as Record<string, unknown>);
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("attraction_reframes")
    .update(dbUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function deleteReframe(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("attraction_reframes")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function getReframes(): Promise<Reframe[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("attraction_reframes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<Reframe>(row));
}

export async function logReframeResponse(
  reframeId: string,
  response: "helped" | "dismissed",
): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Fetch current counters
  const { data: current, error: fetchErr } = await supabase
    .from("attraction_reframes")
    .select("times_shown, times_helped, times_dismissed")
    .eq("id", reframeId)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  const updateData: Record<string, unknown> = {
    times_shown: (current.times_shown as number) + 1,
    updated_at: new Date().toISOString(),
  };

  if (response === "helped") {
    updateData.times_helped = (current.times_helped as number) + 1;
  } else {
    updateData.times_dismissed = (current.times_dismissed as number) + 1;
  }

  const { error } = await supabase
    .from("attraction_reframes")
    .update(updateData)
    .eq("id", reframeId);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// TRIBE CRUD
// ─────────────────────────────────────────

export async function createTribe(data: {
  tribeName: string;
  tribeType: string;
  tribePlatform?: string;
  tribeLink?: string;
  tribeIcon?: string;
  influenceType: "close" | "many" | "powerful";
  identityId?: string;
  supportedBehavior?: string;
  sharedIdentity?: string;
  normalBehavior?: string;
  whatInCommon?: string;
  influenceRating?: number;
  positiveInfluence?: boolean;
}): Promise<Tribe> {
  const { supabase, user } = await getAuthedClient();

  const insertData = toDb({
    userId: user.id,
    tribeName: data.tribeName,
    tribeType: data.tribeType,
    tribePlatform: data.tribePlatform ?? null,
    tribeLink: data.tribeLink ?? null,
    tribeIcon: data.tribeIcon ?? null,
    influenceType: data.influenceType,
    identityId: data.identityId ?? null,
    supportedBehavior: data.supportedBehavior ?? null,
    sharedIdentity: data.sharedIdentity ?? null,
    normalBehavior: data.normalBehavior ?? null,
    whatInCommon: data.whatInCommon ?? null,
    influenceRating: data.influenceRating ?? null,
    positiveInfluence: data.positiveInfluence ?? true,
  });

  const { data: row, error } = await supabase
    .from("attraction_tribes")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Tribe>(row);
}

export async function updateTribe(
  id: string,
  updates: Partial<Tribe>,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  const dbUpdates = toDb(updates as Record<string, unknown>);
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("attraction_tribes")
    .update(dbUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function deleteTribe(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("attraction_tribes")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function getTribes(): Promise<Tribe[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("attraction_tribes")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<Tribe>(row));
}

// ─────────────────────────────────────────
// PARTNER CRUD
// ─────────────────────────────────────────

export async function createPartner(data: {
  partnerName: string;
  partnerContact?: string;
  partnerType?: string;
  partnerIcon?: string;
  sharedHabits?: string[];
  checkinFrequency?: string;
  commitmentStatement?: string;
  stakes?: string;
}): Promise<Partner> {
  const { supabase, user } = await getAuthedClient();

  const insertData = toDb({
    userId: user.id,
    partnerName: data.partnerName,
    partnerContact: data.partnerContact ?? null,
    partnerType: data.partnerType ?? null,
    partnerIcon: data.partnerIcon ?? "🤝",
    sharedHabits: data.sharedHabits ?? [],
    checkinFrequency: data.checkinFrequency ?? "weekly",
    commitmentStatement: data.commitmentStatement ?? null,
    stakes: data.stakes ?? null,
  });

  const { data: row, error } = await supabase
    .from("attraction_partners")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Partner>(row);
}

export async function updatePartner(
  id: string,
  updates: Partial<Partner>,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  const dbUpdates = toDb(updates as Record<string, unknown>);
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("attraction_partners")
    .update(dbUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function deletePartner(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("attraction_partners")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function getPartners(): Promise<Partner[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("attraction_partners")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<Partner>(row));
}

export async function logCheckin(partnerId: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Fetch current counters
  const { data: current, error: fetchErr } = await supabase
    .from("attraction_partners")
    .select("total_checkins, current_streak")
    .eq("id", partnerId)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);

  const { error } = await supabase
    .from("attraction_partners")
    .update({
      total_checkins: (current.total_checkins as number) + 1,
      current_streak: (current.current_streak as number) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", partnerId);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}
