"use client";

import { Button } from "@/components/ui/button";
import { ScorecardHeader } from "./scorecard-header";
import type { ScorecardDay } from "@/lib/db/schema";
import type {
  ScorecardLiveStats,
  ScorecardOnboardingState,
  ScorecardTimeBreakdown,
} from "@/lib/scorecard";

interface ScorecardSidePanelProps {
  scorecard: ScorecardDay;
  dateLabel: string;
  liveStats: ScorecardLiveStats;
  timeBreakdown: ScorecardTimeBreakdown;
  onboardingState: ScorecardOnboardingState;
  isPending: boolean;
  onSaveMorningIntention: (value: string | null | undefined) => void;
  onOpenBulkComposer: () => void;
  onOpenCompletePanel: () => void;
  onJumpToToday: () => void;
}

export function ScorecardSidePanel({
  scorecard,
  dateLabel,
  liveStats,
  timeBreakdown,
  onboardingState,
  isPending,
  onSaveMorningIntention,
  onOpenBulkComposer,
  onOpenCompletePanel,
  onJumpToToday,
}: ScorecardSidePanelProps) {
  const showJumpToToday =
    scorecard.scorecardDate !== onboardingState.starterDate ||
    !onboardingState.needsOnboarding;

  return (
    <div className="space-y-6 lg:col-span-2">
      <ScorecardHeader
        scorecard={scorecard}
        dateLabel={dateLabel}
        liveStats={liveStats}
        isPending={isPending}
        onSaveMorningIntention={onSaveMorningIntention}
      />

      <div className="glass-card rounded-[28px] p-6 space-y-5">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#34D399]/70">
            Time Breakdown
          </p>
          <p className="text-[12px] text-[#FFF8F0]/35 mt-2">
            {timeBreakdown.totalTrackedMinutes > 0
              ? `${timeBreakdown.totalTrackedMinutes} tracked minutes`
              : "Add durations to reveal time-heavy patterns."}
          </p>
        </div>

        <div className="space-y-3">
          {timeBreakdown.byCategory.length > 0 ? (
            timeBreakdown.byCategory.slice(0, 6).map((item) => (
              <div
                key={item.category}
                className="rounded-[18px] border border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.03] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#FFF8F0]/75">
                    {item.icon} {item.category.replaceAll("_", " ")}
                  </p>
                  <span className="text-[11px] font-mono text-[#FEC89A]">
                    {item.formattedTime}
                  </span>
                </div>
                <p className="text-[11px] text-[#FFF8F0]/35 mt-2">
                  {item.count} votes • dominant rating {item.dominantRating}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#FFF8F0]/35">
              No category data yet. Add entries or durations to start surfacing patterns.
            </p>
          )}
        </div>
      </div>

      <div className="glass-card rounded-[28px] p-6 space-y-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FEC89A]/70">
          Next Step
        </p>
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/70 hover:bg-[#FFF8F0]/[0.04]"
            disabled={isPending}
            onClick={onOpenBulkComposer}
          >
            Map a stretch of the day
          </Button>
          <Button
            className="bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 hover:bg-[#34D399]/30"
            disabled={isPending}
            onClick={onOpenCompletePanel}
          >
            {scorecard.status === "completed" ? "Update completion" : "Complete scorecard"}
          </Button>
          {showJumpToToday ? (
            <Button
              variant="secondary"
              className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/70 hover:bg-[#FFF8F0]/[0.04]"
              disabled={isPending}
              onClick={onJumpToToday}
            >
              Jump to today
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
