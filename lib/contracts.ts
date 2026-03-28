// ─────────────────────────────────────────
// Contracts, Savings Jars, Projections, Milestones
// ─────────────────────────────────────────

export interface HabitContract {
  id: string; userId: string; habitName: string; identityStatement: string | null;
  implementationIntention: string | null; twoMinuteVersion: string | null;
  rewardText: string | null; partnerName: string | null; partnerEmail: string | null;
  maxConsecutiveMisses: number; penaltyDescription: string | null;
  penaltyAmount: number | null; penaltyCurrency: string;
  commitmentDays: number; startDate: string; endDate: string | null;
  status: "active" | "completed" | "violated" | "expired";
  currentConsecutiveMisses: number; totalCompletions: number; totalMisses: number;
  penaltyTriggered: boolean; penaltyTriggeredAt: string | null;
  signedAt: string; createdAt: string;
}

export interface SavingsJar {
  id: string; userId: string; jarName: string; jarIcon: string;
  goalAmount: number; currentAmount: number; currency: string;
  goalDescription: string | null; isActive: boolean;
  completed: boolean; completedAt: string | null; createdAt: string;
}

export interface SavingsTransaction {
  id: string; jarId: string; userId: string; amount: number;
  description: string; habitName: string | null; transactionDate: string;
}

// ─── CONTRACT HELPERS ───

export function getContractProgress(contract: HabitContract): {
  daysElapsed: number; daysRemaining: number; completionRate: number;
  progressPercent: number; isOnTrack: boolean;
} {
  const start = new Date(contract.startDate);
  const now = new Date();
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
  const daysRemaining = Math.max(0, contract.commitmentDays - daysElapsed);
  const totalActions = contract.totalCompletions + contract.totalMisses;
  const completionRate = totalActions > 0 ? Math.round((contract.totalCompletions / totalActions) * 100) : 0;
  const progressPercent = Math.min(100, Math.round((daysElapsed / contract.commitmentDays) * 100));
  return { daysElapsed, daysRemaining, completionRate, progressPercent, isOnTrack: completionRate >= 80 };
}

export function getContractStatusColor(status: string): string {
  switch (status) {
    case "active": return "#34D399";
    case "completed": return "#A78BFA";
    case "violated": return "#F87171";
    case "expired": return "#9CA3AF";
    default: return "#9CA3AF";
  }
}

// ─── SAVINGS JAR HELPERS ───

export function getJarProgress(jar: SavingsJar): {
  progressPercent: number; remaining: number; formatted: string;
} {
  const progressPercent = jar.goalAmount > 0 ? Math.min(100, Math.round((jar.currentAmount / jar.goalAmount) * 100)) : 0;
  const remaining = Math.max(0, jar.goalAmount - jar.currentAmount);
  return { progressPercent, remaining, formatted: formatCurrency(jar.currentAmount, jar.currency) };
}

export function formatCurrency(amount: number, currency: string): string {
  if (currency === "PKR") return `₹${amount.toLocaleString()}`;
  if (currency === "USD") return `$${amount.toLocaleString()}`;
  return `${amount.toLocaleString()} ${currency}`;
}

// ─── PROJECTION CALCULATOR ───

export interface Projection {
  habitName: string; habitEmoji: string;
  currentRate: number; // completions per day
  projections: { label: string; value: string; detail: string }[];
  motivationalMessage: string;
}

