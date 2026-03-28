"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromDb, toDb } from "@/lib/utils";
import {
  type Blueprint,
  type HabitChain,
  type EnvironmentSetup,
  buildIntentionStatement,
  buildStackStatement,
  calculateCompleteness,
  detectBlueprintCategory,
  generateTwoMinute,
  detectTimeOfDay,
} from "@/lib/architect";

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
// BLUEPRINT CRUD
// ─────────────────────────────────────────

export async function createBlueprint(data: {
  habitName: string;
  habitDescription?: string;
  habitCategory?: string;
  habitIcon?: string;
  habitColor?: string;
  twoMinuteVersion?: string;
  fullVersion?: string;
  intentionBehavior: string;
  intentionTime?: string;
  intentionTimeFlexible?: boolean;
  intentionLocation?: string;
  intentionLocationDetails?: string;
  frequency?: string;
  specificDays?: number[];
  stackType?: string;
  stackAnchorBlueprintId?: string;
  stackAnchorDescription?: string;
  chainId?: string;
  chainPosition?: number;
  environmentCue?: string;
  frictionRemovals?: string[];
  frictionAdditions?: string[];
  designatedSpace?: string;
  spaceRule?: string;
  identityId?: string;
}): Promise<Blueprint> {
  const { supabase, user } = await getAuthedClient();

  // Auto-detect category if not provided
  const habitCategory =
    data.habitCategory || detectBlueprintCategory(data.habitName);

  // Auto-generate 2-minute version if not provided
  const twoMinuteVersion =
    data.twoMinuteVersion || generateTwoMinute(data.habitName);

  // Build intention statement
  const intentionStatement = buildIntentionStatement(
    data.intentionBehavior,
    data.intentionTime ?? null,
    data.intentionLocation ?? null,
  );

  // Build stack statement if applicable
  const stackType = data.stackType ?? "none";
  let stackStatement: string | null = null;
  if (stackType !== "none" && data.stackAnchorDescription) {
    stackStatement = buildStackStatement(
      stackType,
      data.stackAnchorDescription,
      data.intentionBehavior,
    );
  }

  // Build the blueprint object for completeness scoring
  const blueprintData = {
    ...data,
    habitCategory,
    twoMinuteVersion,
    stackType,
  };
  const blueprintCompleteness = calculateCompleteness(blueprintData);

  // Detect time of day
  const timeOfDay = detectTimeOfDay(data.intentionTime ?? null);

  // Get next sort order
  const { data: existing } = await supabase
    .from("habit_blueprints")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const insertData = toDb({
    userId: user.id,
    habitName: data.habitName,
    habitDescription: data.habitDescription ?? null,
    habitCategory,
    habitIcon: data.habitIcon ?? null,
    habitColor: data.habitColor ?? "#6366f1",
    twoMinuteVersion,
    fullVersion: data.fullVersion ?? null,
    intentionBehavior: data.intentionBehavior,
    intentionTime: data.intentionTime ?? null,
    intentionTimeFlexible: data.intentionTimeFlexible ?? false,
    intentionLocation: data.intentionLocation ?? null,
    intentionLocationDetails: data.intentionLocationDetails ?? null,
    intentionStatement,
    frequency: data.frequency ?? "daily",
    specificDays: data.specificDays ?? null,
    stackType,
    stackAnchorBlueprintId: data.stackAnchorBlueprintId ?? null,
    stackAnchorDescription: data.stackAnchorDescription ?? null,
    stackStatement,
    chainId: data.chainId ?? null,
    chainPosition: data.chainPosition ?? null,
    environmentCue: data.environmentCue ?? null,
    frictionRemovals: data.frictionRemovals ?? [],
    frictionAdditions: data.frictionAdditions ?? [],
    designatedSpace: data.designatedSpace ?? null,
    spaceRule: data.spaceRule ?? null,
    identityId: data.identityId ?? null,
    blueprintCompleteness,
    timeOfDay,
    sortOrder,
  });

  const { data: row, error } = await supabase
    .from("habit_blueprints")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<Blueprint>(row);
}

// Fields that affect completeness score
const COMPLETENESS_FIELDS = new Set([
  "habitName",
  "intentionBehavior",
  "intentionTime",
  "intentionLocation",
  "twoMinuteVersion",
  "stackType",
  "stackAnchorDescription",
  "environmentCue",
  "frictionRemovals",
  "frictionAdditions",
  "designatedSpace",
  "identityId",
]);

