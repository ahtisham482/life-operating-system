"use client";

import { useMemo } from "react";

export interface SmartPromptProps {
  habitsCount: number;
  daysOfData: number;
  hasBlueprintsData: boolean;
  hasScorecardData: boolean;
  hasIdentityData: boolean;
  hasFrictionData: boolean;
  hasAttractionData: boolean;
  hasMasteryHabits: boolean;
  hasOnboardingComplete: boolean;
  onNavigate: (view: string) => void;
}

interface PromptConfig {
  icon: string;
  message: string;
  buttonLabel: string;
  view: string;
}

function getPrompt(props: SmartPromptProps): PromptConfig {
  const {
    habitsCount,
    daysOfData,
    hasBlueprintsData,
    hasScorecardData,
    hasIdentityData,
    hasFrictionData,
    hasAttractionData,
    hasMasteryHabits,
  } = props;

  if (habitsCount === 0) {
    return {
      icon: "🌱",
      message: "Every system starts with one habit. Pick something small you already want to do.",
      buttonLabel: "Create Your First Habit",
      view: "tracker",
    };
  }

  if (habitsCount > 0 && daysOfData < 3) {
    return {
      icon: "⏳",
      message: "Keep tracking — 3 days unlocks Build tools.",
      buttonLabel: "Track Today",
      view: "tracker",
    };
  }

  if (daysOfData >= 3 && !hasBlueprintsData) {
    return {
      icon: "🔓",
      message: "Build zone unlocked! Design how your habits actually run.",
      buttonLabel: "Create a Blueprint",
      view: "architect",
    };
  }

  if (daysOfData >= 3 && !hasScorecardData) {
    return {
      icon: "📊",
      message: "Score your day to see which behaviors matter most.",
      buttonLabel: "Try Daily Score",
      view: "scorecard",
    };
  }

  if (habitsCount > 0 && !hasIdentityData) {
    return {
      icon: "🪞",
      message: "Habits stick when they match who you're becoming.",
      buttonLabel: "Define Your Identity",
      view: "identity",
    };
  }

  if (daysOfData >= 7 && !hasFrictionData && !hasAttractionData) {
    return {
      icon: "🛠️",
      message: "Shape your environment — make good habits easy, bad ones hard.",
      buttonLabel: "Set Up Environment",
      view: "friction",
    };
  }

  if (daysOfData >= 14 && !hasMasteryHabits) {
    return {
      icon: "🚀",
      message: "Grow zone unlocked! Pick a habit to push toward mastery.",
      buttonLabel: "Start Mastery",
      view: "mastery",
    };
  }

  return {
    icon: "✨",
    message: "Your system is running. Every check-in is a vote for who you're becoming.",
    buttonLabel: "Track Today",
    view: "tracker",
  };
}

export function SmartPrompt(props: SmartPromptProps) {
  const prompt = useMemo(() => getPrompt(props), [props]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.06] rounded-xl max-h-[60px]">
      <span className="text-lg shrink-0">{prompt.icon}</span>
      <p className="text-[11px] font-mono text-[#FFF8F0]/60 flex-1 truncate">
        {prompt.message}
      </p>
      <button
        onClick={() => props.onNavigate(prompt.view)}
        className="shrink-0 px-3 py-1.5 text-xs font-mono text-[#FFF8F0]/80 bg-[#FFF8F0]/[0.06] hover:bg-[#FFF8F0]/[0.1] border border-[#FFF8F0]/[0.08] rounded-lg transition-all whitespace-nowrap"
      >
        {prompt.buttonLabel}
      </button>
    </div>
  );
}
