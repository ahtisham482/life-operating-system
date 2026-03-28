"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { BadHabit, ReframeItem } from "@/lib/breaker";
import { getResistanceLevel, analyzeUrges } from "@/lib/breaker";
import {
  getUrgeAnalytics,
  getCleanStreakCalendar,
  getCostAnalysis,
  getReframes,
  createReframe,
  deleteReframe,
  seedDefaultReframes,
} from "./breaker-actions";

interface Props {
  habit: BadHabit;
}

interface CalendarDay {
  date: string;
  status: "clean" | "battle" | "slip" | "none";
}

interface CostData {
  dailyHoursEstimate: number;
  hourlyValue: number;
  currentDailyUsage: number;
  beforeCost: { daily: number; weekly: number; monthly: number; yearly: number };
  afterCost: { daily: number; weekly: number; monthly: number; yearly: number };
  projectedSavings: { hoursPerYear: number; moneyPerYear: number };
}

interface AnalyticsData {
  analysis: {
    topTrigger: string | null;
    topLocation: string | null;
    avgIntensity: number;
    resistanceRate: number;
    totalResisted: number;
    totalSlipped: number;
  };
  dailyRates: { date: string; resisted: number; slipped: number }[];
  dangerHours: { hour: number; count: number }[];
  intensityTrend: { week: string; avg: number }[];
}

