import { createClient } from "@/lib/supabase/server";
import type {
  ScorecardDay,
  ScorecardEntryRow,
  ScorecardPreference,
} from "@/lib/db/schema";
import {
  buildLiveStats,
  buildTimeBreakdown,
  buildTimeline,
  getScorecardDateLabel,
  getStarterDate,
  type ScorecardScreenData,
} from "@/lib/scorecard";
import { fromDb, getTodayKarachi } from "@/lib/utils";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getScorecardTabData(): Promise<ScorecardScreenData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return buildScorecardScreenData(supabase, user.id);
}

export async function buildScorecardScreenData(
  supabase: SupabaseClient,
  userId: string,
  options?: { scorecardId?: string | null },
): Promise<ScorecardScreenData> {
  const today = getTodayKarachi();
  const starterDate = getStarterDate(today);

  const [{ data: preferenceRow }, { data: identityRows }, scorecardRow] =
    await Promise.all([
      supabase
        .from("scorecard_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_identities")
        .select("id, identity_statement, color, icon")
        .eq("status", "active")
        .order("sort_order", { ascending: true }),
      findActiveScorecard(supabase, userId, options?.scorecardId ?? null, today),
    ]);

  const preferences = preferenceRow
    ? fromDb<ScorecardPreference>(preferenceRow)
    : null;
  const activeIdentities = (identityRows ?? []).map((row) => ({
    id: row.id as string,
    identityStatement: row.identity_statement as string,
    color: row.color as string,
    icon: (row.icon as string | null) ?? null,
  }));

  let scorecard: ScorecardDay | null = null;
  let entries: ScorecardEntryRow[] = [];

  if (scorecardRow) {
    scorecard = fromDb<ScorecardDay>(scorecardRow);
    const { data: entryRows } = await supabase
      .from("scorecard_entries")
      .select("*")
      .eq("scorecard_id", scorecard.id)
      .order("sort_order", { ascending: true })
      .order("time_of_action", { ascending: true });

    entries = (entryRows ?? []).map((row) => fromDb<ScorecardEntryRow>(row));
  }

  return {
    scorecard,
    timeline: buildTimeline(entries),
    liveStats: buildLiveStats(scorecard),
    timeBreakdown: buildTimeBreakdown(entries),
    activeIdentities,
    onboardingState: {
      completed: preferences?.onboardingCompleted ?? false,
      needsOnboarding: !(preferences?.onboardingCompleted ?? false),
      starterDate,
      starterDateLabel: getScorecardDateLabel(starterDate),
    },
    dateLabel: scorecard ? getScorecardDateLabel(scorecard.scorecardDate) : null,
  };
}

async function findActiveScorecard(
  supabase: SupabaseClient,
  userId: string,
  scorecardId: string | null,
  today: string,
) {
  if (scorecardId) {
    const { data } = await supabase
      .from("scorecard_days")
      .select("*")
      .eq("id", scorecardId)
      .eq("user_id", userId)
      .maybeSingle();

    return data;
  }

  const { data: todayScorecard } = await supabase
    .from("scorecard_days")
    .select("*")
    .eq("user_id", userId)
    .eq("scorecard_date", today)
    .maybeSingle();

  if (todayScorecard) return todayScorecard;

  const { data: latestRows } = await supabase
    .from("scorecard_days")
    .select("*")
    .eq("user_id", userId)
    .order("scorecard_date", { ascending: false })
    .limit(1);

  return latestRows?.[0] ?? null;
}
