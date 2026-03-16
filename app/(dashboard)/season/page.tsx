export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb, getTodayKarachi } from "@/lib/utils";
import { SeasonForm } from "./season-form";
import { DomainList } from "./domain-list";

const DOMAINS = [
  { id: "business", label: "Business & Agency", icon: "◈", desc: "Revenue, clients, PPC, growth" },
  { id: "content", label: "Content & Brand", icon: "◉", desc: "TikTok, personal brand, audience" },
  { id: "learning", label: "Learning & Books", icon: "◎", desc: "Reading, implementation, skills" },
  { id: "health", label: "Health & Body", icon: "◇", desc: "Exercise, sleep, energy" },
  { id: "deen", label: "Deen & Spirit", icon: "◆", desc: "Prayer, reflection, purpose" },
  { id: "personal", label: "Personal Life", icon: "○", desc: "Family, rest, relationships" },
];

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

  const leadDomainInfo = season
    ? DOMAINS.find((d) => d.id === season.leadDomain)
    : null;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10">
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          90-Day Focus
        </p>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Season
        </h1>
        <p className="text-[11px] font-mono text-white/30 tracking-wider">
          Pick ONE lead domain. Go all-in for 90 days.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
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
          {/* Season Goal Card */}
          <div className="glass-card rounded-2xl p-8 hover:border-white/[0.08] transition-all animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/25 mb-2">
                  Season Goal
                </p>
                <p className="text-lg font-serif text-primary">
                  {season.goal || "Not set yet"}
                </p>
                <p className="text-xs font-mono text-white/40 mt-2">
                  {formatDate(season.startDate)} → {formatDate(season.endDate)}
                  {daysLeft !== null && ` · ${daysLeft} days remaining`}
                </p>
                {leadDomainInfo && (
                  <p className="text-xs font-mono text-white/30 mt-1">
                    Lead: {leadDomainInfo.label} — {leadDomainInfo.desc}
                  </p>
                )}
              </div>
              <SeasonForm season={season} />
            </div>
          </div>

          {/* Domain Modes */}
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
            <div>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary mb-2">
                Domain Modes — Lead vs Maintenance
              </h2>
              <p className="text-xs font-mono text-white/40">
                Only ONE domain should be LEAD at a time. Click to toggle.
              </p>
            </div>
            <DomainList
              seasonId={season.id}
              domains={season.domains}
              domainDefs={DOMAINS}
            />
          </div>
        </>
      )}
    </div>
  );
}
