// ─────────────────────────────────────────
// Day One Engine — Types, Guardian Rules, Compound Math, Quick Reference
// ─────────────────────────────────────────

export interface OnboardingProgress {
  id: string; userId: string; currentStep: number; completed: boolean;
  stepData: Record<string, unknown>; completedAt: string | null;
}

export interface GuardianAlert {
  id: string; userId: string; mistakeNumber: number; mistakeName: string;
  alertText: string; severity: string; shownAt: string;
  userResponse: string | null; isActive: boolean;
}

export interface GuardianHealth {
  id: string; userId: string; scoreDate: string;
  scores: Record<string, string>; overallScore: number; suggestions: string[];
}

// ─── ONBOARDING STEPS ───

export const ONBOARDING_STEPS = [
  { step: 1, name: "Identity", icon: "🪪", description: "Who do you want to become?" },
  { step: 2, name: "Audit", icon: "📋", description: "See your current habits clearly" },
  { step: 3, name: "Focus", icon: "🎯", description: "Choose 1-2 habits strategically" },
  { step: 4, name: "Intention", icon: "📝", description: "When, where, what — specifically" },
  { step: 5, name: "Stack", icon: "🔗", description: "Attach to an existing habit" },
  { step: 6, name: "Environment", icon: "🏠", description: "Design your space for success" },
  { step: 7, name: "2-Min Rule", icon: "⏱️", description: "Make it impossibly small" },
  { step: 8, name: "Tracking", icon: "📊", description: "Set up your visual chain" },
  { step: 9, name: "Accountability", icon: "🤝", description: "Tell someone" },
  { step: 10, name: "Launch", icon: "🚀", description: "Review and begin" },
];

export const IDENTITY_SUGGESTIONS = [
  { icon: "📚", text: "reads every day" },
  { icon: "🏋️", text: "takes care of their body" },
  { icon: "🧘", text: "stays calm and present" },
  { icon: "✍️", text: "writes and reflects regularly" },
  { icon: "💰", text: "is smart with money" },
  { icon: "🍳", text: "eats healthy, home-cooked food" },
  { icon: "🌅", text: "starts the day with intention" },
  { icon: "🧠", text: "never stops learning" },
  { icon: "📱", text: "is in control of their attention" },
  { icon: "⏰", text: "doesn't procrastinate" },
];

// ─── COMPOUND MATH ───

export function compoundGrowth(dailyRate: number, days: number): number {
  return Math.pow(1 + dailyRate, days);
}

export function calculateCompoundProjections(
  currentDaily: number, unit: string, daysTracked: number, totalDone: number,
): { label: string; value: string; detail: string }[] {
  const rate = daysTracked > 0 ? totalDone / daysTracked : currentDaily;
  return [
    { label: "By 30 days", value: `${Math.round(rate * 30)} ${unit}`, detail: "" },
    { label: "By 90 days", value: `${Math.round(rate * 90)} ${unit}`, detail: "More than most do in a year" },
    { label: "By 180 days", value: `${Math.round(rate * 180)} ${unit}`, detail: "" },
    { label: "By 365 days", value: `${Math.round(rate * 365)} ${unit}`, detail: "Top 1% consistency" },
  ];
}

export function getValleyMessage(day: number): string | null {
  if (day >= 10 && day <= 21) {
    return "You're in the Valley of Disappointment. This is exactly when most people quit. " +
      "The compound curve doesn't FEEL like growth yet — but it IS growing, underground, like roots. " +
      "You are RIGHT ON SCHEDULE. Keep going.";
  }
  if (day >= 22 && day <= 45) {
    return "You've survived the Valley. Most people quit by now. " +
      "The compound effect is building momentum. Stay the course.";
  }
  return null;
}

// ─── QUICK REFERENCE ───

