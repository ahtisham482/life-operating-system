export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { CheckinForm } from "./checkin-form";

const DOMAINS = [
  { id: "business", label: "Business & Agency", desc: "Revenue, clients, PPC, growth" },
  { id: "content", label: "Content & Brand", desc: "TikTok, personal brand, audience" },
  { id: "learning", label: "Learning & Books", desc: "Reading, implementation, skills" },
  { id: "health", label: "Health & Body", desc: "Exercise, sleep, energy" },
  { id: "deen", label: "Deen & Spirit", desc: "Prayer, reflection, purpose" },
  { id: "personal", label: "Personal Life", desc: "Family, rest, relationships" },
];

type Checkin = {
  id: string;
  date: string;
  leadDone: boolean;
  mood: string | null;
  reflection: string | null;
  blockers: string | null;
};

type Season = {
  goal: string;
  leadDomain: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CheckinPage() {
  const today = getTodayKarachi();
  const supabase = await createClient();

  const [{ data: checkinRows }, { data: seasonRow }] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("*")
      .order("date", { ascending: false })
      .limit(60),
    supabase.from("seasons").select("*").eq("is_active", true).maybeSingle(),
  ]);

  const checkins = (checkinRows || []).map((r) => fromDb<Checkin>(r));
  const season = seasonRow ? fromDb<Season>(seasonRow) : null;

  // Build lookup
  const checkinMap = new Map(checkins.map((c) => [c.date, c]));
  const todayEntry = checkinMap.get(today);

  // 7-day track
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const k = d.toISOString().slice(0, 10);
    const isToday = k === today;
    const entry = checkinMap.get(k);
    const label = isToday
      ? "TODAY"
      : d.toLocaleDateString("en", { weekday: "short" }).toUpperCase();
    return { key: k, label, entry, isToday };
  });

  // Streak
  let streak = 0;
  for (let i = 0; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    if (checkinMap.get(k)?.leadDone === true) streak++;
    else break;
  }

  const leadDomain = season
    ? DOMAINS.find((d) => d.id === season.leadDomain)
    : null;

  // Past entries (exclude today)
  const pastEntries = checkins.filter((c) => c.date !== today).slice(0, 14);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
          Daily Check-In
        </h1>
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          Track your lead priority execution every day.
        </p>
      </div>

      {/* 7-Day Execution Track */}
      <div>
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary mb-4">
          7-Day Execution Track
        </h2>
        <div className="flex gap-2 items-center mb-2">
          {last7.map(({ key, label, entry, isToday }) => (
            <div key={key} className="text-center">
              <div
                className={`w-9 h-9 flex items-center justify-center border text-xs font-mono rounded ${
                  isToday
                    ? "border-primary/50 shadow-[0_0_0_1px_rgba(201,168,76,0.2)]"
                    : entry?.leadDone === true
                    ? "border-primary bg-primary/10"
                    : entry?.leadDone === false
                    ? "border-red-500/40"
                    : "border-border"
                } ${
                  entry?.leadDone === true
                    ? "text-primary"
                    : entry?.leadDone === false
                    ? "text-red-400"
                    : "text-muted-foreground/30"
                }`}
              >
                {entry?.leadDone === true
                  ? "✓"
                  : entry?.leadDone === false
                  ? "✗"
                  : "·"}
              </div>
              <p
                className={`text-[9px] font-mono mt-1 ${
                  isToday ? "text-primary/60" : "text-muted-foreground/40"
                }`}
              >
                {label}
              </p>
            </div>
          ))}

          {streak > 0 && (
            <div className="ml-4 px-3 py-1 border border-primary/30 bg-primary/5 rounded">
              <p className="text-xs font-mono text-primary tracking-widest">
                🔥 {streak}-DAY STREAK
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Check-In */}
      <div>
        <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary mb-4">
          Today&apos;s Check-In
        </h2>
        <CheckinForm
          today={today}
          todayEntry={
            todayEntry
              ? {
                  leadDone: todayEntry.leadDone,
                  mood: todayEntry.mood || "",
                  reflection: todayEntry.reflection || "",
                  blockers: todayEntry.blockers || "",
                }
              : undefined
          }
          seasonGoal={season?.goal}
          leadDomainLabel={leadDomain?.label}
          leadDomainDesc={leadDomain?.desc}
        />
      </div>

      {/* Past Reflections */}
      {pastEntries.length > 0 && (
        <div>
          <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary mb-4">
            Past Reflections
          </h2>
          <div className="space-y-3">
            {pastEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-card border border-border p-4 rounded-lg"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatDate(entry.date)}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      entry.leadDone ? "text-primary" : "text-red-400"
                    }`}
                  >
                    {entry.leadDone ? "LEAD ✓" : "LEAD ✗"}
                  </span>
                </div>
                {entry.mood && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {entry.mood}
                  </p>
                )}
                {entry.reflection && (
                  <p className="text-sm font-serif text-foreground mb-1">
                    &ldquo;{entry.reflection}&rdquo;
                  </p>
                )}
                {entry.blockers && (
                  <p className="text-xs text-muted-foreground/60 italic">
                    Blocked by: {entry.blockers}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
