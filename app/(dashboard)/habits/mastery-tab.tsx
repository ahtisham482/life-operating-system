"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { HabitMastery } from "@/lib/mastery";
import { MASTERY_LEVEL_ICONS } from "@/lib/mastery";
import { getMasteryHabits } from "./mastery-actions";
import { GoldilocksSection } from "./goldilocks-section";
import { PhaseDashboard } from "./phase-dashboard";
import { ReviewSection } from "./review-section";
import { ChallengeSection } from "./challenge-section";
import { EmptyState } from "./empty-state";
import { PillSelector } from "./ui-kit";

type Section = "goldilocks" | "phases" | "reviews" | "challenges";

const sectionPills: { key: Section; label: string }[] = [
  { key: "goldilocks", label: "Goldilocks" },
  { key: "phases", label: "Phases" },
  { key: "reviews", label: "Reviews" },
  { key: "challenges", label: "Challenges" },
];

export function MasteryTab({ initialData }: { initialData?: { masteryHabits: any } | null } = {}) {
  const [habits, setHabits] = useState<HabitMastery[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("goldilocks");
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const loadHabits = useCallback(() => {
    start(async () => {
      try {
        const data = await getMasteryHabits().catch(() => [] as HabitMastery[]);
        setHabits(data);
      } catch {
        // Tables may not exist yet
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (initialData?.masteryHabits != null) {
      setHabits(initialData.masteryHabits as HabitMastery[]);
      setLoading(false);
      return;
    }
    loadHabits();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Empty state */}
      {habits.length === 0 && (
        <EmptyState
          icon="🎯"
          title="Master your habits over time"
          description="Track measurable progress, stay in the flow zone with auto-difficulty adjustment, and get deliberate practice challenges that prevent autopilot boredom."
          principle="The greatest threat to success is not failure — it's boredom."
        />
      )}

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

      <p className="text-[11px] font-mono text-[#FFF8F0]/30 mb-4">
        Track difficulty, advance through phases, reflect on progress, and take on challenges to prevent autopilot.
      </p>

      {/* Section pills */}
      <PillSelector
        options={sectionPills}
        selected={activeSection}
        onSelect={setActiveSection}
        color="#A78BFA"
      />

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
