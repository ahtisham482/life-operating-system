"use server";

import { revalidatePath } from "next/cache";
import type { ZodSchema } from "zod";
import {
  bulkCreateScorecardEntriesSchema,
  completeScorecardSchema,
  createScorecardEntrySchema,
  deleteScorecardEntrySchema,
  saveMorningIntentionSchema,
  startScorecardSchema,
  updateScorecardEntrySchema,
} from "@/lib/schemas/scorecard";
import {
  calculateDurationMinutes,
  computeScorecardRollup,
  getDefaultDayType,
  type ScorecardScreenData,
} from "@/lib/scorecard";
import type { ScorecardDay, ScorecardEntryRow } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi, toDb } from "@/lib/utils";
import { buildScorecardScreenData } from "./scorecard-data";

type ActionError = {
  code: "AUTH_FAILED" | "VALIDATION_ERROR" | "NOT_FOUND" | "UNEXPECTED";
  message: string;
  field?: string;
  retryable: boolean;
};

export type ScorecardActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function startScorecard(
  input: unknown,
): Promise<ScorecardActionResult<ScorecardScreenData>> {
  return withScorecardAction(startScorecardSchema, input, async (supabase, userId, parsed) => {
    const scorecardDate = parsed.scorecardDate ?? getTodayKarachi();

    const { data: existing } = await supabase
      .from("scorecard_days")
      .select("id")
      .eq("user_id", userId)
      .eq("scorecard_date", scorecardDate)
      .maybeSingle();

    const activeScorecardId =
      existing?.id ??
      (
        await supabase
          .from("scorecard_days")
          .insert({
            user_id: userId,
            scorecard_date: scorecardDate,
            day_type: parsed.dayType ?? getDefaultDayType(scorecardDate),
            day_label: parsed.dayLabel,
            morning_intention: parsed.morningIntention,
            status: "in_progress",
          })
          .select("id")
          .single()
      ).data?.id;

    if (!activeScorecardId) {
      return failure("UNEXPECTED", "Unable to start the scorecard.", true);
    }

    return success(await refreshScorecard(supabase, userId, activeScorecardId));
  });
}

