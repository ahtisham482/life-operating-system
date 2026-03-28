// ─────────────────────────────────────────
// Mastery Engine — Types, Goldilocks Algorithm, Phase System, Challenges
// ─────────────────────────────────────────

export interface HabitMastery {
  id: string; userId: string; habitName: string; habitIcon: string | null;
  baselineAmount: number; baselineUnit: string; currentTarget: number; horizonAmount: number | null;
  currentPhase: number; phaseStartedAt: string;
  totalLevelUps: number; totalLevelDowns: number;
  goldilocksZone: string; consistencyScore: number; growthScore: number;
  depthScore: number; masteryScore: number; deliberateChallengesDone: number;
  isActive: boolean; createdAt: string;
}

export interface PerformanceLog {
  id: string; masteryId: string; logDate: string;
  targetAmount: number; actualAmount: number | null; timeSpentMinutes: number | null;
  difficultyFeeling: number | null; completed: boolean; usedTwoMinute: boolean; note: string | null;
}

export interface LevelChange {
  id: string; masteryId: string; oldTarget: number; newTarget: number;
  direction: string; reason: string; avgPerformance: number | null; avgFeeling: number | null;
  changedAt: string;
}

export interface MasteryReview {
  id: string; userId: string; reviewType: string; periodLabel: string;
  responses: Record<string, string>; autoInsights: string[]; completedAt: string;
}

export interface Challenge {
  id: string; masteryId: string; challengeText: string; weekNumber: number;
  accepted: boolean; completed: boolean; completedAt: string | null; rating: string | null;
}

// ─── PHASE SYSTEM ───

export const PHASE_NAMES = ["", "Standardize", "Stabilize", "Optimize", "Automate", "Review & Evolve"];
export const PHASE_ICONS = ["", "🌱", "🔗", "📈", "🤖", "🔄"];
export const PHASE_COLORS = ["", "#FEC89A", "#34D399", "#60A5FA", "#A78BFA", "#F472B6"];
export const PHASE_DESCRIPTIONS = [
  "",
  "Just show up. The only metric is: did I do it?",
  "Don't miss. Build the chain. Never miss twice.",
  "Improve quality AND quantity. Find your flow zone.",
  "The habit runs on autopilot. Protect it from boredom.",
  "Periodic reflection. Does this still serve who I am?",
];

// Phase transition criteria
export function canAdvancePhase(phase: number, stats: { daysDone: number; consistency: number; neverMissedTwice: boolean; levelUps: number; flowDays: number }): boolean {
  switch (phase) {
    case 1: return stats.daysDone >= 10 && stats.consistency >= 71;
    case 2: return stats.daysDone >= 12 && stats.consistency >= 75 && stats.neverMissedTwice;
    case 3: return stats.daysDone >= 30 && stats.levelUps >= 2 && stats.flowDays >= 80 && stats.consistency >= 80;
    case 4: return stats.daysDone >= 30 && stats.consistency >= 75;
    default: return false;
  }
}

// ─── GOLDILOCKS ALGORITHM ───

export type GoldilocksZone = "boredom" | "goldilocks" | "anxiety" | "ready" | "friction_warning";

export interface GoldilocksAssessment {
  zone: GoldilocksZone;
  avgPerformance: number;
  avgFeeling: number;
  consistency: number;
  recommendation: "increase" | "maintain" | "decrease" | "evolve" | "refocus";
  suggestedTarget: number | null;
  changePercent: number | null;
  message: string;
}

