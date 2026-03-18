"use client";

import { useState } from "react";
import type { Habit } from "@/lib/db/schema";

type HabitTrend = {
  d7: number;  // completion rate 7 days (0-100)
  d30: number; // completion rate 30 days (0-100)
  d90: number; // completion rate 90 days (0-100)
};

type Props = {
  habits: Habit[];
  heatmapDays: { date: string; dayAbbrev: string }[];
  logMap: Record<string, string>; // "habitId:date" → status
  trends: Record<string, HabitTrend>; // habitId → rates
  mostMissed: { habit: Habit; count: number }[];
};

function getRateColor(rate: number): string {
  if (rate >= 75) return "text-[#34D399]";
  if (rate >= 50) return "text-[#FEC89A]";
  return "text-[#FF6B6B]";
}

function getRateBg(rate: number): string {
  if (rate >= 75) return "bg-[#34D399]/10";
  if (rate >= 50) return "bg-[#FEC89A]/10";
  return "bg-[#FF6B6B]/10";
}

export function HabitInsights({ habits, heatmapDays, logMap, trends, mostMissed }: Props) {
  const [heatmapRange, setHeatmapRange] = useState<7 | 30>(7);
  const [showTrends, setShowTrends] = useState(false);

  // Slice heatmap days based on selected range
  const displayDays = heatmapRange === 7
    ? heatmapDays.slice(-7)
    : heatmapDays;

  return (
    <div className="space-y-6">
      {/* Heatmap Card */}
      <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#34D399]/80">
            Completion Heatmap
          </h2>
          {/* Range toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setHeatmapRange(7)}
              className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider rounded-md transition-colors ${
                heatmapRange === 7
                  ? "bg-[#34D399]/20 text-[#34D399]"
                  : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50"
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setHeatmapRange(30)}
              className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider rounded-md transition-colors ${
                heatmapRange === 30
                  ? "bg-[#34D399]/20 text-[#34D399]"
                  : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50"
              }`}
            >
              30d
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          {/* Day column headers */}
          <div className="flex items-center mb-3" style={{ minWidth: heatmapRange === 30 ? "600px" : "320px" }}>
            <div className="w-24 flex-shrink-0" />
            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))` }}>
              {displayDays.map((wd, i) => (
                <div key={i} className="text-center">
                  <span className="text-[8px] font-mono text-[#FFF8F0]/30 uppercase">
                    {heatmapRange === 30
                      ? (i % 5 === 0 ? wd.dayAbbrev : "")
                      : wd.dayAbbrev
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Habit rows */}
          <div className="space-y-1.5" style={{ minWidth: heatmapRange === 30 ? "600px" : "320px" }}>
            {habits.map((habit) => (
              <div key={habit.id} className="flex items-center">
                <div className="w-24 flex-shrink-0 pr-2">
                  <span className="text-[9px] font-mono text-[#FFF8F0]/40 truncate block">
                    {habit.emoji ? `${habit.emoji} ` : ""}{habit.name}
                  </span>
                </div>
                <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))` }}>
                  {displayDays.map((wd, i) => {
                    const status = logMap[`${habit.id}:${wd.date}`];
                    const done = status === "completed";
                    const skipped = status === "skipped";
                    const missed = status === "missed";

                    return (
                      <div key={i} className="flex justify-center">
                        <div
                          className={`rounded-sm transition-colors ${
                            heatmapRange === 30 ? "w-3 h-3" : "w-4 h-4"
                          } ${
                            done
                              ? "bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.3)]"
                              : skipped
                              ? "bg-[#60A5FA]/30"
                              : missed
                              ? "bg-[#FFF8F0]/[0.06]"
                              : "border border-[#FFF8F0]/[0.06] bg-transparent"
                          }`}
                          title={`${habit.name} - ${wd.date} (${status || "no data"})`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[#FFF8F0]/[0.04]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#34D399]" />
            <span className="text-[9px] font-mono text-[#FFF8F0]/30">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#60A5FA]/30" />
            <span className="text-[9px] font-mono text-[#FFF8F0]/30">Skipped</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#FFF8F0]/[0.06]" />
            <span className="text-[9px] font-mono text-[#FFF8F0]/30">Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-[#FFF8F0]/[0.06]" />
            <span className="text-[9px] font-mono text-[#FFF8F0]/30">No data</span>
          </div>
        </div>
      </div>

      {/* Completion Rate Trends */}
      <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
        <button
          onClick={() => setShowTrends(!showTrends)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FEC89A]/80">
            Completion Trends
          </h2>
          <span className="text-[#FFF8F0]/30 text-xs">
            {showTrends ? "▾" : "▸"}
          </span>
        </button>

        {showTrends && (
          <div className="mt-4 space-y-3">
            {/* Column headers */}
            <div className="flex items-center px-1">
              <div className="flex-1" />
              <div className="flex gap-4 text-[9px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
                <span className="w-10 text-center">7d</span>
                <span className="w-10 text-center">30d</span>
                <span className="w-10 text-center">90d</span>
              </div>
            </div>

            {habits.map((habit) => {
              const trend = trends[habit.id] || { d7: 0, d30: 0, d90: 0 };
              return (
                <div key={habit.id} className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-[#FFF8F0]/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-serif text-[#FFF8F0]/60 truncate block">
                      {habit.emoji ? `${habit.emoji} ` : ""}{habit.name}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className={`w-10 text-center text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${getRateColor(trend.d7)} ${getRateBg(trend.d7)}`}>
                      {trend.d7}%
                    </span>
                    <span className={`w-10 text-center text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${getRateColor(trend.d30)} ${getRateBg(trend.d30)}`}>
                      {trend.d30}%
                    </span>
                    <span className={`w-10 text-center text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${getRateColor(trend.d90)} ${getRateBg(trend.d90)}`}>
                      {trend.d90}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Needs Attention */}
      {mostMissed.length > 0 && (
        <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FF6B6B]/80 mb-4">
            Needs Attention
          </h2>
          <div className="space-y-3">
            {mostMissed.map(({ habit, count }) => (
              <div key={habit.id} className="flex items-center justify-between">
                <span className="text-sm font-serif text-[#FFF8F0]/60 truncate">
                  {habit.emoji && `${habit.emoji} `}{habit.name}
                </span>
                <span className="text-[10px] font-mono text-[#FF6B6B]/60 shrink-0 ml-2">
                  {count}/7 missed
                </span>
              </div>
            ))}
          </div>
          <p className="text-[9px] font-mono text-[#FFF8F0]/20 mt-3 italic">
            These habits need the most love this week
          </p>
        </div>
      )}
    </div>
  );
}
