"use client";

import { useState } from "react";
import { Link2, BookOpen } from "lucide-react";
import { ConfidenceRing } from "./confidence-ring";
import { VoteStrip } from "./vote-strip";
import type { MilestoneDef } from "@/lib/identity";

interface IdentityCardHabit {
  id: string;
  name: string;
  emoji: string | null;
  tinyVersion: string | null;
  isCompletedToday: boolean;
}

interface IdentityCardProps {
  id: string;
  identityStatement: string;
  icon: string | null;
  color: string;
  whyStatement: string | null;
  confidenceLevel: number;
  habits: IdentityCardHabit[];
  onLinkHabits: () => void;
  onReflect: () => void;
  onMilestone: (m: MilestoneDef) => void;
}

export function IdentityCard({
  id,
  identityStatement,
  icon,
  color,
  whyStatement,
  confidenceLevel,
  habits,
  onLinkHabits,
  onReflect,
  onMilestone,
}: IdentityCardProps) {
  const [confidence, setConfidence] = useState(confidenceLevel);

  function handleVoteCast(result: {
    newConfidence: number;
    milestone: MilestoneDef | null;
  }) {
    setConfidence(result.newConfidence);
    if (result.milestone) {
      onMilestone(result.milestone);
    }
  }

  return (
    <div className="glass-card rounded-3xl p-5 space-y-4 hover:border-[#FFF8F0]/[0.08] transition-all">
      {/* Header row */}
      <div className="flex items-start gap-4">
        {/* Confidence ring */}
        <div className="flex-shrink-0">
          <ConfidenceRing score={confidence} color={color} size={76} />
        </div>

        {/* Identity statement + why */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <span className="text-lg leading-none">{icon}</span>}
            <h3 className="text-sm font-serif italic text-[#FFF8F0]/90 leading-snug">
              {identityStatement}
            </h3>
          </div>
          {whyStatement && (
            <p className="text-[10px] font-mono text-[#FFF8F0]/30 leading-relaxed line-clamp-2">
              {whyStatement}
            </p>
          )}
        </div>
      </div>

      {/* Vote strip */}
      <VoteStrip identityId={id} habits={habits} onVoteCast={handleVoteCast} />

      {/* Action row */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#FFF8F0]/[0.05]">
        <button
          onClick={onLinkHabits}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.15em] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 border border-[#FFF8F0]/[0.06] hover:border-[#FFF8F0]/[0.15] rounded-xl transition-colors"
        >
          <Link2 size={10} />
          Link habits
        </button>
        <button
          onClick={onReflect}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.15em] text-[#FEC89A]/40 hover:text-[#FEC89A]/70 border border-dashed border-[#FEC89A]/[0.1] hover:border-[#FEC89A]/[0.25] rounded-xl transition-colors"
        >
          <BookOpen size={10} />
          Reflect
        </button>
      </div>
    </div>
  );
}
