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

interface ArchitectTabProps {
  identities: { id: string; identityStatement: string }[];
}

type Section = "blueprints" | "chains" | "environments" | "execute" | "insights" | "prep";

export function ArchitectTab({ identities }: ArchitectTabProps) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [chains, setChains] = useState<HabitChain[]>([]);
  const [setups, setSetups] = useState<EnvironmentSetup[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("blueprints");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [bp, ch, env] = await Promise.all([
      getBlueprints(),
      getChains(),
      getEnvironmentSetups(),
    ]);
    setBlueprints(bp);
    setChains(ch);
    setSetups(env);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <div className="flex gap-1 p-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all ${
                activeSection === s.key
                  ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                  : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 border border-transparent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors"
        >
          + New Blueprint
        </button>
      </div>

      {/* Onboarding */}
      {hasNoBlueprints && activeSection === "blueprints" && (
        <EmptyState
          icon="🏗️"
          title="Design your habit system"
          description="Create a complete blueprint for each habit — when you'll do it, what triggers it, and how your environment supports it. This is where vague intentions become specific plans."
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
