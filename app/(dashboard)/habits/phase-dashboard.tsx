"use client";

import { useState, useTransition } from "react";
import type { HabitMastery } from "@/lib/mastery";
import {
  PHASE_NAMES,
  PHASE_ICONS,
  PHASE_COLORS,
  PHASE_DESCRIPTIONS,
} from "@/lib/mastery";
import { checkPhaseAdvancement, advancePhase } from "./mastery-actions";

const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const glass = "bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl";
const btnGreen = "px-4 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[13px] font-medium hover:bg-[#34D399]/30 transition-all disabled:opacity-30";

interface Props {
  habits: HabitMastery[];
  onRefresh: () => void;
}

interface PhaseCheck {
  canAdvance: boolean;
  currentPhase: number;
  stats: {
    daysDone: number;
    consistency: number;
    neverMissedTwice: boolean;
    levelUps: number;
    flowDays: number;
  };
  nextPhaseName: string | null;
}

export function PhaseDashboard({ habits, onRefresh }: Props) {
  const [pending, start] = useTransition();
  const [checks, setChecks] = useState<Record<string, PhaseCheck>>({});
  const [celebration, setCelebration] = useState<string | null>(null);

  function handleCheckPhase(masteryId: string) {
    start(async () => {
      const result = await checkPhaseAdvancement(masteryId);
      setChecks((prev) => ({ ...prev, [masteryId]: result }));
    });
  }

  function handleAdvance(masteryId: string) {
    start(async () => {
      const updated = await advancePhase(masteryId);
      setCelebration(masteryId);
      setTimeout(() => setCelebration(null), 4000);
      setChecks((prev) => {
        const n = { ...prev };
        delete n[masteryId];
        return n;
      });
      onRefresh();
    });
  }

  if (habits.length === 0) {
    return (
      <div className={`${glass} p-8 text-center max-w-lg mx-auto`}>
        <p className="text-[14px] text-[#FFF8F0]/50">Create a mastery habit in Goldilocks to see your phase journey.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {habits.map((h) => {
        const phase = h.currentPhase;
        const check = checks[h.id];
        const isCelebrating = celebration === h.id;
        const daysSincePhase = Math.floor(
          (Date.now() - new Date(h.phaseStartedAt).getTime()) / 86400000,
        );

        return (
          <div key={h.id} className={`${glass} p-5 space-y-5`}>
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="text-[20px]">{h.habitIcon || "🎯"}</span>
              <h3 className="text-[16px] font-medium text-[#FFF8F0]">{h.habitName}</h3>
            </div>

            {/* 5-Phase Progress Bar */}
            <div className="flex items-center justify-between px-2">
              {[1, 2, 3, 4, 5].map((p, i) => {
                const isCompleted = p < phase;
                const isCurrent = p === phase;
                const isFuture = p > phase;
                const color = PHASE_COLORS[p];

                return (
                  <div key={p} className="flex items-center flex-1 last:flex-none">
                    {/* Circle */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] transition-all border-2"
                        style={{
                          background: isCompleted
                            ? `${color}30`
                            : isCurrent
                              ? `${color}20`
                              : "transparent",
                          borderColor: isFuture
                            ? "rgba(255,248,240,0.1)"
                            : color,
                          boxShadow: isCurrent
                            ? `0 0 12px ${color}40`
                            : "none",
                        }}
                      >
                        {isCompleted ? "✓" : PHASE_ICONS[p]}
                      </div>
                      <span
                        className="text-[10px] font-mono mt-1.5 text-center max-w-[70px] leading-tight"
                        style={{
                          color: isFuture
                            ? "rgba(255,248,240,0.3)"
                            : color,
                        }}
                      >
                        {PHASE_NAMES[p]}
                      </span>
                    </div>

                    {/* Connecting line */}
                    {i < 4 && (
                      <div
                        className="flex-1 h-0.5 mx-1 rounded-full"
                        style={{
                          background: isCompleted
                            ? color
                            : "rgba(255,248,240,0.08)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Celebration */}
            {isCelebrating && (
              <div className="p-4 bg-[#34D399]/[0.1] border border-[#34D399]/30 rounded-xl text-center">
                <p className="text-[20px] mb-1">{"🎉"}</p>
                <p className="text-[14px] font-medium text-[#34D399]">
                  Phase Advanced!
                </p>
                <p className="text-[13px] text-[#FFF8F0]/50 mt-1">
                  Welcome to {PHASE_NAMES[phase]} {PHASE_ICONS[phase]}
                </p>
              </div>
            )}

            {/* Current Phase Detail */}
            <div
              className="p-4 rounded-xl border"
              style={{
                background: `${PHASE_COLORS[phase]}08`,
                borderColor: `${PHASE_COLORS[phase]}20`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[18px]">{PHASE_ICONS[phase]}</span>
                <h4
                  className="text-[15px] font-medium"
                  style={{ color: PHASE_COLORS[phase] }}
                >
                  Phase {phase}: {PHASE_NAMES[phase]}
                </h4>
              </div>
              <p className="text-[13px] text-[#FFF8F0]/50 mb-3">
                {PHASE_DESCRIPTIONS[phase]}
              </p>

              <div className="flex items-center gap-4 text-[12px] text-[#FFF8F0]/40 mb-3">
                <span>{daysSincePhase} days in phase</span>
                <span>Target: {h.currentTarget} {h.baselineUnit}</span>
              </div>

              {/* What's visible in this phase */}
              <div className="space-y-1 mb-3">
                <p className={label}>Visible in this phase</p>
                {phase === 1 && (
                  <p className="text-[13px] text-[#FFF8F0]/50">
                    Completion tracking only. Just show up every day.
                  </p>
                )}
                {phase === 2 && (
                  <p className="text-[13px] text-[#FFF8F0]/50">
                    Streaks + consistency metrics. Build the chain.
                  </p>
                )}
                {phase === 3 && (
                  <p className="text-[13px] text-[#FFF8F0]/50">
                    Goldilocks zone + level changes + performance metrics.
                  </p>
                )}
                {phase === 4 && (
                  <p className="text-[13px] text-[#FFF8F0]/50">
                    Autopilot monitoring + boredom prevention + challenges.
                  </p>
                )}
                {phase === 5 && (
                  <p className="text-[13px] text-[#FFF8F0]/50">
                    Full review + identity alignment + retirement assessment.
                  </p>
                )}
              </div>

              {/* Check advancement */}
              {phase < 5 && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleCheckPhase(h.id)}
                    disabled={pending}
                    className="text-[13px] text-[#FFF8F0]/50 hover:text-[#FFF8F0]/70 transition-colors underline decoration-dotted underline-offset-4"
                  >
                    Check advancement criteria
                  </button>

                  {check && (
                    <div className="space-y-2 mt-2">
                      <p className={label}>Phase {check.currentPhase} Criteria</p>
                      <div className="space-y-1">
                        {getCriteriaList(check).map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-[13px]">
                            <span className={c.met ? "text-[#34D399]" : "text-[#FF6B6B]"}>
                              {c.met ? "✓" : "✗"}
                            </span>
                            <span className="text-[#FFF8F0]/60">{c.label}</span>
                          </div>
                        ))}
                      </div>
                      {check.canAdvance && check.nextPhaseName && (
                        <button
                          onClick={() => handleAdvance(h.id)}
                          disabled={pending}
                          className={btnGreen}
                        >
                          Advance to {check.nextPhaseName} {PHASE_ICONS[check.currentPhase + 1]}
                        </button>
                      )}
                      {!check.canAdvance && (
                        <p className="text-[12px] text-[#FFF8F0]/30">
                          Keep going! Not all criteria met yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getCriteriaList(check: PhaseCheck): { label: string; met: boolean }[] {
  const s = check.stats;
  const p = check.currentPhase;

  switch (p) {
    case 1:
      return [
        { label: `${s.daysDone}/10 days completed`, met: s.daysDone >= 10 },
        { label: `${s.consistency}%/71% consistency`, met: s.consistency >= 71 },
      ];
    case 2:
      return [
        { label: `${s.daysDone}/12 days completed`, met: s.daysDone >= 12 },
        { label: `${s.consistency}%/75% consistency`, met: s.consistency >= 75 },
        { label: `Never missed twice: ${s.neverMissedTwice ? "Yes" : "No"}`, met: s.neverMissedTwice },
      ];
    case 3:
      return [
        { label: `${s.daysDone}/30 days completed`, met: s.daysDone >= 30 },
        { label: `${s.levelUps}/2 level ups`, met: s.levelUps >= 2 },
        { label: `${s.flowDays}%/80% flow days`, met: s.flowDays >= 80 },
        { label: `${s.consistency}%/80% consistency`, met: s.consistency >= 80 },
      ];
    case 4:
      return [
        { label: `${s.daysDone}/30 days completed`, met: s.daysDone >= 30 },
        { label: `${s.consistency}%/75% consistency`, met: s.consistency >= 75 },
      ];
    default:
      return [];
  }
}
