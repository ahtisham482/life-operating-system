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
  leadDone: boolean | number;
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

/** Normalize leadDone (boolean or number) to a numeric score 0-5 */
function toScore(leadDone: boolean | number | null | undefined): number {
  if (leadDone === null || leadDone === undefined) return 0;
  if (typeof leadDone === "boolean") return leadDone ? 5 : 0;
  if (typeof leadDone === "number") return leadDone;
  return 0;
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

  const checkinMap = new Map(checkins.map((c) => [c.date, c]));
  const todayEntry = checkinMap.get(today);

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

  // Streak: consecutive days where score >= 3
  let streak = 0;
  for (let i = 0; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const entry = checkinMap.get(k);
    if (entry && toScore(entry.leadDone) >= 3) streak++;
    else break;
  }

  const leadDomain = season
    ? DOMAINS.find((d) => d.id === season.leadDomain)
    : null;

  const pastEntries = checkins.filter((c) => c.date !== today).slice(0, 14);

  // Pattern Insights computation
  const scoredCheckins = checkins.filter((c) => c.leadDone !== null && c.leadDone !== undefined);
  const scores = scoredCheckins.map((c) => toScore(c.leadDone));
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const leadDoneRate = scores.length > 0
    ? Math.round((scores.filter((s) => s >= 3).length / scores.length) * 100)
    : 0;

  // Most common mood
  const moodCounts: Record<string, number> = {};
  for (const c of checkins) {
    if (c.mood) {
      moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1;
    }
  }
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center space-y-3 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase">
          Daily Execution
        </p>
        <h1 className="text-3xl font-serif tracking-widest uppercase text-gradient-primary">
          Check-In
        </h1>
        <p className="text-[11px] font-mono text-white/20 tracking-wider">
          Track your lead priority execution every day.
        </p>
        <div className="divider-gradient mt-5" />
      </div>

      {/* Today's Check-In — Centered Score Circles */}
      <section className="animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
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
      </section>

      {/* 7-Day Track + Streak */}
      <section className="animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
        <div className="flex flex-col items-center gap-6">
          {/* 7-Day Circles */}
          <div className="flex items-center gap-4 justify-center">
            {last7.map(({ key, label, entry, isToday }) => {
              const score = entry ? toScore(entry.leadDone) : 0;
              const hasEntry = !!entry;

              // Color logic: gold = 4-5, yellow = 3, gray = 1-2, outline = no data
              let circleClasses = "";
              let dotColor = "";
              if (!hasEntry || score === 0) {
                circleClasses = "border-white/20 bg-transparent";
                dotColor = "bg-white/10";
              } else if (score >= 4) {
                circleClasses = "border-[#C49E45] bg-[#C49E45]/15";
                dotColor = "bg-[#C49E45]";
              } else if (score === 3) {
                circleClasses = "border-yellow-500 bg-yellow-500/10";
                dotColor = "bg-yellow-500";
              } else {
                circleClasses = "border-white/20 bg-white/[0.04]";
                dotColor = "bg-white/30";
              }

              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  <div
                    className={`size-8 rounded-full border-2 flex items-center justify-center transition-all ${circleClasses} ${
                      isToday ? "ring-2 ring-[#C49E45]/40 ring-offset-2 ring-offset-black" : ""
                    }`}
                  >
                    {hasEntry && score > 0 && (
                      <div className={`size-2.5 rounded-full ${dotColor}`} />
                    )}
                  </div>
                  <p
                    className={`text-[7px] font-mono tracking-[0.2em] ${
                      isToday ? "text-[#C49E45]/70" : "text-white/25"
                    }`}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Streak Badge */}
          {streak > 0 && (
            <div className="glass-card rounded-full px-4 py-1.5">
              <p className="text-[11px] font-mono text-[#C49E45]/80 tracking-wider">
                {"\uD83D\uDD25"} {streak} day streak
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Pattern Insights */}
      {scoredCheckins.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: "0.24s", animationFillMode: "both" }}>
          <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-6 text-center">
            Pattern Insights
          </p>
          <div className="grid grid-cols-3 gap-4">
            {/* Average Score */}
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-3xl font-serif text-gradient-primary leading-none">
                {avgScore.toFixed(1)}
              </p>
              <p className="text-[8px] font-mono text-white/30 mt-2 tracking-[0.3em] uppercase">
                Avg Score
              </p>
            </div>

            {/* Lead-Done Rate */}
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-3xl font-serif text-gradient-primary leading-none">
                {leadDoneRate}%
              </p>
              <p className="text-[8px] font-mono text-white/30 mt-2 tracking-[0.3em] uppercase">
                Lead-Done
              </p>
            </div>

            {/* Top Mood */}
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-xl font-serif text-gradient-primary leading-none">
                {topMood}
              </p>
              <p className="text-[8px] font-mono text-white/30 mt-2 tracking-[0.3em] uppercase">
                Top Mood
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Past Reflections — collapsed, muted */}
      {pastEntries.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: "0.32s", animationFillMode: "both" }}>
          <details>
            <summary className="cursor-pointer font-mono text-[9px] tracking-[0.35em] text-white/30 uppercase hover:text-white/50 transition-colors mb-4">
              Past Reflections ({pastEntries.length})
            </summary>
            <div className="space-y-3 mt-4">
              {pastEntries.map((entry, i) => {
                const score = toScore(entry.leadDone);
                const isGoodScore = score >= 3;

                return (
                  <div
                    key={entry.id}
                    className="glass-card rounded-xl p-4 animate-slide-up"
                    style={{ animationDelay: `${i * 0.03}s`, animationFillMode: "both" }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-[8px] tracking-[0.3em] text-white/30 uppercase">
                        {formatDate(entry.date)}
                      </span>
                      <span
                        className={`text-[8px] font-mono tracking-[0.3em] uppercase px-2 py-0.5 rounded-full border ${
                          isGoodScore
                            ? "bg-[#C49E45]/[0.08] border-[#C49E45]/20 text-[#C49E45]/70"
                            : "bg-white/[0.03] border-white/10 text-white/30"
                        }`}
                      >
                        {score}/5
                      </span>
                    </div>
                    {entry.mood && (
                      <p className="text-[10px] text-white/30 mb-1 font-mono tracking-wider">
                        {entry.mood}
                      </p>
                    )}
                    {entry.reflection && (
                      <p className="text-sm font-serif text-white/50 leading-relaxed italic">
                        {entry.reflection}
                      </p>
                    )}
                    {entry.blockers && (
                      <p className="text-[9px] text-white/15 font-mono tracking-wider mt-1">
                        Blocked by: {entry.blockers}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