export function assessGoldilocks(
  logs: PerformanceLog[],
  currentTarget: number,
): GoldilocksAssessment {
  if (logs.length < 3) {
    return { zone: "goldilocks", avgPerformance: 0, avgFeeling: 0, consistency: 0, recommendation: "maintain", suggestedTarget: null, changePercent: null, message: "Need at least 3 days of data for Goldilocks analysis." };
  }

  const completed = logs.filter((l) => l.completed);
  const consistency = Math.round((completed.length / logs.length) * 100);
  const withAmount = completed.filter((l) => l.actualAmount != null);
  const avgPerformance = withAmount.length > 0
    ? Math.round((withAmount.reduce((s, l) => s + (l.actualAmount! / l.targetAmount) * 100, 0) / withAmount.length))
    : 0;
  const withFeeling = logs.filter((l) => l.difficultyFeeling != null);
  const avgFeeling = withFeeling.length > 0
    ? Math.round((withFeeling.reduce((s, l) => s + l.difficultyFeeling!, 0) / withFeeling.length) * 10) / 10
    : 3;

  // Friction warning: consistency collapsed
  if (consistency <= 60) {
    return {
      zone: "friction_warning", avgPerformance, avgFeeling, consistency,
      recommendation: "refocus", suggestedTarget: Math.round(currentTarget * 0.5),
      changePercent: -50,
      message: `Consistency dropped to ${consistency}%. Return to the 2-minute version. Consistency > intensity.`,
    };
  }

  // Boredom: too easy + high performance
  if (avgFeeling <= 1.5 && avgPerformance >= 120) {
    const newTarget = Math.round(currentTarget * 1.1);
    return {
      zone: "boredom", avgPerformance, avgFeeling, consistency,
      recommendation: "increase", suggestedTarget: newTarget,
      changePercent: 10,
      message: `You're crushing it. Average ${avgPerformance}% of target and it feels too easy. Time to level up.`,
    };
  }

  // Anxiety: too hard + low performance
  if (avgFeeling >= 4.0 || avgPerformance <= 70) {
    const newTarget = Math.round(currentTarget * 0.85);
    return {
      zone: "anxiety", avgPerformance, avgFeeling, consistency,
      recommendation: "decrease", suggestedTarget: newTarget,
      changePercent: -15,
      message: `This level feels too hard (${avgFeeling}/5) or performance is low (${avgPerformance}%). Pull back to build confidence.`,
    };
  }

  // Ready for challenge: leaning easy + high performance + high consistency
  if (avgFeeling <= 2.5 && avgPerformance >= 110 && consistency >= 90) {
    const newTarget = Math.round(currentTarget * 1.05);
    return {
      zone: "ready", avgPerformance, avgFeeling, consistency,
      recommendation: "increase", suggestedTarget: newTarget,
      changePercent: 5,
      message: `Consistent at ${consistency}% and it's getting easy. A small 5% step up keeps you in the flow zone.`,
    };
  }

  // Goldilocks: just right
  return {
    zone: "goldilocks", avgPerformance, avgFeeling, consistency,
    recommendation: "maintain", suggestedTarget: null, changePercent: null,
    message: `Perfect difficulty. ${avgPerformance}% performance, ${avgFeeling}/5 feeling, ${consistency}% consistency. Stay here.`,
  };
}

// ─── MASTERY SCORE ───

export function calculateMasteryScore(
  consistencyRate: number,
  levelsGained: number,
  baselineAmount: number,
  currentTarget: number,
  challengesDone: number,
  totalChallenges: number,
): { consistency: number; growth: number; depth: number; overall: number; level: string } {
  const consistency = Math.min(100, Math.round(consistencyRate));
  const growthRatio = baselineAmount > 0 ? (currentTarget - baselineAmount) / baselineAmount : 0;
  const growth = Math.min(100, Math.round(growthRatio * 50 + levelsGained * 10));
  const depth = totalChallenges > 0 ? Math.min(100, Math.round((challengesDone / totalChallenges) * 100)) : 0;
  const overall = Math.round(consistency * 0.4 + growth * 0.35 + depth * 0.25);
  const level = overall >= 90 ? "Master" : overall >= 75 ? "Expert" : overall >= 50 ? "Skilled" : overall >= 25 ? "Practitioner" : "Beginner";
  return { consistency, growth, depth, overall, level };
}

export const MASTERY_LEVEL_ICONS: Record<string, string> = {
  Beginner: "🌱", Practitioner: "🌿", Skilled: "🌳", Expert: "🏔️", Master: "👑",
};

// ─── DELIBERATE PRACTICE CHALLENGES ───

