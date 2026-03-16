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
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-serif tracking-widest uppercase text-foreground">
          Current 90-Day Season
        </h1>
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          Pick ONE lead domain. Go all-in for 90 days.
        </p>
      </div>

      {!season ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-mono">
            No active season. Start a new one below.
          </p>
          <div className="bg-card border border-border p-6 rounded-lg">
            <SeasonForm />
          </div>
        </div>
      ) : (
        <>
          {/* Season Goal Card */}
          <div className="bg-card border border-primary/30 p-6 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  Season Goal
                </p>
                <p className="text-lg font-serif text-primary">
                  {season.goal || "Not set yet"}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-2">
                  {formatDate(season.startDate)} → {formatDate(season.endDate)}
                  {daysLeft !== null && ` · ${daysLeft} days remaining`}
                </p>
                {leadDomainInfo && (
                  <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                    Lead: {leadDomainInfo.label} — {leadDomainInfo.desc}
                  </p>
                )}
              </div>
              <SeasonForm season={season} />
            </div>
          </div>

          {/* Domain Modes */}
          <div className="space-y-4">
            <div>
              <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary mb-2">
                Domain Modes — Lead vs Maintenance
              </h2>
              <p className="text-xs font-mono text-muted-foreground">
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
