"use client";

import { useState } from "react";
import type { Habit } from "@/lib/db/schema";

type HabitTrend = {
  d7: number; // completion rate 7 days (0-100)
  d30: number; // completion rate 30 days (0-100)
  d90: number; // completion rate 90 days (0-100)
};

type KeystoneInsight = {
  habitId: string;
  habitName: string;
  habitEmoji: string;
  withRate: number;
  withoutRate: number;
};

type Props = {
  habits: Habit[];
  heatmapDays: { date: string; dayAbbrev: string }[];
  logMap: Record<string, string>; // "habitId:date" → status
  trends: Record<string, HabitTrend>; // habitId → rates
  mostMissed: { habit: Habit; count: number }[];
  keystoneInsights?: KeystoneInsight[];
  perfectDayCount?: number;
  daysOfData?: number;
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

export function HabitInsights({
  habits,
  heatmapDays,
  logMap,
  trends,
  mostMissed,
  keystoneInsights = [],
  perfectDayCount = 0,
  daysOfData = 0,
}: Props) {
  const [heatmapRange, setHeatmapRange] = useState<7 | 30>(7);
  const [showTrends, setShowTrends] = useState(false);

  // Slice heatmap days based on selected range
  const displayDays = heatmapRange === 7 ? heatmapDays.slice(-7) : heatmapDays;

  return (
    <div className="space-y-6">
      {/* Perfect Day Stats */}
      {perfectDayCount > 0 && (
        <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌟</span>
            <div>
              <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#34D399]/80">
                Perfect Days This Month
              </h2>
              <p className="text-2xl font-serif font-light text-[#FFF8F0] mt-1">
                {perfectDayCount}{" "}
                <span className="text-sm text-[#FFF8F0]/40">
                  {perfectDayCount === 1 ? "day" : "days"}
                </span>
              </p>
              <p className="text-[9px] font-mono text-[#FFF8F0]/20 mt-0.5 italic">
                Every scheduled habit completed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Card */}
      <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
        <div className="flex items-center justify-between mb-3">
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

        <p className="text-[10px] text-[#FFF8F0]/20 mb-3">Each square = one day. Green = done, dark = missed.</p>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#34D399]" />
            <span className="text-[9px] font-mono text-[#FFF8F0]/30">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#60A5FA]/30" />
            <span className="text-[9px] font-mono text-[#FFF8F0]/30">
              Skipped
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#FFF8F0]/[0.06]" />
            <span className="text-[9px] font-mono text-[#FFF8F0]/30">
              Missed
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-[#FFF8F0]/[0.06]" />
            <span className="text-[9px] font-mono text-[#FFF8F0]/30">
              No data
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          {/* Day column headers */}
          <div
            className="flex items-center mb-3"
            style={{ minWidth: heatmapRange === 30 ? "600px" : "320px" }}
          >
            <div className="w-24 flex-shrink-0" />
            <div
              className="flex-1 grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))`,
              }}
            >
              {displayDays.map((wd, i) => (
                <div key={i} className="text-center">
                  <span className="text-[8px] font-mono text-[#FFF8F0]/30 uppercase">
                    {heatmapRange === 30
                      ? i % 5 === 0
                        ? wd.dayAbbrev
                        : ""
                      : wd.dayAbbrev}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Habit rows */}
          <div
            className="space-y-1.5"
            style={{ minWidth: heatmapRange === 30 ? "600px" : "320px" }}
          >
            {habits.map((habit) => (
              <div key={habit.id} className="flex items-center">
                <div className="w-24 flex-shrink-0 pr-2">
                  <span className="text-[9px] font-mono text-[#FFF8F0]/40 truncate block">
                    {habit.emoji ? `${habit.emoji} ` : ""}
                    {habit.name}
                  </span>
                </div>
                <div
                  className="flex-1 grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${displayDays.length}, minmax(0, 1fr))`,
                  }}
                >
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

      </div>

      {/* Completion Rate Trends — gated at 7+ days */}
      {daysOfData >= 7 ? (
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
                  <span
                    className={`w-10 text-center ${daysOfData < 30 ? "opacity-30" : ""}`}
                  >
                    30d
                  </span>
                  <span
                    className={`w-10 text-center ${daysOfData < 90 ? "opacity-30" : ""}`}
                  >
                    90d
                  </span>
                </div>
              </div>

              {habits.map((habit) => {
                const trend = trends[habit.id] || { d7: 0, d30: 0, d90: 0 };
                return (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-[#FFF8F0]/[0.02] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-serif text-[#FFF8F0]/60 truncate block">
                        {habit.emoji ? `${habit.emoji} ` : ""}
                        {habit.name}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span
                        className={`w-10 text-center text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${getRateColor(trend.d7)} ${getRateBg(trend.d7)}`}
                      >
                        {trend.d7}%
                      </span>
                      {daysOfData >= 30 ? (
                        <span
                          className={`w-10 text-center text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${getRateColor(trend.d30)} ${getRateBg(trend.d30)}`}
                        >
                          {trend.d30}%
                        </span>
                      ) : (
                        <span className="w-10 text-center text-[11px] font-mono text-[#FFF8F0]/15 px-1.5 py-0.5">
                          —
                        </span>
                      )}
                      {daysOfData >= 90 ? (
                        <span
                          className={`w-10 text-center text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${getRateColor(trend.d90)} ${getRateBg(trend.d90)}`}
                        >
                          {trend.d90}%
                        </span>
                      ) : (
                        <span className="w-10 text-center text-[11px] font-mono text-[#FFF8F0]/15 px-1.5 py-0.5">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Milestone unlock hints */}
              {daysOfData < 30 && (
                <p className="text-[9px] font-mono text-[#FEC89A]/30 mt-2 italic text-center">
                  Track {30 - daysOfData} more days to unlock 30-day trends
                </p>
              )}
              {daysOfData >= 30 && daysOfData < 90 && (
                <p className="text-[9px] font-mono text-[#FEC89A]/30 mt-2 italic text-center">
                  Track {90 - daysOfData} more days to unlock 90-day trends
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
          <div className="text-center py-4">
            <span className="text-2xl">📊</span>
            <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FEC89A]/50 mt-3">
              Completion Trends
            </h2>
            <p className="text-xs font-serif text-[#FFF8F0]/30 mt-2">
              Track {7 - daysOfData} more day{7 - daysOfData !== 1 ? "s" : ""}{" "}
              to unlock weekly trends
            </p>
            <div className="w-full h-1 bg-[#FFF8F0]/[0.05] rounded-full mt-3 max-w-[200px] mx-auto">
              <div
                className="h-full bg-[#FEC89A]/30 rounded-full transition-all"
                style={{ width: `${Math.min((daysOfData / 7) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Keystone Habits Insight — gated at 30+ days */}
      {daysOfData >= 30 ? (
        keystoneInsights.length > 0 ? (
          <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#E2B0FF]/80 mb-4">
              Keystone Habits
            </h2>
            <p className="text-[9px] font-mono text-[#FFF8F0]/20 mb-4 italic">
              These habits have the biggest impact on your overall routine
            </p>
            <div className="space-y-4">
              {keystoneInsights.map((insight) => (
                <div
                  key={insight.habitId}
                  className="p-3 rounded-xl bg-[#E2B0FF]/[0.06] border border-[#E2B0FF]/10"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">
                      {insight.habitEmoji || "⭐"}
                    </span>
                    <span className="text-xs font-serif text-[#FFF8F0]/70 font-medium">
                      {insight.habitName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-[9px] font-mono mb-1">
                        <span className="text-[#34D399]/70">When done</span>
                        <span className="text-[#34D399] font-semibold">
                          {insight.withRate}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#FFF8F0]/[0.05] rounded-full">
                        <div
                          className="h-full bg-[#34D399] rounded-full"
                          style={{ width: `${insight.withRate}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-[#FFF8F0]/20">
                      vs
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-[9px] font-mono mb-1">
                        <span className="text-[#FF6B6B]/70">When skipped</span>
                        <span className="text-[#FF6B6B] font-semibold">
                          {insight.withoutRate}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#FFF8F0]/[0.05] rounded-full">
                        <div
                          className="h-full bg-[#FF6B6B] rounded-full"
                          style={{ width: `${insight.withoutRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-[#E2B0FF]/40 mt-2 italic">
                    On days you do this, you complete {insight.withRate}% of
                    other habits vs {insight.withoutRate}% when you don&apos;t
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#E2B0FF]/50 mb-2">
              Keystone Habits
            </h2>
            <p className="text-xs font-serif text-[#FFF8F0]/30 italic">
              No strong keystone patterns detected yet. Keep tracking to reveal
              which habits drive everything else.
            </p>
          </div>
        )
      ) : daysOfData >= 7 ? (
        <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
          <div className="text-center py-4">
            <span className="text-2xl">🔬</span>
            <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#E2B0FF]/50 mt-3">
              Keystone Habits
            </h2>
            <p className="text-xs font-serif text-[#FFF8F0]/30 mt-2">
              Track {30 - daysOfData} more day{30 - daysOfData !== 1 ? "s" : ""}{" "}
              to unlock keystone habit detection
            </p>
            <div className="w-full h-1 bg-[#FFF8F0]/[0.05] rounded-full mt-3 max-w-[200px] mx-auto">
              <div
                className="h-full bg-[#E2B0FF]/30 rounded-full transition-all"
                style={{ width: `${Math.min((daysOfData / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

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
                  {habit.emoji && `${habit.emoji} `}
                  {habit.name}
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

      {/* Progressive Milestone Progress */}
      {daysOfData > 0 && daysOfData < 365 && (
        <div className="glass-card rounded-3xl p-6 hover:border-[#FFF8F0]/[0.08] transition-all">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/40 mb-4">
            Journey Milestones
          </h2>
          <div className="space-y-3">
            {[
              {
                days: 7,
                label: "Weekly patterns",
                emoji: "📊",
                color: "text-[#34D399]",
              },
              {
                days: 30,
                label: "Monthly trends",
                emoji: "📈",
                color: "text-[#FEC89A]",
              },
              {
                days: 90,
                label: "Keystone detection",
                emoji: "🔬",
                color: "text-[#E2B0FF]",
              },
              {
                days: 365,
                label: "Year in review",
                emoji: "🏆",
                color: "text-[#FFD93D]",
              },
            ].map((milestone) => {
              const reached = daysOfData >= milestone.days;
              const progress = Math.min(
                (daysOfData / milestone.days) * 100,
                100,
              );
              return (
                <div key={milestone.days} className="flex items-center gap-3">
                  <span
                    className={`text-sm ${reached ? "" : "opacity-30 grayscale"}`}
                  >
                    {milestone.emoji}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`text-[10px] font-mono ${reached ? milestone.color : "text-[#FFF8F0]/20"}`}
                      >
                        {milestone.label}
                      </span>
                      <span
                        className={`text-[9px] font-mono ${reached ? "text-[#34D399]/60" : "text-[#FFF8F0]/15"}`}
                      >
                        {reached
                          ? "Unlocked"
                          : `${milestone.days - daysOfData}d left`}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[#FFF8F0]/[0.05] rounded-full">
                      <div
                        className={`h-full rounded-full transition-all ${reached ? "bg-[#34D399]" : "bg-[#FFF8F0]/10"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
