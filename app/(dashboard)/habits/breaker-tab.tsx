"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { BadHabit } from "@/lib/breaker";
import { getBadHabits, deleteBadHabit } from "./breaker-actions";
import { BreakerSetup } from "./breaker-setup";
import { UrgeTracker } from "./urge-tracker";
import { DefenseDashboard } from "./defense-dashboard";
import { BreakerInsights } from "./breaker-insights";
import { EmptyState } from "./empty-state";
import { PillSelector } from "./ui-kit";

type Section = "battle" | "defense" | "insights";

export function BreakerTab({ initialData }: { initialData?: { badHabits: any } | null } = {}) {
  const [badHabits, setBadHabits] = useState<BadHabit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("battle");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const loadHabits = useCallback(() => {
    startTransition(async () => {
      const habits = await getBadHabits();
      setBadHabits(habits);
      if (habits.length > 0 && !selectedId) {
        setSelectedId(habits[0].id);
      }
      setLoading(false);
    });
  }, [selectedId]);

  useEffect(() => {
    if (initialData?.badHabits != null) {
      const habits = initialData.badHabits as BadHabit[];
      setBadHabits(habits);
      if (habits.length > 0 && !selectedId) {
        setSelectedId(habits[0].id);
      }
      setLoading(false);
      return;
    }
    loadHabits();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedHabit = badHabits.find((h) => h.id === selectedId) || null;

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBadHabit(id);
      setSelectedId(null);
      loadHabits();
    });
  }

  const sectionPills: { key: Section; label: string }[] = [
    { key: "battle", label: "Battle" },
    { key: "defense", label: "Defense" },
    { key: "insights", label: "Insights" },
  ];

  const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  // Onboarding
  if (badHabits.length === 0 && !showSetup) {
    return (
      <EmptyState
        icon="🛡️"
        title="Break free from bad habits"
        description="Diagnose your triggers, build a 4-layer defense plan, track every urge, and watch the old neural pathway weaken over time. No shame — just science."
        principle="You don't eliminate a bad habit. You replace it."
        actionLabel="Start breaking a habit"
        onAction={() => setShowSetup(true)}
      />
    );
  }

  if (showSetup) {
    return (
      <div className="max-w-2xl mx-auto">
        <BreakerSetup
          onCreated={() => {
            setShowSetup(false);
            loadHabits();
          }}
          onClose={() => setShowSetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Habit selector + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {badHabits.length > 1 && (
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-2 text-[14px] focus:outline-none"
          >
            {badHabits.map((h) => (
              <option key={h.id} value={h.id} className="bg-[#1a1a1a]">
                {h.habitName}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => setShowSetup(true)}
          className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[12px] font-medium hover:bg-[#FF6B6B]/30 transition-all"
        >
          + Break New Habit
        </button>
        {selectedHabit && (
          <button
            onClick={() => handleDelete(selectedHabit.id)}
            disabled={pending}
            className="px-3 py-2 text-[12px] text-[#FFF8F0]/30 hover:text-[#FF6B6B] transition-colors disabled:opacity-30"
          >
            Remove
          </button>
        )}
      </div>

      {/* Section pills */}
      <PillSelector
        options={sectionPills}
        selected={activeSection}
        onSelect={setActiveSection}
        color="#2DD4BF"
      />

      <p className="text-[11px] font-mono text-[#FFF8F0]/30 mb-4">
        Track urges, build defense layers, and analyze patterns to break unwanted habits.
      </p>

      {/* Content */}
      {selectedHabit && (
        <div>
          {activeSection === "battle" && (
            <UrgeTracker habit={selectedHabit} onRefresh={loadHabits} />
          )}
          {activeSection === "defense" && (
            <DefenseDashboard habit={selectedHabit} onRefresh={loadHabits} />
          )}
          {activeSection === "insights" && (
            <BreakerInsights habit={selectedHabit} />
          )}
        </div>
      )}
    </div>
  );
}
