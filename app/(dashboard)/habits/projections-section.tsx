"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { Projection } from "@/lib/contracts";
import { getProjections } from "./contract-actions";

export function ProjectionsSection() {
  const [projections, setProjections] = useState<Projection[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    const data = await getProjections();
    setProjections(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => { loadData(); });
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-32 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-32 bg-[#FFF8F0]/[0.03] rounded-2xl" />
      </div>
    );
  }

  if (projections.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-[32px]">🔮</p>
        <p className="text-[14px] text-[#FFF8F0]/60 max-w-sm mx-auto">
          Start tracking habits to see your future projections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-[24px]">🔮</p>
        <h3 className="text-[18px] font-serif text-[#FFF8F0]/90 tracking-wide">
          IF YOU KEEP GOING...
        </h3>
      </div>

      {/* Per-habit projections */}
      {projections.map((p) => (
        <div key={p.habitName} className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
          {/* Habit header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[18px]">{p.habitEmoji}</span>
              <span className="text-[14px] text-[#FFF8F0]/80 font-medium">{p.habitName}</span>
            </div>
            <span className="px-2 py-0.5 bg-[#FEC89A]/15 text-[#FEC89A] border border-[#FEC89A]/20 rounded-lg text-[11px] font-mono">
              {p.currentRate}% daily rate
            </span>
          </div>

          {/* Projection cards row */}
          <div className="grid grid-cols-3 gap-3">
            {p.projections.slice(0, 3).map((proj) => (
              <div key={proj.label} className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl p-3 text-center space-y-1">
                <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
                  {proj.label}
                </p>
                <p className="text-[16px] text-[#34D399] font-medium">
                  {proj.value}
                </p>
                {proj.detail && (
                  <p className="text-[10px] text-[#FFF8F0]/30">{proj.detail}</p>
                )}
              </div>
            ))}
          </div>

          {/* Custom metric projections */}
          {p.projections.length > 3 && (
            <div className="grid grid-cols-2 gap-3">
              {p.projections.slice(3).map((proj) => (
                <div key={proj.label} className="bg-[#FEC89A]/[0.05] border border-[#FEC89A]/[0.1] rounded-xl p-3 text-center space-y-1">
                  <p className="text-[10px] font-mono text-[#FEC89A]/50 uppercase tracking-wider">
                    {proj.label}
                  </p>
                  <p className="text-[15px] text-[#FEC89A] font-medium">
                    {proj.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Motivational message */}
          <p className="text-[12px] text-[#FFF8F0]/40 italic text-center pt-1">
            {p.motivationalMessage}
          </p>
        </div>
      ))}

      {/* Overall message */}
      <div className="text-center py-4">
        <p className="text-[13px] text-[#FEC89A]/70 italic max-w-md mx-auto">
          You&apos;re not just building habits. You&apos;re building a completely different life.
        </p>
      </div>
    </div>
  );
}
