"use client";

import { Button } from "@/components/ui/button";
import type { ScorecardTimelineItem } from "@/lib/scorecard";

interface ScorecardTimelineProps {
  timeline: ScorecardTimelineItem[];
  isPending: boolean;
  onEdit: (entry: ScorecardTimelineItem) => void;
  onDelete: (entryId: string) => void;
}

export function ScorecardTimeline({
  timeline,
  isPending,
  onEdit,
  onDelete,
}: ScorecardTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div className="glass-card rounded-[28px] p-8 text-center">
        <p className="text-4xl">🪞</p>
        <h3 className="text-2xl font-serif italic text-[#FFF8F0] mt-4">
          Nothing logged yet
        </h3>
        <p className="text-sm text-[#FFF8F0]/45 max-w-md mx-auto mt-3 leading-relaxed">
          Start with one behavior. Awareness compounds faster than perfection.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[28px] p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#34D399]/70">
            Timeline
          </p>
          <p className="text-[12px] text-[#FFF8F0]/35 mt-1">
            Watch the day in sequence. Chains often reveal themselves here first.
          </p>
        </div>
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/30">
          {timeline.length} entries
        </p>
      </div>

      <div className="space-y-3">
        {timeline.map((entry) => (
          <div
            key={entry.id}
            className="rounded-[22px] border border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.03] px-4 py-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FEC89A]/75">
                    {entry.time}
                  </p>
                  {entry.endTime ? (
                    <p className="text-[11px] font-mono text-[#FFF8F0]/25">
                      → {entry.endTime}
                    </p>
                  ) : null}
                  {entry.duration ? (
                    <span className="rounded-full border border-[#FFF8F0]/10 px-2 py-1 text-[10px] font-mono text-[#FFF8F0]/35">
                      {entry.duration}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-xl font-serif text-[#FFF8F0] mt-2 break-words">
                  {entry.categoryIcon} {entry.behavior}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] ${
                      entry.ratingTone === "positive"
                        ? "bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/25"
                        : entry.ratingTone === "negative"
                          ? "bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/25"
                          : "bg-[#FEC89A]/10 text-[#FEC89A] border border-[#FEC89A]/20"
                    }`}
                  >
                    {entry.rating} {entry.ratingLabel}
                  </span>
                  {entry.category ? (
                    <span className="rounded-full border border-[#FFF8F0]/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-[#FFF8F0]/35">
                      {entry.category.replaceAll("_", " ")}
                    </span>
                  ) : null}
                  {entry.emotionalState ? (
                    <span className="rounded-full border border-[#FFF8F0]/10 px-3 py-1 text-[10px] font-mono text-[#FFF8F0]/35">
                      {entry.emotionalState}
                    </span>
                  ) : null}
                  {entry.location ? (
                    <span className="rounded-full border border-[#FFF8F0]/10 px-3 py-1 text-[10px] font-mono text-[#FFF8F0]/35">
                      {entry.location}
                    </span>
                  ) : null}
                </div>
                {entry.ratingReason ? (
                  <p className="text-sm text-[#FFF8F0]/55 leading-relaxed mt-3">
                    {entry.ratingReason}
                  </p>
                ) : null}
              </div>

              <div className="flex gap-2 sm:flex-col sm:min-w-[96px]">
                <Button
                  variant="secondary"
                  className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/55 hover:bg-[#FFF8F0]/[0.04] hover:text-[#FFF8F0]"
                  disabled={isPending}
                  onClick={() => onEdit(entry)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="border-[#FF6B6B]/20 bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20"
                  disabled={isPending}
                  onClick={() => onDelete(entry.id)}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-[#FFF8F0]/[0.05] text-[11px] text-[#FFF8F0]/35">
              <span>{entry.wasAutomatic ? "Autopilot" : "Deliberate"}</span>
              {entry.energyLevel ? <span>Energy: {entry.energyLevel}</span> : null}
              {entry.identityLink ? (
                <span>Identity link: {entry.identityLink.alignment ?? "linked"}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
