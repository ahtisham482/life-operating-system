"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTimingInsights,
  getChainHealthInsights,
  getStackEffectiveness,
  getEnvironmentImpact,
  type TimingInsight,
  type ChainHealthInsight,
  type StackInsight,
  type EnvironmentImpactInsight,
} from "./execution-actions";

function formatTimeDisplay(t: string | null): string {
  if (!t) return "--:--";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function PercentBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-[#FFF8F0]/50">{label}</span>
        <span className="text-[11px] font-mono" style={{ color }}>{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-[12px] font-mono text-[#FFF8F0]/30">{message}</p>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm">{icon}</span>
      <h3 className="text-[11px] font-mono text-[#FFF8F0]/60 uppercase tracking-wider">{title}</h3>
    </div>
  );
}

export function ArchitectInsights() {
  const [timing, setTiming] = useState<TimingInsight[]>([]);
  const [chainHealth, setChainHealth] = useState<ChainHealthInsight[]>([]);
  const [stacks, setStacks] = useState<StackInsight[]>([]);
  const [envImpact, setEnvImpact] = useState<EnvironmentImpactInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [t, c, s, e] = await Promise.all([
      getTimingInsights(),
      getChainHealthInsights(),
      getStackEffectiveness(),
      getEnvironmentImpact(),
    ]);
    setTiming(t);
    setChainHealth(c);
    setStacks(s);
    setEnvImpact(e);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Timing Adherence */}
      <section>
        <SectionHeader title="Timing Adherence" icon="⏱️" />
        {timing.length === 0 ? (
          <EmptyState message="Track for 3+ days to see timing insights" />
        ) : (
          <div className="space-y-3">
            {timing.map((t) => {
              const dirIcon = t.direction === "early" ? "🕐" : t.direction === "on_time" ? "✅" : "⏰";
              const devText =
                t.avgDeviationMinutes === 0
                  ? "on time"
                  : t.avgDeviationMinutes > 0
                    ? `+${t.avgDeviationMinutes} min late`
                    : `${t.avgDeviationMinutes} min early`;
              const devColor =
                t.direction === "on_time" ? "#34D399" : t.direction === "late" ? "#F87171" : "#FEC89A";

              return (
                <div
                  key={t.blueprintId}
                  className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t.habitIcon || "📋"}</span>
                    <p className="text-[13px] font-serif text-[#FFF8F0]/90 flex-1">{t.habitName}</p>
                    <span className="text-sm">{dirIcon}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="text-[#FFF8F0]/40">
                      Planned: {formatTimeDisplay(t.plannedTime)}
                    </span>
                    <span className="text-[#FFF8F0]/40">
                      Avg: {formatTimeDisplay(t.avgActualTime)}
                    </span>
                    <span style={{ color: devColor }}>{devText}</span>
                  </div>
                  <PercentBar
                    value={t.onTimePercentage}
                    color={t.onTimePercentage >= 70 ? "#34D399" : t.onTimePercentage >= 40 ? "#FEC89A" : "#F87171"}
                    label="On-time rate"
                  />
                  {t.suggestion && (
                    <p className="text-[11px] font-mono text-[#FFF8F0]/35 italic">{t.suggestion}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Chain Health */}
      <section>
        <SectionHeader title="Chain Health" icon="⛓️" />
        {chainHealth.length === 0 ? (
          <EmptyState message="Complete chains for 3+ days to see health insights" />
        ) : (
          <div className="space-y-3">
            {chainHealth.map((c) => {
              const healthConfig = {
                strong: { color: "#34D399", badge: "Strong", dot: "🟢" },
                moderate: { color: "#FEC89A", badge: "Moderate", dot: "🟡" },
                weak: { color: "#F87171", badge: "Weak", dot: "🔴" },
                new: { color: "#FFF8F0", badge: "New", dot: "⚪" },
              }[c.health];

              return (
                <div
                  key={c.chainId}
                  className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{c.chainIcon}</span>
                    <p className="text-[13px] font-serif text-[#FFF8F0]/90 flex-1">{c.chainName}</p>
                    <span
                      className="px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider"
                      style={{ color: healthConfig.color, backgroundColor: `${healthConfig.color}15` }}
                    >
                      {healthConfig.dot} {healthConfig.badge}
                    </span>
                  </div>
                  <PercentBar
                    value={c.fullCompletionRate}
                    color={healthConfig.color}
                    label="Full completion"
                  />
                  {c.weakestLinkName && (
                    <p className="text-[11px] font-mono text-[#F87171]/70">
                      Weakest link #{(c.weakestLinkPosition ?? 0)}: {c.weakestLinkName}
                    </p>
                  )}
                  {c.avgBreakPoint !== null && (
                    <p className="text-[11px] font-mono text-[#FFF8F0]/35">
                      Avg break at link #{c.avgBreakPoint + 1}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] font-mono text-[#FFF8F0]/40">
                    <span>Streak: {c.currentStreak}d</span>
                  </div>
                  {c.suggestions.length > 0 && (
                    <div className="space-y-1">
                      {c.suggestions.map((s, i) => (
                        <p key={i} className="text-[11px] font-mono text-[#FFF8F0]/35 italic">
                          {s}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Stack Effectiveness */}
      <section>
        <SectionHeader title="Stack Effectiveness" icon="📊" />
        {stacks.length === 0 ? (
          <EmptyState message="Track stacked habits to measure effectiveness" />
        ) : (
          <div className="space-y-3">
            {stacks.map((s) => (
              <div
                key={s.blueprintId}
                className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3"
              >
                <p className="text-[13px] font-serif text-[#FFF8F0]/90">{s.habitName}</p>
                <PercentBar value={s.completionWithAnchor} color="#34D399" label="With anchor" />
                <PercentBar value={s.completionWithoutAnchor} color="#FFF8F0" label="Without anchor" />
                {(() => { const delta = s.completionWithAnchor - s.completionWithoutAnchor; return (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#FFF8F0]/35">{s.effectiveness}</span>
                  <span
                    className="text-[12px] font-mono font-medium"
                    style={{ color: delta > 0 ? "#34D399" : "#F87171" }}
                  >
                    {delta > 0 ? "+" : ""}{Math.round(delta)}% with stack
                  </span>
                </div>
                ); })()}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Environment Impact */}
      <section>
        <SectionHeader title="Environment Impact" icon="🏠" />
        {envImpact.length === 0 ? (
          <EmptyState message="Log evening prep to see impact" />
        ) : (
          <div className="space-y-3">
            {envImpact.map((e, i) => (
              <div
                key={i}
                className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">📍</span>
                  <p className="text-[13px] font-serif text-[#FFF8F0]/90 flex-1">{e.setupName}</p>
                  <span className="text-[11px] font-mono text-[#FFF8F0]/40">
                    Prep rate: {Math.round(e.prepRate)}%
                  </span>
                </div>
                <PercentBar value={e.completionWithPrep} color="#34D399" label="Days with prep" />
                <PercentBar value={e.completionWithoutPrep} color="#FFF8F0" label="Days without" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#FFF8F0]/35 italic">{e.message}</span>
                  <span
                    className="text-[12px] font-mono font-medium"
                    style={{ color: e.impactDelta > 0 ? "#34D399" : "#F87171" }}
                  >
                    {e.impactDelta > 0 ? "+" : ""}{Math.round(e.impactDelta)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
