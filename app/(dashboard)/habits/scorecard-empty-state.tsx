"use client";

import { Button } from "@/components/ui/button";

interface ScorecardEmptyStateProps {
  isPending: boolean;
  onStart: () => void;
}

export function ScorecardEmptyState({
  isPending,
  onStart,
}: ScorecardEmptyStateProps) {
  return (
    <div className="glass-card rounded-[28px] p-8 text-center space-y-4 animate-slide-up">
      <p className="text-4xl">📋</p>
      <h2 className="text-3xl font-serif italic text-[#FFF8F0]">
        Start today&apos;s scorecard
      </h2>
      <p className="text-sm text-[#FFF8F0]/45 max-w-xl mx-auto leading-relaxed">
        Log what happened, rate the vote, and let the day become visible instead of vague.
      </p>
      <Button
        className="bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30"
        disabled={isPending}
        onClick={onStart}
      >
        {isPending ? "Starting..." : "Start today"}
      </Button>
    </div>
  );
}
