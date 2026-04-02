"use client";

import { useState, useEffect, useCallback } from "react";
import { ScorecardDayStats } from "./scorecard-day-stats";
import { ScorecardEntryForm } from "./scorecard-entry-form";
import { ScorecardTimeline } from "./scorecard-timeline";
import { ScorecardComplete } from "./scorecard-complete";
import { ScorecardOnboarding } from "./scorecard-onboarding";
import {
  startOrGetScorecard,
  getScorecardEntries,
  getScorecardHistory,
} from "./scorecard-actions";
import type { ScorecardDay, ScorecardEntry } from "@/lib/scorecard";

interface ScorecardTabProps {
  date: string;
  totalScorecards: number;
}

export function ScorecardTab({ date, totalScorecards }: ScorecardTabProps) {
  const [scorecard, setScorecard] = useState<ScorecardDay | null>(null);
  const [entries, setEntries] = useState<ScorecardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [history, setHistory] = useState<ScorecardDay[]>([]);

  const loadScorecard = useCallback(async () => {
    try {
      const result = await startOrGetScorecard(date);
      setScorecard(result.scorecard);
      const entries = await getScorecardEntries(result.scorecard.id);
      setEntries(entries);
    } catch {
      // No scorecard yet
      setScorecard(null);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    // Check if this is first time — show onboarding
    if (totalScorecards === 0) {
      setShowOnboarding(true);
      setLoading(false);
    } else {
      loadScorecard();
    }
  }, [totalScorecards, loadScorecard]);

  // Load history for streak display
  useEffect(() => {
    getScorecardHistory(7).then(setHistory);
  }, []);

  async function refreshEntries() {
    if (!scorecard) return;
    const fresh = await getScorecardEntries(scorecard.id);
    setEntries(fresh);
    // Refresh scorecard stats too
    const result = await startOrGetScorecard(date);
    setScorecard(result.scorecard);
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <ScorecardOnboarding
        date={date}
        onComplete={() => {
          setShowOnboarding(false);
          loadScorecard();
        }}
      />
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-32 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-48 bg-[#FFF8F0]/[0.03] rounded-2xl" />
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className="text-center py-16">
        <p className="text-3xl mb-3">🔍</p>
        <p className="text-sm text-[#FFF8F0]/50">
          Something went wrong loading your scorecard.
        </p>
        <button
          type="button"
          onClick={loadScorecard}
          className="mt-3 px-4 py-2 rounded-xl text-sm font-mono bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-[11px] font-mono text-[#FFF8F0]/30 mb-4">
        Rate each behavior as + (good), − (bad), or = (neutral). Build awareness of your daily patterns.
      </p>

      {/* Morning intention */}
      {scorecard.morningIntention && (
        <div className="px-4 py-3 bg-[#FEC89A]/[0.05] border border-[#FEC89A]/[0.15] rounded-xl">
          <p className="text-[10px] font-mono text-[#FEC89A]/60 uppercase tracking-wider mb-1">
            Today&apos;s intention
          </p>
          <p className="text-sm text-[#FEC89A]/80 italic">
            &ldquo;{scorecard.morningIntention}&rdquo;
          </p>
        </div>
      )}

      {/* Day stats */}
      <ScorecardDayStats scorecard={scorecard} />

      {/* Tracking streak */}
      {history.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#FFF8F0]/25">
            Last 7 days:
          </span>
          {history.slice(0, 7).reverse().map((day) => {
            const color =
              day.dayScore > 0
                ? "#34D399"
                : day.dayScore < 0
                  ? "#F87171"
                  : "#9CA3AF";
            return (
              <div
                key={day.id}
                className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-mono"
                style={{ background: `${color}20`, color }}
                title={`${day.scorecardDate}: ${day.dayScore > 0 ? "+" : ""}${day.dayScore}`}
              >
                {day.dayScore > 0 ? "+" : day.dayScore < 0 ? "−" : "·"}
              </div>
            );
          })}
        </div>
      )}

      {/* Entry form (always visible when not completed) */}
      {scorecard.status === "in_progress" && (
        <ScorecardEntryForm
          scorecardId={scorecard.id}
          onAdded={refreshEntries}
        />
      )}

      {/* Timeline */}
      <ScorecardTimeline entries={entries} />

      {/* Complete scorecard section */}
      {entries.length > 0 && (
        <ScorecardComplete scorecard={scorecard} entries={entries} />
      )}

      {/* Philosophy reminder */}
      <div className="text-center py-4 border-t border-[#FFF8F0]/[0.04]">
        <p className="text-[10px] font-mono text-[#FFF8F0]/15 italic">
          &ldquo;You can&apos;t change what you can&apos;t see.&rdquo; — James
          Clear
        </p>
      </div>
    </div>
  );
}
