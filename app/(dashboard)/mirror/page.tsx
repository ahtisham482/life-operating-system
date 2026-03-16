export const dynamic = "force-dynamic";

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

export default async function MirrorPage() {
  const supabase = await createClient();

  const [report, { data: rawEntries }, { count: interactionCount }, dailyInsight] =
    await Promise.all([
      generateMirrorReport(),
      supabase
        .from("knowledge_entries")
        .select("*")
        .order("confidence", { ascending: false }),
      supabase
        .from("interactions")
        .select("*", { count: "exact", head: true }),
      generateDailyInsight(),
    ]);

  const entries = (rawEntries ?? []).map((r) =>
    fromDb<KnowledgeEntry>(r)
  );
  const totalSignals = interactionCount || 0;
  const stage = getStage(totalSignals);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: "0s", animationFillMode: "both" }}>
        <p className="text-[9px] font-mono tracking-[0.35em] text-white/20 uppercase">
          Self-Learning Intelligence
        </p>
        <h1 className="text-3xl font-serif tracking-tight text-gradient-primary">
          Mirror
        </h1>
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-[#C49E45]/20 bg-[#C49E45]/[0.06] text-[#C49E45]">
            {stage.label} ({totalSignals} signals)
          </span>
          <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/40">
            {entries.length} entries
          </span>
          <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/40">
            {totalSignals} signals
          </span>
          {report.predictionAccuracy > 0 && (
            <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-[#C49E45]/20 bg-[#C49E45]/[0.06] text-[#C49E45]">
              {Math.round(report.predictionAccuracy * 100)}% accuracy
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-white/30 tracking-wider mt-1">
          {stage.desc}
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

      {/* Daily Insight */}
      {dailyInsight && (
        <section className="glass-card rounded-2xl p-6 border-[#C49E45]/10 animate-slide-up" style={{ animationDelay: "0.04s", animationFillMode: "both" }}>
          <p className="text-[9px] font-mono tracking-[0.35em] text-[#C49E45]/60 uppercase mb-2">Daily Insight</p>
          <p className="text-sm font-serif text-white/80">{dailyInsight}</p>
        </section>
      )}

      {/* Mirror Report */}
      <div className="animate-slide-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
        <MirrorReportCard report={report} entryCount={entries.length} />
      </div>

      {/* Teach Mirror */}
      <div className="animate-slide-up" style={{ animationDelay: "0.16s", animationFillMode: "both" }}>
        <AddKnowledgeForm />
      </div>

      {/* Knowledge Graph */}
      <div className="animate-slide-up" style={{ animationDelay: "0.24s", animationFillMode: "both" }}>
        <KnowledgeGraph entries={entries} />
      </div>
    </div>
  );
}
