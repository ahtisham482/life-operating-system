"use client";

import { useState, useTransition } from "react";
import type { HabitMastery, GoldilocksAssessment } from "@/lib/mastery";
import {
  PHASE_NAMES,
  PHASE_ICONS,
  PHASE_COLORS,
  getZoneColor,
  getZoneLabel,
  getDifficultyEmoji,
  getDifficultyLabel,
  MASTERY_LEVEL_ICONS,
} from "@/lib/mastery";
import {
  createMastery,
  deleteMastery,
  logPerformance,
  applyLevelChange,
  runGoldilocksAssessment,
} from "./mastery-actions";

const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const glass = "bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl";
const inputCls = "bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-2 text-[14px] focus:outline-none w-full";
const btnPrimary = "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px] font-medium hover:bg-[#FF6B6B]/30 transition-all disabled:opacity-30";
const btnGreen = "px-4 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[13px] font-medium hover:bg-[#34D399]/30 transition-all disabled:opacity-30";

interface Props {
  habits: HabitMastery[];
  onRefresh: () => void;
}

export function GoldilocksSection({ habits, onRefresh }: Props) {
  const [pending, start] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Record<string, GoldilocksAssessment>>({});

  // Create form state
  const [name, setName] = useState("");
  const [baseline, setBaseline] = useState("");
  const [unit, setUnit] = useState("pages");
  const [horizon, setHorizon] = useState("");

  // Log form state
  const [logAmount, setLogAmount] = useState("");
  const [logTime, setLogTime] = useState("");
  const [logDifficulty, setLogDifficulty] = useState<number>(3);
  const [logCompleted, setLogCompleted] = useState(true);
  const [logTwoMin, setLogTwoMin] = useState(false);
  const [logNote, setLogNote] = useState("");

  // Custom target for level change
  const [customTarget, setCustomTarget] = useState("");

  function handleCreate() {
    if (!name || !baseline) return;
    start(async () => {
      await createMastery({
        habitName: name,
        baselineAmount: Number(baseline),
        baselineUnit: unit,
        horizonAmount: horizon ? Number(horizon) : undefined,
      });
      setName(""); setBaseline(""); setHorizon(""); setShowCreate(false);
      onRefresh();
    });
  }

  function handleLog(habit: HabitMastery) {
    start(async () => {
      const result = await logPerformance({
        masteryId: habit.id,
        actualAmount: logAmount ? Number(logAmount) : undefined,
        timeSpentMinutes: logTime ? Number(logTime) : undefined,
        difficultyFeeling: logDifficulty,
        completed: logCompleted,
        usedTwoMinute: logTwoMin,
        note: logNote || undefined,
      });
      setAssessments((prev) => ({ ...prev, [habit.id]: result.assessment }));
      setExpandedLog(null);
      setLogAmount(""); setLogTime(""); setLogDifficulty(3); setLogCompleted(true); setLogTwoMin(false); setLogNote("");
      onRefresh();
    });
  }

  function handleLevelChange(habitId: string, newTarget: number, reason: string) {
    start(async () => {
      await applyLevelChange(habitId, newTarget, reason);
      setAssessments((prev) => { const n = { ...prev }; delete n[habitId]; return n; });
      onRefresh();
    });
  }

  function handleRunAssessment(habitId: string) {
    start(async () => {
      const a = await runGoldilocksAssessment(habitId);
      setAssessments((prev) => ({ ...prev, [habitId]: a }));
    });
  }

  if (habits.length === 0 && !showCreate) {
    return (
      <div className={`${glass} p-8 text-center space-y-4 max-w-lg mx-auto`}>
        <p className="text-[32px]">{"🎯"}</p>
        <h3 className="text-[20px] font-serif text-[#FFF8F0]">Track a measurable habit to unlock the Goldilocks Engine</h3>
        <p className="text-[14px] text-[#FFF8F0]/50 leading-relaxed">Find your perfect difficulty zone. Not too easy, not too hard.</p>
        <button onClick={() => setShowCreate(true)} className={btnPrimary}>Create Mastery Habit</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      {showCreate && (
        <div className={`${glass} p-5 space-y-3`}>
          <p className={label}>New Mastery Habit</p>
          <input placeholder="Habit name (e.g. Reading)" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          <div className="flex gap-2">
            <input placeholder="Baseline" type="number" value={baseline} onChange={(e) => setBaseline(e.target.value)} className={`${inputCls} flex-1`} />
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={`${inputCls} w-28`}>
              <option value="pages" className="bg-[#1a1a1a]">pages</option>
              <option value="minutes" className="bg-[#1a1a1a]">minutes</option>
              <option value="reps" className="bg-[#1a1a1a]">reps</option>
            </select>
          </div>
          <input placeholder="Dream level (optional)" type="number" value={horizon} onChange={(e) => setHorizon(e.target.value)} className={inputCls} />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={pending} className={btnPrimary}>Create</button>
            <button onClick={() => setShowCreate(false)} className="text-[13px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {!showCreate && habits.length > 0 && (
        <button onClick={() => setShowCreate(true)} className={btnPrimary}>+ New Mastery Habit</button>
      )}

      {/* Habit cards */}
      {habits.map((h) => {
        const a = assessments[h.id];
        const zoneColor = getZoneColor(h.goldilocksZone);
        const zoneLabel = getZoneLabel(h.goldilocksZone);
        const progress = h.horizonAmount ? Math.round(((h.currentTarget - h.baselineAmount) / (h.horizonAmount - h.baselineAmount)) * 100) : 0;
        const isLogOpen = expandedLog === h.id;
        const needsLevelUp = h.goldilocksZone === "boredom" || h.goldilocksZone === "ready";
        const needsPullBack = h.goldilocksZone === "anxiety" || h.goldilocksZone === "friction_warning";

        return (
          <div key={h.id} className={`${glass} p-5 space-y-4`}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[20px]">{h.habitIcon || "🎯"}</span>
                <div>
                  <h3 className="text-[16px] font-medium text-[#FFF8F0]">{h.habitName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-lg" style={{ background: `${PHASE_COLORS[h.currentPhase]}20`, color: PHASE_COLORS[h.currentPhase] }}>
                      {PHASE_ICONS[h.currentPhase]} {PHASE_NAMES[h.currentPhase]}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-lg" style={{ background: `${zoneColor}20`, color: zoneColor }}>{zoneLabel}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleRunAssessment(h.id)} disabled={pending} className="text-[11px] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 transition-colors">Refresh</button>
            </div>

            {/* Goldilocks zone bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[#FFF8F0]/40">
                <span>Too Easy</span><span>Flow Zone</span><span>Too Hard</span>
              </div>
              <div className="h-2 rounded-full bg-[#FFF8F0]/[0.05] relative overflow-hidden">
                <div className="absolute inset-y-0 left-[25%] right-[25%] bg-[#34D399]/20 rounded-full" />
                <div className="absolute top-0 bottom-0 w-3 h-3 rounded-full -mt-0.5 transition-all" style={{
                  background: zoneColor,
                  left: h.goldilocksZone === "boredom" ? "10%" : h.goldilocksZone === "ready" ? "30%" : h.goldilocksZone === "goldilocks" ? "50%" : h.goldilocksZone === "anxiety" ? "75%" : "90%",
                }} />
              </div>
            </div>

            {/* Current target */}
            <div className="flex items-baseline gap-2">
              <span className="text-[24px] font-serif text-[#FFF8F0]">{h.currentTarget}</span>
              <span className="text-[14px] text-[#FFF8F0]/50">{h.baselineUnit || "units"} / day</span>
            </div>

            {/* Log Today */}
            <button onClick={() => setExpandedLog(isLogOpen ? null : h.id)} className={`text-[13px] ${isLogOpen ? "text-[#FEC89A]" : "text-[#FFF8F0]/50 hover:text-[#FFF8F0]/70"} transition-colors`}>
              {isLogOpen ? "Close Log" : "Log Today"}
            </button>

            {isLogOpen && (
              <div className="space-y-3 pt-1">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className={label}>Actual Amount</p>
                    <input type="number" placeholder={String(h.currentTarget)} value={logAmount} onChange={(e) => setLogAmount(e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <p className={label}>Time (min)</p>
                    <input type="number" placeholder="15" value={logTime} onChange={(e) => setLogTime(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <p className={label}>Difficulty Feeling</p>
                  <div className="flex gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((f) => (
                      <button key={f} onClick={() => setLogDifficulty(f)} className={`flex-1 py-2 rounded-xl text-center transition-all ${logDifficulty === f ? "bg-[#FFF8F0]/[0.1] border border-[#FFF8F0]/20" : "bg-[#FFF8F0]/[0.03] border border-transparent hover:border-[#FFF8F0]/10"}`}>
                        <span className="text-[18px]">{getDifficultyEmoji(f)}</span>
                        <p className="text-[10px] text-[#FFF8F0]/40 mt-0.5">{getDifficultyLabel(f)}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-[13px] text-[#FFF8F0]/60 cursor-pointer">
                    <input type="checkbox" checked={logCompleted} onChange={(e) => setLogCompleted(e.target.checked)} className="rounded" />
                    Completed
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-[#FFF8F0]/60 cursor-pointer">
                    <input type="checkbox" checked={logTwoMin} onChange={(e) => setLogTwoMin(e.target.checked)} className="rounded" />
                    2-min version
                  </label>
                </div>
                <input placeholder="Note (optional)" value={logNote} onChange={(e) => setLogNote(e.target.value)} className={inputCls} />
                <button onClick={() => handleLog(h)} disabled={pending} className={btnGreen}>Save Log</button>
              </div>
            )}

            {/* Assessment message */}
            {a && (
              <div className="p-3 rounded-xl" style={{ background: `${getZoneColor(a.zone)}10`, borderLeft: `3px solid ${getZoneColor(a.zone)}` }}>
                <p className="text-[13px] text-[#FFF8F0]/70">{a.message}</p>
              </div>
            )}

            {/* Level Up suggestion */}
            {needsLevelUp && a?.suggestedTarget && (
              <div className="p-4 bg-[#34D399]/[0.05] border border-[#34D399]/20 rounded-xl space-y-2">
                <p className="text-[13px] font-medium text-[#34D399]">Level Up Suggestion</p>
                <p className="text-[14px] text-[#FFF8F0]/60">New target: <span className="text-[#FFF8F0]">{a.suggestedTarget} {h.baselineUnit}</span> ({a.changePercent && a.changePercent > 0 ? "+" : ""}{a.changePercent}%)</p>
                <div className="flex gap-2">
                  <button onClick={() => handleLevelChange(h.id, a.suggestedTarget!, "Goldilocks suggestion: level up")} disabled={pending} className={btnGreen}>Accept</button>
                  <button onClick={() => setAssessments((prev) => { const n = { ...prev }; delete n[h.id]; return n; })} className="text-[13px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60">Decline</button>
                  <div className="flex gap-1 items-center">
                    <input type="number" placeholder="Custom" value={customTarget} onChange={(e) => setCustomTarget(e.target.value)} className={`${inputCls} w-20 text-[13px]`} />
                    {customTarget && (
                      <button onClick={() => { handleLevelChange(h.id, Number(customTarget), "Custom level change"); setCustomTarget(""); }} disabled={pending} className="text-[13px] text-[#FEC89A] hover:text-[#FEC89A]/80">Set</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pull Back suggestion */}
            {needsPullBack && a?.suggestedTarget && (
              <div className="p-4 bg-[#FF6B6B]/[0.05] border border-[#FF6B6B]/20 rounded-xl space-y-2">
                <p className="text-[13px] font-medium text-[#FF6B6B]">Pull Back Suggestion</p>
                <p className="text-[14px] text-[#FFF8F0]/60">Suggested target: <span className="text-[#FFF8F0]">{a.suggestedTarget} {h.baselineUnit}</span> ({a.changePercent}%)</p>
                <div className="flex gap-2">
                  <button onClick={() => handleLevelChange(h.id, a.suggestedTarget!, "Goldilocks suggestion: pull back")} disabled={pending} className={btnPrimary}>Accept</button>
                  <button onClick={() => setAssessments((prev) => { const n = { ...prev }; delete n[h.id]; return n; })} className="text-[13px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60">Decline</button>
                </div>
              </div>
            )}

            {/* Growth trajectory */}
            {h.horizonAmount && (
              <div className="space-y-1">
                <p className={label}>Growth Trajectory</p>
                <div className="flex items-center gap-2 text-[13px] text-[#FFF8F0]/50">
                  <span>{h.baselineAmount}</span>
                  <span className="text-[#FFF8F0]/20">{"-->"}</span>
                  <span className="text-[#FEC89A]">{h.currentTarget}</span>
                  <span className="text-[#FFF8F0]/20">{"-->"}</span>
                  <span className="text-[#FFF8F0]/30">{h.horizonAmount}</span>
                  <span className="text-[#34D399] ml-2">{Math.max(0, Math.min(100, progress))}%</span>
                </div>
                <div className="h-1 rounded-full bg-[#FFF8F0]/[0.05]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#FEC89A] to-[#34D399] transition-all" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
                </div>
              </div>
            )}

            {/* Mastery score */}
            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-[#FFF8F0]/40">Mastery:</span>
              <span className="text-[#FFF8F0]">{h.masteryScore}/100</span>
              <span>{MASTERY_LEVEL_ICONS[h.masteryScore >= 90 ? "Master" : h.masteryScore >= 75 ? "Expert" : h.masteryScore >= 50 ? "Skilled" : h.masteryScore >= 25 ? "Practitioner" : "Beginner"]}</span>
              <span className="text-[#FFF8F0]/40">Ups: {h.totalLevelUps} Downs: {h.totalLevelDowns}</span>
            </div>

            {/* Delete */}
            <button onClick={() => start(async () => { await deleteMastery(h.id); onRefresh(); })} disabled={pending} className="text-[12px] text-[#FFF8F0]/30 hover:text-[#FF6B6B] transition-colors">
              Remove habit
            </button>
          </div>
        );
      })}
    </div>
  );
}
