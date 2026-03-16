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

  // Fetch today's entry
  const { data: todayRows } = await supabase
    .from("habit_entries")
    .select("*")
    .eq("date", today)
    .limit(1);

  const todayEntry =
    todayRows && todayRows.length > 0
      ? fromDb<HabitEntry>(todayRows[0])
      : null;

  // Fetch last 7 entries for weekly history
  const { data: historyRows } = await supabase
    .from("habit_entries")
    .select("*")
    .order("date", { ascending: false })
    .limit(7);

  const history = (historyRows || []).map((r) => fromDb<HabitEntry>(r));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
          {"🔁 Habit Tracker"}
        </h1>
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          {dateLabel}
        </p>
      </div>

      {/* Today's form */}
      <div className="border border-border/50 rounded-lg p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-serif tracking-widest uppercase text-foreground">
            {"Today's Checklist"}
          </h2>
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
            {today} &middot; {dayName}
          </p>
        </div>
        <HabitForm entry={todayEntry} date={today} day={dayName} />
      </div>

      {/* Weekly History */}
      <div className="space-y-3">
        <h2 className="text-sm font-serif tracking-widest uppercase text-foreground">
          Weekly History
        </h2>

        {history.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-mono text-sm border border-border/30 rounded-lg">
            No entries yet. Complete your first daily checklist above.
          </div>
        ) : (
          <div className="border border-border/50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card border-b border-border/50">
                  <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Day
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => {
                  const completed = countCompleted(entry.habits);
                  return (
                    <tr
                      key={entry.id}
                      className={`border-t border-border/30 ${
                        i % 2 !== 0 ? "bg-card/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {entry.date}
                      </td>
                      <td className="px-4 py-3 font-serif text-sm">
                        {entry.day}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-sm ${
                              completed === 14
                                ? "text-primary font-semibold"
                                : completed >= 10
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {completed}/14
                          </span>
                          <div className="w-16 h-1 bg-border/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(completed / 14) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground line-clamp-1 max-w-xs">
                        {entry.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
