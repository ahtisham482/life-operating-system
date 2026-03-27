"use client";

import { useState, useTransition } from "react";
import { castVote } from "./identity-actions";
import { getTodayKarachi } from "@/lib/utils";
import type { MilestoneDef } from "@/lib/identity";

interface VoteStripHabit {
  id: string;
  name: string;
  emoji: string | null;
  tinyVersion: string | null;
  isCompletedToday: boolean;
}

interface VoteStripProps {
  identityId: string;
  habits: VoteStripHabit[];
  onVoteCast?: (result: {
    newConfidence: number;
    milestone: MilestoneDef | null;
  }) => void;
}

export function VoteStrip({ identityId, habits, onVoteCast }: VoteStripProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(habits.filter((h) => h.isCompletedToday).map((h) => h.id)),
  );
  const [isPending, startTransition] = useTransition();
  const today = getTodayKarachi();

  const allDone = habits.length > 0 && completedIds.size === habits.length;

  function handleToggle(habitId: string) {
    if (completedIds.has(habitId)) return; // No un-voting for now
    setCompletedIds((prev) => new Set([...prev, habitId]));

    startTransition(async () => {
      const result = await castVote(habitId, identityId, today);
      onVoteCast?.(result);
    });
  }

  if (habits.length === 0) {
    return (
      <p className="text-[10px] font-mono text-[#FFF8F0]/25 italic">
        No habits linked yet — use &quot;Link habits&quot; below.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* All-done banner */}
      {allDone && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#34D399]/10 border border-[#34D399]/20">
          <span className="text-[#34D399] text-xs">✓</span>
          <span className="text-[10px] font-mono text-[#34D399] uppercase tracking-[0.15em]">
            All votes cast today
          </span>
        </div>
      )}

      {habits.map((habit) => {
        const done = completedIds.has(habit.id);
        return (
          <button
            key={habit.id}
            onClick={() => handleToggle(habit.id)}
            disabled={done || isPending}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
              done
                ? "bg-[#34D399]/10 border-[#34D399]/20 opacity-80"
                : "bg-[#FFF8F0]/[0.03] border-[#FFF8F0]/[0.07] hover:bg-[#FFF8F0]/[0.06] hover:border-[#FFF8F0]/[0.12] active:scale-[0.98]"
            }`}
          >
            {/* Checkbox */}
            <div
              className={`w-4 h-4 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${
                done ? "bg-[#34D399] border-[#34D399]" : "border-[#FFF8F0]/20"
              }`}
            >
              {done && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {/* Habit info */}
            <div className="flex-1 min-w-0">
              <span
                className={`text-xs font-serif truncate block ${
                  done ? "text-[#FFF8F0]/40 line-through" : "text-[#FFF8F0]/80"
                }`}
              >
                {habit.emoji && <span className="mr-1">{habit.emoji}</span>}
                {habit.name}
              </span>
              {!done && habit.tinyVersion && (
                <span className="text-[9px] font-mono text-[#FFF8F0]/25 block truncate">
                  2 min: {habit.tinyVersion}
                </span>
              )}
            </div>

            {/* Cast vote label */}
            {!done && (
              <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#FFF8F0]/20 flex-shrink-0">
                Vote
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
