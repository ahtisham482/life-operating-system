"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { BadHabit } from "@/lib/breaker";
import { getBadHabits, deleteBadHabit } from "./breaker-actions";
import { BreakerSetup } from "./breaker-setup";
import { UrgeTracker } from "./urge-tracker";
import { DefenseDashboard } from "./defense-dashboard";
import { BreakerInsights } from "./breaker-insights";

type Section = "battle" | "defense" | "insights";

export function BreakerTab() {
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

  useEffect(() => { loadHabits(); }, [loadHabits]);

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
      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto">
        <p className="text-[32px]">{"🚫"}</p>
        <h3 className="text-[20px] font-serif text-[#FFF8F0]">
          Ready to break a bad habit?
        </h3>
        <p className="text-[14px] text-[#FFF8F0]/50 leading-relaxed">
          The first step is understanding it. We will map your triggers, calculate the real cost,
          and build a 4-layer defense system.
        </p>
        <button
          onClick={() => setShowSetup(true)}
          className="px-5 py-2.5 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[14px] font-medium hover:bg-[#FF6B6B]/30 transition-all"
        >
          Break a Bad Habit
        </button>
      </div>
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
