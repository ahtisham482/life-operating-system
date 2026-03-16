"use client";

import { useState, useTransition, useCallback } from "react";
import { upsertCheckin } from "./actions";

const MOODS = ["🔥 On Fire", "⚡ Energized", "😐 Neutral", "😔 Drained", "🌀 Scattered"];

const SCORE_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Not at all", color: "text-red-400" },
  2: { label: "A little", color: "text-orange-400" },
  3: { label: "Moderate", color: "text-yellow-400" },
  4: { label: "Significant", color: "text-[#C49E45]/80" },
  5: { label: "Breakthrough", color: "text-[#C49E45]" },
};

type CheckinFormProps = {
  today: string;
  todayEntry?: {
    leadDone: boolean | number | null;
    mood: string;
    reflection: string;
    blockers: string;
  };
  seasonGoal?: string;
  leadDomainLabel?: string;
  leadDomainDesc?: string;
};

function normalizeLeadScore(leadDone: boolean | number | null | undefined): number | null {
  if (leadDone === null || leadDone === undefined) return null;
  if (typeof leadDone === "boolean") return leadDone ? 5 : 1;
  if (typeof leadDone === "number" && leadDone >= 1 && leadDone <= 5) return leadDone;
  return null;
}

export function CheckinForm({
  today,
  todayEntry,
  seasonGoal,
  leadDomainLabel,
  leadDomainDesc,
}: CheckinFormProps) {
  const initialScore = normalizeLeadScore(todayEntry?.leadDone);
  const [leadScore, setLeadScore] = useState<number | null>(initialScore);
  const [mood, setMood] = useState(todayEntry?.mood ?? "");
  const [reflection, setReflection] = useState(todayEntry?.reflection ?? "");
  const [blockers, setBlockers] = useState(todayEntry?.blockers ?? "");
  const [isPending, startTransition] = useTransition();
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(
    !!(todayEntry?.mood || todayEntry?.reflection || todayEntry?.blockers)
  );

  const showSaved = useCallback(() => {
    setSavedIndicator(true);
    const timer = setTimeout(() => setSavedIndicator(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  function handleScoreTap(score: number) {
    setLeadScore(score);
    startTransition(async () => {
      await upsertCheckin(today, score, mood, reflection, blockers);
      showSaved();
    });
  }

  function handleDetailsUpdate() {
    if (leadScore === null) return;
    startTransition(async () => {
      await upsertCheckin(today, leadScore, mood, reflection, blockers);
      showSaved();
    });
  }

  return (
    <div className="space-y-8">
      {/* Season Goal — subtle context */}
      {seasonGoal && (
        <div className="text-center space-y-1">
          <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/30">
            Your Lead Priority
          </p>
          <p className="text-sm font-serif text-white/60 italic">{seasonGoal}</p>
          {leadDomainLabel && (
            <p className="text-[9px] font-mono text-white/20 tracking-wider">
              {leadDomainLabel}
            </p>
          )}
        </div>
      )}

      {/* Score Circles — prominently centered */}
      <div className="flex flex-col items-center gap-6">
        <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/40">
          How much did you move your lead priority forward?
        </p>

        <div className="flex items-center gap-5">
          {[1, 2, 3, 4, 5].map((score) => {
            const config = SCORE_CONFIG[score];
            const isSelected = leadScore === score;
            const borderColor = isSelected
              ? score >= 4
                ? "border-[#C49E45]"
                : score === 3
                ? "border-yellow-400"
                : score === 2
                ? "border-orange-400"
                : "border-red-400"
              : "border-white/[0.08]";
            const bgColor = isSelected
              ? score >= 4
                ? "bg-[#C49E45]/15"
                : score === 3
                ? "bg-yellow-400/10"
                : score === 2
                ? "bg-orange-400/10"
                : "bg-red-400/10"
              : "bg-white/[0.02] hover:bg-white/[0.04]";

            return (
              <button
                key={score}
                onClick={() => handleScoreTap(score)}
                disabled={isPending}
                className={`size-14 flex items-center justify-center text-lg font-mono border-2 rounded-full transition-all duration-200 ${borderColor} ${bgColor} ${
                  isSelected ? config.color : "text-white/25"
                } hover:border-white/20 disabled:opacity-50 ${
                  isSelected ? "scale-110 shadow-glow-sm" : ""
                }`}
              >
                {score}
              </button>
            );
          })}
        </div>

        {/* Score Label + Saved Indicator */}
        <div className="h-5 flex items-center gap-3">
          {leadScore !== null && (
            <p className={`text-xs font-mono tracking-wider ${SCORE_CONFIG[leadScore].color}`}>
              {SCORE_CONFIG[leadScore].label}
            </p>
          )}
          {leadScore === null && (
            <p className="text-xs font-mono tracking-wider text-white/20">
              Tap a score to check in
            </p>
          )}
          {savedIndicator && (
            <span className="text-[10px] font-mono text-[#C49E45] tracking-wider animate-fade-in">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/30 hover:text-white/50 transition-colors"
        >
          {detailsOpen ? "Hide details" : "Add details"}
        </button>

        {detailsOpen && (
          <div className="mt-6 w-full space-y-5 animate-slide-up" style={{ animationFillMode: "both" }}>
            <div className="glass-card rounded-2xl p-6 space-y-5">
              {/* Mood */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/40 mb-3">
                  Mood & Energy
                </p>
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={`px-3 py-1.5 text-xs font-mono border rounded-lg transition-colors ${
                        mood === m
                          ? "border-[#C49E45]/40 bg-[#C49E45]/10 text-[#C49E45]"
                          : "border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/10"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/40 mb-2">
                  One-Line Reflection
                </p>
                <input
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What happened today..."
                  className="w-full bg-black/20 border border-white/[0.06] text-white/80 p-3 text-sm font-serif rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C49E45]/30 placeholder:text-white/15"
                />
              </div>

              {/* Blockers */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-white/40 mb-2">
                  What blocked you?
                </p>
                <input
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Optional — be honest..."
                  className="w-full bg-black/20 border border-white/[0.06] text-white/80 p-3 text-sm font-serif rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C49E45]/30 placeholder:text-white/15"
                />
              </div>

              {/* Update button */}
              <div className="flex justify-center pt-1">
                <button
                  onClick={handleDetailsUpdate}
                  disabled={isPending || leadScore === null}
                  className="px-6 py-2 text-[10px] font-mono uppercase tracking-widest border border-[#C49E45]/30 text-[#C49E45]/70 hover:bg-[#C49E45]/10 rounded-lg transition-colors disabled:opacity-30"
                >
                  {isPending ? "Saving..." : "Update Details"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
