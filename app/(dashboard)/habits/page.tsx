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

function countCompleted(habits: HabitChecks): number {
  return Object.values(habits).filter(Boolean).length;
}

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

  // Weekly history for table (last 7 entries)
  const weeklyHistory = history.slice(0, 7);

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

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          Daily Discipline
        </p>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Habit Tracker
        </h1>
        <p className="text-[11px] font-mono text-white/30 tracking-wider">
          {dateLabel}
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

      {/* Today's form */}
      <section className="animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
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
      </section>

      {/* Weekly History */}
      <section className="space-y-4 animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
        <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/30 font-serif">
          Weekly History
        </h2>

        {weeklyHistory.length === 0 ? (
          <div className="py-12 text-center glass-card rounded-2xl">
            <p className="text-[11px] font-mono text-white/25 tracking-widest uppercase">
              No entries yet. Complete your first daily checklist above.
            </p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.04]">
                  <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                    Day
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                    Completed
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-mono uppercase tracking-[0.25em] text-white/25">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyHistory.map((entry) => {
                  const completed = countCompleted(entry.habits);
                  const total = 14;
                  return (
                    <tr
                      key={entry.id}
                      className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5 font-mono text-[11px] text-white/40">
                        {entry.date}
                      </td>
                      <td className="px-5 py-3.5 font-serif text-sm text-white/90">
                        {entry.day}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-sm stat-number ${
                              completed === total
                                ? "text-primary font-semibold"
                                : completed >= 10
                                ? "text-primary/80"
                                : "text-white/30"
                            }`}
                          >
                            {completed}/{total}
                          </span>
                          <div className="w-16 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/70 rounded-full transition-all"
                              style={{
                                width: `${(completed / total) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-white/25 line-clamp-1 max-w-xs">
                        {entry.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Most Missed Insight */}
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