export const CHALLENGE_LIBRARY: Record<string, string[]> = {
  reading: [
    "Underline 3 key sentences per chapter",
    "Write a 1-paragraph summary after reading",
    "Explain what you read to someone",
    "Read from a genre you never read",
    "Read without any device nearby",
    "Take notes using the Feynman technique",
    "Re-read a challenging chapter",
    "Create a mind map of this month's reading",
  ],
  exercise: [
    "Focus on FORM for every rep (fewer reps OK)",
    "Try a harder variation of your main exercise",
    "Time your rest periods precisely",
    "Record yourself and check form",
    "Try a completely new exercise",
    "Do slower reps (increase time under tension)",
    "Track heart rate zones",
    "Do a benchmark test — measure progress",
  ],
  meditation: [
    "Meditate with eyes open",
    "Try body scan instead of breath focus",
    "Meditate in a noisy environment",
    "Practice loving-kindness meditation",
    "Extend by 2 minutes without a timer",
    "Try walking meditation",
    "Meditate right after something stressful",
    "Full unguided silence (no app)",
  ],
  writing: [
    "Write without editing (pure flow)",
    "Write about something uncomfortable",
    "Write for a specific person",
    "Edit yesterday's writing ruthlessly",
    "Write in a different format",
    "Write from a perspective not your own",
    "Publish or share something you wrote",
    "Write about something you know nothing about",
  ],
  general: [
    "Do the habit in a different location",
    "Do it at a different time than usual",
    "Teach someone what you've learned",
    "Set a personal record",
    "Do it with zero distractions",
    "Combine it with another habit (stack)",
    "Journal about why this habit matters to you",
    "Do the hardest version you can manage",
  ],
};

export function getChallengesForHabit(habitName: string): string[] {
  const lower = habitName.toLowerCase();
  for (const [key, challenges] of Object.entries(CHALLENGE_LIBRARY)) {
    if (key !== "general" && lower.includes(key.slice(0, 4))) return challenges;
  }
  return CHALLENGE_LIBRARY.general;
}

// ─── REVIEW PROMPTS ───

export const WEEKLY_PROMPTS = [
  { id: "feeling", label: "How did each habit feel this week?", type: "goldilocks" },
];

export const MONTHLY_PROMPTS = [
  { id: "went_well", label: "What went WELL this month?" },
  { id: "struggled", label: "What STRUGGLED this month? Why?" },
  { id: "adjustment", label: "What ONE adjustment will you make next month?" },
];

export const QUARTERLY_PROMPTS = [
  { id: "proud", label: "What are you MOST proud of?" },
  { id: "hardest", label: "What habit has been hardest? What makes it hard?" },
  { id: "add", label: "Should you ADD a habit based on who you're becoming?" },
  { id: "retire", label: "Should you RETIRE a habit? (It's okay.)" },
  { id: "transforming", label: "Are you becoming the person you want to become?" },
];

// ─── ZONE VISUAL HELPERS ───

export function getZoneColor(zone: string): string {
  switch (zone) {
    case "boredom": return "#FEC89A";
    case "goldilocks": return "#34D399";
    case "anxiety": return "#F87171";
    case "ready": return "#60A5FA";
    case "friction_warning": return "#F87171";
    default: return "#9CA3AF";
  }
}

export function getZoneLabel(zone: string): string {
  switch (zone) {
    case "boredom": return "😴 Too Easy";
    case "goldilocks": return "🔥 Flow Zone";
    case "anxiety": return "😰 Too Hard";
    case "ready": return "📈 Ready to Level Up";
    case "friction_warning": return "⚠️ Consistency Drop";
    default: return "📊 Analyzing...";
  }
}

export function getDifficultyEmoji(feeling: number): string {
  switch (feeling) {
    case 1: return "😴";
    case 2: return "😊";
    case 3: return "🔥";
    case 4: return "😰";
    case 5: return "😫";
    default: return "😊";
  }
}

export function getDifficultyLabel(feeling: number): string {
  switch (feeling) {
    case 1: return "Too Easy";
    case 2: return "Good Challenge";
    case 3: return "In The Flow";
    case 4: return "Slightly Hard";
    case 5: return "Way Too Hard";
    default: return "Good";
  }
}
