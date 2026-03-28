"use client";

import { useState, useEffect, useTransition } from "react";
import type { GuardianCheckResult, GuardianAlert } from "@/lib/dayone";
import { GUARDIAN_MISTAKES } from "@/lib/dayone";
import { runGuardianCheck, getActiveAlerts, respondToAlert } from "./guide-actions";

const STATUS_ICONS: Record<string, string> = {
  pass: "✅",
  warning: "🟡",
  fail: "🔴",
  info: "ℹ️",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-[#34D399]";
  if (score >= 5) return "text-[#FEC89A]";
  return "text-[#FF6B6B]";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-[#34D399]/20 border-[#34D399]/30";
  if (score >= 5) return "bg-[#FEC89A]/20 border-[#FEC89A]/30";
  return "bg-[#FF6B6B]/20 border-[#FF6B6B]/30";
}

function severityColor(severity: string): string {
  if (severity === "high" || severity === "critical") return "border-[#FF6B6B]/30 bg-[#FF6B6B]/10";
  if (severity === "medium") return "border-[#FEC89A]/30 bg-[#FEC89A]/10";
  return "border-[#FFF8F0]/[0.08] bg-[#FFF8F0]/[0.03]";
}

export function GuardianDashboard() {
  const [checks, setChecks] = useState<GuardianCheckResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [expandedMistake, setExpandedMistake] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  function loadData() {
    startTransition(async () => {
      const [guardianResult, activeAlerts] = await Promise.all([
        runGuardianCheck(),
        getActiveAlerts(),
      ]);
      setChecks(guardianResult.checks);
      setOverallScore(guardianResult.overallScore);
      setSuggestions(guardianResult.suggestions);
      setAlerts(activeAlerts);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRespond(alertId: string, response: "accepted" | "dismissed") {
    startTransition(async () => {
      await respondToAlert(alertId, response);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${scoreBg(overallScore)}`}>
            <span className={`text-2xl font-mono ${scoreColor(overallScore)}`}>
              {overallScore}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-serif text-[#FFF8F0]">Guardian Health</h2>
            <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
              Score out of 10
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={pending}
          className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-sm hover:bg-[#FF6B6B]/30 transition-all disabled:opacity-50"
        >
          {pending ? "Checking..." : "Run Check"}
        </button>
      </div>

      {/* 10-mistake checklist */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-2">
        <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-3">
          10-Mistake Checklist
        </p>
        {GUARDIAN_MISTAKES.map((mistake) => {
          const check = checks.find((c) => c.mistakeNumber === mistake.number);
          const status = check?.status || "pass";
          const isExpanded = expandedMistake === mistake.number;

          return (
            <div key={mistake.number}>
              <button
                onClick={() => setExpandedMistake(isExpanded ? null : mistake.number)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#FFF8F0]/[0.03] transition-all text-left"
              >
                <span className="text-[12px] font-mono text-[#FFF8F0]/30 w-5">
                  {mistake.number}
                </span>
                <span className="flex-1 text-sm text-[#FFF8F0]">
                  {mistake.name}
                </span>
                <span className="text-base">{STATUS_ICONS[status]}</span>
              </button>
              {isExpanded && check && check.status !== "pass" && (
                <div className="ml-8 px-3 pb-3 space-y-1.5">
                  <p className="text-sm text-[#FFF8F0]/50">{check.message}</p>
                  {check.suggestion && (
                    <p className="text-sm text-[#FEC89A]">
                      Suggestion: {check.suggestion}
                    </p>
                  )}
                </div>
              )}
              {isExpanded && check && check.status === "pass" && (
                <div className="ml-8 px-3 pb-3">
                  <p className="text-sm text-[#34D399]/60">{check.message}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
            Active Alerts
          </p>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-2xl p-4 space-y-3 ${severityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#FFF8F0]">{alert.alertText}</p>
                  <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mt-1">
                    Mistake #{alert.mistakeNumber}: {alert.mistakeName}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRespond(alert.id, "accepted")}
                  disabled={pending}
                  className="px-3 py-1.5 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[12px] hover:bg-[#34D399]/30 transition-all disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRespond(alert.id, "dismissed")}
                  disabled={pending}
                  className="px-3 py-1.5 bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border border-[#FFF8F0]/[0.08] rounded-xl text-[12px] hover:text-[#FFF8F0]/60 transition-all disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-3">
          <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
            Actionable Improvements
          </p>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-[#FEC89A]">
              <span className="text-[#FEC89A]/40 mt-0.5">→</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
