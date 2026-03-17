export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { HabitForm } from "./habit-form";
import type { HabitEntry, HabitChecks } from "@/lib/db/schema";

const HABIT_LABELS: Record<keyof HabitChecks, string> = {
  quickAction: "Quick Action",
  exercise: "Exercise",
  clothes: "Clothes Ready",
  actionLog: "Action Log",
  readAM: "Read AM",
  readPM: "Read PM",
  skillStudy: "Skill Study",
  bike: "Bike",
  needDesire: "Need vs Desire",
  cashRecall: "Cash Recall",
  leftBy9: "Left by 9",
  tafseer: "Tafseer",
  phoneOutBy10: "Phone Out by 10",
  weekendPlan: "Weekend Plan",
};

const ALL_HABIT_KEYS = Object.keys(HABIT_LABELS) as (keyof HabitChecks)[];

export default async function HabitsPage() {
  const supabase = await createClient();
  const today = getTodayKarachi();
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
  }).format(new Date());
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const { data: todayRows } = await supabase
    .from("habit_entries")
    .select("*")
    .eq("date", today)
    .limit(1);

  const todayEntry =
    todayRows && todayRows.length > 0
      ? fromDb<HabitEntry>(todayRows[0])
      : null;

  // Fetch last 14 entries for streak calculation
  const { data: historyRows } = await supabase
    .from("habit_entries")
    .select("*")
    .order("date", { ascending: false })
    .limit(14);

  const history = (historyRows || []).map((r) => fromDb<HabitEntry>(r));

  // Compute per-habit streaks from history (consecutive days from today backwards)
  const streaks: Record<string, number> = {};
  for (const key of ALL_HABIT_KEYS) {
    let count = 0;
    // Walk backwards through sorted history (already desc by date)
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      // Check if this is a consecutive day
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedKey = expectedDate.toISOString().slice(0, 10);

      if (entry.date !== expectedKey) break;
      if (entry.habits && entry.habits[key]) {
        count++;
      } else {
        break;
      }
    }
    streaks[key] = count;
  }

  // Build last 7 days data for heatmap (always 7 days, even if no entry)
  const weekDays: { date: string; dayAbbrev: string; entry: HabitEntry | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const abbrev = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      weekday: "short",
    }).format(d);
    const matchingEntry = history.find((e) => e.date === dateStr) ?? null;
    weekDays.push({ date: dateStr, dayAbbrev: abbrev.charAt(0), entry: matchingEntry });
  }

  // Most Missed insight (from last 7 entries)
  const last7Entries = history.slice(0, 7);
  let mostMissedKey: keyof HabitChecks | null = null;
  let mostMissedCount = Infinity;
  let allPerfect = true;

  if (last7Entries.length > 0) {
    for (const key of ALL_HABIT_KEYS) {
      const completions = last7Entries.filter(
        (e) => e.habits && e.habits[key]
      ).length;
      if (completions < last7Entries.length) allPerfect = false;
      if (completions < mostMissedCount) {
        mostMissedCount = completions;
        mostMissedKey = key;
      }
    }
  }

  // Compute today's completion for the header badge
  const todayHabits = todayEntry?.habits;
  const todayCompleted = todayHabits
    ? Object.values(todayHabits).filter(Boolean).length
    : 0;
  const totalHabits = ALL_HABIT_KEYS.length;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          Daily Discipline
        </p>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-gradient-primary">
            {"Today's Habits"}
          </h1>
          <span className="text-[11px] font-mono bg-white/[0.06] text-white/50 px-3 py-1 rounded-full tracking-wider">
            {todayCompleted} of {totalHabits} done
          </span>
        </div>
        <p className="text-[11px] font-mono text-white/30 tracking-wider">
          {dateLabel}
        </p>
        {/* Progress bar */}
        <div className="w-full max-w-md h-1.5 bg-white/[0.05] rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-[#C49E45] to-[#C49E45]/60 rounded-full transition-all duration-500"
            style={{ width: `${totalHabits > 0 ? (todayCompleted / totalHabits) * 100 : 0}%` }}
          />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
        {/* Left column: Today's habit toggles */}
        <div className="lg:col-span-3">
          <div className="glass-card rounded-2xl p-6 space-y-4 hover:border-white/[0.08] transition-all">
            <div className="space-y-1">
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-primary/80 font-serif">
                {"Today's Checklist"}
              </h2>
              <p className="text-[10px] font-mono text-white/25 tracking-wider uppercase">
                {today} &middot; {dayName}
              </p>
            </div>
            <HabitForm entry={todayEntry} date={today} day={dayName} streaks={streaks} />
          </div>
        </div>

        {/* Right column: Weekly Streaks Heatmap */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-6 hover:border-white/[0.08] transition-all">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-primary/80 font-serif mb-5">
              Weekly Streaks
            </h2>

            <div className="overflow-x-auto -mx-6 px-6">
            {/* Day column headers */}
            <div className="flex items-center mb-3 min-w-[320px]">
              <div className="w-24 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-7 gap-1">
                {weekDays.map((wd, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[9px] font-mono text-white/30 uppercase">
                      {wd.dayAbbrev}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Habit rows with heatmap squares */}
            <div className="space-y-1.5 min-w-[320px]">
              {ALL_HABIT_KEYS.map((key) => (
                <div key={key} className="flex items-center">
                  <div className="w-24 flex-shrink-0 pr-2">
                    <span className="text-[9px] font-mono text-white/40 truncate block">
                      {HABIT_LABELS[key]}
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-7 gap-1">
                    {weekDays.map((wd, i) => {
                      const done = wd.entry?.habits?.[key] ?? false;
                      const hasEntry = wd.entry !== null;

                      return (
                        <div key={i} className="flex justify-center">
                          <div
                            className={`w-4 h-4 rounded-sm transition-colors ${
                              done
                                ? "bg-[#C49E45] shadow-[0_0_6px_rgba(196,158,69,0.3)]"
                                : hasEntry
                                ? "bg-white/[0.06]"
                                : "border border-white/[0.06] bg-transparent"
                            }`}
                            title={`${HABIT_LABELS[key]} - ${wd.date}${done ? " (done)" : hasEntry ? " (missed)" : " (no data)"}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            </div>{/* end overflow-x-auto */}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#C49E45]" />
                <span className="text-[9px] font-mono text-white/30">Done</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-white/[0.06]" />
                <span className="text-[9px] font-mono text-white/30">Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border border-white/[0.06]" />
                <span className="text-[9px] font-mono text-white/30">No data</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Most Missed Insight — full width */}
      {last7Entries.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: "0.24s", animationFillMode: "both" }}>
          <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/30 font-serif mb-4">
            Weekly Insight
          </h2>
          <div className="glass-card rounded-2xl p-6 hover:border-white/[0.08] transition-all">
            {allPerfect ? (
              <div className="text-center py-2">
                <p className="text-sm font-serif text-gradient-primary">
                  Perfect week! All habits completed.
                </p>
                <p className="text-[10px] font-mono text-white/20 mt-1 tracking-wider">
                  Keep the momentum going.
                </p>
              </div>
            ) : mostMissedKey ? (
              <div className="text-center py-2">
                <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase mb-2">
                  This week&apos;s most missed
                </p>
                <p className="text-lg font-serif text-gradient-primary">
                  {HABIT_LABELS[mostMissedKey]}
                </p>
                <p className="text-[10px] font-mono text-white/30 mt-1.5 tracking-wider">
                  completed {mostMissedCount}/{last7Entries.length} days
                </p>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
