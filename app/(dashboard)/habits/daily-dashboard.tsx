"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { getBundles, logBundleOutcome } from "./attraction-actions";
import { getBadHabits, getTodayUrges, logUrge } from "./breaker-actions";
import { runGuardianCheck, getActiveAlerts, respondToAlert } from "./guide-actions";
import { getEnvironmentSetups } from "./architect-actions";
import type { Bundle } from "@/lib/attraction";
import type { BadHabit, UrgeLog } from "@/lib/breaker";
import type { GuardianAlert, GuardianCheckResult } from "@/lib/dayone";

interface DailyDashboardProps {
  todayCompleted: number;
  totalScheduled: number;
  date: string;
}

export function DailyDashboard({ todayCompleted, totalScheduled, date }: DailyDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [badHabits, setBadHabits] = useState<BadHabit[]>([]);
  const [todayUrges, setTodayUrges] = useState<Record<string, UrgeLog[]>>({});
  const [guardianChecks, setGuardianChecks] = useState<GuardianCheckResult[]>([]);
  const [guardianScore, setGuardianScore] = useState(0);
  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [prepItems, setPrepItems] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [bundleData, habitData, guardianData, alertData, setupData] = await Promise.all([
        getBundles().catch(() => []),
        getBadHabits().catch(() => []),
        runGuardianCheck().catch(() => ({ checks: [], overallScore: 0, suggestions: [] })),
        getActiveAlerts().catch(() => []),
        getEnvironmentSetups().catch(() => []),
      ]);
      setBundles(bundleData as Bundle[]);
      setBadHabits(habitData as BadHabit[]);
      setGuardianChecks((guardianData as { checks: GuardianCheckResult[] }).checks || []);
      setGuardianScore((guardianData as { overallScore: number }).overallScore || 0);
      setAlerts(alertData as GuardianAlert[]);

      // Compile evening prep items
      const allPrep: string[] = [];
      for (const setup of setupData as { eveningPrepItems?: string[] }[]) {
        if (setup.eveningPrepItems) allPrep.push(...setup.eveningPrepItems);
      }
      setPrepItems(allPrep);

      // Load today's urges per bad habit
      const urgeMap: Record<string, UrgeLog[]> = {};
      for (const h of habitData as BadHabit[]) {
        const urges = await getTodayUrges(h.id).catch(() => []);
        urgeMap[h.id] = urges as UrgeLog[];
      }
      setTodayUrges(urgeMap);
    } catch {
      // Silent fail — dashboard is supplementary
    }
    setLoaded(true);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Check if it's evening (for prep reminder)
  const hour = new Date().getHours();
  const isEvening = hour >= 20;

  // Count warnings from guardian
  const warnings = guardianChecks.filter((c) => c.status === "warning" || c.status === "fail");

  // Active bundles
  const activeBundles = bundles.filter((b) => b.isActive);

  // Active bad habits with today's battle stats
  const activeBattles = badHabits.filter((b) => b.isActive);

  if (!loaded) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-16 bg-[#FFF8F0]/[0.03] rounded-2xl" />
      </div>
    );
  }

  // Only show sections that have data
  const hasExtras = activeBundles.length > 0 || activeBattles.length > 0 || warnings.length > 0 || (isEvening && prepItems.length > 0);
  if (!hasExtras) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
        At a Glance
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Guardian Alerts */}
        {warnings.length > 0 && (
          <div className="p-3 bg-[#F87171]/[0.05] border border-[#F87171]/[0.15] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🛡️</span>
              <span className="text-[11px] font-mono text-[#F87171]/80">
                {warnings.length} habit health {warnings.length === 1 ? "alert" : "alerts"}
              </span>
              <span className="ml-auto text-[10px] font-mono text-[#FFF8F0]/25">{guardianScore}/10</span>
            </div>
            {warnings.slice(0, 2).map((w) => (
              <p key={w.mistakeNumber} className="text-[11px] text-[#FFF8F0]/40 mb-1 truncate">
                #{w.mistakeNumber} {w.mistakeName}: {w.message.slice(0, 60)}...
              </p>
            ))}
          </div>
        )}

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div className="p-3 bg-[#FEC89A]/[0.05] border border-[#FEC89A]/[0.15] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">⚠️</span>
              <span className="text-[11px] font-mono text-[#FEC89A]/80">
                {alerts.length} active {alerts.length === 1 ? "alert" : "alerts"}
              </span>
            </div>
            {alerts.slice(0, 2).map((a) => (
              <div key={a.id} className="flex items-center gap-2 mb-1">
                <p className="text-[11px] text-[#FFF8F0]/40 truncate flex-1">{a.alertText.slice(0, 50)}...</p>
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await respondToAlert(a.id, "dismissed"); loadData(); })}
                  disabled={isPending}
                  className="text-[9px] font-mono text-[#FFF8F0]/20 hover:text-[#FFF8F0]/40 shrink-0"
                >
                  dismiss
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Temptation Bundles */}
        {activeBundles.length > 0 && (
          <div className="p-3 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🎁</span>
              <span className="text-[11px] font-mono text-[#FFF8F0]/50">
                Reward Bundles
              </span>
            </div>
            {activeBundles.slice(0, 3).map((b) => (
              <div key={b.id} className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px]">{b.needIcon ?? "🎯"}</span>
                <span className="text-[11px] text-[#FFF8F0]/40 truncate flex-1">{b.needDescription}</span>
                <span className="text-[10px] text-[#FFF8F0]/15">→</span>
                <span className="text-[10px]">🔒</span>
                <span className="text-[11px] text-[#FFF8F0]/25 truncate max-w-[80px]">{b.wantDescription}</span>
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await logBundleOutcome(b.id, "full_bundle"); loadData(); })}
                  disabled={isPending}
                  className="text-[9px] font-mono text-[#34D399]/60 hover:text-[#34D399] shrink-0"
                >
                  ✓ done
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active Urge Battles */}
        {activeBattles.length > 0 && (
          <div className="p-3 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🛡️</span>
              <span className="text-[11px] font-mono text-[#FFF8F0]/50">
                Today&apos;s Battles
              </span>
            </div>
            {activeBattles.slice(0, 3).map((h) => {
              const urges = todayUrges[h.id] || [];
              const resisted = urges.filter((u) => u.result === "resisted" || u.result === "surfed").length;
              const slipped = urges.filter((u) => u.result === "slipped").length;
              return (
                <div key={h.id} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] text-[#FFF8F0]/40 truncate flex-1">{h.habitName}</span>
                  {urges.length > 0 ? (
                    <span className="text-[10px] font-mono text-[#FFF8F0]/25">
                      <span className="text-[#34D399]">{resisted}🛡️</span>
                      {slipped > 0 && <span className="text-[#F87171] ml-1">{slipped}😞</span>}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#FFF8F0]/15">no urges yet</span>
                  )}
                  <button
                    type="button"
                    onClick={() => startTransition(async () => { await logUrge({ badHabitId: h.id, result: "resisted" }); loadData(); })}
                    disabled={isPending}
                    className="text-[9px] font-mono text-[#34D399]/60 hover:text-[#34D399] shrink-0"
                  >
                    🛡️ resisted
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Evening Prep Reminder */}
        {isEvening && prepItems.length > 0 && (
          <div className="p-3 bg-[#A78BFA]/[0.05] border border-[#A78BFA]/[0.15] rounded-xl sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🌙</span>
              <span className="text-[11px] font-mono text-[#A78BFA]/80">
                Evening Prep — {prepItems.length} items for tomorrow
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {prepItems.slice(0, 5).map((item, i) => (
                <span key={i} className="text-[10px] font-mono text-[#FFF8F0]/30 px-2 py-0.5 bg-[#FFF8F0]/[0.03] rounded-md">
                  {item}
                </span>
              ))}
              {prepItems.length > 5 && (
                <span className="text-[10px] font-mono text-[#FFF8F0]/20">+{prepItems.length - 5} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