export async function updateBlueprint(
  id: string,
  updates: Partial<Blueprint>,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  // If relevant fields changed, recalculate completeness
  const hasCompletenessChange = Object.keys(updates).some((k) =>
    COMPLETENESS_FIELDS.has(k),
  );

  if (hasCompletenessChange) {
    // Fetch current blueprint to merge with updates for scoring
    const { data: current, error: fetchErr } = await supabase
      .from("habit_blueprints")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);

    const merged = { ...fromDb<Blueprint>(current), ...updates };
    updates.blueprintCompleteness = calculateCompleteness(merged);
  }

  // Rebuild intention statement if behavior/time/location changed
  if (
    updates.intentionBehavior !== undefined ||
    updates.intentionTime !== undefined ||
    updates.intentionLocation !== undefined
  ) {
    const { data: current } = await supabase
      .from("habit_blueprints")
      .select("intention_behavior, intention_time, intention_location")
      .eq("id", id)
      .single();
    if (current) {
      const behavior =
        updates.intentionBehavior ?? current.intention_behavior;
      const time = updates.intentionTime ?? current.intention_time;
      const location = updates.intentionLocation ?? current.intention_location;
      updates.intentionStatement = buildIntentionStatement(
        behavior,
        time,
        location,
      );
    }
  }

  // Rebuild stack statement if stack fields changed
  if (
    updates.stackType !== undefined ||
    updates.stackAnchorDescription !== undefined ||
    updates.intentionBehavior !== undefined
  ) {
    const { data: current } = await supabase
      .from("habit_blueprints")
      .select(
        "stack_type, stack_anchor_description, intention_behavior",
      )
      .eq("id", id)
      .single();
    if (current) {
      const stackType = updates.stackType ?? current.stack_type;
      const anchor =
        updates.stackAnchorDescription ?? current.stack_anchor_description;
      const behavior =
        updates.intentionBehavior ?? current.intention_behavior;
      if (stackType !== "none" && anchor) {
        updates.stackStatement = buildStackStatement(
          stackType,
          anchor,
          behavior,
        );
      } else {
        updates.stackStatement = null;
      }
    }
  }

  // Recalculate time_of_day if intentionTime changed
  if (updates.intentionTime !== undefined) {
    updates.timeOfDay = detectTimeOfDay(updates.intentionTime ?? null);
  }

  const dbUpdates = toDb(updates as Record<string, unknown>);
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("habit_blueprints")
    .update(dbUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function deleteBlueprint(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("habit_blueprints")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function getBlueprints(): Promise<Blueprint[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("habit_blueprints")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<Blueprint>(row));
}

// ─────────────────────────────────────────
// CHAIN CRUD
// ─────────────────────────────────────────

export async function createChain(data: {
  chainName: string;
  chainDescription?: string;
  chainIcon?: string;
  chainColor?: string;
  timeOfDay: string;
  startTime?: string;
  estimatedDuration?: number;
  chainTrigger?: string;
  chainTriggerType?: string;
  primaryLocation?: string;
}): Promise<HabitChain> {
  const { supabase, user } = await getAuthedClient();

  // Get next sort order
  const { data: existing } = await supabase
    .from("habit_chains")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sortOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const insertData = toDb({
    userId: user.id,
    chainName: data.chainName,
    chainDescription: data.chainDescription ?? null,
    chainIcon: data.chainIcon ?? "⛓️",
    chainColor: data.chainColor ?? null,
    timeOfDay: data.timeOfDay,
    startTime: data.startTime ?? null,
    estimatedDuration: data.estimatedDuration ?? null,
    chainTrigger: data.chainTrigger ?? null,
    chainTriggerType: data.chainTriggerType ?? "time",
    primaryLocation: data.primaryLocation ?? null,
    sortOrder,
  });

  const { data: row, error } = await supabase
    .from("habit_chains")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<HabitChain>(row);
}

export async function updateChain(
  id: string,
  updates: Partial<HabitChain>,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  const dbUpdates = toDb(updates as Record<string, unknown>);
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("habit_chains")
    .update(dbUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function deleteChain(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Unlink all blueprints from this chain
  const { error: unlinkError } = await supabase
    .from("habit_blueprints")
    .update({
      chain_id: null,
      chain_position: null,
      stack_type: "none",
      stack_statement: null,
      updated_at: new Date().toISOString(),
    })
    .eq("chain_id", id);
  if (unlinkError) throw new Error(unlinkError.message);

  // Delete the chain
  const { error } = await supabase
    .from("habit_chains")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function getChains(): Promise<
  (HabitChain & { blueprints: Blueprint[] })[]
> {
  const { supabase, user } = await getAuthedClient();

  const { data: chains, error } = await supabase
    .from("habit_chains")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);

  // Fetch linked blueprints for each chain
  const chainIds = (chains ?? []).map((c) => c.id);
  const { data: blueprints } = await supabase
    .from("habit_blueprints")
    .select("*")
    .in("chain_id", chainIds.length > 0 ? chainIds : ["__none__"])
    .eq("is_active", true)
    .order("chain_position", { ascending: true });

  const blueprintsByChain = new Map<string, Blueprint[]>();
  for (const bp of blueprints ?? []) {
    const chainId = bp.chain_id as string;
    if (!blueprintsByChain.has(chainId)) {
      blueprintsByChain.set(chainId, []);
    }
    blueprintsByChain.get(chainId)!.push(fromDb<Blueprint>(bp));
  }

  return (chains ?? []).map((row) => ({
    ...fromDb<HabitChain>(row),
    blueprints: blueprintsByChain.get(row.id) ?? [],
  }));
}

// ─────────────────────────────────────────
// CHAIN LINK MANAGEMENT
// ─────────────────────────────────────────

export async function addBlueprintToChain(
  blueprintId: string,
  chainId: string,
  position: number,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Get the previous blueprint in the chain for stack statement
  let stackStatement: string | null = null;
  let stackType = "none";

  if (position > 0) {
    const { data: prevBlueprint } = await supabase
      .from("habit_blueprints")
      .select("habit_name, intention_behavior")
      .eq("chain_id", chainId)
      .eq("chain_position", position - 1)
      .single();

    if (prevBlueprint) {
      stackType = "after";
      // Get current blueprint's behavior
      const { data: currentBp } = await supabase
        .from("habit_blueprints")
        .select("intention_behavior")
        .eq("id", blueprintId)
        .single();

      if (currentBp) {
        stackStatement = buildStackStatement(
          "after",
          prevBlueprint.habit_name,
          currentBp.intention_behavior,
        );
      }
    }
  }

  // Update the blueprint
  const { error: bpError } = await supabase
    .from("habit_blueprints")
    .update({
      chain_id: chainId,
      chain_position: position,
      stack_type: stackType,
      stack_statement: stackStatement,
      updated_at: new Date().toISOString(),
    })
    .eq("id", blueprintId);
  if (bpError) throw new Error(bpError.message);

  // Update chain's total_links count
  const { count } = await supabase
    .from("habit_blueprints")
    .select("id", { count: "exact", head: true })
    .eq("chain_id", chainId);

  const { error: chainError } = await supabase
    .from("habit_chains")
    .update({
      total_links: count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chainId);
  if (chainError) throw new Error(chainError.message);

  revalidatePath("/habits");
}

export async function removeBlueprintFromChain(
  blueprintId: string,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Get the current chain_id before removing
  const { data: bp } = await supabase
    .from("habit_blueprints")
    .select("chain_id")
    .eq("id", blueprintId)
    .single();

  const chainId = bp?.chain_id;

  // Unlink the blueprint
  const { error } = await supabase
    .from("habit_blueprints")
    .update({
      chain_id: null,
      chain_position: null,
      stack_type: "none",
      stack_statement: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", blueprintId);
  if (error) throw new Error(error.message);

  // Update chain's total_links count
  if (chainId) {
    const { count } = await supabase
      .from("habit_blueprints")
      .select("id", { count: "exact", head: true })
      .eq("chain_id", chainId);

    await supabase
      .from("habit_chains")
      .update({
        total_links: count ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chainId);
  }

  revalidatePath("/habits");
}

export async function reorderChainLinks(
  chainId: string,
  order: { blueprintId: string; position: number }[],
): Promise<void> {
  const { supabase } = await getAuthedClient();

  // Sort by position to process in order
  const sorted = [...order].sort((a, b) => a.position - b.position);

  // Fetch all blueprint names/behaviors for stack statement generation
  const bpIds = sorted.map((o) => o.blueprintId);
  const { data: blueprints } = await supabase
    .from("habit_blueprints")
    .select("id, habit_name, intention_behavior")
    .in("id", bpIds);

  const bpMap = new Map<string, { habitName: string; intentionBehavior: string }>(
    (blueprints ?? []).map((bp) => [
      bp.id as string,
      {
        habitName: bp.habit_name as string,
        intentionBehavior: bp.intention_behavior as string,
      },
    ]),
  );

  for (let i = 0; i < sorted.length; i++) {
    const { blueprintId, position } = sorted[i];
    const current = bpMap.get(blueprintId);

    let stackType = "none";
    let stackStatement: string | null = null;

    // Generate stack statement from previous link
    if (i > 0) {
      const prevId = sorted[i - 1].blueprintId;
      const prev = bpMap.get(prevId);
      if (prev && current) {
        stackType = "after";
        stackStatement = buildStackStatement(
          "after",
          prev.habitName,
          current.intentionBehavior,
        );
      }
    }

    const { error } = await supabase
      .from("habit_blueprints")
      .update({
        chain_position: position,
        stack_type: stackType,
        stack_statement: stackStatement,
        updated_at: new Date().toISOString(),
      })
      .eq("id", blueprintId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/habits");
}

// ─────────────────────────────────────────
// ENVIRONMENT SETUP CRUD
// ─────────────────────────────────────────

export async function createEnvironmentSetup(data: {
  spaceName: string;
  spaceType?: string;
  spacePurpose?: string;
  spaceIcon?: string;
  primaryUse?: string;
  forbiddenUses?: string[];
  visualCues?: string[];
  frictionRemovals?: string[];
  frictionAdditions?: string[];
  linkedBlueprintIds?: string[];
  eveningPrepItems?: string[];
}): Promise<EnvironmentSetup> {
  const { supabase, user } = await getAuthedClient();

  const insertData = toDb({
    userId: user.id,
    spaceName: data.spaceName,
    spaceType: data.spaceType ?? null,
    spacePurpose: data.spacePurpose ?? null,
    spaceIcon: data.spaceIcon ?? null,
    primaryUse: data.primaryUse ?? null,
    forbiddenUses: data.forbiddenUses ?? [],
    visualCues: data.visualCues ?? [],
    frictionRemovals: data.frictionRemovals ?? [],
    frictionAdditions: data.frictionAdditions ?? [],
    linkedBlueprintIds: data.linkedBlueprintIds ?? [],
    eveningPrepItems: data.eveningPrepItems ?? [],
  });

  const { data: row, error } = await supabase
    .from("environment_setups")
    .insert(insertData)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
  return fromDb<EnvironmentSetup>(row);
}

export async function updateEnvironmentSetup(
  id: string,
  updates: Partial<EnvironmentSetup>,
): Promise<void> {
  const { supabase } = await getAuthedClient();

  const dbUpdates = toDb(updates as Record<string, unknown>);
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("environment_setups")
    .update(dbUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function deleteEnvironmentSetup(id: string): Promise<void> {
  const { supabase } = await getAuthedClient();

  const { error } = await supabase
    .from("environment_setups")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/habits");
}

export async function getEnvironmentSetups(): Promise<EnvironmentSetup[]> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("environment_setups")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => fromDb<EnvironmentSetup>(row));
}

// ─────────────────────────────────────────
// EVENING PREP CHECKLIST
// ─────────────────────────────────────────

export async function getEveningPrepChecklist(): Promise<
  { spaceName: string; spaceIcon: string | null; items: string[] }[]
> {
  const { supabase, user } = await getAuthedClient();

  const { data, error } = await supabase
    .from("environment_setups")
    .select("space_name, space_icon, evening_prep_items")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("evening_prep_items", "eq", "{}");
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter(
      (row) =>
        row.evening_prep_items && row.evening_prep_items.length > 0,
    )
    .map((row) => ({
      spaceName: row.space_name,
      spaceIcon: row.space_icon,
      items: row.evening_prep_items as string[],
    }));
}
