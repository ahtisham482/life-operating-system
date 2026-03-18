export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { HabitTracker } from "./habit-tracker";
import type { Habit, HabitGroup, HabitLog, TimeOfDay } from "@/lib/db/schema";
import { isHabitScheduledForDay } from "@/lib/habits";

function getTimeOfDayNudge(): string {
  const now = new Date();
  const hour = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  ).getHours();

  if (hour < 12) return "morning routines await \u2600\uFE0F";
  if (hour < 17) return "afternoon momentum building \uD83C\uDF3F";
  if (hour < 21) return "evening wind-down time \uD83C\uDF19";
  return "reflect and rest \u2728";
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
  const dayOfWeek = todayDate.getDay(); // 0=Sun..6=Sat

  // Fetch groups, active habits, and today's logs in parallel
  const [
    { data: groupRows },
    { data: habitRows },
    { data: archivedHabitRows },
    { data: logRows },
    { data: recentLogRows },
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
    // Recent logs for weekly heatmap (7 days)
    supabase
      .from("habit_logs")
      .select("*")
      .gte("date", new Date(todayDate.getTime() - 6 * 86400000).toISOString().slice(0, 10))
      .lte("date", today)
      .order("date", { ascending: false }),
  ]);

  const groups = (groupRows || []).map((r) => fromDb<HabitGroup>(r));
  const allHabits = (habitRows || []).map((r) => fromDb<Habit>(r));
  const archivedHabits = (archivedHabitRows || []).map((r) => fromDb<Habit>(r));
  const todayLogs = (logRows || []).map((r) => fromDb<HabitLog>(r));
  const recentLogs = (recentLogRows || []).map((r) => fromDb<HabitLog>(r));

  // Split habits into scheduled-today vs not-today
  const scheduledHabits = allHabits.filter((h) =>
    isHabitScheduledForDay(h.scheduleType, h.scheduleDays || [], dayOfWeek)
  );
  const notTodayHabits = allHabits.filter(
    (h) => !isHabitScheduledForDay(h.scheduleType, h.scheduleDays || [], dayOfWeek)
  );

  // Build log map for today: habitId → status
  const todayLogMap: Record<string, HabitLog> = {};
  for (const log of todayLogs) {
    todayLogMap[log.habitId] = log;
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

  // Build 7-day heatmap data
  const weekDays: { date: string; dayAbbrev: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const abbrev = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      weekday: "short",
    }).format(d);
    weekDays.push({ date: dateStr, dayAbbrev: abbrev.charAt(0) });
  }

  // Build recent logs map: habitId+date → status
  const recentLogMap: Record<string, string> = {};
  for (const log of recentLogs) {
    recentLogMap[`${log.habitId}:${log.date}`] = log.status;
  }

  // Weekly Insight: find most missed habit in the last 7 days
  const missedCounts: Record<string, number> = {};
  for (const habit of scheduledHabits) {
    let missed = 0;
    for (const wd of weekDays) {
      const logKey = `${habit.id}:${wd.date}`;
      const status = recentLogMap[logKey];
      // Count as missed if no log or explicitly missed/pending (but not completed or skipped)
      if (!status || status === "missed" || status === "pending") {
        // Only count if the habit was scheduled for that day
        const dayDow = new Date(wd.date + "T12:00:00").getDay();
        if (isHabitScheduledForDay(habit.scheduleType, habit.scheduleDays || [], dayDow)) {
          missed++;
        }
      }
    }
    if (missed > 0) missedCounts[habit.id] = missed;
  }

  // Sort by most missed, get top 3
  const mostMissed = Object.entries(missedCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, count]) => ({
      habit: allHabits.find((h) => h.id === id),
      count,
    }))
    .filter((m) => m.habit);

  const timeNudge = getTimeOfDayNudge();

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-lg font-serif italic text-[#FFF8F0]/60">
          your garden is growing {"\uD83C\uDF31"}
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

        {/* Right column: Weekly Streaks Heatmap */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#34D399]/80 font-serif mb-5">
              Weekly Streaks
            </h2>

            <div className="overflow-x-auto -mx-6 px-6">
              {/* Day column headers */}
              <div className="flex items-center mb-3 min-w-[320px]">
                <div className="w-24 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {weekDays.map((wd, i) => (
                    <div key={i} className="text-center">
                      <span className="text-[9px] font-mono text-[#FFF8F0]/30 uppercase">
                        {wd.dayAbbrev}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Habit rows with heatmap squares */}
              <div className="space-y-1.5 min-w-[320px]">
                {allHabits.map((habit) => (
                  <div key={habit.id} className="flex items-center">
                    <div className="w-24 flex-shrink-0 pr-2">
                      <span className="text-[9px] font-mono text-[#FFF8F0]/40 truncate block">
                        {habit.emoji ? `${habit.emoji} ` : ""}{habit.name}
                      </span>
                    </div>
                    <div className="flex-1 grid grid-cols-7 gap-1">
                      {weekDays.map((wd, i) => {
                        const status = recentLogMap[`${habit.id}:${wd.date}`];
                        const done = status === "completed";
                        const skipped = status === "skipped";
                        const missed = status === "missed";

                        return (
                          <div key={i} className="flex justify-center">
                            <div
                              className={`w-4 h-4 rounded-sm transition-colors ${
                                done
                                  ? "bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.3)]"
                                  : skipped
                                  ? "bg-[#60A5FA]/30"
                                  : missed
                                  ? "bg-[#FFF8F0]/[0.06]"
                                  : "border border-[#FFF8F0]/[0.06] bg-transparent"
                              }`}
                              title={`${habit.name} - ${wd.date} (${status || "no data"})`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[#FFF8F0]/[0.04]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#34D399]" />
                <span className="text-[9px] font-mono text-[#FFF8F0]/30">Done</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#60A5FA]/30" />
                <span className="text-[9px] font-mono text-[#FFF8F0]/30">Skipped</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#FFF8F0]/[0.06]" />
                <span className="text-[9px] font-mono text-[#FFF8F0]/30">Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border border-[#FFF8F0]/[0.06]" />
                <span className="text-[9px] font-mono text-[#FFF8F0]/30">No data</span>
              </div>
            </div>
          </div>

          {/* Weekly Insight: Most Missed Habits */}
          {mostMissed.length > 0 && (
            <div className="glass-card rounded-3xl p-6 mt-6 hover:border-[#FFF8F0]/[0.08] transition-all">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FF6B6B]/80 font-serif mb-4">
                Needs Attention
              </h2>
              <div className="space-y-3">
                {mostMissed.map(({ habit, count }) => (
                  <div key={habit!.id} className="flex items-center justify-between">
                    <span className="text-sm font-serif text-[#FFF8F0]/60 truncate">
                      {habit!.emoji && `${habit!.emoji} `}{habit!.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#FF6B6B]/60 shrink-0 ml-2">
                      {count}/7 missed
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] font-mono text-[#FFF8F0]/20 mt-3 italic">
                These habits need the most love this week
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
