"use client";

import { getRatingColor, type ScorecardDay } from "@/lib/scorecard";

interface ScorecardDayStatsProps {
  scorecard: ScorecardDay;
}

export function ScorecardDayStats({ scorecard }: ScorecardDayStatsProps) {
  const { positiveCount, negativeCount, neutralCount, totalEntries, dayScore } =
    scorecard;

  const posPercent =
    totalEntries > 0 ? Math.round((positiveCount / totalEntries) * 100) : 0;
  const negPercent =
    totalEntries > 0 ? Math.round((negativeCount / totalEntries) * 100) : 0;

  const scoreColor =
    dayScore > 0
      ? getRatingColor("+")
      : dayScore < 0
        ? getRatingColor("-")
        : getRatingColor("=");

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Score badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
        style={{
          borderColor: `${scoreColor}30`,
          background: `${scoreColor}10`,
        }}
      >
        <span
          className="text-lg font-mono font-bold"
          style={{ color: scoreColor }}
        >
          {dayScore > 0 ? "+" : ""}
          {dayScore}
        </span>
        <span className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
          score
        </span>
      </div>

      {/* Counts */}
      <div className="flex items-center gap-2 text-[11px] font-mono">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#34D399]" />
          <span className="text-[#34D399]">{positiveCount}</span>
          {posPercent > 0 && (
            <span className="text-[#FFF8F0]/25">({posPercent}%)</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#F87171]" />
          <span className="text-[#F87171]">{negativeCount}</span>
          {negPercent > 0 && (
            <span className="text-[#FFF8F0]/25">({negPercent}%)</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
          <span className="text-[#9CA3AF]">{neutralCount}</span>
        </span>
      </div>

      {/* Total entries */}
      <span className="text-[10px] font-mono text-[#FFF8F0]/25">
        {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
      </span>

      {/* Progress bar */}
      {totalEntries > 0 && (
        <div className="flex-1 min-w-[80px] h-1.5 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden flex">
          {positiveCount > 0 && (
            <div
              className="h-full bg-[#34D399] transition-all duration-300"
              style={{ width: `${posPercent}%` }}
            />
          )}
          {neutralCount > 0 && (
            <div
              className="h-full bg-[#9CA3AF]/40 transition-all duration-300"
              style={{
                width: `${Math.round((neutralCount / totalEntries) * 100)}%`,
              }}
            />
          )}
          {negativeCount > 0 && (
            <div
              className="h-full bg-[#F87171] transition-all duration-300"
              style={{ width: `${negPercent}%` }}
            />
          )}
        </div>
      )}
    </div>
  );
}
