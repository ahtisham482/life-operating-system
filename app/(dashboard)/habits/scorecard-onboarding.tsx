"use client";

import { useState, useTransition } from "react";
import { FIRST_SCORECARD_TEMPLATE, type ScorecardRating } from "@/lib/scorecard";
import { startOrGetScorecard, bulkAddScorecardEntries } from "./scorecard-actions";

interface ScorecardOnboardingProps {
  date: string;
  onComplete: () => void;
}

export function ScorecardOnboarding({
  date,
  onComplete,
}: ScorecardOnboardingProps) {
  const [step, setStep] = useState(0);
  const [intention, setIntention] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<
    { time: string; name: string; rating: ScorecardRating }[]
  >([]);
  const [isPending, startTransition] = useTransition();

  const screens = [
    {
      title: "You Can't Change What You Can't See",
      icon: "🔍",
      description:
        "Right now, most of your daily behaviors happen on AUTOPILOT. You don't even notice them. The Habits Scorecard makes the invisible visible.",
      button: "I want to see clearly",
    },
    {
      title: "This Is NOT About Judgment",
      icon: "🧘",
      description:
        "You're a scientist observing data about yourself. There's no guilt here. \"I scrolled for 40 minutes\" is data, not failure. The act of NOTICING is what creates change.",
      button: "I'll observe without judgment",
    },
    {
      title: "How It Works",
      icon: "📋",
      description:
        "1. Write down everything you do from morning to night\n2. Rate each behavior:\n   ✅ (+) Builds who you want to become\n   ❌ (-) Works against who you want to become\n   ➖ (=) Neutral\n3. Watch patterns emerge automatically",
      button: "Let me try",
    },
  ];

  // Intro screens
  if (step < screens.length) {
    const screen = screens[step];
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6 animate-slide-up">
        <span className="text-5xl">{screen.icon}</span>
        <h2 className="text-xl font-serif text-[#FFF8F0] leading-snug">
          {screen.title}
        </h2>
        <p className="text-sm text-[#FFF8F0]/50 whitespace-pre-line leading-relaxed">
          {screen.description}
        </p>
        <button
          type="button"
          onClick={() => setStep(step + 1)}
          className="px-6 py-2.5 rounded-xl text-sm font-mono bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30 transition-all"
        >
          {screen.button}
        </button>

        {/* Skip */}
        <div>
          <button
            type="button"
            onClick={() => setStep(screens.length)}
            className="text-[10px] font-mono text-[#FFF8F0]/20 hover:text-[#FFF8F0]/40 transition-colors"
          >
            skip intro →
          </button>
        </div>
      </div>
    );
  }

  // Intention step
  if (step === screens.length) {
    return (
      <div className="max-w-md mx-auto py-8 space-y-6 animate-slide-up">
        <div className="text-center">
          <span className="text-3xl">✍️</span>
          <h2 className="text-lg font-serif text-[#FFF8F0] mt-3">
            Set Your Intention
          </h2>
          <p className="text-sm text-[#FFF8F0]/40 mt-1">
            What will you watch for today?
          </p>
        </div>

        <textarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="e.g., I want to notice how often I check my phone..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40 resize-none"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex-1 py-2.5 rounded-xl text-sm font-mono bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/50 border border-[#FFF8F0]/[0.06] hover:bg-[#FFF8F0]/[0.08] transition-all"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex-1 py-2.5 rounded-xl text-sm font-mono bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30 transition-all"
          >
            Start scorecard
          </button>
        </div>
      </div>
    );
  }

  // Quick-start template
  if (step === screens.length + 1) {
    return (
      <div className="max-w-lg mx-auto py-6 space-y-4 animate-slide-up">
        <div className="text-center mb-4">
          <h2 className="text-lg font-serif text-[#FFF8F0]">
            Quick Start: Tap the behaviors you did today
          </h2>
          <p className="text-[11px] text-[#FFF8F0]/30 mt-1">
            Select what applies, then start logging in detail
          </p>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {FIRST_SCORECARD_TEMPLATE.map((slot) => (
            <div key={slot.time}>
              <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1.5">
                {slot.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {slot.suggestions.map((s) => {
                  const isSelected = selectedEntries.some(
                    (e) => e.name === s.name,
                  );
                  const ratingColor =
                    s.defaultRating === "+"
                      ? "#34D399"
                      : s.defaultRating === "-"
                        ? "#F87171"
                        : "#9CA3AF";

                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedEntries(
                            selectedEntries.filter((e) => e.name !== s.name),
                          );
                        } else {
                          // Parse time from slot for rough timestamp
                          const startHour = parseInt(
                            slot.time.split("-")[0].split(":")[0],
                          );
                          const timeStr = `${startHour.toString().padStart(2, "0")}:00`;
                          setSelectedEntries([
                            ...selectedEntries,
                            {
                              time: timeStr,
                              name: s.name,
                              rating: s.defaultRating,
                            },
                          ]);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                        isSelected
                          ? "border-opacity-50"
                          : "border-[#FFF8F0]/[0.06] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60"
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: `${ratingColor}50`,
                              background: `${ratingColor}15`,
                              color: ratingColor,
                            }
                          : undefined
                      }
                    >
                      {s.defaultRating === "+"
                        ? "✅"
                        : s.defaultRating === "-"
                          ? "❌"
                          : "➖"}{" "}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected count + submit */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#FFF8F0]/[0.06]">
          <span className="text-[11px] font-mono text-[#FFF8F0]/30">
            {selectedEntries.length} selected
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                // Create scorecard
                const { scorecard } = await startOrGetScorecard(
                  date,
                  intention || undefined,
                );

                // Bulk add selected entries
                if (selectedEntries.length > 0) {
                  const sorted = [...selectedEntries].sort((a, b) =>
                    a.time.localeCompare(b.time),
                  );
                  await bulkAddScorecardEntries(
                    scorecard.id,
                    sorted.map((e) => ({
                      timeOfAction: e.time,
                      behaviorDescription: e.name,
                      rating: e.rating,
                    })),
                  );
                }

                onComplete();
              });
            }}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-mono bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30 transition-all disabled:opacity-30"
          >
            {isPending
              ? "Creating..."
              : selectedEntries.length > 0
                ? `Start with ${selectedEntries.length} entries`
                : "Start empty scorecard"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
