"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ScorecardDay } from "@/lib/db/schema";
import { getStatusLabel, type ScorecardLiveStats } from "@/lib/scorecard";

interface ScorecardHeaderProps {
  scorecard: ScorecardDay;
  dateLabel: string;
  liveStats: ScorecardLiveStats;
  isPending: boolean;
  onSaveMorningIntention: (value: string) => void;
}

export function ScorecardHeader({
  scorecard,
  dateLabel,
  liveStats,
  isPending,
  onSaveMorningIntention,
}: ScorecardHeaderProps) {
  const [intention, setIntention] = useState(scorecard.morningIntention ?? "");

  useEffect(() => {
    setIntention(scorecard.morningIntention ?? "");
  }, [scorecard.id, scorecard.morningIntention]);

  return (
    <div className="glass-card rounded-[28px] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#34D399]/70">
            Awareness Scorecard
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-light text-[#FFF8F0] mt-2">
            {dateLabel}
          </h2>
          <p className="text-sm text-[#FFF8F0]/45 mt-2 max-w-xl">
            Watch what happens, rate the vote honestly, and let the invisible become visible.
          </p>
        </div>
        <Badge
          variant={scorecard.status === "completed" ? "default" : "outline"}
          className={
            scorecard.status === "completed"
              ? "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/25"
              : "border-[#FFF8F0]/15 text-[#FFF8F0]/65"
          }
        >
          {getStatusLabel(scorecard.status)}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Entries", value: liveStats.totalEntries, tone: "text-[#FFF8F0]" },
          { label: "Positive", value: liveStats.positive, tone: "text-[#34D399]" },
          { label: "Negative", value: liveStats.negative, tone: "text-[#FF6B6B]" },
          {
            label: "Day Score",
            value: liveStats.currentDayScore > 0 ? `+${liveStats.currentDayScore}` : liveStats.currentDayScore,
            tone:
              liveStats.dayScoreTone === "positive"
                ? "text-[#34D399]"
                : liveStats.dayScoreTone === "negative"
                  ? "text-[#FF6B6B]"
                  : "text-[#FEC89A]",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[22px] border border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.03] px-4 py-4"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#FFF8F0]/35">
              {stat.label}
            </p>
            <p className={`stat-number text-3xl font-serif font-light mt-2 ${stat.tone}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-[22px] border border-[#FFF8F0]/[0.06] bg-[#0D0D1A]/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FEC89A]/70">
              Morning Intention
            </p>
            <p className="text-[12px] text-[#FFF8F0]/40 mt-1">
              Optional, but useful when you want to watch a specific pattern today.
            </p>
          </div>
          <Button
            variant="secondary"
            className="border-[#FEC89A]/20 bg-[#FEC89A]/10 text-[#FEC89A] hover:bg-[#FEC89A]/20"
            disabled={isPending}
            onClick={() => onSaveMorningIntention(intention)}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
        <Textarea
          value={intention}
          onChange={(event) => setIntention(event.target.value)}
          className="border-[#FFF8F0]/10 bg-[#FFF8F0]/[0.03] text-[#FFF8F0]/85 placeholder:text-[#FFF8F0]/20"
          placeholder="Today I want to notice what triggers my phone use after each task."
        />
      </div>
    </div>
  );
}
