"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { HabitMastery } from "@/lib/mastery";
import { MASTERY_LEVEL_ICONS } from "@/lib/mastery";
import { getMasteryHabits } from "./mastery-actions";
import { GoldilocksSection } from "./goldilocks-section";
import { PhaseDashboard } from "./phase-dashboard";
import { ReviewSection } from "./review-section";
import { ChallengeSection } from "./challenge-section";

type Section = "goldilocks" | "phases" | "reviews" | "challenges";

const sectionPills: { key: Section; label: string }[] = [
  { key: "goldilocks", label: "Goldilocks" },
  { key: "phases", label: "Phases" },
  { key: "reviews", label: "Reviews" },
  { key: "challenges", label: "Challenges" },
];

export function MasteryTab() {
  const [habits, setHabits] = useState<HabitMastery[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("goldilocks");
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const loadHabits = useCallback(() => {
    start(async () => {
      const data = await getMasteryHabits();
      setHabits(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadHabits(); }, [loadHabits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  // Overall mastery stats
  const avgScore = habits.length > 0
    ? Math.round(habits.reduce((s, h) => s + h.masteryScore, 0) / habits.length)
    : 0;
  const level = avgScore >= 90 ? "Master" : avgScore >= 75 ? "Expert" : avgScore >= 50 ? "Skilled" : avgScore >= 25 ? "Practitioner" : "Beginner";
  const levelIcon = MASTERY_LEVEL_ICONS[level] || "🌱";

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Overall stats */}
      {habits.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[24px]">{levelIcon}</span>
            <div>
              <p className="text-[18px] font-serif text-[#FFF8F0]">{level}</p>
              <p className="text-[11px] text-[#FFF8F0]/40">
                Avg mastery: {avgScore}/100 across {habits.length} habit{habits.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section pills */}
      <div className="flex gap-1 p-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl w-fit">
        {sectionPills.map((pill) => (
          <button
            key={pill.key}
            onClick={() => setActiveSection(pill.key)}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all ${
              activeSection === pill.key
                ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60"
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSection === "goldilocks" && (
        <GoldilocksSection habits={habits} onRefresh={loadHabits} />
      )}
      {activeSection === "phases" && (
        <PhaseDashboard habits={habits} onRefresh={loadHabits} />
      )}
      {activeSection === "reviews" && <ReviewSection />}
      {activeSection === "challenges" && (
        <ChallengeSection habits={habits} onRefresh={loadHabits} />
      )}
    </div>
  );
}