export function BreakerInsights({ habit }: Props) {
  const [pending, startTransition] = useTransition();
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [reframes, setReframes] = useState<ReframeItem[]>([]);
  const [brainSays, setBrainSays] = useState("");
  const [truthIs, setTruthIs] = useState("");

  const load = useCallback(() => {
    startTransition(async () => {
      const [cal, ana, cost, ref] = await Promise.all([
        getCleanStreakCalendar(habit.id),
        getUrgeAnalytics(habit.id),
        getCostAnalysis(habit.id),
        getReframes(habit.id),
      ]);
      setCalendar(cal as CalendarDay[]);
      setAnalytics(ana);
      setCostData(cost);
      setReframes(ref as ReframeItem[]);
    });
  }, [habit.id]);

  useEffect(() => { load(); }, [load]);

  const resistLevel = getResistanceLevel(habit.resistanceRate);

  function handleAddReframe() {
    if (!brainSays.trim() || !truthIs.trim()) return;
    startTransition(async () => {
      await createReframe({
        badHabitId: habit.id,
        brainSays: brainSays.trim(),
        truthIs: truthIs.trim(),
      });
      setBrainSays("");
      setTruthIs("");
      load();
    });
  }

  function handleDeleteReframe(id: string) {
    startTransition(async () => {
      await deleteReframe(id);
      load();
    });
  }

  function handleSeedReframes() {
    startTransition(async () => {
      await seedDefaultReframes(habit.id, habit.habitName);
      load();
    });
  }

  const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1.5";
  const card = "bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5";

  const maxDangerCount = analytics?.dangerHours
    ? Math.max(...analytics.dangerHours.map((h) => h.count), 1)
    : 1;

  return (
    <div className="space-y-4">
      {/* Clean Streak Calendar */}
      <div className={card}>
        <p className={label}>30-Day Calendar</p>
        <div className="grid grid-cols-10 gap-1.5 mt-2">
          {calendar.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.status}`}
              className="w-full aspect-square rounded-md transition-colors"
              style={{
                backgroundColor:
                  day.status === "clean"
                    ? "#34D39940"
                    : day.status === "battle"
                      ? "#FEC89A40"
                      : day.status === "slip"
                        ? "#FF6B6B40"
                        : "#FFF8F010",
              }}
            />
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-[#FFF8F0]/40">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#34D399]/40" /> Clean
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FEC89A]/40" /> Battle
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF6B6B]/40" /> Slip
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FFF8F0]/[0.06]" /> No data
          </span>
        </div>
      </div>

      {/* Trigger Analysis */}
      {analytics && (
        <div className={card}>
          <p className={label}>Trigger Analysis</p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-[12px] text-[#FFF8F0]/40">Top Trigger</p>
              <p className="text-[15px] text-[#FEC89A] capitalize">{analytics.analysis.topTrigger || "None yet"}</p>
            </div>
            <div>
              <p className="text-[12px] text-[#FFF8F0]/40">Top Location</p>
              <p className="text-[15px] text-[#FEC89A] capitalize">{analytics.analysis.topLocation || "None yet"}</p>
            </div>
          </div>
          {analytics.dangerHours.length > 0 && (
            <div className="mt-4">
              <p className="text-[12px] text-[#FFF8F0]/40 mb-2">Danger Hours</p>
              <div className="flex items-end gap-1 h-16">
                {analytics.dangerHours.map((h) => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[#FF6B6B]/30 rounded-t-sm"
                      style={{ height: `${(h.count / maxDangerCount) * 48}px` }}
                    />
                    <span className="text-[10px] text-[#FFF8F0]/30">{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resistance Trend */}
      {analytics && analytics.intensityTrend.length > 0 && (
        <div className={card}>
          <p className={label}>Weekly Avg Intensity (should decrease)</p>
          <div className="flex items-end gap-2 h-16 mt-2">
            {analytics.intensityTrend.map((w) => (
              <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[#FEC89A]/30 rounded-t-sm"
                  style={{ height: `${(w.avg / 10) * 48}px` }}
                />
                <span className="text-[10px] text-[#FFF8F0]/30">{w.week}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identity Progress */}
      <div className={card}>
        <p className={label}>Identity Progress</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[24px]">{resistLevel.icon}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-medium" style={{ color: resistLevel.color }}>
                {resistLevel.level}
              </span>
              <span className="text-[13px] text-[#FFF8F0]/50">{habit.resistanceRate}%</span>
            </div>
            <div className="w-full h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${habit.resistanceRate}%`, backgroundColor: resistLevel.color }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cost Reclaimed */}
      {costData && (
        <div className={card}>
          <p className={label}>Cost Reclaimed</p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-[12px] text-[#FFF8F0]/40">Before (daily)</p>
              <p className="text-[15px] text-[#FF6B6B]">{costData.beforeCost.daily.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[12px] text-[#FFF8F0]/40">Now (daily)</p>
              <p className="text-[15px] text-[#34D399]">{costData.currentDailyUsage.toFixed(1)}h</p>
            </div>
            <div>
              <p className="text-[12px] text-[#FFF8F0]/40">Time Saved / yr</p>
              <p className="text-[15px] text-[#34D399]">{costData.projectedSavings.hoursPerYear.toFixed(0)}h</p>
            </div>
            <div>
              <p className="text-[12px] text-[#FFF8F0]/40">Money Saved / yr</p>
              <p className="text-[15px] text-[#34D399]">${costData.projectedSavings.moneyPerYear.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reframe Vault */}
      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <p className={label}>Reframe Vault</p>
          {reframes.length === 0 && (
            <button onClick={handleSeedReframes} disabled={pending} className="text-[11px] text-[#FF6B6B] hover:text-[#FF6B6B]/80 disabled:opacity-30">
              Load defaults
            </button>
          )}
        </div>
        <div className="space-y-2">
          {reframes.map((r) => (
            <div key={r.id} className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl p-3 group">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#FF6B6B]/80">Brain says: &ldquo;{r.brainSays}&rdquo;</p>
                  <p className="text-[13px] text-[#34D399] mt-1">Truth: {r.truthIs}</p>
                </div>
                <button
                  onClick={() => handleDeleteReframe(r.id)}
                  className="text-[#FFF8F0]/20 hover:text-[#FF6B6B] text-[12px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Add reframe form */}
        <div className="mt-3 space-y-2">
          <input
            className="w-full bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-1.5 text-[13px] placeholder:text-[#FFF8F0]/20"
            placeholder='Brain says: "..."'
            value={brainSays}
            onChange={(e) => setBrainSays(e.target.value)}
          />
          <input
            className="w-full bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-1.5 text-[13px] placeholder:text-[#FFF8F0]/20"
            placeholder="Truth is: ..."
            value={truthIs}
            onChange={(e) => setTruthIs(e.target.value)}
          />
          <button
            onClick={handleAddReframe}
            disabled={pending || !brainSays.trim() || !truthIs.trim()}
            className="px-4 py-1.5 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[12px] font-medium disabled:opacity-30 transition-all hover:bg-[#FF6B6B]/30"
          >
            Add Reframe
          </button>
        </div>
      </div>
    </div>
  );
}
