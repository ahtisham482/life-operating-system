export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { SeasonForm } from "./season-form";
import { DomainList } from "./domain-list";
import { getLeadLifeAreas, MAINTENANCE_GUIDANCE } from "@/lib/domains";

const DOMAINS = [
  { id: "business", label: "Business & Agency", icon: "◈", desc: "Revenue, clients, PPC, growth" },
  { id: "content", label: "Content & Brand", icon: "◉", desc: "TikTok, personal brand, audience" },
  { id: "learning", label: "Learning & Books", icon: "◎", desc: "Reading, implementation, skills" },
  { id: "health", label: "Health & Body", icon: "◇", desc: "Exercise, sleep, energy" },
  { id: "deen", label: "Deen & Spirit", icon: "◆", desc: "Prayer, reflection, purpose" },
  { id: "personal", label: "Personal Life", icon: "○", desc: "Family, rest, relationships" },
];

const DOMAIN_ID_TO_LABEL: Record<string, string> = {
  business: "Business & Agency",
  content: "Content & Brand",
  learning: "Learning & Books",
  health: "Health & Body",
  deen: "Deen & Spirit",
  personal: "Personal Life",
};

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

type Season = {
  id: string;
  goal: string;
  startDate: string;
  endDate: string;
  leadDomain: string;
  domains: Record<string, string>;
  isActive: boolean;
};

export default async function SeasonPage() {
  const today = getTodayKarachi();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  const season = row ? fromDb<Season>(row) : null;
  const daysLeft = season?.endDate
    ? Math.max(0, Math.ceil((new Date(season.endDate).getTime() - new Date(today).getTime()) / 86400000))
    : null;

  const totalDays = season
    ? Math.max(1, Math.ceil((new Date(season.endDate).getTime() - new Date(season.startDate).getTime()) / 86400000))
    : 0;
  const daysPassed = season
    ? Math.max(0, Math.ceil((new Date(today).getTime() - new Date(season.startDate).getTime()) / 86400000))
    : 0;
  const daysProgress = Math.min(daysPassed, totalDays);
  const daysProgressPercent = totalDays > 0 ? Math.round((daysProgress / totalDays) * 100) : 0;

  const leadDomainInfo = season
    ? DOMAINS.find((d) => d.id === season.leadDomain)
    : null;

  let leadDoneRate = 0;
  let completedTaskCount = 0;
  let checkinCount = 0;

  if (season) {
    const leadLabel = DOMAIN_ID_TO_LABEL[season.leadDomain] ?? "";
    const leadAreas = getLeadLifeAreas(leadLabel);

    const [{ data: seasonCheckins }, { data: completedTasks }] = await Promise.all([
      supabase
        .from("daily_checkins")
        .select("lead_done, date")
        .gte("date", season.startDate)
        .lte("date", season.endDate),
      leadAreas.length > 0
        ? supabase
            .from("tasks")
            .select("id")
            .eq("status", "Done")
            .in("life_area", leadAreas)
        : Promise.resolve({ data: [] as { id: string }[] }),
    ]);

    checkinCount = seasonCheckins?.length ?? 0;
    if (checkinCount > 0) {
      const leadDoneCount = (seasonCheckins || []).filter((c) => {
        const val = c.lead_done;
        if (typeof val === "boolean") return val;
        if (typeof val === "number") return val >= 3;
        return false;
      }).length;
      leadDoneRate = Math.round((leadDoneCount / checkinCount) * 100);
    }

    completedTaskCount = completedTasks?.length ?? 0;
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 sm:space-y-12">
      {/* Header with progress */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/40 uppercase">
          90-Day Focus
        </p>
        <h1 className="text-3xl font-serif tracking-widest uppercase text-gradient-primary">
          90-Day Season
        </h1>
        {season && (
          <>
            <p className="text-sm font-serif text-white/50 italic">
              {season.goal || "No goal set"}
            </p>
            <div className="pt-2">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C49E45]/60 to-[#C49E45] rounded-full transition-all duration-500"
                    style={{ width: `${daysProgressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] font-mono text-white/50 shrink-0">
                  Day {daysProgress} of {totalDays}
                </p>
              </div>
              <p className="text-[9px] font-mono text-white/20 mt-1.5 tracking-wider">
                {formatDate(season.startDate)} — {formatDate(season.endDate)}
                {daysLeft !== null && ` · ${daysLeft} days remaining`}
              </p>
            </div>
          </>
        )}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-4" />
      </div>

      {!season ? (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
          <p className="text-sm text-white/40 font-mono">
            No active season. Start a new one below.
          </p>
          <div className="glass-card rounded-2xl p-6 hover:border-white/[0.08] transition-all">
            <SeasonForm />
          </div>
        </div>
      ) : (
        <>
          {/* Transition Banner */}
          {daysLeft !== null && daysLeft <= 7 && (
            <div
              className="border border-[#C49E45]/30 bg-[#C49E45]/[0.06] rounded-2xl p-6 animate-slide-up"
              style={{ animationDelay: "0.04s", animationFillMode: "both" }}
            >
              <p className="text-sm font-serif text-[#C49E45]">
                Season ending in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </p>
              <p className="text-[10px] font-mono text-white/40 mt-1">
                Review your progress and plan your next season.
              </p>
            </div>
          )}

          {/* Hero Card — Lead Domain */}
          {leadDomainInfo && (
            <div
              className="glass-card rounded-2xl p-8 border-[#C49E45]/30 animate-slide-up"
              style={{ animationDelay: "0.08s", animationFillMode: "both" }}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="space-y-3 min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-serif text-white/90">
                      {leadDomainInfo.label}
                    </h2>
                    <span className="text-[9px] font-mono tracking-[0.3em] uppercase px-3 py-1 rounded-full border border-[#C49E45]/30 bg-[#C49E45]/10 text-[#C49E45]">
                      Lead
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-white/30 tracking-wider">
                    {leadDomainInfo.desc}
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 sm:gap-8 pt-2">
                    <div>
                      <p className="text-2xl font-serif text-gradient-primary leading-none">
                        {checkinCount > 0 ? `${leadDoneRate}%` : "—"}
                      </p>
                      <p className="text-[8px] font-mono text-white/25 mt-1 tracking-[0.3em] uppercase">
                        Lead-Done Rate
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-serif text-gradient-primary leading-none">
                        {completedTaskCount}
                      </p>
                      <p className="text-[8px] font-mono text-white/25 mt-1 tracking-[0.3em] uppercase">
                        Tasks Done
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-serif text-gradient-primary leading-none">
                        {checkinCount}
                      </p>
                      <p className="text-[8px] font-mono text-white/25 mt-1 tracking-[0.3em] uppercase">
                        Check-ins
                      </p>
                    </div>
                  </div>

                  {/* Goal Quote */}
                  {season.goal && (
                    <p className="text-sm font-serif text-white/40 italic pt-2">
                      &ldquo;{season.goal}&rdquo;
                    </p>
                  )}
                </div>

                <SeasonForm season={season} />
              </div>
            </div>
          )}

          {/* Domain Grid */}
          <div className="animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
            <p className="font-mono text-[9px] tracking-[0.35em] text-white/40 uppercase mb-4">
              All Domains
            </p>
            <DomainList
              seasonId={season.id}
              domains={season.domains}
              domainDefs={DOMAINS}
              maintenanceGuidance={Object.fromEntries(
                DOMAINS.map((d) => [
                  d.id,
                  MAINTENANCE_GUIDANCE[DOMAIN_ID_TO_LABEL[d.id] ?? ""] ?? "",
                ])
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}