export async function saveMorningIntention(
  input: unknown,
): Promise<ScorecardActionResult<ScorecardScreenData>> {
  return withScorecardAction(
    saveMorningIntentionSchema,
    input,
    async (supabase, userId, parsed) => {
      const scorecard = await getOwnedScorecard(supabase, userId, parsed.scorecardId);
      if (!scorecard) {
        return failure("NOT_FOUND", "Scorecard not found.", false);
      }

      await supabase
        .from("scorecard_days")
        .update({
          morning_intention: parsed.morningIntention,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scorecard.id)
        .eq("user_id", userId);

      return success(await refreshScorecard(supabase, userId, scorecard.id));
    },
  );
}

export async function createScorecardEntry(
  input: unknown,
): Promise<ScorecardActionResult<ScorecardScreenData>> {
  return withScorecardAction(
    createScorecardEntrySchema,
    input,
    async (supabase, userId, parsed) => {
      const scorecard = await getOwnedScorecard(supabase, userId, parsed.scorecardId);
      if (!scorecard) {
        return failure("NOT_FOUND", "Scorecard not found.", false);
      }

      const { data: lastRow } = await supabase
        .from("scorecard_entries")
        .select("sort_order")
        .eq("scorecard_id", scorecard.id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = (lastRow?.[0]?.sort_order ?? -1) + 1;
      const payload = buildEntryPayload(userId, scorecard.id, parsed.entry, nextSortOrder);

      const { error } = await supabase.from("scorecard_entries").insert(payload);
      if (error) {
        return failure("UNEXPECTED", error.message, true);
      }

      await recalculateScorecardStats(supabase, scorecard.id);
      return success(await refreshScorecard(supabase, userId, scorecard.id));
    },
  );
}

export async function bulkCreateScorecardEntries(
  input: unknown,
): Promise<ScorecardActionResult<ScorecardScreenData>> {
  return withScorecardAction(
    bulkCreateScorecardEntriesSchema,
    input,
    async (supabase, userId, parsed) => {
      const scorecard = await getOwnedScorecard(supabase, userId, parsed.scorecardId);
      if (!scorecard) {
        return failure("NOT_FOUND", "Scorecard not found.", false);
      }

      const { data: lastRow } = await supabase
        .from("scorecard_entries")
        .select("sort_order")
        .eq("scorecard_id", scorecard.id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const startingSortOrder = (lastRow?.[0]?.sort_order ?? -1) + 1;
      const payload = parsed.entries.map((entry, index) =>
        buildEntryPayload(userId, scorecard.id, entry, startingSortOrder + index),
      );

      const { error } = await supabase.from("scorecard_entries").insert(payload);
      if (error) {
        return failure("UNEXPECTED", error.message, true);
      }

      await recalculateScorecardStats(supabase, scorecard.id);
      return success(await refreshScorecard(supabase, userId, scorecard.id));
    },
  );
}

export async function updateScorecardEntry(
  input: unknown,
): Promise<ScorecardActionResult<ScorecardScreenData>> {
  return withScorecardAction(
    updateScorecardEntrySchema,
    input,
    async (supabase, userId, parsed) => {
      const entry = await getOwnedEntry(supabase, userId, parsed.entryId);
      if (!entry) {
        return failure("NOT_FOUND", "Scorecard entry not found.", false);
      }

      const mergedEntry = {
        ...entry,
        ...parsed.updates,
      };
      const payload = buildEntryUpdatePayload(mergedEntry, parsed.updates);

      const { error } = await supabase
        .from("scorecard_entries")
        .update(payload)
        .eq("id", entry.id)
        .eq("user_id", userId);

      if (error) {
        return failure("UNEXPECTED", error.message, true);
      }

      await recalculateScorecardStats(supabase, entry.scorecardId);
      return success(await refreshScorecard(supabase, userId, entry.scorecardId));
    },
  );
}

export async function deleteScorecardEntry(
  input: unknown,
): Promise<ScorecardActionResult<ScorecardScreenData>> {
  return withScorecardAction(
    deleteScorecardEntrySchema,
    input,
    async (supabase, userId, parsed) => {
      const entry = await getOwnedEntry(supabase, userId, parsed.entryId);
      if (!entry) {
        return failure("NOT_FOUND", "Scorecard entry not found.", false);
      }

      const { error } = await supabase
        .from("scorecard_entries")
        .delete()
        .eq("id", entry.id)
        .eq("user_id", userId);

      if (error) {
        return failure("UNEXPECTED", error.message, true);
      }

      await recalculateScorecardStats(supabase, entry.scorecardId);
      return success(await refreshScorecard(supabase, userId, entry.scorecardId));
    },
  );
}

export async function completeScorecard(
  input: unknown,
): Promise<ScorecardActionResult<ScorecardScreenData>> {
  return withScorecardAction(
    completeScorecardSchema,
    input,
    async (supabase, userId, parsed) => {
      const scorecard = await getOwnedScorecard(supabase, userId, parsed.scorecardId);
      if (!scorecard) {
        return failure("NOT_FOUND", "Scorecard not found.", false);
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("scorecard_days")
        .update({
          evening_reflection: parsed.eveningReflection,
          awareness_rating: parsed.awarenessRating,
          status: "completed",
          completed_at: now,
          updated_at: now,
        })
        .eq("id", scorecard.id)
        .eq("user_id", userId);

      if (error) {
        return failure("UNEXPECTED", error.message, true);
      }

      await recalculateScorecardStats(supabase, scorecard.id);
      await markOnboardingComplete(supabase, userId, scorecard.scorecardDate);

      return success(await refreshScorecard(supabase, userId, scorecard.id));
    },
  );
}

async function withScorecardAction<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  input: unknown,
  handler: (
    supabase: SupabaseClient,
    userId: string,
    parsed: TInput,
  ) => Promise<ScorecardActionResult<TOutput>>,
): Promise<ScorecardActionResult<TOutput>> {
  try {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return failure(
        "VALIDATION_ERROR",
        issue?.message ?? "Invalid input.",
        false,
        issue?.path.join("."),
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return failure("AUTH_FAILED", "You must be logged in to use the scorecard.", false);
    }

    const result = await handler(supabase, user.id, parsed.data);
    if (result.success) {
      revalidatePath("/habits");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return failure("UNEXPECTED", message, true);
  }
}

function buildEntryPayload(
  userId: string,
  scorecardId: string,
  entry: Record<string, unknown>,
  sortOrder: number,
) {
  const durationMinutes = deriveDurationMinutes(entry);
  return {
    user_id: userId,
    scorecard_id: scorecardId,
    sort_order: sortOrder,
    ...toDb({
      ...entry,
      durationMinutes,
      wasAutomatic: (entry.wasAutomatic as boolean | undefined) ?? true,
    }),
  };
}

function buildEntryUpdatePayload(
  mergedEntry: Record<string, unknown>,
  updates: Record<string, unknown>,
) {
  const durationMinutes = deriveDurationMinutes(mergedEntry);
  return {
    ...toDb({
      ...updates,
      durationMinutes,
    }),
    updated_at: new Date().toISOString(),
  };
}

function deriveDurationMinutes(entry: Record<string, unknown>) {
  if (typeof entry.durationMinutes === "number") return entry.durationMinutes;
  if (
    typeof entry.timeOfAction === "string" &&
    typeof entry.endTime === "string" &&
    entry.timeOfAction.length > 0 &&
    entry.endTime.length > 0
  ) {
    return calculateDurationMinutes(entry.timeOfAction, entry.endTime);
  }
  return null;
}

async function getOwnedScorecard(
  supabase: SupabaseClient,
  userId: string,
  scorecardId: string,
) {
  const { data } = await supabase
    .from("scorecard_days")
    .select("*")
    .eq("id", scorecardId)
    .eq("user_id", userId)
    .maybeSingle();

  return data ? fromDb<ScorecardDay>(data) : null;
}

async function getOwnedEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
) {
  const { data } = await supabase
    .from("scorecard_entries")
    .select("*")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();

  return data ? fromDb<ScorecardEntryRow>(data) : null;
}

async function recalculateScorecardStats(
  supabase: SupabaseClient,
  scorecardId: string,
) {
  const { data } = await supabase
    .from("scorecard_entries")
    .select("*")
    .eq("scorecard_id", scorecardId);

  const entries = (data ?? []).map((row) => fromDb<ScorecardEntryRow>(row));
  const rollup = computeScorecardRollup(entries);

  await supabase
    .from("scorecard_days")
    .update({
      ...toDb(rollup),
      updated_at: new Date().toISOString(),
    })
    .eq("id", scorecardId);
}

async function markOnboardingComplete(
  supabase: SupabaseClient,
  userId: string,
  scorecardDate: string,
) {
  const { data: existing } = await supabase
    .from("scorecard_preferences")
    .select("id, first_scorecard_date")
    .eq("user_id", userId)
    .maybeSingle();

  const firstScorecardDate = existing?.first_scorecard_date ?? scorecardDate;

  await supabase.from("scorecard_preferences").upsert(
    {
      user_id: userId,
      onboarding_completed: true,
      first_scorecard_date: firstScorecardDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function refreshScorecard(
  supabase: SupabaseClient,
  userId: string,
  scorecardId: string,
) {
  return buildScorecardScreenData(supabase, userId, { scorecardId });
}

function success<T>(data: T): ScorecardActionResult<T> {
  return { success: true, data };
}

function failure(
  code: ActionError["code"],
  message: string,
  retryable: boolean,
  field?: string,
): ScorecardActionResult<never> {
  return {
    success: false,
    error: {
      code,
      message,
      field,
      retryable,
    },
  };
}
