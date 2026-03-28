"use client";

import { useState, useEffect, useTransition } from "react";
import { getOnboardingProgress, skipOnboarding } from "./guide-actions";
import { OnboardingWizard } from "./onboarding-wizard";
import { CompoundVisualizer } from "./compound-visualizer";
import { QuickReference } from "./quick-reference";
import { GuardianDashboard } from "./guardian-dashboard";

type Section = "compound" | "reference" | "guardian";

export function GuideTab() {
  const [showWizard, setShowWizard] = useState(false);
  const [section, setSection] = useState<Section>("compound");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
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

  const sections: { key: Section | "restart"; label: string }[] = [
    { key: "compound", label: "Compound" },
    { key: "reference", label: "Reference" },
    { key: "guardian", label: "Guardian" },
    { key: "restart", label: "Restart Onboarding" },
  ];

  return (
    <div className="space-y-6">
      {/* Section pills */}
      <div className="flex gap-1 p-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl w-fit">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              if (s.key === "restart") handleRestart();
              else setSection(s.key);
            }}
            className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all ${
              s.key !== "restart" && section === s.key
                ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                : s.key === "restart"
                  ? "text-[#FFF8F0]/30 hover:text-[#FEC89A]/60"
                  : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === "compound" && <CompoundVisualizer />}
      {section === "reference" && <QuickReference />}
      {section === "guardian" && <GuardianDashboard />}
    </div>
  );
}
