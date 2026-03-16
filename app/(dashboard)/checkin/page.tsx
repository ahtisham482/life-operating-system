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

  const pastEntries = checkins.filter((c) => c.date !== today).slice(0, 14);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
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

      {/* 7-Day Execution Track */}
      <section className="animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
        <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-1.5">
          Consistency
        </p>
        <h2 className="text-lg font-serif text-gradient-primary mb-6">
          7-Day Execution Track
        </h2>
        <div className="glass-card rounded-2xl p-8 hover:border-white/[0.08] transition-all">
          <div className="flex gap-3 items-center">
            {last7.map(({ key, label, entry, isToday }) => (
              <div key={key} className="text-center">
                <div
                  className={`size-10 flex items-center justify-center border text-xs font-mono rounded-xl transition-all ${
                    isToday
                      ? "border-[#C49E45]/40 bg-[#C49E45]/[0.12] shadow-glow-sm"
                      : entry?.leadDone === true
                      ? "bg-[#C49E45]/20 border-[#C49E45]/30"
                      : entry?.leadDone === false
                      ? "bg-red-500/10 border-red-500/20"
                      : "border-white/[0.05] bg-white/[0.02]"
                  } ${
                    entry?.leadDone === true
                      ? "text-[#C49E45]"
                      : entry?.leadDone === false
                      ? "text-red-400/70"
                      : "text-white/20"
                  }`}
                >
                  {entry?.leadDone === true
                    ? "✓"
                    : entry?.leadDone === false
                    ? "✗"
                    : "·"}
                </div>
                <p
                  className={`text-[8px] font-mono mt-2 tracking-[0.2em] ${
                    isToday ? "text-[#C49E45]/60" : "text-white/20"
                  }`}
                >
                  {label}
                </p>
              </div>
            ))}

            {streak > 0 && (
              <div className="ml-auto px-5 py-2.5 border border-[#C49E45]/20 bg-[#C49E45]/[0.08] rounded-2xl">
                <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase mb-0.5">
                  Streak
                </p>
                <p className="text-lg font-serif text-gradient-primary leading-none">
                  {streak} <span className="text-[10px] font-mono text-[#C49E45]/60 tracking-widest">days</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Today's Check-In */}
      <section className="animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
        <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-1.5">
          Today
        </p>
        <h2 className="text-lg font-serif text-gradient-primary mb-6">
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
      </section>

      {/* Past Reflections */}
      {pastEntries.length > 0 && (
        <section className="animate-slide-up" style={{ animationDelay: "0.24s", animationFillMode: "both" }}>
          <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-1.5">
            History
          </p>
          <h2 className="text-lg font-serif text-gradient-primary mb-6">
            Past Reflections
          </h2>
          <div className="space-y-4">
            {pastEntries.map((entry, i) => (
              <div
                key={entry.id}
                className="glass-card rounded-2xl p-6 hover:border-white/[0.08] transition-all animate-slide-up"
                style={{ animationDelay: `${0.28 + i * 0.03}s`, animationFillMode: "both" }}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase">
                    {formatDate(entry.date)}
                  </span>
                  <span
                    className={`text-[9px] font-mono tracking-[0.35em] uppercase px-3 py-1 rounded-lg border ${
                      entry.leadDone
                        ? "bg-[#C49E45]/[0.08] border-[#C49E45]/20 text-[#C49E45]"
                        : "bg-red-500/[0.06] border-red-500/15 text-red-400/70"
                    }`}
                  >
                    {entry.leadDone ? "LEAD ✓" : "LEAD ✗"}
                  </span>
                </div>
                {entry.mood && (
                  <p className="text-[11px] text-white/40 mb-2 font-mono tracking-wider">
                    {entry.mood}
                  </p>
                )}
                {entry.reflection && (
                  <p className="text-sm font-serif text-white/80 mb-2 leading-relaxed">
                    &ldquo;{entry.reflection}&rdquo;
                  </p>
                )}
                {entry.blockers && (
                  <p className="text-[10px] text-white/20 italic font-mono tracking-wider">
                    Blocked by: {entry.blockers}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
