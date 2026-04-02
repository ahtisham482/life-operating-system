"use client";

import { useState, useEffect, useTransition } from "react";
import { getOnboardingProgress, skipOnboarding } from "./guide-actions";
import { OnboardingWizard } from "./onboarding-wizard";
import { CompoundVisualizer } from "./compound-visualizer";
import { QuickReference } from "./quick-reference";
import { GuardianDashboard } from "./guardian-dashboard";
import { PillSelector } from "./ui-kit";

type Section = "compound" | "reference" | "guardian";

export function GuideTab({ initialData }: { initialData?: { onboarding: any } | null } = {}) {
  const [showWizard, setShowWizard] = useState(false);
  const [section, setSection] = useState<Section>("compound");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialData?.onboarding != null) {
      const progress = initialData.onboarding;
      if (!progress || !progress.completed) {
        setShowWizard(true);
      }
      setLoading(false);
      return;
    }
    startTransition(async () => {
      const progress = await getOnboardingProgress();
      if (!progress || !progress.completed) {
        setShowWizard(true);
      }
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleComplete() {
    setShowWizard(false);
  }

  function handleRestart() {
    setShowWizard(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  if (showWizard) {
    return <OnboardingWizard onComplete={handleComplete} />;
  }

  const sections: { key: Section; label: string }[] = [
    { key: "compound", label: "Growth Visualizer" },
    { key: "reference", label: "Quick Reference" },
    { key: "guardian", label: "Habit Health Check" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-[11px] font-mono text-[#FFF8F0]/30 mb-4">
        Learn habit science, check your system&apos;s health, and see how small improvements compound over time.
      </p>

      {/* Section pills */}
      <div className="flex items-center gap-2">
        <PillSelector
          options={sections}
          selected={section}
          onSelect={setSection}
          color="#A78BFA"
        />
        <button
          onClick={handleRestart}
          className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all text-[#FFF8F0]/30 hover:text-[#FEC89A]/60"
        >
          Restart Onboarding
        </button>
      </div>

      {/* Content */}
      {section === "compound" && <CompoundVisualizer />}
      {section === "reference" && <QuickReference />}
      {section === "guardian" && <GuardianDashboard />}
    </div>
  );
}
