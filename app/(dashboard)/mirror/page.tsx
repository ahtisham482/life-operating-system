export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import type { KnowledgeEntry } from "@/lib/mirror/types";
import { generateMirrorReport } from "@/lib/mirror/engine";
import { generateDailyInsight } from "@/lib/mirror/insights";
import KnowledgeGraph from "./knowledge-graph";
import MirrorReportCard from "./mirror-report";
import AddKnowledgeForm from "./add-knowledge-form";

function getStage(signals: number) {
  if (signals >= 500) return { label: "Understanding", level: 4, desc: "Deep pattern recognition active" };
  if (signals >= 200) return { label: "Learning", level: 3, desc: "Connecting patterns across features" };
  if (signals >= 50) return { label: "Observing", level: 2, desc: "Collecting behavioral data" };
  return { label: "Awakening", level: 1, desc: "Starting to learn your patterns" };
}

/* ── Skeleton fallback ─────────────────────────────────── */
function SectionSkeleton({ height = "h-32" }: { height?: string }) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-48 bg-[#FFF8F0]/[0.05] rounded-lg" />
      <div className={`${height} bg-[#FFF8F0]/[0.03] rounded-xl`} />
    </div>
  );
}

/* ── Async server component: Daily Insight ─────────────── */
async function DailyInsightSection() {
  const dailyInsight = await generateDailyInsight();

  return (
    <section
      className="glass-card rounded-2xl p-8 border-t-2 border-[#FF6B6B]/40 animate-slide-up"
      style={{ animationDelay: "0.04s", animationFillMode: "both" }}
    >
      <p className="text-[9px] font-mono tracking-[0.35em] text-[#FF6B6B]/60 uppercase mb-4">
        Daily Insight
      </p>
      {dailyInsight ? (
        <>
          <p className="text-lg font-serif text-[#FFF8F0]/80 leading-relaxed">
            {dailyInsight}
          </p>
          <p className="text-[10px] font-mono text-[#FFF8F0]/30 tracking-wider mt-4">
            Based on 30 days of data
          </p>
        </>
      ) : (
        <p className="text-sm font-serif text-[#FFF8F0]/40 italic">
          Mirror is still learning. Keep using LOS to unlock insights.
        </p>
      )}
    </section>
  );
}

/* ── Async server component: Mirror Report + Knowledge ── */
async function MirrorDataSection() {
  const supabase = await createClient();

  const [report, { data: rawEntries }, { count: interactionCount }] =
    await Promise.all([
      generateMirrorReport(),
      supabase
        .from("knowledge_entries")
        .select("*")
        .order("confidence", { ascending: false }),
      supabase
        .from("interactions")
        .select("*", { count: "exact", head: true }),
    ]);

  const entries = (rawEntries ?? []).map((r) =>
    fromDb<KnowledgeEntry>(r)
  );
  const totalSignals = interactionCount || 0;
  const stage = getStage(totalSignals);

  return (
    <>
      {/* Mirror Report */}
      <div className="animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
        <MirrorReportCard report={report} entryCount={entries.length} />
      </div>

      {/* Knowledge Section */}
      {entries.length > 0 && (
        <section className="space-y-4 animate-slide-up" style={{ animationDelay: "0.12s", animationFillMode: "both" }}>
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#FF6B6B]/60">
            Knowledge Entries
          </h2>
          <div className="space-y-2">
            {entries.map((entry) => {
              const pct = Math.round(entry.confidence * 100);
              const dateStr = new Date(entry.lastConfirmed || entry.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return (
                <div
                  key={entry.id}
                  className="glass-card rounded-xl px-5 py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif text-[#FFF8F0]/80 truncate">
                      {entry.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {pct > 0 && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        pct >= 70
                          ? "border-[#FF6B6B]/30 text-[#FF6B6B]"
                          : pct >= 40
                            ? "border-yellow-500/30 text-yellow-500"
                            : "border-red-400/30 text-red-400"
                      }`}>
                        {pct}%
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-[#FFF8F0]/25">
                      {dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Knowledge Graph */}
      <div className="animate-slide-up" style={{ animationDelay: "0.20s", animationFillMode: "both" }}>
        <KnowledgeGraph entries={entries} />
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: "0.24s", animationFillMode: "both" }}>
        <span className="text-[10px] font-mono tracking-widest px-4 py-2 rounded-full border border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.02] text-[#FFF8F0]/40 backdrop-blur-sm">
          {totalSignals} observations
        </span>
        <span className="text-[10px] font-mono tracking-widest px-4 py-2 rounded-full border border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.02] text-[#FFF8F0]/40 backdrop-blur-sm">
          {entries.length} entries
        </span>
        <span className="text-[10px] font-mono tracking-widest px-4 py-2 rounded-full border border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.06] text-[#FF6B6B] backdrop-blur-sm">
          Stage {stage.level}: {stage.label}
        </span>
      </div>
    </>
  );
}

/* ── Main page: shell renders instantly, data streams in ── */
export default function MirrorPage() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 sm:space-y-10">
      {/* Header — renders instantly */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Mirror
        </h1>
        <p className="text-sm font-serif text-[#FFF8F0]/50">
          Your personal intelligence that learns from you.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#FF6B6B]/20 to-transparent mt-4" />
      </div>

      {/* Daily Insight — streams in */}
      <Suspense fallback={<SectionSkeleton height="h-40" />}>
        <DailyInsightSection />
      </Suspense>

      {/* Mirror Report + Knowledge + Stats — streams in */}
      <Suspense fallback={<SectionSkeleton height="h-48" />}>
        <MirrorDataSection />
      </Suspense>

      {/* Add Knowledge — renders instantly (client component, no data fetch) */}
      <div className="animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
        <AddKnowledgeForm />
      </div>
    </div>
  );
}
