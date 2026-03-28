"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { HabitMastery, Challenge } from "@/lib/mastery";
import { suggestChallenge, respondToChallenge, getChallenges } from "./mastery-actions";

const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const glass = "bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl";
const btnPrimary = "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px] font-medium hover:bg-[#FF6B6B]/30 transition-all disabled:opacity-30";
const btnGreen = "px-4 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[13px] font-medium hover:bg-[#34D399]/30 transition-all disabled:opacity-30";

const RATING_OPTIONS = [
  { value: "helpful", label: "Helpful", icon: "👍" },
  { value: "neutral", label: "Neutral", icon: "😐" },
  { value: "not_helpful", label: "Not Helpful", icon: "👎" },
];

interface Props {
  habits: HabitMastery[];
  onRefresh: () => void;
}

export function ChallengeSection({ habits, onRefresh }: Props) {
  const [pending, start] = useTransition();
  const [challengeMap, setChallengeMap] = useState<Record<string, Challenge[]>>({});
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChallenges = useCallback(() => {
    start(async () => {
      const results: Record<string, Challenge[]> = {};
      await Promise.all(
        habits.map(async (h) => {
          const list = await getChallenges(h.id);
          results[h.id] = list;
        }),
      );
      setChallengeMap(results);
      setLoading(false);
    });
  }, [habits]);

  useEffect(() => {
    if (habits.length > 0) loadChallenges();
    else setLoading(false);
  }, [habits, loadChallenges]);

  function handleSuggest(masteryId: string) {
    start(async () => {
      await suggestChallenge(masteryId);
      loadChallenges();
    });
  }

  function handleRespond(challengeId: string, action: "accept" | "complete" | "skip", rating?: string) {
    start(async () => {
      await respondToChallenge(challengeId, action, rating || undefined);
      setRatingFor(null);
      loadChallenges();
      onRefresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className={`${glass} p-8 text-center max-w-lg mx-auto`}>
        <p className="text-[14px] text-[#FFF8F0]/50">
          Create a mastery habit in Goldilocks to unlock challenges.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {habits.map((h) => {
        const challenges = challengeMap[h.id] || [];
        const activeChallenge = challenges.find((c) => c.accepted && !c.completed);
        const pendingChallenge = challenges.find((c) => !c.accepted && !c.completed);
        const completedChallenges = challenges.filter((c) => c.completed);
        const showRating = ratingFor === activeChallenge?.id;

        return (
          <div key={h.id} className={`${glass} p-5 space-y-4`}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[20px]">{h.habitIcon || "🎯"}</span>
                <div>
                  <h3 className="text-[16px] font-medium text-[#FFF8F0]">{h.habitName}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[12px] text-[#FFF8F0]/40">
                      {completedChallenges.length} completed
                    </span>
                    <span className="text-[12px] text-[#FEC89A]/60">
                      Depth: {h.depthScore}/100
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active challenge */}
            {activeChallenge && (
              <div className="p-4 bg-[#FEC89A]/[0.05] border border-[#FEC89A]/20 rounded-xl space-y-3">
                <p className={label}>Active Challenge</p>
                <p className="text-[15px] text-[#FFF8F0] font-medium">
                  {activeChallenge.challengeText}
                </p>
                <p className="text-[12px] text-[#FFF8F0]/30">
                  Week {activeChallenge.weekNumber}
                </p>

                {showRating ? (
                  <div className="space-y-2">
                    <p className="text-[13px] text-[#FFF8F0]/50">How was this challenge?</p>
                    <div className="flex gap-2">
                      {RATING_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleRespond(activeChallenge.id, "complete", opt.value)}
                          disabled={pending}
                          className="flex-1 py-2 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] rounded-xl text-center hover:bg-[#FFF8F0]/[0.06] transition-all"
                        >
                          <span className="text-[18px]">{opt.icon}</span>
                          <p className="text-[11px] text-[#FFF8F0]/40 mt-0.5">{opt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRatingFor(activeChallenge.id)}
                      disabled={pending}
                      className={btnGreen}
                    >
                      {"✅"} Completed
                    </button>
                    <button
                      onClick={() => handleRespond(activeChallenge.id, "skip")}
                      disabled={pending}
                      className="text-[13px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 transition-colors"
                    >
                      {"⏭️"} Skip
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pending (suggested but not accepted) */}
            {pendingChallenge && !activeChallenge && (
              <div className="p-4 bg-[#60A5FA]/[0.05] border border-[#60A5FA]/20 rounded-xl space-y-3">
                <p className={label}>Suggested Challenge</p>
                <p className="text-[15px] text-[#FFF8F0] font-medium">
                  {pendingChallenge.challengeText}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(pendingChallenge.id, "accept")}
                    disabled={pending}
                    className={btnGreen}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(pendingChallenge.id, "skip")}
                    disabled={pending}
                    className="text-[13px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => {
                      handleRespond(pendingChallenge.id, "skip");
                      setTimeout(() => handleSuggest(h.id), 300);
                    }}
                    disabled={pending}
                    className="text-[13px] text-[#FEC89A] hover:text-[#FEC89A]/80 transition-colors"
                  >
                    Get Another
                  </button>
                </div>
              </div>
            )}

            {/* No challenge: suggest */}
            {!activeChallenge && !pendingChallenge && (
              <button
                onClick={() => handleSuggest(h.id)}
                disabled={pending}
                className={btnPrimary}
              >
                {"🎯"} Get a Challenge
              </button>
            )}

            {/* Completed history */}
            {completedChallenges.length > 0 && (
              <div className="space-y-2">
                <p className={label}>Completed ({completedChallenges.length})</p>
                {completedChallenges.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 text-[13px]">
                    <span className="text-[#34D399]">{"✓"}</span>
                    <span className="text-[#FFF8F0]/50 flex-1">{c.challengeText}</span>
                    {c.rating && (
                      <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/30">
                        {c.rating === "helpful" ? "👍" : c.rating === "neutral" ? "😐" : "👎"}
                      </span>
                    )}
                    {c.completedAt && (
                      <span className="text-[11px] text-[#FFF8F0]/20">
                        {new Date(c.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
