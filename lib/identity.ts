/**
 * Identity Engine — Confidence Score Algorithm
 *
 * Pure function: no DB calls. Takes pre-fetched completion data
 * and returns a 0-100 belief score.
 *
 * Weights:
 * - Recent completion rate (last 7 days): 40%
 * - Overall completion rate (all-time):   20%
 * - Current streak score (capped at 30d): 20%
 * - Weekly consistency (last 8 weeks):    15%
 * - Longevity (days since first vote):     5%
 */

export type ConfidenceInputs = {
  /** Habits completed in the last 7 days */
  recentCompletions: number;
  /** Habits scheduled in the last 7 days */
  recentScheduled: number;
  /** All-time completed habit logs */
  overallCompletions: number;
  /** All-time scheduled habit logs */
  overallScheduled: number;
  /** Max currentStreak across all identity-linked habits */
  currentStreak: number;
  /** Fraction of last 8 weeks that had at least 1 completion (0–1) */
  weeklyConsistencyRate: number;
  /** Days since the first habit_log for this identity */
  daysSinceFirstVote: number;
};

export function computeConfidenceScore(inputs: ConfidenceInputs): number {
  const {
    recentCompletions,
    recentScheduled,
    overallCompletions,
    overallScheduled,
    currentStreak,
    weeklyConsistencyRate,
    daysSinceFirstVote,
  } = inputs;

  const recentRate =
    recentScheduled > 0 ? recentCompletions / recentScheduled : 0;
  const overallRate =
    overallScheduled > 0 ? overallCompletions / overallScheduled : 0;
  // Streak is scored 0→1, capped at 30 days for full points
  const streakScore = Math.min(currentStreak / 30, 1);
  // Longevity is scored 0→1, capped at 90 days for full points
  const longevity = Math.min(daysSinceFirstVote / 90, 1);

  const raw =
    recentRate * 40 +
    overallRate * 20 +
    streakScore * 20 +
    weeklyConsistencyRate * 15 +
    longevity * 5;

  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * Returns a human-readable label for a confidence score.
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 90) return "Integrated";
  if (score >= 75) return "Embodying";
  if (score >= 50) return "Believing";
  if (score >= 25) return "Building";
  return "Exploring";
}

/**
 * Returns a Tailwind color class for a confidence score.
 */
export function getConfidenceColor(score: number): string {
  if (score >= 75) return "text-green-400";
  if (score >= 50) return "text-amber-400";
  if (score >= 25) return "text-orange-400";
  return "text-red-400";
}

/**
 * Milestone definitions checked after each vote.
 */
export type MilestoneDef = {
  type: "streak" | "votes" | "confidence";
  value: number;
  title: string;
  message: string;
};

export const MILESTONE_DEFS: MilestoneDef[] = [
  // Streak milestones
  {
    type: "streak",
    value: 3,
    title: "🌱 Seed Planted",
    message: "3 days! A tiny habit is taking root.",
  },
  {
    type: "streak",
    value: 7,
    title: "🔥 One Week Strong",
    message: "7 days of voting for your identity. This is real.",
  },
  {
    type: "streak",
    value: 14,
    title: "💪 Two Week Warrior",
    message: "Two weeks. You're building neural pathways.",
  },
  {
    type: "streak",
    value: 21,
    title: "⚡ 21-Day Mark",
    message: "21 days — the habit formation milestone.",
  },
  {
    type: "streak",
    value: 30,
    title: "🏅 Monthly Master",
    message: "30 days! This is becoming who you are.",
  },
  {
    type: "streak",
    value: 50,
    title: "🌟 Half Century",
    message: "50 days. You've made this automatic.",
  },
  {
    type: "streak",
    value: 66,
    title: "💎 Automaticity",
    message: "66 days — science says this is when habits truly stick.",
  },
  {
    type: "streak",
    value: 100,
    title: "👑 Triple Digits",
    message: "100 days. Identity confirmed.",
  },
  {
    type: "streak",
    value: 365,
    title: "🏆 One Year Identity",
    message: "A full year. This identity is permanent.",
  },
  // Total votes milestones
  {
    type: "votes",
    value: 10,
    title: "🗳️ 10 Votes Cast",
    message: "10 pieces of evidence that you ARE this person.",
  },
  {
    type: "votes",
    value: 50,
    title: "🗳️ 50 Votes",
    message: "50 votes for your identity!",
  },
  {
    type: "votes",
    value: 100,
    title: "💯 100 Votes!",
    message: "100 votes. The evidence is overwhelming.",
  },
  {
    type: "votes",
    value: 500,
    title: "🏛️ 500 Votes",
    message: "500 votes. Undeniable.",
  },
  {
    type: "votes",
    value: 1000,
    title: "🌍 1000 Votes",
    message: "1000 votes for your identity. Unshakeable.",
  },
  // Confidence milestones
  {
    type: "confidence",
    value: 25,
    title: "🌅 Belief Emerging",
    message: "25% confidence — you're starting to believe.",
  },
  {
    type: "confidence",
    value: 50,
    title: "⚖️ Halfway Believer",
    message: "50% confidence. The scales are tipping.",
  },
  {
    type: "confidence",
    value: 75,
    title: "🌤️ Strong Believer",
    message: "75% confidence. You mostly believe you ARE this person.",
  },
  {
    type: "confidence",
    value: 90,
    title: "☀️ Near Certainty",
    message: "90% confidence. This identity is becoming unshakeable.",
  },
  {
    type: "confidence",
    value: 100,
    title: "🔮 Full Identity",
    message: "100% confidence. You don't do this — you ARE this.",
  },
];

/**
 * Returns the ISO week key for a given date, e.g. "2026-W13".
 */
export function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    ) + 1;
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
