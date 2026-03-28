"use client";

import { useState, useEffect, useCallback } from "react";
import type { Blueprint, HabitChain, EnvironmentSetup } from "@/lib/architect";
import { getBlueprints, getChains, getEnvironmentSetups } from "./architect-actions";
import { BlueprintWizard } from "./blueprint-wizard";
import { BlueprintCard } from "./blueprint-card";
import { ChainBuilder } from "./chain-builder";
import { EnvironmentDesigner } from "./environment-designer";

interface ArchitectTabProps {
  identities: { id: string; identityStatement: string }[];
}

type Section = "blueprints" | "chains" | "environments";

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
        <div className="text-center py-16 space-y-4">
          <p className="text-4xl">🏗️</p>
          <h3 className="text-base font-serif text-[#FFF8F0]/80">
            Welcome to the Habit Architect
          </h3>
          <p className="text-[12px] text-[#FFF8F0]/40 font-mono max-w-sm mx-auto leading-relaxed">
            Build habits that stick using three science-backed pillars:
          </p>
          <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
            <div className="flex items-center gap-2 text-[11px] text-[#FFF8F0]/50 font-mono">
              <span>🎯</span>
              <span>Implementation Intentions &mdash; when, where, what</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#FFF8F0]/50 font-mono">
              <span>⛓️</span>
              <span>Habit Stacking &mdash; chain to existing habits</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#FFF8F0]/50 font-mono">
              <span>🏠</span>
              <span>Environment Design &mdash; shape your space</span>
            </div>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-4 px-6 py-3 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[12px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors"
          >
            Create Your First Blueprint
          </button>
        </div>
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
