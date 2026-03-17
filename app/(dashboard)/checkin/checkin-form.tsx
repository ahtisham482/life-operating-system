"use client";

import { useState, useTransition, useCallback } from "react";
import { upsertCheckin } from "./actions";

const MOODS = ["🔥 On Fire", "⚡ Energized", "😐 Neutral", "😔 Drained", "🌀 Scattered"];

const MOOD_GRADIENTS: Record<string, string> = {
  "🔥 On Fire": "bg-gradient-to-br from-[#FF6B6B] to-[#FFD93D]",
  "⚡ Energized": "bg-gradient-to-br from-[#2DD4BF] to-[#FEC89A]",
  "😐 Neutral": "bg-gradient-to-br from-[#FFF8F0]/20 to-[#FFF8F0]/10",
  "😔 Drained": "bg-gradient-to-br from-[#E2B0FF]/40 to-[#64788E]/30",
  "🌀 Scattered": "bg-gradient-to-br from-[#B4AAC8]/40 to-[#FFF8F0]/10",
};

const MOOD_LABELS: Record<string, string> = {
  "🔥 On Fire": "On Fire",
  "⚡ Energized": "Energized",
  "😐 Neutral": "Neutral",
  "😔 Drained": "Drained",
  "🌀 Scattered": "Scattered",
};

const SCORE_CONFIG: Record<number, { label: string; bg: string; selectedBg: string }> = {
  1: { label: "Rough", bg: "bg-[#64788E]/15", selectedBg: "bg-[#64788E]/15" },
  2: { label: "Slow", bg: "bg-[#B4AAC8]/12", selectedBg: "bg-[#B4AAC8]/12" },
  3: { label: "Steady", bg: "bg-[#FFC864]/12", selectedBg: "bg-[#FFC864]/12" },
  4: { label: "Strong", bg: "bg-gradient-to-br from-[#FF6B6B]/20 to-[#FEC89A]/20", selectedBg: "bg-gradient-to-br from-[#FF6B6B]/20 to-[#FEC89A]/20" },
  5: { label: "Crushed It", bg: "bg-[#FFD93D]/12", selectedBg: "bg-[#FFD93D]/12" },
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
          <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-[#FFF8F0]/30">
            Your Lead Priority
          </p>
          <p className="text-sm font-serif text-[#FFF8F0]/60 italic">{seasonGoal}</p>
          {leadDomainLabel && (
            <p className="text-[9px] font-mono text-[#FFF8F0]/20 tracking-wider">
              {leadDomainLabel}
            </p>
          )}
        </div>
      )}

      {/* Score Cards — prominently centered */}
      <div className="flex flex-col items-center gap-6">
        <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-[#FFF8F0]/40">
          How much did you move your lead priority forward?
        </p>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          {[1, 2, 3, 4, 5].map((score) => {
            const config = SCORE_CONFIG[score];
            const isSelected = leadScore === score;

            return (
              <button
                key={score}
                onClick={() => handleScoreTap(score)}
                disabled={isPending}
                className={`w-24 h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all duration-200 disabled:opacity-50 ${
                  config.bg
                } ${
                  isSelected
                    ? "border-2 border-[#FF6B6B] shadow-[0_0_20px_rgba(255,107,107,0.2)] scale-105"
                    : "border border-[#FFF8F0]/[0.06] hover:border-[#FFF8F0]/15"
                }`}
              >
                <span className={`text-2xl font-light ${isSelected ? "text-[#FF6B6B]" : "text-[#FFF8F0]/25"}`}>
                  {score}
                </span>
                <span className={`text-[8px] font-mono tracking-wider uppercase ${isSelected ? "text-[#FF6B6B]/80" : "text-[#FFF8F0]/20"}`}>
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Score Label + Saved Indicator */}
        <div className="h-5 flex items-center gap-3">
          {leadScore !== null && (
            <p className="text-xs font-mono tracking-wider text-[#FF6B6B]">
              {SCORE_CONFIG[leadScore].label}
            </p>
          )}
          {leadScore === null && (
            <p className="text-xs font-mono tracking-wider text-[#FFF8F0]/20">
              Tap a score to check in
            </p>
          )}
          {savedIndicator && (
            <span className="text-[10px] font-mono text-[#FF6B6B] tracking-wider animate-fade-in">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 transition-colors"
        >
          {detailsOpen ? "Hide details" : "Add details"}
        </button>

        {detailsOpen && (
          <div className="mt-6 w-full space-y-5 animate-slide-up" style={{ animationFillMode: "both" }}>
            <div className="glass-card rounded-3xl p-6 space-y-5">
              {/* Mood */}
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.35em] text-[#FFF8F0]/40 mb-3">
                  Mood & Energy
                </p>
                <div className="flex gap-3 flex-wrap items-center">
                  {MOODS.map((m) => {
                    const isSelected = mood === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMood(m)}
                        className={`w-11 h-11 rounded-full transition-all duration-200 ${MOOD_GRADIENTS[m]} ${
                          isSelected
                            ? "ring-2 ring-[#FF6B6B] ring-offset-2 ring-offset-[#1A1A2E] scale-110"
                            : "opacity-60 hover:opacity-90 hover:scale-105"
                        }`}
                        title={MOOD_LABELS[m]}
                      />
                    );
                  })}
                </div>
                {mood && (
                  <p className="text-xs font-mono text-[#FFF8F0]/40 mt-2 tracking-wider">
                    {mood}
                  </p>
                )}
              </div>

              {/* Reflection */}
              <div>
                <p className="text-sm font-serif italic text-[#FFF8F0]/50 mb-2">
                  What moved the needle?
                </p>
                <input
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What happened today..."
                  className="w-full bg-black/20 border border-[#FFF8F0]/[0.06] text-[#FFF8F0]/80 p-3 text-sm font-serif rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/15"
                />
              </div>

              {/* Blockers */}
              <div>
                <p className="text-sm font-serif italic text-[#FFF8F0]/50 mb-2">
                  What got in the way?
                </p>
                <input
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Optional — be honest..."
                  className="w-full bg-black/20 border border-[#FFF8F0]/[0.06] text-[#FFF8F0]/80 p-3 text-sm font-serif rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/15"
                />
              </div>

              {/* Update button */}
              <div className="flex justify-center pt-1">
                <button
                  onClick={handleDetailsUpdate}
                  disabled={isPending || leadScore === null}
                  className="px-6 py-2.5 text-[10px] font-mono uppercase tracking-widest bg-gradient-to-r from-[#FF6B6B] to-[#FEC89A] text-white rounded-2xl transition-all hover:shadow-[0_0_20px_rgba(255,107,107,0.3)] disabled:opacity-30"
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