export const QUICK_REFERENCE = [
  {
    category: "Building Good Habits",
    icon: "🟢",
    laws: [
      { law: "1. Make It Obvious", items: ["Implementation Intention: 'I will X at TIME in PLACE'", "Habit Stacking: 'After X, I will Y'", "Environment Design: Make cues visible"] },
      { law: "2. Make It Attractive", items: ["Temptation Bundling: Pair want with need", "Join a culture where your habit is the norm", "Reframe: 'I GET to' not 'I HAVE to'"] },
      { law: "3. Make It Easy", items: ["Two-Minute Rule: Start impossibly small", "Reduce friction: Fewer steps to start", "Prep environment in advance"] },
      { law: "4. Make It Satisfying", items: ["Track visually: Don't break the chain", "Never miss twice", "Immediate reward after completion"] },
    ],
  },
  {
    category: "Breaking Bad Habits",
    icon: "🔴",
    laws: [
      { law: "1. Make It Invisible", items: ["Remove cues from environment", "Avoid trigger situations"] },
      { law: "2. Make It Unattractive", items: ["Reframe the true cost", "Highlight what you LOSE, not gain"] },
      { law: "3. Make It Difficult", items: ["Add friction: More steps to start", "Use commitment devices", "Block access"] },
      { law: "4. Make It Unsatisfying", items: ["Accountability partner", "Public commitment", "Penalty system"] },
    ],
  },
  {
    category: "Key Rules",
    icon: "🎯",
    laws: [
      { law: "Core Principles", items: [
        "Identity > Goals > Outcomes", "Systems > Goals (always)",
        "Environment > Willpower (always)", "Every action = vote for identity",
        "Goldilocks: ~4% beyond comfortable", "Never miss twice",
        "Review every 30/90/365 days",
      ] },
    ],
  },
];

// ─── GUARDIAN: 10 MISTAKES ───

export const GUARDIAN_MISTAKES = [
  { number: 1, name: "Too many habits", description: "Adding 3+ habits before existing ones are stable" },
  { number: 2, name: "Bar too high", description: "Setting unrealistic targets, not using 2-min rule" },
  { number: 3, name: "Relying on motivation", description: "High start, sharp drop when motivation fades" },
  { number: 4, name: "Goals over systems", description: "Setting goals without Implementation Intentions" },
  { number: 5, name: "Not tracking", description: "Completing habits but not logging them" },
  { number: 6, name: "No environment design", description: "Environment not set up, cues still invisible" },
  { number: 7, name: "Quit after 1 bad day", description: "Missing once then disappearing for days" },
  { number: 8, name: "Expecting fast results", description: "In the Valley of Disappointment (day 10-21)" },
  { number: 9, name: "Going alone", description: "No accountability partner or public commitment" },
  { number: 10, name: "Perfectionism", description: "All-or-nothing: one miss = total abandonment" },
];

export interface GuardianCheckResult {
  mistakeNumber: number; mistakeName: string;
  status: "pass" | "warning" | "fail";
  message: string; suggestion: string | null;
}

