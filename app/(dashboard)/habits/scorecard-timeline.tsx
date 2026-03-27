"use client";

import { useState, useTransition } from "react";
import {
  formatTimeDisplay,
  getCategoryIcon,
  getRatingColor,
  getRatingEmoji,
  formatMinutes,
  type ScorecardEntry,
} from "@/lib/scorecard";
import { deleteScorecardEntry, updateScorecardEntry } from "./scorecard-actions";

interface ScorecardTimelineProps {
  entries: ScorecardEntry[];
}

export function ScorecardTimeline({ entries }: ScorecardTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-3">🔍</p>
        <p className="text-sm text-[#FFF8F0]/40 font-mono">
          No behaviors logged yet
        </p>
        <p className="text-[11px] text-[#FFF8F0]/25 mt-1">
          Start adding entries above to build your daily timeline
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
          Today&apos;s Timeline
        </span>
        <span className="text-[10px] font-mono text-[#FFF8F0]/20">
          {entries.length} behaviors
        </span>
      </div>

      {entries.map((entry, i) => (
        <TimelineEntry key={entry.id} entry={entry} isLast={i === entries.length - 1} />
      ))}
    </div>
  );
}

function TimelineEntry({
  entry,
  isLast,
}: {
  entry: ScorecardEntry;
  isLast: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(entry.rating);
  const [isPending, startTransition] = useTransition();

  const ratingColor = getRatingColor(entry.rating);

  function handleRatingChange(newRating: "+" | "-" | "=") {
    setEditRating(newRating);
    startTransition(async () => {
      await updateScorecardEntry(entry.id, { rating: newRating });
      setIsEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteScorecardEntry(entry.id);
    });
  }

  return (
    <div className="flex gap-3 group">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center w-6 shrink-0">
        <div
          className="w-3 h-3 rounded-full border-2 shrink-0 mt-1.5"
          style={{
            borderColor: ratingColor,
            backgroundColor: `${ratingColor}30`,
          }}
        />
        {!isLast && (
          <div className="w-px flex-1 bg-[#FFF8F0]/[0.06] my-0.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start gap-2">
          {/* Time */}
          <span className="text-[11px] font-mono text-[#FFF8F0]/40 shrink-0 mt-0.5">
            {formatTimeDisplay(entry.timeOfAction)}
          </span>

          {/* Behavior */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">
                {getCategoryIcon(entry.behaviorCategory)}
              </span>
              <span className="text-sm text-[#FFF8F0]/80 truncate">
                {entry.behaviorDescription}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {entry.durationMinutes && (
                <span className="text-[10px] font-mono text-[#FFF8F0]/25">
                  {formatMinutes(entry.durationMinutes)}
                </span>
              )}
              {entry.emotionalState && (
                <span className="text-[10px] font-mono text-[#FEC89A]/40">
                  {entry.emotionalState}
                </span>
              )}
              {entry.wasAutomatic && (
                <span className="text-[10px] font-mono text-[#FFF8F0]/20">
                  🤖 auto
                </span>
              )}
              {entry.behaviorCategory && (
                <span className="text-[10px] font-mono text-[#FFF8F0]/15">
                  {entry.behaviorCategory}
                </span>
              )}
            </div>
          </div>

          {/* Rating + actions */}
          <div className="flex items-center gap-1 shrink-0">
            {isEditing ? (
              <div className="flex gap-1">
                {(["+" , "-" , "="] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRatingChange(r)}
                    disabled={isPending}
                    className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center border transition-all ${
                      editRating === r
                        ? "border-opacity-60"
                        : "border-[#FFF8F0]/[0.08]"
                    }`}
                    style={{
                      borderColor:
                        editRating === r
                          ? `${getRatingColor(r)}60`
                          : undefined,
                      background:
                        editRating === r
                          ? `${getRatingColor(r)}20`
                          : "transparent",
                    }}
                  >
                    {getRatingEmoji(r)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-7 h-7 rounded-lg text-[10px] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 border border-[#FFF8F0]/[0.06]"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-sm opacity-80 hover:opacity-100 transition-opacity"
                  title="Click to change rating"
                >
                  {getRatingEmoji(entry.rating)}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-6 h-6 rounded-lg text-[10px] text-[#FFF8F0]/0 group-hover:text-[#FFF8F0]/20 hover:!text-[#F87171]/60 hover:bg-[#F87171]/10 transition-all flex items-center justify-center"
                  title="Delete entry"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
