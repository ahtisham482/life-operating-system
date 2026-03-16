export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import type { KnowledgeEntry } from "@/lib/mirror/types";
import { generateMirrorReport } from "@/lib/mirror/engine";
import KnowledgeGraph from "./knowledge-graph";
import MirrorReportCard from "./mirror-report";
import AddKnowledgeForm from "./add-knowledge-form";

export default async function MirrorPage() {
  const supabase = await createClient();

  const [report, { data: rawEntries }, { data: rawInteractions }] =
    await Promise.all([
      generateMirrorReport(),
      supabase
        .from("knowledge_entries")
        .select("*")
        .order("confidence", { ascending: false }),
      supabase
        .from("interactions")
        .select("id")
        .limit(1),
    ]);

  const entries = (rawEntries ?? []).map((r) =>
    fromDb<KnowledgeEntry>(r)
  );
  const interactionCount = rawInteractions?.length ?? 0;

  // Determine Mirror's "stage" based on knowledge count
  const stage =
    entries.length === 0
      ? "awakening"
      : entries.length < 10
        ? "observing"
        : entries.length < 30
          ? "learning"
          : "understanding";

  const stageLabels = {
    awakening: "Awaiting First Input",
    observing: "Observing Patterns",
    learning: "Building Your Model",
    understanding: "Deep Understanding",
  };

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
            {stageLabels[stage]}
          </span>
          <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-white/[0.06] text-white/40">
            {entries.length} entries
          </span>
          {report.predictionAccuracy > 0 && (
            <span className="text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-lg border border-[#C49E45]/20 bg-[#C49E45]/[0.06] text-[#C49E45]">
              {Math.round(report.predictionAccuracy * 100)}% accuracy
            </span>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C49E45]/20 to-transparent mt-6" />
      </div>

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