export function calculateProjections(
  habitName: string,
  habitEmoji: string,
  totalCompletions: number,
  daysTracked: number,
  customMetric?: { unit: string; perCompletion: number }, // e.g. { unit: "pages", perCompletion: 10 }
): Projection {
  const rate = daysTracked > 0 ? totalCompletions / daysTracked : 0;
  const projections: { label: string; value: string; detail: string }[] = [];

  // Time projections
  const daysToMonth = 30 - (daysTracked % 30);
  const byMonth = Math.round(rate * 30);
  const byQuarter = Math.round(rate * 90);
  const byYear = Math.round(rate * 365);

  projections.push(
    { label: "By next month", value: `${byMonth} completions`, detail: `~${byMonth} days of ${habitName.toLowerCase()}` },
    { label: "By 3 months", value: `${byQuarter} completions`, detail: `That's more than most people do in a year` },
    { label: "By end of year", value: `${byYear} completions`, detail: `Top 1% consistency` },
  );

  if (customMetric) {
    const monthMetric = Math.round(byMonth * customMetric.perCompletion);
    const yearMetric = Math.round(byYear * customMetric.perCompletion);
    projections.push(
      { label: `${customMetric.unit} by month`, value: `~${monthMetric.toLocaleString()} ${customMetric.unit}`, detail: "" },
      { label: `${customMetric.unit} by year`, value: `~${yearMetric.toLocaleString()} ${customMetric.unit}`, detail: "" },
    );
  }

  // Motivational message based on rate
  let motivationalMessage: string;
  if (rate >= 0.9) {
    motivationalMessage = "You're building a completely different life. At this rate, a year from now you won't recognize yourself.";
  } else if (rate >= 0.7) {
    motivationalMessage = "Strong consistency. Keep this up and the compound effect will be extraordinary.";
  } else if (rate >= 0.5) {
    motivationalMessage = "You're showing up more often than not. Every completion compounds over time.";
  } else {
    motivationalMessage = "Even at this pace, you'll accomplish more than those who never started. Keep going.";
  }

  return { habitName, habitEmoji, currentRate: Math.round(rate * 100), projections, motivationalMessage };
}

// ─── HABIT METRIC SUGGESTIONS ───

export function getHabitMetric(habitName: string): { unit: string; perCompletion: number } | undefined {
  const lower = habitName.toLowerCase();
  if (lower.includes("read")) return { unit: "pages", perCompletion: 10 };
  if (lower.includes("run") || lower.includes("walk")) return { unit: "km", perCompletion: 3 };
  if (lower.includes("pushup")) return { unit: "pushups", perCompletion: 10 };
  if (lower.includes("meditat")) return { unit: "minutes", perCompletion: 10 };
  if (lower.includes("write") || lower.includes("journal")) return { unit: "words", perCompletion: 300 };
  if (lower.includes("code")) return { unit: "hours", perCompletion: 1 };
  if (lower.includes("study")) return { unit: "hours", perCompletion: 1 };
  return undefined;
}

// ─── MILESTONE CARD DATA ───

export interface MilestoneCard {
  tier: string; tierIcon: string; tierColor: string;
  habitName: string; streakDays: number;
  completionRate: number; cumulativeImpact: string;
  identityStatement: string | null;
  quote: string; quoteAuthor: string;
  dateAchieved: string;
}

export const MILESTONE_TIERS = [
  { days: 7, tier: "Bronze", icon: "🏅", color: "#CD7F32", quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { days: 21, tier: "Silver", icon: "🥈", color: "#C0C0C0", quote: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Will Durant" },
  { days: 30, tier: "Gold", icon: "🥇", color: "#FFD700", quote: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { days: 66, tier: "Diamond", icon: "💎", color: "#B9F2FF", quote: "It's not what we do once in a while that shapes our lives, but what we do consistently.", author: "Tony Robbins" },
  { days: 100, tier: "Obsidian", icon: "🔥", color: "#FF6B6B", quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { days: 365, tier: "Crown", icon: "👑", color: "#A78BFA", quote: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
];

export function generateMilestoneCard(
  habitName: string, streakDays: number, completionRate: number,
  identityStatement: string | null, cumulativeImpact: string,
): MilestoneCard | null {
  const tier = [...MILESTONE_TIERS].reverse().find((t) => streakDays >= t.days);
  if (!tier) return null;

  return {
    tier: tier.tier, tierIcon: tier.icon, tierColor: tier.color,
    habitName, streakDays, completionRate, cumulativeImpact,
    identityStatement, quote: tier.quote, quoteAuthor: tier.author,
    dateAchieved: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  };
}
