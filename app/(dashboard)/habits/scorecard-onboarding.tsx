"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SCORECARD_ONBOARDING_STEPS } from "./scorecard-content";

interface ScorecardOnboardingProps {
  starterDateLabel: string;
  isPending: boolean;
  onStart: () => void;
}

export function ScorecardOnboarding({
  starterDateLabel,
  isPending,
  onStart,
}: ScorecardOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = SCORECARD_ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === SCORECARD_ONBOARDING_STEPS.length - 1;

  return (
    <div className="glass-card rounded-[28px] p-6 sm:p-8 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#FEC89A]/75">
            Awareness Scorecard
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-light text-[#FFF8F0] mt-2">
            Observe before you optimize
          </h2>
          <p className="text-sm text-[#FFF8F0]/45 mt-2 max-w-2xl leading-relaxed">
            Your first guided map will cover <span className="text-[#FFF8F0]/75">{starterDateLabel}</span>.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {SCORECARD_ONBOARDING_STEPS.map((item, index) => (
            <div
              key={item.step}
              className={`h-2 rounded-full transition-all ${
                index === stepIndex ? "w-10 bg-[#FF6B6B]" : "w-2 bg-[#FFF8F0]/15"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[24px] border border-[#FFF8F0]/[0.08] bg-[#FFF8F0]/[0.03] p-6">
          <p className="text-4xl">{step.icon}</p>
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#FFF8F0]/35 mt-4">
            Step {step.step}
          </p>
          <h3 className="text-2xl font-serif italic text-[#FFF8F0] mt-2">
            {step.title}
          </h3>
          <p className="text-sm text-[#FFF8F0]/55 leading-relaxed mt-4 max-w-xl">
            {step.description}
          </p>
        </div>

        <div className="rounded-[24px] border border-[#FFF8F0]/[0.08] bg-[#0D0D1A]/70 p-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#34D399]/70">
            Awareness Ladder
          </p>
          <div className="space-y-4 mt-5">
            {[
              "Unconscious incompetence",
              "Conscious incompetence",
              "Conscious competence",
              "Unconscious competence",
            ].map((label, index) => (
              <div
                key={label}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  index === 1
                    ? "border-[#FF6B6B]/30 bg-[#FF6B6B]/10 text-[#FFF8F0]"
                    : "border-[#FFF8F0]/[0.06] bg-[#FFF8F0]/[0.02] text-[#FFF8F0]/45"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#FFF8F0]/35 leading-relaxed mt-5">
            The scorecard’s job is to move invisible patterns into conscious awareness. That alone starts the change.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="secondary"
          className="border-[#FFF8F0]/10 bg-transparent text-[#FFF8F0]/60 hover:bg-[#FFF8F0]/[0.04] hover:text-[#FFF8F0]"
          disabled={stepIndex === 0 || isPending}
          onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
        >
          Back
        </Button>
        <Button
          className="bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30"
          disabled={isPending}
          onClick={() => {
            if (isLast) {
              onStart();
              return;
            }
            setStepIndex((value) => Math.min(value + 1, SCORECARD_ONBOARDING_STEPS.length - 1));
          }}
        >
          {isPending && isLast ? "Starting..." : step.actionLabel}
        </Button>
      </div>
    </div>
  );
}