export function runGuardianChecks(data: {
  activeHabitsCount: number;
  habitConsistencies: number[];
  daysTracked: number;
  hasImplementationIntention: boolean;
  hasEnvironmentSetup: boolean;
  hasAccountabilityPartner: boolean;
  consecutiveMisses: number;
  daysSinceLastOpen: number;
  historicalConsistency: number;
}): GuardianCheckResult[] {
  const results: GuardianCheckResult[] = [];

  // #1 Too many habits
  const avgConsistency = data.habitConsistencies.length > 0
    ? data.habitConsistencies.reduce((a, b) => a + b, 0) / data.habitConsistencies.length : 100;
  if (data.activeHabitsCount >= 3 && avgConsistency < 80) {
    results.push({ mistakeNumber: 1, mistakeName: "Too many habits", status: "warning",
      message: `${data.activeHabitsCount} active habits with ${Math.round(avgConsistency)}% avg consistency. Consider focusing on fewer.`,
      suggestion: "Archive or pause habits until your core 1-2 reach 80%+ consistency." });
  } else {
    results.push({ mistakeNumber: 1, mistakeName: "Too many habits", status: "pass", message: "Habit count is manageable.", suggestion: null });
  }

  // #2 Bar too high
  const lowConsistency = data.habitConsistencies.filter((c) => c < 60);
  if (lowConsistency.length > 0 && data.daysTracked < 30) {
    results.push({ mistakeNumber: 2, mistakeName: "Bar too high", status: "warning",
      message: `${lowConsistency.length} habit(s) below 60% in first 30 days.`,
      suggestion: "Use the 2-minute version more. Showing up > performing." });
  } else {
    results.push({ mistakeNumber: 2, mistakeName: "Bar too high", status: "pass", message: "Targets seem appropriate.", suggestion: null });
  }

  // #4 Goals over systems
  if (!data.hasImplementationIntention) {
    results.push({ mistakeNumber: 4, mistakeName: "Goals over systems", status: "warning",
      message: "No Implementation Intention set up.",
      suggestion: "Go to Architect tab and create a blueprint with when/where/what." });
  } else {
    results.push({ mistakeNumber: 4, mistakeName: "Goals over systems", status: "pass", message: "Implementation Intention active.", suggestion: null });
  }

  // #6 No environment design
  if (!data.hasEnvironmentSetup) {
    results.push({ mistakeNumber: 6, mistakeName: "No environment design", status: "warning",
      message: "No environment setup found.",
      suggestion: "Design your space in the Architect → Environments section." });
  } else {
    results.push({ mistakeNumber: 6, mistakeName: "No environment design", status: "pass", message: "Environment designed.", suggestion: null });
  }

  // #7 Quit after 1 bad day
  if (data.consecutiveMisses === 1 && data.daysSinceLastOpen > 1) {
    results.push({ mistakeNumber: 7, mistakeName: "Quit after 1 bad day", status: "fail",
      message: "You missed yesterday and haven't been back. Never miss twice!",
      suggestion: "Just do the 2-minute version today. That's all it takes." });
  } else {
    results.push({ mistakeNumber: 7, mistakeName: "Quit after 1 bad day", status: "pass", message: "Good recovery pattern.", suggestion: null });
  }

  // #8 Expecting fast results
  if (data.daysTracked >= 10 && data.daysTracked <= 21) {
    results.push({ mistakeNumber: 8, mistakeName: "Expecting fast results", status: "info",
      message: "You're in the Valley of Disappointment (days 10-21). This is normal.",
      suggestion: "The compound curve is building underground. Trust the process." });
  } else {
    results.push({ mistakeNumber: 8, mistakeName: "Expecting fast results", status: "pass", message: "Past the valley.", suggestion: null });
  }

  // #9 Going alone
  if (!data.hasAccountabilityPartner && data.daysTracked > 14 && avgConsistency < 70) {
    results.push({ mistakeNumber: 9, mistakeName: "Going alone", status: "warning",
      message: "No accountability partner and consistency below 70%.",
      suggestion: "Add a partner in Attract → Tribe section. It increases success by 65%." });
  } else {
    results.push({ mistakeNumber: 9, mistakeName: "Going alone", status: "pass", message: "Accountability in place or consistency strong.", suggestion: null });
  }

  // #10 Perfectionism
  if (data.consecutiveMisses >= 2 && data.daysSinceLastOpen >= 3 && data.historicalConsistency > 75) {
    results.push({ mistakeNumber: 10, mistakeName: "Perfectionism", status: "fail",
      message: `You had ${Math.round(data.historicalConsistency)}% consistency but disappeared after missing. This is the all-or-nothing trap.`,
      suggestion: "Your track record is excellent. One miss doesn't erase it. Come back." });
  } else {
    results.push({ mistakeNumber: 10, mistakeName: "Perfectionism", status: "pass", message: "Handles misses well.", suggestion: null });
  }

  // Fill remaining as pass
  for (const m of GUARDIAN_MISTAKES) {
    if (!results.find((r) => r.mistakeNumber === m.number)) {
      results.push({ mistakeNumber: m.number, mistakeName: m.name, status: "pass", message: "No issues detected.", suggestion: null });
    }
  }

  return results.sort((a, b) => a.mistakeNumber - b.mistakeNumber);
}

export function getGuardianOverallScore(checks: GuardianCheckResult[]): number {
  let score = 0;
  for (const c of checks) {
    if (c.status === "pass") score += 1;
    else if (c.status === "info") score += 0.8;
    else if (c.status === "warning") score += 0.3;
  }
  return Math.round((score / checks.length) * 10);
}
