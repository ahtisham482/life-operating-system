"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { MilestoneCard } from "@/lib/contracts";
import { MILESTONE_TIERS } from "@/lib/contracts";
import { getMilestoneCards } from "./contract-actions";
import { EmptyState } from "./empty-state";

export function MilestoneCardsSection() {
  const [cards, setCards] = useState<MilestoneCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    const data = await getMilestoneCards();
    setCards(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    startTransition(() => { loadData(); });
  }, [loadData]);

  // Which tiers are unlocked based on cards
  const unlockedTiers = new Set(cards.map((c) => c.tier));

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-48 bg-[#FFF8F0]/[0.03] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tier Progression Ladder */}
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5">
        <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-3">
          Milestone Tiers
        </p>
        <div className="flex gap-2 flex-wrap">
          {MILESTONE_TIERS.map((tier) => {
            const unlocked = unlockedTiers.has(tier.tier);
            return (
              <div key={tier.tier}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono transition-all ${
                  unlocked
                    ? "border-opacity-40"
                    : "opacity-35 border-[#FFF8F0]/[0.06]"
                }`}
                style={unlocked ? {
                  color: tier.color,
                  borderColor: `${tier.color}40`,
                  backgroundColor: `${tier.color}12`,
                } : {}}
              >
                <span className="text-[14px]">{tier.icon}</span>
                <span className={unlocked ? "" : "text-[#FFF8F0]/40"}>
                  {tier.tier}
                </span>
                <span className={`text-[10px] ${unlocked ? "opacity-60" : "text-[#FFF8F0]/30"}`}>
                  {tier.days}d
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <EmptyState
          icon="🏆"
          title="Earn shareable achievement cards"
          description="Complete 7+ day streaks on any habit to unlock milestone cards you can save or share. Six tiers from Bronze to Crown."
          principle="What is immediately celebrated is repeated."
          compact
        />
      )}

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card, i) => (
          <AchievementCard key={`${card.habitName}-${i}`} card={card} />
        ))}
      </div>
    </div>
  );
}

function AchievementCard({ card }: { card: MilestoneCard }) {
  return (
    <div className="relative overflow-hidden rounded-2xl"
      style={{ border: `2px solid ${card.tierColor}30` }}>
      {/* Background glow */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ background: `radial-gradient(ellipse at top, ${card.tierColor}, transparent 70%)` }} />

      <div className="relative bg-[#FFF8F0]/[0.02] p-6 space-y-4">
        {/* Tier badge */}
        <div className="text-center space-y-1">
          <span className="text-[32px]">{card.tierIcon}</span>
          <p className="text-[14px] font-mono uppercase tracking-[0.3em]"
            style={{ color: card.tierColor }}>
            {card.tier}
          </p>
        </div>

        {/* Habit name */}
        <p className="text-center text-[16px] text-[#FFF8F0]/90 font-medium">
          {card.habitName}
        </p>

        {/* Streak - large number */}
        <div className="text-center">
          <p className="text-[40px] font-light leading-none"
            style={{ color: card.tierColor }}>
            {card.streakDays}
          </p>
          <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mt-1">
            consecutive days
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-6 text-center">
          <div>
            <p className="text-[14px] text-[#FFF8F0]/70 font-medium">{card.completionRate}%</p>
            <p className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">rate</p>
          </div>
          <div>
            <p className="text-[13px] text-[#FFF8F0]/70 font-medium">{card.cumulativeImpact}</p>
            <p className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">impact</p>
          </div>
        </div>

        {/* Identity statement */}
        {card.identityStatement && (
          <p className="text-center text-[12px] italic text-[#FEC89A]/70 px-4">
            &ldquo;{card.identityStatement}&rdquo;
          </p>
        )}

        {/* Quote */}
        <div className="border-t border-[#FFF8F0]/[0.06] pt-3 text-center">
          <p className="text-[11px] italic text-[#FFF8F0]/40 leading-relaxed">
            &ldquo;{card.quote}&rdquo;
          </p>
          <p className="text-[10px] font-mono text-[#FFF8F0]/30 mt-1">
            — {card.quoteAuthor}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] font-mono text-[#FFF8F0]/25 uppercase tracking-wider">
            {card.dateAchieved}
          </p>
          <p className="text-[10px] font-mono text-[#FFF8F0]/25 uppercase tracking-wider">
            Tracked with Life OS
          </p>
        </div>
      </div>
    </div>
  );
}
