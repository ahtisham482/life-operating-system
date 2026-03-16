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
    <div className="space-y-6">
      {/* Season Goal Card */}
      {seasonGoal && (
        <div className="bg-card border border-primary/30 p-5 rounded-lg">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
            Your Current Lead Priority
          </p>
          <p className="text-base font-serif text-primary">{seasonGoal}</p>
          {leadDomainLabel && (
            <p className="text-xs font-mono text-muted-foreground/60 mt-1.5">
              {leadDomainLabel} — {leadDomainDesc}
            </p>
          )}
        </div>
      )}

      {/* Today's Check-In Card */}
      <div className="bg-card border border-border p-5 rounded-lg space-y-5">
        {/* Lead Score Question */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
              How much did you move your lead priority forward?
            </p>
            {savedIndicator && (
              <span className="text-[10px] font-mono text-[#C49E45] tracking-wider animate-fade-in">
                Saved ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((score) => {
              const config = SCORE_CONFIG[score];
              const isSelected = leadScore === score;
              const borderColor = isSelected
                ? score >= 4
                  ? "border-[#C49E45]/60"
                  : score === 3
                  ? "border-yellow-400/60"
                  : score === 2
                  ? "border-orange-400/60"
                  : "border-red-400/60"
                : "border-border";
              const bgColor = isSelected
                ? score >= 4
                  ? "bg-[#C49E45]/10"
                  : score === 3
                  ? "bg-yellow-400/10"
                  : score === 2
                  ? "bg-orange-400/10"
                  : "bg-red-400/10"
                : "bg-transparent";

              return (
                <button
                  key={score}
                  onClick={() => handleScoreTap(score)}
                  disabled={isPending}
                  className={`size-11 flex items-center justify-center text-sm font-mono border-2 rounded-full transition-all ${borderColor} ${bgColor} ${
                    isSelected ? config.color : "text-muted-foreground/40"
                  } hover:border-white/20 disabled:opacity-50`}
                >
                  {score}
                </button>
              );
            })}
          </div>
          {leadScore !== null && (
            <p className={`text-xs font-mono mt-2.5 tracking-wider ${SCORE_CONFIG[leadScore].color}`}>
              {SCORE_CONFIG[leadScore].label}
            </p>
          )}
          {leadScore === null && (
            <p className="text-xs font-mono mt-2.5 tracking-wider text-muted-foreground/40">
              Tap a score to check in
            </p>
          )}
        </div>

        {/* Expandable Details */}
        <div>
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors"
          >
            {detailsOpen ? "Hide details ▾" : "Add details ▸"}
          </button>

          {detailsOpen && (
            <div className="mt-4 space-y-5 animate-slide-up" style={{ animationFillMode: "both" }}>
              {/* Mood */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
                  Mood & Energy
                </p>
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={`px-3 py-1.5 text-xs font-mono border rounded transition-colors ${
                        mood === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflection */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  One-Line Reflection — What happened today?
                </p>
                <input
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Write one honest sentence about today..."
                  className="w-full bg-background border border-border text-foreground p-3 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Blockers */}
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  What blocked you or scattered you today?
                </p>
                <input
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Optional — be honest with yourself..."
                  className="w-full bg-background border border-border text-foreground p-3 text-sm font-serif rounded focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Update button for details */}
              <button
                onClick={handleDetailsUpdate}
                disabled={isPending || leadScore === null}
                className="px-6 py-2.5 text-[11px] font-mono uppercase tracking-widest border border-primary text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-40"
              >
                {isPending ? "Saving..." : "Update"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
