export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { HabitTracker } from "./habit-tracker";
import { HabitInsights } from "./habit-insights";
import { IdentityBoard } from "./identity-board";
import { ZoneTabs, resolveNavigation, getUnlockedZones } from "./zone-tabs";
import type {
  Habit,
  HabitGroup,
  HabitLog,
  HabitTemplate,
  TimeOfDay,
} from "@/lib/db/schema";
import { isHabitScheduledForDay } from "@/lib/habits";
import { ScorecardTab } from "./scorecard-tab";
import { ArchitectTab } from "./architect-tab";
import { AttractionTab } from "./attraction-tab";
import { FrictionTab } from "./friction-tab";
import { RewardsTab } from "./rewards-tab";
import { BreakerTab } from "./breaker-tab";
import { MasteryTab } from "./mastery-tab";
import { GuideTab } from "./guide-tab";
import { DailyDashboard } from "./daily-dashboard";

function getTimeOfDayNudge(): string {
  const now = new Date();
  const hour = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }),
  ).getHours();

  if (hour < 12) return "morning routines await ☀️";
  if (hour < 17) return "afternoon momentum building 🌿";
  if (hour < 21) return "evening wind-down time 🌙";
  return "reflect and rest ✨";
}

function getCurrentTimeOfDay(): TimeOfDay {
  const now = new Date();
  const hour = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }),
  ).getHours();

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; zone?: string; view?: string }>;
}) {
  const params = await searchParams;
  let { zone: activeZone, view: activeView } = resolveNavigation(params);

  const supabase = await createClient();
  const today = getTodayKarachi();
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const todayDate = new Date(today);
  const dayOfWeek = todayDate.getDay();
  const ninetyDaysAgo = new Date(todayDate.getTime() - 89 * 86400000)
    .toISOString()
    .slice(0, 10);

  // Fetch groups, habits, logs, templates, and diagnoses in parallel
  const [
    { data: groupRows },
    { data: habitRows },
    { data: archivedHabitRows },
    { data: logRows },
    { data: historyLogRows },
    { data: templateRows },
    { data: diagnosisRows },
  ] = await Promise.all([
    supabase
      .from("habit_groups")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("habits")
      .select("*")
      .is("archived_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("habits")
      .select("*")
      .not("archived_at", "is", null)
      .order("updated_at", { ascending: false }),
    supabase.from("habit_logs").select("*").eq("date", today),
    // 90 days of logs for heatmap + trends + keystone
    supabase
      .from("habit_logs")
      .select("*")
      .gte("date", ninetyDaysAgo)
      .lte("date", today)
      .order("date", { ascending: false }),
    // Templates for template library
    supabase
      .from("habit_templates")
      .select("*")
      .order("sort_order", { ascending: true }),
    // Active (undismissed) diagnoses from the last 7 days
    supabase
      .from("habit_diagnoses")
      .select("*")
      .is("dismissed_at", null)
      .gte(
        "created_at",
        new Date(todayDate.getTime() - 7 * 86400000).toISOString(),
      ),
  ]);

  const groups = (groupRows || []).map((r) => fromDb<HabitGroup>(r));
  const allHabits = (habitRows || []).map((r) => fromDb<Habit>(r));
  const archivedHabits = (archivedHabitRows || []).map((r) => fromDb<Habit>(r));
  const todayLogs = (logRows || []).map((r) => fromDb<HabitLog>(r));
  const historyLogs = (historyLogRows || []).map((r) => fromDb<HabitLog>(r));
  const templates = (templateRows || []).map((r) => fromDb<HabitTemplate>(r));

  // ─────────────────────────────────────────
  // Identity Engine data (fetched for both tabs, lightweight)
  // ─────────────────────────────────────────
  const [{ data: identityRows }, { data: uncelebratedRows }, { count: scorecardCount }] =
    await Promise.all([
      supabase
        .from("user_identities")
        .select("*")
        .eq("status", "active")
        .order("sort_order", { ascending: true }),
      supabase
        .from("identity_milestones")
        .select("id, milestone_title, milestone_message")
        .eq("celebrated", false)
        .order("achieved_at", { ascending: true })
        .limit(5),
      supabase
        .from("scorecard_days")
        .select("*", { count: "exact", head: true }),
    ]);

  const identities = (identityRows ?? []).map((r) => ({
    id: r.id as string,
    identityStatement: r.identity_statement as string,
    icon: r.icon as string | null,
    color: r.color as string,
    whyStatement: r.why_statement as string | null,
    confidenceLevel: r.confidence_level as number,
  }));

  const uncelebrated = (uncelebratedRows ?? []).map((r) => ({
    id: r.id as string,
    milestoneTitle: r.milestone_title as string,
    milestoneMessage: r.milestone_message as string,
  }));

  // Habits with completion status for the Identity tab
  const todayLogSet = new Set(
    todayLogs.filter((l) => l.status === "completed").map((l) => l.habitId),
  );
  const habitsForIdentity = allHabits.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji ?? null,
    tinyVersion: h.tinyVersion ?? null,
    identityId: h.identityId ?? null,
    isCompletedToday: todayLogSet.has(h.id),
  }));

  // Week stats per identity (for reflection modal)
  const weekStart = new Date(todayDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const weekStats: Record<
    string,
    { totalVotes: number; positiveVotes: number; percentage: number }
  > = {};
  for (const identity of identities) {
    const linkedHabitIds = habitsForIdentity
      .filter((h) => h.identityId === identity.id)
      .map((h) => h.id);
    const weekLogs = historyLogs.filter(
      (l) => linkedHabitIds.includes(l.habitId) && l.date >= weekStartStr,
    );
    const positiveVotes = weekLogs.filter(
      (l) => l.status === "completed",
    ).length;
    const totalVotes = weekLogs.length;
    weekStats[identity.id] = {
      totalVotes,
      positiveVotes,
      percentage:
        totalVotes > 0 ? Math.round((positiveVotes / totalVotes) * 100) : 0,
    };
  }

  // Build a set of habit IDs that have active diagnoses (undismissed, within 7 days)
  const activeDiagnosisHabitIds = new Set<string>();
  const activeDiagnosisMap: Record<string, string> = {}; // habitId → diagnosisId
  for (const d of diagnosisRows || []) {
    activeDiagnosisHabitIds.add(d.habit_id);
    activeDiagnosisMap[d.habit_id] = d.id;
  }

  // Split habits into scheduled-today vs not-today
  const scheduledHabits = allHabits.filter((h) =>
    isHabitScheduledForDay(h.scheduleType, h.scheduleDays || [], dayOfWeek),
  );
  const notTodayHabits = allHabits.filter(
    (h) =>
      !isHabitScheduledForDay(h.scheduleType, h.scheduleDays || [], dayOfWeek),
  );

  // Build log map for today: habitId → HabitLog
  const todayLogMap: Record<string, HabitLog> = {};
  for (const log of todayLogs) {
    todayLogMap[log.habitId] = log;
  }

  // Build history log map: "habitId:date" → status
  const historyLogMap: Record<string, string> = {};
  for (const log of historyLogs) {
    historyLogMap[`${log.habitId}:${log.date}`] = log.status;
  }

  // Compute today's completion stats
  const todayCompleted = scheduledHabits.filter(
    (h) => todayLogMap[h.id]?.status === "completed",
  ).length;
  const totalScheduled = scheduledHabits.length;

  // Smart group ordering: current time-of-day group first
  const currentTod = getCurrentTimeOfDay();
  const todPriority: Record<string, number> = {
    [currentTod]: 0,
    anytime: 1,
  };
  const sortedGroups = [...groups].sort((a, b) => {
    const aPri = todPriority[a.timeOfDay] ?? 2;
    const bPri = todPriority[b.timeOfDay] ?? 2;
    if (aPri !== bPri) return aPri - bPri;
    return a.sortOrder - b.sortOrder;
  });

  // ─────────────────────────────────────────
  // Build heatmap data (30 days)
  // ─────────────────────────────────────────
  const heatmapDays: { date: string; dayAbbrev: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const abbrev = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      weekday: "short",
    }).format(d);
    heatmapDays.push({ date: dateStr, dayAbbrev: abbrev.charAt(0) });
  }

  // ─────────────────────────────────────────
  // Compute completion rate trends (7d / 30d / 90d)
  // ─────────────────────────────────────────
  const trends: Record<string, { d7: number; d30: number; d90: number }> = {};

  for (const habit of allHabits) {
    let completed7 = 0,
      scheduled7 = 0;
    let completed30 = 0,
      scheduled30 = 0;
    let completed90 = 0,
      scheduled90 = 0;

    for (let i = 0; i < 90; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const dow = d.getDay();
      const dateStr = d.toISOString().slice(0, 10);

      if (
        !isHabitScheduledForDay(
          habit.scheduleType,
          habit.scheduleDays || [],
          dow,
        )
      )
        continue;

      const status = historyLogMap[`${habit.id}:${dateStr}`];
      if (status === "skipped") continue;

      const done = status === "completed" ? 1 : 0;

      if (i < 7) {
        scheduled7++;
        completed7 += done;
      }
      if (i < 30) {
        scheduled30++;
        completed30 += done;
      }
      scheduled90++;
      completed90 += done;
    }

    trends[habit.id] = {
      d7: scheduled7 > 0 ? Math.round((completed7 / scheduled7) * 100) : 0,
      d30: scheduled30 > 0 ? Math.round((completed30 / scheduled30) * 100) : 0,
      d90: scheduled90 > 0 ? Math.round((completed90 / scheduled90) * 100) : 0,
    };
  }

  // ─────────────────────────────────────────
  // Weekly Insight: most missed habits (last 7 days)
  // ─────────────────────────────────────────
  const weekDays = heatmapDays.slice(-7);
  const missedCounts: Record<string, number> = {};
  for (const habit of allHabits) {
    let missed = 0;
    for (const wd of weekDays) {
      const status = historyLogMap[`${habit.id}:${wd.date}`];
      if (!status || status === "missed" || status === "pending") {
        const dayDow = new Date(wd.date + "T12:00:00").getDay();
        if (
          isHabitScheduledForDay(
            habit.scheduleType,
            habit.scheduleDays || [],
            dayDow,
          )
        ) {
          missed++;
        }
      }
    }
    if (missed > 0) missedCounts[habit.id] = missed;
  }

  const mostMissed = Object.entries(missedCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, count]) => ({
      habit: allHabits.find((h) => h.id === id)!,
      count,
    }))
    .filter((m) => m.habit);

  // ─────────────────────────────────────────
  // Diagnosis flags: habits with 3+ misses/week
  // that don't already have an active diagnosis
  // ─────────────────────────────────────────
  const diagnosisFlags: {
    habitId: string;
    missCount: number;
    diagnosisId?: string;
  }[] = [];
  for (const [habitId, count] of Object.entries(missedCounts)) {
    if (count >= 3 && !activeDiagnosisHabitIds.has(habitId)) {
      diagnosisFlags.push({ habitId, missCount: count });
    }
  }

  // ─────────────────────────────────────────
  // Days of data (distinct dates in history logs)
  // ─────────────────────────────────────────
  const uniqueDates = new Set<string>();
  for (const log of historyLogs) {
    uniqueDates.add(log.date);
  }
  const daysOfData = uniqueDates.size;

  // ─────────────────────────────────────────
  // Progressive Disclosure: enforce zone locks server-side
  // ─────────────────────────────────────────
  const unlocked = getUnlockedZones(daysOfData, allHabits.length);
  if (activeZone === "build" && !unlocked.build) {
    activeZone = "today";
    activeView = "tracker";
  }
  if (activeZone === "grow" && !unlocked.grow) {
    activeZone = "today";
    activeView = "tracker";
  }

  // ─────────────────────────────────────────
  // Keystone Habit Detection (only when 30+ days of data)
  // ─────────────────────────────────────────
  const keystoneHabitIds: string[] = [];
  const keystoneInsights: {
    habitId: string;
    habitName: string;
    habitEmoji: string;
    withRate: number;
    withoutRate: number;
  }[] = [];

  if (daysOfData >= 30 && allHabits.length >= 2) {
    // Build a day-level completion map: date → Set of completed habit IDs
    const dateCompletedHabits: Record<string, Set<string>> = {};
    for (const log of historyLogs) {
      if (log.status === "completed") {
        if (!dateCompletedHabits[log.date])
          dateCompletedHabits[log.date] = new Set();
        dateCompletedHabits[log.date].add(log.habitId);
      }
    }

    // Get all dates where at least one habit was scheduled
    const allDates = Array.from(uniqueDates);

    for (const habit of allHabits) {
      const otherHabits = allHabits.filter((h) => h.id !== habit.id);
      if (otherHabits.length === 0) continue;

      let withDays = 0,
        withTotal = 0,
        withCompleted = 0;
      let withoutDays = 0,
        withoutTotal = 0,
        withoutCompleted = 0;

      for (const dateStr of allDates) {
        const dow = new Date(dateStr + "T12:00:00").getDay();
        // Check if habit H was scheduled on this day
        if (
          !isHabitScheduledForDay(
            habit.scheduleType,
            habit.scheduleDays || [],
            dow,
          )
        )
          continue;

        const completedSet = dateCompletedHabits[dateStr] || new Set();
        const hDone = completedSet.has(habit.id);

        // Count other habits' completion on this day
        for (const other of otherHabits) {
          if (
            !isHabitScheduledForDay(
              other.scheduleType,
              other.scheduleDays || [],
              dow,
            )
          )
            continue;
          if (hDone) {
            withTotal++;
            if (completedSet.has(other.id)) withCompleted++;
          } else {
            withoutTotal++;
            if (completedSet.has(other.id)) withoutCompleted++;
          }
        }

        if (hDone) withDays++;
        else withoutDays++;
      }

      if (
        withDays >= 5 &&
        withoutDays >= 5 &&
        withTotal > 0 &&
        withoutTotal > 0
      ) {
        const withRate = Math.round((withCompleted / withTotal) * 100);
        const withoutRate = Math.round((withoutCompleted / withoutTotal) * 100);
        const diff = withRate - withoutRate;

        if (diff > 15) {
          keystoneHabitIds.push(habit.id);
          keystoneInsights.push({
            habitId: habit.id,
            habitName: habit.name,
            habitEmoji: habit.emoji || "",
            withRate,
            withoutRate,
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────
  // Recovery banner: check yesterday's misses
  // ─────────────────────────────────────────
  let recoveryMessage: string | null = null;
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayDow = yesterday.getDay();

  const yesterdayScheduled = allHabits.filter((h) =>
    isHabitScheduledForDay(h.scheduleType, h.scheduleDays || [], yesterdayDow),
  );

  if (yesterdayScheduled.length > 0) {
    let missedYesterday = 0;
    let maxStreak = 0;

    for (const habit of yesterdayScheduled) {
      const status = historyLogMap[`${habit.id}:${yesterdayStr}`];
      if (!status || status === "missed" || status === "pending") {
        missedYesterday++;
        if (habit.currentStreak > maxStreak) maxStreak = habit.currentStreak;
      }
    }

    if (missedYesterday > 0) {
      const missRatio = missedYesterday / yesterdayScheduled.length;
      if (maxStreak >= 7 && missRatio < 0.5) {
        recoveryMessage = `One slip doesn't erase your progress. Your longest active streak is ${maxStreak} days. Keep going.`;
      } else if (missRatio >= 0.7) {
        recoveryMessage =
          "Every expert was once a beginner. Start with just one habit today.";
      } else {
        recoveryMessage = "Yesterday was tough. Today is what matters.";
      }
    }
  }

  // ─────────────────────────────────────────
  // Perfect day count (this month)
  // ─────────────────────────────────────────
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  let perfectDayCount = 0;

  for (
    let d = new Date(monthStart);
    d < todayDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateStr = d.toISOString().slice(0, 10);
    const dow = d.getDay();

    const dayScheduled = allHabits.filter((h) =>
      isHabitScheduledForDay(h.scheduleType, h.scheduleDays || [], dow),
    );

    if (dayScheduled.length === 0) continue;

    const allCompleted = dayScheduled.every((h) => {
      const status = historyLogMap[`${h.id}:${dateStr}`];
      return status === "completed" || status === "skipped";
    });

    if (allCompleted) perfectDayCount++;
  }

  const timeNudge = getTimeOfDayNudge();

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div
        className="space-y-2 animate-slide-up"
        style={{ animationDelay: "0s", animationFillMode: "both" }}
      >
        <p className="text-lg font-serif italic text-[#FFF8F0]/60">
          your garden is growing 🌱
        </p>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <h1 className="text-5xl font-serif font-light text-[#FFF8F0]">
            {todayCompleted} of {totalScheduled}
          </h1>
        </div>
        <p className="text-sm text-[#FEC89A]">{timeNudge}</p>
        <p className="text-[11px] font-mono text-[#FFF8F0]/30 tracking-wider">
          {dateLabel}
        </p>
        {/* Progress bar */}
        <div className="w-full max-w-md h-1.5 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-[#34D399] to-[#2DD4BF] rounded-full transition-all duration-500"
            style={{
              width: `${totalScheduled > 0 ? (todayCompleted / totalScheduled) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Zone navigation */}
      <ZoneTabs activeZone={activeZone} activeView={activeView} daysOfData={daysOfData} habitsCount={allHabits.length} />

      {/* New user welcome — shows only when 0 habits exist */}
      {allHabits.length === 0 && activeView === "tracker" && (
        <div
          className="max-w-xl mx-auto text-center py-12 space-y-6 animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <span className="text-5xl">🌱</span>
          <h2 className="text-xl font-serif text-[#FFF8F0]">
            Welcome to your habit system
          </h2>
          <p className="text-sm text-[#FFF8F0]/50 leading-relaxed max-w-md mx-auto">
            This isn&apos;t just a tracker — it&apos;s a complete system for building the person
            you want to become. Start by creating your first habit below, or visit the
            <span className="text-[#A78BFA]"> Learn &amp; Check </span>
            guide for a step-by-step walkthrough.
          </p>
          <div className="flex items-center gap-2 justify-center text-[10px] font-mono text-[#FFF8F0]/25">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FF6B6B]/40" /> Today — track daily</span>
            <span>·</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2DD4BF]/40" /> Build — design systems</span>
            <span>·</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#A78BFA]/40" /> Grow — level up</span>
          </div>
          <p className="text-[11px] text-[#FFF8F0]/20 italic">
            &ldquo;You do not rise to the level of your goals. You fall to the level of your systems.&rdquo; — James Clear
          </p>
        </div>
      )}

      {/* Daily Dashboard — shows at-a-glance info above tracker */}
      {activeView === "tracker" && allHabits.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: "0.06s", animationFillMode: "both" }}>
          <DailyDashboard todayCompleted={todayCompleted} totalScheduled={totalScheduled} date={today} />
        </div>
      )}

      {/* Tracker view */}
      {activeView === "tracker" && (
        <div
          className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          {/* Left column: Habit tracker */}
          <div className="lg:col-span-3">
            <HabitTracker
              groups={sortedGroups}
              habits={scheduledHabits}
              notTodayHabits={notTodayHabits}
              archivedHabits={archivedHabits}
              todayLogs={todayLogMap}
              date={today}
              templates={templates}
              diagnosisFlags={diagnosisFlags}
              keystoneHabitIds={keystoneHabitIds}
              recoveryMessage={recoveryMessage}
              perfectDayCount={perfectDayCount}
              daysOfData={daysOfData}
            />
          </div>

          {/* Right column: Insights */}
          <div className="lg:col-span-2">
            <HabitInsights
              habits={allHabits}
              heatmapDays={heatmapDays}
              logMap={historyLogMap}
              trends={trends}
              mostMissed={mostMissed}
              keystoneInsights={keystoneInsights}
              perfectDayCount={perfectDayCount}
              daysOfData={daysOfData}
            />
          </div>
        </div>
      )}

      {/* Identity tab */}
      {activeView === "identity" && (
        <div
          className="animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <IdentityBoard
            identities={identities}
            habits={habitsForIdentity}
            uncelebrated={uncelebrated}
            weekStats={weekStats}
          />
        </div>
      )}

      {/* Scorecard tab */}
      {activeView === "scorecard" && (
        <div
          className="max-w-2xl animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <ScorecardTab date={today} totalScorecards={scorecardCount ?? 0} />
        </div>
      )}

      {/* Architect tab */}
      {activeView === "architect" && (
        <div
          className="max-w-4xl animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <ArchitectTab identities={identities} />
        </div>
      )}

      {/* Attract tab */}
      {activeView === "attract" && (
        <div
          className="max-w-3xl animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <AttractionTab identities={identities} />
        </div>
      )}

      {/* Friction tab */}
      {activeView === "friction" && (
        <div
          className="max-w-4xl animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <FrictionTab identities={identities} />
        </div>
      )}

      {/* Rewards tab */}
      {activeView === "rewards" && (
        <div
          className="max-w-4xl animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <RewardsTab />
        </div>
      )}

      {/* Breaker tab */}
      {activeView === "breaker" && (
        <div
          className="max-w-4xl animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <BreakerTab />
        </div>
      )}

      {/* Mastery tab */}
      {activeView === "mastery" && (
        <div
          className="max-w-4xl animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <MasteryTab />
        </div>
      )}

      {/* Guide tab */}
      {activeView === "guide" && (
        <div
          className="max-w-3xl animate-slide-up"
          style={{ animationDelay: "0.08s", animationFillMode: "both" }}
        >
          <GuideTab />
        </div>
      )}
    </div>
  );
}
