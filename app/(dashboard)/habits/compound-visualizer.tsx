"use client";

import { useState, useEffect, useTransition } from "react";
import { calculateCompoundProjections, getValleyMessage, compoundGrowth } from "@/lib/dayone";
import { getCompoundData } from "./guide-actions";

type HabitData = {
  habitName: string;
  emoji: string | null;
  totalDone: number;
  daysTracked: number;
  dailyRate: number;
  projections: { label: string; value: number }[];
  valleyMessage: string | null;
};

export function CompoundVisualizer() {
  const [habits, setHabits] = useState<HabitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getCompoundData();
      setHabits(data);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDone = habits.reduce((s, h) => s + h.totalDone, 0);
  const totalDays = habits.reduce((s, h) => s + h.daysTracked, 0);
  const avgDays = habits.length > 0 ? Math.round(totalDays / habits.length) : 0;
  const multiplier = compoundGrowth(0.01, avgDays);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1% growth explainer */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-6">
        <h3 className="text-lg font-serif text-[#FFF8F0] mb-2">The Power of 1% Daily</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-mono text-[#34D399]">1.01^365 = 37.78x</span>
        </div>
        <p className="text-sm text-[#FFF8F0]/50 mt-2">
          Improving 1% every day for a year makes you 37x better. The curve is flat at first
          (the Valley of Disappointment), then explodes upward. You are on that curve right now.
        </p>
        <div className="flex gap-1 mt-3 h-12 items-end">
          {Array.from({ length: 30 }).map((_, i) => {
            const height = Math.pow(1.03, i) * 4;
            return (
              <div
                key={i}
                className="flex-1 bg-[#34D399]/40 rounded-t"
                style={{ height: `${Math.min(height, 48)}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Per-habit cards */}
      {habits.map((habit) => {
        const valley = getValleyMessage(habit.daysTracked);
        const projections = calculateCompoundProjections(
          habit.dailyRate, "completions", habit.daysTracked, habit.totalDone,
        );

        return (
          <div
            key={habit.habitName}
            className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{habit.emoji || "🔄"}</span>
                <h4 className="text-[#FFF8F0] font-serif">{habit.habitName}</h4>
              </div>
              <span className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
                {habit.daysTracked} days tracked
              </span>
            </div>

            <div className="flex gap-4">
              <div>
                <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Total done</p>
                <p className="text-2xl font-mono text-[#FFF8F0]">{habit.totalDone}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Daily rate</p>
                <span className="inline-block px-2 py-0.5 bg-[#34D399]/20 text-[#34D399] text-sm font-mono rounded-lg">
                  {(habit.dailyRate * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Projections */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {projections.map((p) => (
                <div
                  key={p.label}
                  className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl p-3"
                >
                  <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">{p.label}</p>
                  <p className="text-lg font-mono text-[#FEC89A]">{p.value}</p>
                  {p.detail && (
                    <p className="text-[11px] text-[#FFF8F0]/30">{p.detail}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Valley message */}
            {(valley || habit.valleyMessage) && (
              <div className="p-4 bg-[#FEC89A]/10 border border-[#FEC89A]/20 rounded-xl">
                <p className="text-sm text-[#FEC89A] font-serif italic">
                  {valley || habit.valleyMessage}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {habits.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#FFF8F0]/40 text-sm">No habits tracked yet. Start tracking to see compound growth.</p>
        </div>
      )}

      {/* Combined impact */}
      {habits.length > 0 && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-6 space-y-3">
          <h3 className="text-lg font-serif text-[#FFF8F0]">Combined Impact</h3>
          <div className="flex gap-6">
            <div>
              <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Total completions</p>
              <p className="text-3xl font-mono text-[#34D399]">{totalDone}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">Compound multiplier</p>
              <p className="text-3xl font-mono text-[#FEC89A]">
                {multiplier.toFixed(2)}x
              </p>
              <p className="text-[11px] text-[#FFF8F0]/30">
                (1.01)^{avgDays} = {multiplier.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="text-sm text-[#FFF8F0]/50 font-serif italic">
            {totalDone > 100
              ? "You have built something extraordinary. The compound effect is undeniable."
              : totalDone > 30
                ? "Momentum is building. Every completion adds to your compound growth."
                : "You are planting seeds. The harvest comes later. Keep showing up."}
          </p>
        </div>
      )}
    </div>
  );
}
