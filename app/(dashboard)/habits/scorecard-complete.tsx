"use client";

import { useState, useTransition } from "react";
import { completeScorecard } from "./scorecard-actions";
import {
  generateDayInsights,
  getRatingColor,
  type ScorecardDay,
  type ScorecardEntry,
} from "@/lib/scorecard";

interface ScorecardCompleteProps {
  scorecard: ScorecardDay;
  entries: ScorecardEntry[];
}

export function ScorecardComplete({
  scorecard,
  entries,
}: ScorecardCompleteProps) {
  const [isPending, startTransition] = useTransition();
  const [reflection, setReflection] = useState("");
  const [awarenessRating, setAwarenessRating] = useState(0);
  const [isCompleted, setIsCompleted] = useState(
    scorecard.status === "completed",
  );
  const [finalScore, setFinalScore] = useState<number | null>(
    scorecard.status === "completed" ? scorecard.dayScore : null,
  );

  const insights = generateDayInsights(
    entries,
    scorecard.dayScore,
  );

  function handleComplete() {
    startTransition(async () => {
      const score = await completeScorecard(
        scorecard.id,
        reflection || undefined,
        awarenessRating || undefined,
      );
      setFinalScore(score);
      setIsCompleted(true);
    });
  }

  // Show completion summary if already completed
  if (isCompleted && finalScore !== null) {
    const scoreColor =
      finalScore > 0
        ? getRatingColor("+")
        : finalScore < 0
          ? getRatingColor("-")
          : getRatingColor("=");

    return (
      <div className="space-y-4">
        {/* Score reveal */}
        <div className="text-center py-6 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.06] rounded-2xl">
          <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-2">
            Day Score
          </p>
          <p
            className="text-5xl font-mono font-bold"
            style={{ color: scoreColor }}
          >
            {finalScore > 0 ? "+" : ""}
            {finalScore}
          </p>
          <p className="text-sm text-[#FFF8F0]/40 mt-2 max-w-xs mx-auto">
            {finalScore > 50
              ? "Strong day! Most behaviors aligned with who you want to become."
              : finalScore > 0
                ? "More positive than negative. You're moving in the right direction."
                : finalScore === 0
                  ? "Balanced day. Awareness is already powerful."
                  : "Awareness is the first step. You now KNOW what needs to shift."}
          </p>
        </div>

        {/* Day insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
              Insights
            </p>
            {insights.map((insight, i) => (
              <div
                key={i}
                className="p-3 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.06] rounded-xl"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">{insight.icon}</span>
                  <div>
                    <p className="text-sm text-[#FFF8F0]/80 font-medium">
                      {insight.title}
                    </p>
                    <p className="text-[11px] text-[#FFF8F0]/40 mt-0.5">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Evening reflection display */}
        {scorecard.eveningReflection && (
          <div className="p-3 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.06] rounded-xl">
            <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1">
              Your reflection
            </p>
            <p className="text-sm text-[#FFF8F0]/60 italic">
              &ldquo;{scorecard.eveningReflection}&rdquo;
            </p>
          </div>
        )}
      </div>
    );
  }

  // Show completion form
  return (
    <div className="space-y-4 p-4 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.06] rounded-2xl">
      <div>
        <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
          End of Day
        </p>
        <p className="text-sm text-[#FFF8F0]/60 mt-1">
          Complete your scorecard to see your day score and insights.
        </p>
      </div>

      {/* Evening reflection */}
      <div>
        <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
          Evening reflection
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What did you notice about your behaviors today? Any patterns?"
          rows={3}
          className="w-full mt-1 px-3 py-2 text-sm bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40 resize-none"
        />
      </div>

      {/* Awareness rating */}
      <div>
        <label className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
          How AWARE were you today? (1-5)
        </label>
        <div className="flex gap-2 mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAwarenessRating(n)}
              className={`w-10 h-10 rounded-xl text-sm font-mono border transition-all ${
                awarenessRating === n
                  ? "bg-[#FEC89A]/20 border-[#FEC89A]/40 text-[#FEC89A]"
                  : "border-[#FFF8F0]/[0.06] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#FFF8F0]/20 mt-1">
          1 = barely noticed my habits — 5 = caught myself in real-time
        </p>
      </div>

      {/* Complete button */}
      <button
        type="button"
        onClick={handleComplete}
        disabled={isPending || entries.length === 0}
        className="w-full py-3 rounded-xl text-sm font-mono transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-[#34D399]/20 to-[#2DD4BF]/20 text-[#34D399] border border-[#34D399]/30 hover:from-[#34D399]/30 hover:to-[#2DD4BF]/30"
      >
        {isPending
          ? "Calculating..."
          : entries.length === 0
            ? "Log behaviors first"
            : "Complete scorecard & see insights"}
      </button>
    </div>
  );
}
