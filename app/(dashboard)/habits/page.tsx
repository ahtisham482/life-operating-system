export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { HabitForm } from "./habit-form";
import type { HabitEntry, HabitChecks } from "@/lib/db/schema";

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

  const { data: historyRows } = await supabase
    .from("habit_entries")
    .select("*")
    .order("date", { ascending: false })
    .limit(7);

  const history = (historyRows || []).map((r) => fromDb<HabitEntry>(r));

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
          <HabitForm entry={todayEntry} date={today} day={dayName} />
        </div>
      </section>

      {/* Weekly History */}
      <section className="space-y-4 animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
        <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/30 font-serif">
          Weekly History
        </h2>

        {history.length === 0 ? (
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
                {history.map((entry) => {
                  const completed = countCompleted(entry.habits);
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
                              completed === 14
                                ? "text-primary font-semibold"
                                : completed >= 10
                                ? "text-primary/80"
                                : "text-white/30"
                            }`}
                          >
                            {completed}/14
                          </span>
                          <div className="w-16 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/70 rounded-full transition-all"
                              style={{
                                width: `${(completed / 14) * 100}%`,
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
    </div>
  );
}
