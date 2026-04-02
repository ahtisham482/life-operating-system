"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { HabitContract, SavingsJar } from "@/lib/contracts";
import { getContracts, getJars } from "./contract-actions";
import { ContractSection } from "./contract-section";
import { SavingsSection } from "./savings-section";
import { ProjectionsSection } from "./projections-section";
import { MilestoneCardsSection } from "./milestone-cards-section";
import { PillSelector } from "./ui-kit";

type Section = "contracts" | "savings" | "projections" | "milestones";

export function RewardsTab({ initialData }: { initialData?: { contracts: any; jars: any } | null } = {}) {
  const [contracts, setContracts] = useState<HabitContract[]>([]);
  const [jars, setJars] = useState<SavingsJar[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("contracts");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    try {
      const [c, j] = await Promise.all([
        getContracts().catch(() => [] as HabitContract[]),
        getJars().catch(() => [] as SavingsJar[]),
      ]);
      setContracts(c);
      setJars(j);
    } catch {
      // Tables may not exist yet
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialData?.contracts != null) {
      setContracts(initialData.contracts);
      setJars(initialData.jars ?? []);
      setLoading(false);
      return;
    }
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <PillSelector
        options={sections}
        selected={activeSection}
        onSelect={setActiveSection}
        color="#2DD4BF"
      />

      <p className="text-[11px] font-mono text-[#FFF8F0]/30 mb-4">
        Set up accountability contracts, savings goals tied to habits, and track projected outcomes.
      </p>

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
