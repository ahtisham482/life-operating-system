"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { HabitContract, SavingsJar } from "@/lib/contracts";
import { getContracts, getJars } from "./contract-actions";
import { ContractSection } from "./contract-section";
import { SavingsSection } from "./savings-section";
import { ProjectionsSection } from "./projections-section";
import { MilestoneCardsSection } from "./milestone-cards-section";

type Section = "contracts" | "savings" | "projections" | "milestones";

export function RewardsTab() {
  const [contracts, setContracts] = useState<HabitContract[]>([]);
  const [jars, setJars] = useState<SavingsJar[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("contracts");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    const [c, j] = await Promise.all([getContracts(), getJars()]);
    setContracts(c);
    setJars(j);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleRefresh() {
    startTransition(() => { loadData(); });
  }

  const sections: { key: Section; label: string }[] = [
    { key: "contracts", label: "Contracts" },
    { key: "savings", label: "Savings" },
    { key: "projections", label: "Projections" },
    { key: "milestones", label: "Milestones" },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-[#FFF8F0]/[0.03] rounded-2xl w-80" />
        <div className="h-32 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-48 bg-[#FFF8F0]/[0.03] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section pills */}
      <div className="flex gap-1 p-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl w-fit">
        {sections.map((s) => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all ${
              activeSection === s.key
                ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 border border-transparent"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Active section */}
      {activeSection === "contracts" && (
        <ContractSection contracts={contracts} onRefresh={handleRefresh} />
      )}
      {activeSection === "savings" && (
        <SavingsSection jars={jars} onRefresh={handleRefresh} />
      )}
      {activeSection === "projections" && <ProjectionsSection />}
      {activeSection === "milestones" && <MilestoneCardsSection />}
    </div>
  );
}
