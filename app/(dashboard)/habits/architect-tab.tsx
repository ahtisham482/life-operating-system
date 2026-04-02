"use client";

import { useState, useEffect, useCallback } from "react";
import type { Blueprint, HabitChain, EnvironmentSetup } from "@/lib/architect";
import { getBlueprints, getChains, getEnvironmentSetups } from "./architect-actions";
import { BlueprintWizard } from "./blueprint-wizard";
import { BlueprintCard } from "./blueprint-card";
import { ChainBuilder } from "./chain-builder";
import { EnvironmentDesigner } from "./environment-designer";
import { ExecutionLogger } from "./execution-logger";
import { ArchitectInsights } from "./architect-insights";
import { EveningPrepLogger } from "./evening-prep-logger";
import { EmptyState } from "./empty-state";
import { PillSelector } from "./ui-kit";

interface ArchitectTabProps {
  identities: { id: string; identityStatement: string }[];
  initialData?: { blueprints: Blueprint[]; chains: HabitChain[]; environments: EnvironmentSetup[] } | null;
}

type Section = "blueprints" | "chains" | "environments" | "execute" | "insights" | "prep";

export function ArchitectTab({ identities, initialData }: ArchitectTabProps) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [chains, setChains] = useState<HabitChain[]>([]);
  const [setups, setSetups] = useState<EnvironmentSetup[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("blueprints");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [bp, ch, env] = await Promise.all([
        getBlueprints().catch(() => [] as Blueprint[]),
        getChains().catch(() => [] as HabitChain[]),
        getEnvironmentSetups().catch(() => [] as EnvironmentSetup[]),
      ]);
      setBlueprints(bp);
      setChains(ch);
      setSetups(env);
    } catch {
      // Tables may not exist yet
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialData?.blueprints != null) {
      setBlueprints(initialData.blueprints);
      setChains(initialData.chains ?? []);
      setSetups(initialData.environments ?? []);
      setLoading(false);
      return;
    }
    loadData();
  }, [loadData]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections: { key: Section; label: string }[] = [
    { key: "blueprints", label: "Blueprints" },
    { key: "chains", label: "Chains" },
    { key: "environments", label: "Environments" },
    { key: "execute", label: "Execute" },
    { key: "insights", label: "Insights" },
    { key: "prep", label: "Prep" },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-32 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-48 bg-[#FFF8F0]/[0.03] rounded-2xl" />
      </div>
    );
  }

  const hasNoBlueprints = blueprints.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PillSelector
          options={sections}
          selected={activeSection}
          onSelect={setActiveSection}
          color="#2DD4BF"
        />

        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors"
        >
          + New Blueprint
        </button>
      </div>

      <p className="text-[11px] font-mono text-[#FFF8F0]/30 mb-4">
        Design the complete system for each habit — what triggers it, where you do it, and how to start in 2 minutes.
      </p>

      {/* Onboarding */}
      {hasNoBlueprints && activeSection === "blueprints" && (
        <EmptyState
          icon="🏗️"
          title="Design your habit blueprint"
          description="Turn vague intentions into specific plans — define WHEN, WHERE, and HOW you'll do each habit."
          principle="People who specify WHEN and WHERE are 2-3x more likely to follow through."
          actionLabel="Create first blueprint"
          onAction={() => setShowWizard(true)}
        />
      )}

      {/* Blueprints section */}
      {activeSection === "blueprints" && !hasNoBlueprints && (
        <div className="grid gap-4 sm:grid-cols-2">
          {blueprints.map((bp) => (
            <BlueprintCard
              key={bp.id}
              blueprint={bp}
              onDelete={() => loadData()}
            />
          ))}
        </div>
      )}

      {/* Chains section */}
      {activeSection === "chains" && (
        <ChainBuilder chains={chains} blueprints={blueprints} onRefresh={loadData} />
      )}

      {/* Environments section */}
      {activeSection === "environments" && (
        <EnvironmentDesigner setups={setups} blueprints={blueprints} onRefresh={loadData} />
      )}

      {/* Execute section */}
      {activeSection === "execute" && <ExecutionLogger />}

      {/* Insights section */}
      {activeSection === "insights" && <ArchitectInsights />}

      {/* Prep section */}
      {activeSection === "prep" && <EveningPrepLogger />}

      {/* Wizard modal */}
      {showWizard && (
        <BlueprintWizard
          onCreated={loadData}
          onClose={() => setShowWizard(false)}
          existingBlueprints={blueprints}
          identities={identities}
        />
      )}
    </div>
  );
}
