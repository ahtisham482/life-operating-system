"use client";

import type { MirrorReport } from "@/lib/mirror/engine";

export default function MirrorReportCard({
  report,
  entryCount,
}: {
  report: MirrorReport;
  entryCount: number;
}) {
  // Empty / Awakening State
  if (entryCount === 0) {
    return (
      <div className="border border-border/50 rounded-lg overflow-hidden">
        {/* Glowing header band */}
        <div className="relative px-6 py-8 border-b border-primary/20 bg-primary/[0.03]">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
          <div className="relative text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-primary/30 bg-primary/5">
              <span className="text-2xl font-serif text-primary">M</span>
            </div>
            <div>
              <p className="text-sm font-serif text-foreground">
                Mirror is ready to learn
              </p>
              <p className="text-[10px] font-mono tracking-[0.25em] text-muted-foreground uppercase mt-2">
                Teach it something about yourself to begin
              </p>
            </div>
          </div>
        </div>

        {/* What Mirror learns from */}
        <div className="p-6 space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary">
            How Mirror Learns
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "You Tell It", desc: "Direct statements about your values, goals, preferences", channel: "Explicit" },
              { label: "It Observes", desc: "Patterns from your check-ins, habits, tasks, and journals", channel: "Behavioral" },
              { label: "It Predicts", desc: "Anticipates your needs based on accumulated knowledge", channel: "Predictive" },
            ].map((item) => (
              <div
                key={item.channel}
                className="px-4 py-3 border border-border/30 rounded-lg space-y-1"
              >
                <p className="text-xs font-serif text-foreground">
                  {item.label}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Knowledge"
          value={report.totalKnowledge}
          sub="entries learned"
          fillPct={Math.min(report.totalKnowledge / 50, 1)}
        />
        <StatCard
          label="Confident"
          value={report.highConfidenceCount}
          sub="entries ≥ 70%"
          fillPct={
            report.totalKnowledge > 0
              ? report.highConfidenceCount / report.totalKnowledge
              : 0
          }
        />
        <StatCard
          label="Accuracy"
          value={`${Math.round(report.predictionAccuracy * 100)}%`}
          sub="predictions"
          fillPct={report.predictionAccuracy}
        />
        <StatCard
          label="Patterns"
          value={report.patterns.length}
          sub="detected"
          fillPct={Math.min(report.patterns.length / 10, 1)}
        />
      </div>

      {/* Top Beliefs */}
      {report.topBeliefs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-primary">
            Top Beliefs — Highest Confidence
          </h2>
          <div className="border border-border/50 rounded-lg overflow-hidden divide-y divide-border/30">
            {report.topBeliefs.map((belief, i) => {
              const pct = Math.round(belief.confidence * 100);
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-[10px] font-mono text-muted-foreground/60 w-5 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif text-foreground truncate">
                      {belief.content}
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                      {belief.category}
                    </p>
                  </div>
                  {/* Visual confidence bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1 bg-border/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 70
                            ? "bg-primary"
                            : pct >= 40
                              ? "bg-yellow-500/70"
                              : "bg-red-500/50"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-mono w-8 text-right ${
                        pct >= 70
                          ? "text-primary"
                          : pct >= 40
                            ? "text-yellow-500"
                            : "text-red-400"
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Contradiction Alerts */}
      {report.contradictionAlerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-yellow-500">
            Say-Do Gap Detected
          </h2>
          <div className="border border-yellow-500/20 rounded-lg overflow-hidden bg-yellow-500/[0.03] divide-y divide-yellow-500/10">
            {report.contradictionAlerts.map((c, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <p className="text-sm font-serif text-foreground">
                  {c.statedBelief}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                  {c.observedBehavior}
                </p>
                <p className="text-[10px] font-mono text-yellow-500/80 italic">
                  {c.suggestion}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detected Patterns */}
      {report.patterns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-primary">
            Detected Patterns
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.patterns.map((p, i) => (
              <div
                key={i}
                className="border border-border/50 rounded-lg px-5 py-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-serif text-foreground">
                    {p.description}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <div className="w-10 h-1 bg-border/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.round(p.confidence * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-primary">
                      {Math.round(p.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {p.evidence[0]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Learnings */}
      {report.recentChanges.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-primary">
            Recent Learnings — Last 7 Days
          </h2>
          <div className="border border-border/50 rounded-lg overflow-hidden divide-y divide-border/30">
            {report.recentChanges.map((change, i) => (
              <div key={i} className="px-5 py-3">
                <p className="text-[11px] font-mono text-muted-foreground">
                  {change}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  fillPct,
}: {
  label: string;
  value: string | number;
  sub: string;
  fillPct: number;
}) {
  return (
    <div className="border border-border/50 rounded-lg p-4 space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-serif text-foreground">{value}</p>
      <div className="space-y-1">
        <div className="w-full h-1 bg-border/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${Math.round(fillPct * 100)}%` }}
          />
        </div>
        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          {sub}
        </p>
      </div>
    </div>
  );
}
