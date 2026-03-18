export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { HabitTracker } from "./habit-tracker";
import { HabitInsights } from "./habit-insights";
import type { Habit, HabitGroup, HabitLog, TimeOfDay } from "@/lib/db/schema";
import { isHabitScheduledForDay } from "@/lib/habits";

function getTimeOfDayNudge(): string {
  const now = new Date();
  const hour = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  ).getHours();

  if (hour < 12) return "morning routines await ☀️";
  if (hour < 17) return "afternoon momentum building 🌿";
  if (hour < 21) return "evening wind-down time 🌙";
  return "reflect and rest ✨";
}

function getCurrentTimeOfDay(): TimeOfDay {
  const now = new Date();
  const hour = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  ).getHours();

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export default async function HabitsPage() {
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

  // Fetch groups, active habits, archived habits, today's logs, and 90 days of history
  const [
    { data: groupRows },
    { data: habitRows },
    { data: archivedHabitRows },
    { data: logRows },
    { data: historyLogRows },
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
    supabase
      .from("habit_logs")
      .select("*")
      .eq("date", today),
    // 90 days of logs for heatmap + trends
    supabase
      .from("habit_logs")
      .select("*")
      .gte("date", ninetyDaysAgo)
      .lte("date", today)
      .order("date", { ascending: false }),
  ]);

  const groups = (groupRows || []).map((r) => fromDb<HabitGroup>(r));
  const allHabits = (habitRows || []).map((r) => fromDb<Habit>(r));
  const archivedHabits = (archivedHabitRows || []).map((r) => fromDb<Habit>(r));
  const todayLogs = (logRows || []).map((r) => fromDb<HabitLog>(r));
  const historyLogs = (historyLogRows || []).map((r) => fromDb<HabitLog>(r));

  // Split habits into scheduled-today vs not-today
  const scheduledHabits = allHabits.filter((h) =>
    isHabitScheduledForDay(h.scheduleType, h.scheduleDays || [], dayOfWeek)
  );
  const notTodayHabits = allHabits.filter(
    (h) => !isHabitScheduledForDay(h.scheduleType, h.scheduleDays || [], dayOfWeek)
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
    (h) => todayLogMap[h.id]?.status === "completed"
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
    let completed7 = 0, scheduled7 = 0;
    let completed30 = 0, scheduled30 = 0;
    let completed90 = 0, scheduled90 = 0;

    for (let i = 0; i < 90; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const dow = d.getDay();
      const dateStr = d.toISOString().slice(0, 10);

      if (!isHabitScheduledForDay(habit.scheduleType, habit.scheduleDays || [], dow)) continue;

      const status = historyLogMap[`${habit.id}:${dateStr}`];
      // Skip "skipped" days — they don't count in the denominator
      if (status === "skipped") continue;

      const done = status === "completed" ? 1 : 0;

      if (i < 7) { scheduled7++; completed7 += done; }
      if (i < 30) { scheduled30++; completed30 += done; }
      scheduled90++; completed90 += done;
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
  for (const habit of scheduledHabits) {
    let missed = 0;
    for (const wd of weekDays) {
      const status = historyLogMap[`${habit.id}:${wd.date}`];
      if (!status || status === "missed" || status === "pending") {
        const dayDow = new Date(wd.date + "T12:00:00").getDay();
        if (isHabitScheduledForDay(habit.scheduleType, habit.scheduleDays || [], dayDow)) {
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

  const timeNudge = getTimeOfDayNudge();

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-lg font-serif italic text-[#FFF8F0]/60">
          your garden is growing 🌱
        </p>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <h1 className="text-5xl font-serif font-light text-[#FFF8F0]">
            {todayCompleted} of {totalScheduled}
          </h1>
        </div>
        <p className="text-sm text-[#FEC89A]">
          {timeNudge}
        </p>
        <p className="text-[11px] font-mono text-[#FFF8F0]/30 tracking-wider">
          {dateLabel}
        </p>
        {/* Progress bar */}
        <div className="w-full max-w-md h-1.5 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-[#34D399] to-[#2DD4BF] rounded-full transition-all duration-500"
            style={{ width: `${totalScheduled > 0 ? (todayCompleted / totalScheduled) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
        {/* Left column: Habit tracker */}
        <div className="lg:col-span-3">
          <HabitTracker
            groups={sortedGroups}
            habits={scheduledHabits}
            notTodayHabits={notTodayHabits}
            archivedHabits={archivedHabits}
            todayLogs={todayLogMap}
            date={today}
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
          />
        </div>
      </div>
    </div>
  );
}
